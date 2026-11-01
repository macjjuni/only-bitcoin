"""
`voxel-crew.blend` 를 인스턴싱 가능한 런타임 에셋으로 가공한다.

원본은 부위마다 메시가 쪼개져 있고 스킨·애니메이션이 붙어 있어, 그대로 쓰면
아바타 한 명이 부위 수만큼 드로우 콜을 쓴다. 50명이면 예산(50)의 수십 배다.

출력
  crew.glb        메시 2개로 병합한 지오메트리(JOINTS_0 유지, 애니메이션 제거)
  crew-walk.bin   Walk 한 사이클의 본 스키닝 행렬(Float32)

실행
  blender --background public/models/voxel-crew.blend \
      --python scripts/blender/process-voxel-crew.py -- public/models
"""
import bpy
import math
import os
import struct
import sys

from mathutils import Matrix

OUT = sys.argv[-1]
HEIGHT = 1.81
WALK_ACTION = "Walk"

# 앞치마 **앞판만** 플레이어 색을 받도록 뺀다(§6 B안).
#
# 앞치마 전체를 빼면 주머니·끈·빨간 트림까지 단색이 되어 디테일이 사라진다.
# 아틀라스의 앞치마 색이 #18171a(밝기 13%)라 텍스처를 곱하는 방식으로는 색이
# 나오지 않으므로, 앞판은 텍스처 없는 단색 머티리얼로 그린다.
ACCENT_NAMES = ("l_apron_front_panel", "r_apron_front_panel")

# glTF 는 Y-up, Blender 는 Z-up 이다. 지오메트리는 익스포터가 변환해 주지만
# 본 행렬은 직접 같은 변환을 해 줘야 셰이더에서 정점과 맞는다.
YUP = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))


# region [Privates]
def mesh_objects():
    """
    리그에 묶인 메시만 캐릭터로 본다.

    `.blend` 에는 200 x 200 m 스튜디오 바닥과 조명·카메라가 함께 들어 있다.
    타입만 보고 고르면 바닥이 아바타마다 딸려 간다.
    """
    armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")

    return [
        o
        for o in bpy.context.scene.objects
        if o.type == "MESH"
        and (
            o.vertex_groups
            or o.parent is armature
            or any(m.type == "ARMATURE" for m in o.modifiers)
        )
    ]


def bake_bone_index(objs, bones):
    """
    정점마다 따라갈 본 번호를 커스텀 속성에 굽는다.

    `JOINTS_0` 를 쓰려면 스킨을 남겨야 하는데, 그러면 익스포터가 아마추어
    모디파이어까지 적용해 지오메트리가 현재 포즈로 굳는다. 번호를 직접 구워
    두면 스킨 없이도 셰이더가 본을 찾을 수 있다.
    """
    index_of = {name: i for i, name in enumerate(bones)}
    missing = 0

    for obj in objs:
        group_bone = {vg.index: vg.name for vg in obj.vertex_groups}
        attribute = obj.data.attributes.new("_BONEINDEX", "FLOAT", "POINT")
        for i, vertex in enumerate(obj.data.vertices):
            best = max(vertex.groups, key=lambda g: g.weight, default=None)
            name = group_bone.get(best.group) if best else None
            if name not in index_of:
                missing += 1
            attribute.data[i].value = float(index_of.get(name, 0))
        # 여분 UV 셋은 아틀라스 하나만 쓰는 모델에 불필요한 용량이다.
        while len(obj.data.uv_layers) > 1:
            obj.data.uv_layers.remove(obj.data.uv_layers[-1])
        # 아마추어를 떼야 익스포터가 포즈를 지오메트리에 굽지 않는다.
        obj.modifiers.clear()
        if obj.parent and obj.parent.type == "ARMATURE":
            world = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = world

    if missing:
        print(f"[warn] 본을 못 찾은 정점 {missing}개 — 0번 본으로 둔다")


def join_group(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    merged = bpy.context.active_object
    merged.name = name
    # glTF 의 meshes[].name 은 오브젝트가 아니라 메시 데이터 이름을 따른다.
    merged.data.name = name
    return merged


def resolve_transform(objs):
    """
    키를 HEIGHT 로 맞추고 발바닥을 z=0 에 두는 변환을 구한다.

    정점과 본 행렬에 **같은 변환**을 적용해야 한다. 따로 맞추면 애니메이션이
    모델에서 어긋난다. 회전은 전방을 `-Z` 로 돌리기 위한 것이다(원본은 `+Z`).
    """
    rotation = Matrix.Rotation(math.pi, 4, "Z")
    corners = [rotation @ o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    zs = [c.z for c in corners]
    scale = HEIGHT / (max(zs) - min(zs))
    lift = -min(zs) * scale

    return Matrix.Translation((0, 0, lift)) @ Matrix.Diagonal((scale,) * 3).to_4x4() @ rotation


def bake_walk_matrices(armature, transform):
    """
    Walk 한 사이클의 본 스키닝 행렬을 프레임마다 굽는다.

    정점은 단일 본에 100% 묶여 있으므로(리지드 바인딩) 셰이더는 행렬 하나만
    곱하면 된다. 정점 위치를 통째로 굽는 VAT 보다 자료가 훨씬 작다.
    """
    action = bpy.data.actions[WALK_ACTION]
    armature.data.pose_position = "POSE"
    armature.animation_data.action = action
    if hasattr(armature.animation_data, "action_slot") and action.slots:
        armature.animation_data.action_slot = action.slots[0]

    start, end = (int(round(v)) for v in action.frame_range)
    # 마지막 프레임은 첫 프레임과 같은 포즈라(루프) 빼야 한 박자 쉬지 않는다.
    frames = list(range(start, end))
    bones = [b.name for b in armature.data.bones]
    to_model = transform @ armature.matrix_world
    rows = []

    for frame in frames:
        bpy.context.scene.frame_set(frame)
        for name in bones:
            rest = armature.data.bones[name].matrix_local
            pose = armature.pose.bones[name].matrix
            # 모델 공간에서의 스키닝 행렬. 좌우 변환으로 감싸 정점과 같은 공간에 둔다.
            skin = YUP @ to_model @ (pose @ rest.inverted()) @ to_model.inverted() @ YUP.inverted()
            rows.extend(skin[0][:] + skin[1][:] + skin[2][:])

    # 지오메트리는 레스트 포즈로 굽는다. 본에 물린 메시는 `matrix_world` 가
    # 포즈를 따라가므로, 켜 둔 채 합치면 Walk 한 프레임이 모델에 굳는다.
    armature.animation_data.action = None
    armature.data.pose_position = "REST"
    bpy.context.view_layer.update()

    return frames, bones, rows
# endregion


bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object else None
armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
armature.data.pose_position = "REST"
bpy.context.view_layer.update()
print(f"[info] 가공 전 메시 {len(mesh_objects())}개, 본 {len(armature.data.bones)}개")

accent = [o for o in mesh_objects() if o.name.lower() in ACCENT_NAMES]
body = [o for o in mesh_objects() if o not in accent]
if not accent:
    raise SystemExit("[error] 앞치마 앞판을 찾지 못했습니다. 노드 이름을 확인하세요.")
print(f"[info] 앞판 {len(accent)}개 / 몸통 {len(body)}개")

transform = resolve_transform(mesh_objects())
frames, bones, matrix_rows = bake_walk_matrices(armature, transform)

# 베이크가 끝난 뒤 바인드 포즈로 되돌려야 지오메트리가 A 포즈로 나간다.
bpy.context.scene.frame_set(int(bpy.data.actions[WALK_ACTION].frame_range[0]))
armature.animation_data.action = None

bake_bone_index(mesh_objects(), bones)
body_obj = join_group(body, "crew_body")
accent_obj = join_group(accent, "crew_accent")
for obj in (body_obj, accent_obj):
    while len(obj.data.uv_layers) > 1:
        obj.data.uv_layers.remove(obj.data.uv_layers[-1])
    # mesh.transform 은 정점과 법선을 함께 돌린다. transform_apply 오퍼레이터는
    # 백그라운드 실행에서 선택 상태를 타므로 쓰지 않는다.
    obj.data.transform(transform @ obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)

bpy.ops.object.select_all(action="DESELECT")
for obj in (body_obj, accent_obj):
    obj.select_set(True)
bpy.context.view_layer.objects.active = body_obj
glb_path = os.path.join(OUT, "crew.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_path, export_format="GLB", use_selection=True, export_apply=True,
    export_yup=True, export_normals=True, export_texcoords=True,
    # 본 번호는 `_BONEINDEX` 커스텀 속성으로 따로 구웠다. 스킨을 남기면
    # 익스포터가 아마추어 모디파이어를 적용해 포즈가 지오메트리에 굳는다.
    export_skins=False, export_animations=False, export_attributes=True)

bin_path = os.path.join(OUT, "crew-walk.bin")
with open(bin_path, "wb") as handle:
    handle.write(struct.pack(f"<{len(matrix_rows)}f", *matrix_rows))

tri = sum(len(p.vertices) - 2 for o in (body_obj, accent_obj) for p in o.data.polygons)
head = [v.co.z for v in body_obj.data.vertices if 1.40 < v.co.z < 1.56]
print(f"[export] crew.glb {os.path.getsize(glb_path)/1024:.0f} KB | 삼각형={tri} | 50명={tri*50:,}")
print(f"[export] crew-walk.bin {os.path.getsize(bin_path)/1024:.0f} KB | "
      f"프레임={len(frames)} 본={len(bones)} 길이={len(frames)/24:.2f}초")
print(f"[anchor] headCenterY={sum(head)/len(head):.4f}")
