"""
복셀 캐릭터 `.blend` 를 인스턴싱 가능한 런타임 에셋으로 가공함.

원본은 부위마다 메시가 쪼개져 있고 스킨·애니메이션이 붙어 있어, 그대로 쓰면
아바타 한 명이 부위 수만큼 드로우 콜을 씀. 50명이면 예산(50)의 수십 배임.

모든 모델을 **본 22칸** 폭으로 구움. 본이 적은 모델(20개)은 남는 칸을 항등 행렬로
채움. Walk 프레임 수는 모델마다 다를 수 있고(크루·곰 40, 황소 48) 런타임이 `.bin`
크기에서 읽음.

출력 (`<prefix>` 기본값 `crew`)
  <prefix>.glb        메시 2~3개로 병합한 지오메트리(애니메이션 제거)
  <prefix>-walk.bin   Walk 한 사이클의 본 스키닝 행렬(Float32)
  <prefix>-kick.bin   발차기 한 번의 본 스키닝 행렬(Float32, `KICK_FRAMES` 프레임)

실행 — `<prefix>`, 색을 받을 메시, 발광시킬 눈동자 메시를 쉼표로 구분해 넘김
  blender --background assets/avatars/voxel-crew.blend \
      --python scripts/blender/process-voxel-character.py -- public/models crew
  blender --background assets/avatars/voxel-bear.blend \
      --python scripts/blender/process-voxel-character.py -- public/models bear
  blender --background assets/avatars/voxel-bull.blend \
      --python scripts/blender/process-voxel-character.py -- public/models bull \
      burgundy_waistcoat_front l_bull_eye_dark_pixel,r_bull_eye_dark_pixel
  blender --background assets/avatars/voxel-pepe.blend \
      --python scripts/blender/process-voxel-character.py -- public/models pepe \
      Shirt_main_cuboid,Sleeve_L,Sleeve_R --height=1.6

`--height=<m>` 로 키를 바꿈. 생략하면 1.81 m. 위치와 상관없이 받음.

`--kick-only` 를 주면 glb·walk 는 건드리지 않고 `<prefix>-kick.bin` 만 구움. 이미 구운
모델에 발차기를 붙일 때 씀. 이때 Walk 도 메모리에서 다시 계산해 기존 `-walk.bin`
과 비교함. 같으면 좌표 변환이 기존 에셋과 맞는다는 뜻임.

편집 원본(`.blend`, 변형 `.glb`)은 `assets/avatars/` 에 있고 런타임은 안 읽음.
`public/` 에 두면 4 MB 가 아무도 안 받는 채로 배포됨.
"""
import bpy
import math
import os
import struct
import sys

from mathutils import Matrix, Quaternion, Vector

# 플레이어 색을 받는 **앞면 한 조각만** 뺌(§6 B안).
#
# 옷 전체를 빼면 주머니·끈·단추까지 단색이 되어 디테일이 사라짐. 아틀라스의 옷
# 색이 어두워(크루 앞치마 #18171a, 밝기 13%) 텍스처를 곱하는 방식으로는 색이 안
# 나와서, 앞면만 텍스처 없는 단색 머티리얼로 그림. 크루·곰은 앞치마 앞판임.
#
# 인자 해석보다 먼저 정의해야 함. 뒤에 두면 색 인자 없이 굽는 크루·곰이
# `NameError` 로 멈췄음.
DEFAULT_ACCENT_NAMES = ("l_apron_front_panel", "r_apron_front_panel")

# `--` 뒤 인자만 받음. 블렌더가 앞쪽 인자를 전부 먹음.
RAW_ARGS = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
# 옵션은 빼고 나머지만 위치 인자로 씀. 눈동자 인자를 비워도 키를 줄 수 있게 함.
OPTIONS = dict(arg[2:].split("=", 1) for arg in RAW_ARGS if arg.startswith("--") and "=" in arg)
FLAGS = {arg[2:] for arg in RAW_ARGS if arg.startswith("--") and "=" not in arg}
ARGS = [arg for arg in RAW_ARGS if not arg.startswith("--")]
OUT = ARGS[0] if ARGS else "public/models"
# 출력 파일과 메시 이름의 접두사. 런타임 상수(`crewModel.ts`)와 같아야 함.
PREFIX = ARGS[1] if len(ARGS) > 1 else "crew"
ACCENT_NAMES = (
    tuple(name.strip().lower() for name in ARGS[2].split(",") if name.strip())
    if len(ARGS) > 2
    else DEFAULT_ACCENT_NAMES
)
# 붉게 발광시킬 눈동자 메시. 비우면 글린트 메시를 안 만듦.
#
# 크루의 글린트는 레이저아이 변형 glb 에서 UV·발광 마스크를 옮겨 만들었음
# (`apply-laser-eyes-to-crew.py`). 변형본이 없는 모델은 눈동자를 떼어 **여기서
# 만든 발광 재질**을 입힘. 아틀라스를 안 고쳐도 눈이 빛남.
PUPIL_NAMES = (
    tuple(name.strip().lower() for name in ARGS[3].split(",") if name.strip())
    if len(ARGS) > 3
    else ()
)
KICK_ONLY = "kick-only" in FLAGS
DEFAULT_HEIGHT = 1.81
# 모델 키(m). 크루·곰·황소는 1.81, 페페는 원본대로 1.6.
HEIGHT = float(OPTIONS.get("height", DEFAULT_HEIGHT))
WALK_ACTION = "Walk"
# 셰이더 텍셀 조회 폭. 런타임 `CREW_WALK.boneCount` 와 같아야 함.
# 본이 적은 모델(페페 20개)은 남는 칸을 항등 행렬로 채움. 아무 정점도 안 씀.
BONE_SLOTS = 22

# 발차기 프레임 수. 런타임 `CREW_KICK.frameCount` 와 같아야 함. 재생 시간은 런타임이 정함.
KICK_FRAMES = 16
# 발차기 키 포즈 시점(0~1)과 각도(도). 다리 회전축은 모델마다 Walk 에서 뽑음.
KICK_WINDUP_AT = 0.32
KICK_STRIKE_AT = 0.58
KICK_THIGH_WINDUP_DEG = -28.0
KICK_THIGH_STRIKE_DEG = 82.0
KICK_KNEE_WINDUP_DEG = 75.0
KICK_KNEE_STRIKE_DEG = 4.0
# 차는 동안 팔을 걷기보다 크게 흔들어 균형 잡는 느낌을 줌.
KICK_ARM_SCALE = 1.6
KICK_ARM_BONES = ("upper_arm.L", "upper_arm.R", "forearm.L", "forearm.R")

# glTF 는 Y-up, Blender 는 Z-up 임. 지오메트리는 익스포터가 바꿔 주지만 본 행렬은
# 직접 같은 변환을 해 줘야 셰이더에서 정점과 맞음.
YUP = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))


# region [Privates]
def mesh_objects():
    """
    리그에 묶인 메시만 캐릭터로 봄.

    `.blend` 에는 200 x 200 m 스튜디오 바닥과 조명·카메라가 같이 들어 있음. 타입만
    보고 고르면 바닥이 아바타마다 딸려 감.
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
    정점마다 따라갈 본 번호를 커스텀 속성에 구움.

    `JOINTS_0` 를 쓰려면 스킨을 남겨야 하는데, 그러면 익스포터가 아마추어
    모디파이어까지 적용해 지오메트리가 현재 포즈로 굳음. 번호를 직접 구워 두면
    스킨 없이도 셰이더가 본을 찾을 수 있음.
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
        # 여분 UV 셋은 아틀라스 하나만 쓰는 모델에 불필요한 용량임.
        while len(obj.data.uv_layers) > 1:
            obj.data.uv_layers.remove(obj.data.uv_layers[-1])
        # 아마추어를 떼야 익스포터가 포즈를 지오메트리에 안 구움.
        obj.modifiers.clear()
        if obj.parent and obj.parent.type == "ARMATURE":
            world = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = world

    if missing:
        print(f"[warn] 본을 못 찾은 정점 {missing}개 — 0번 본으로 둠")


def create_laser_pupil_material(name):
    """
    붉게 발광하는 눈동자 재질.

    텍스처를 안 씀. 아틀라스에 발광 마스크를 그려 넣으려면 원본 이미지를 고쳐야
    하고, 눈동자는 몇 픽셀이라 단색으로 충분함. 런타임은 이 재질을 복사해 걷기
    셰이더만 심음.
    """
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.09, 0.005, 0.005, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.35
    bsdf.inputs["Metallic"].default_value = 0.0

    # 소켓 이름이 Blender 3.x("Emission")와 4.x("Emission Color")에서 다름.
    for socket_name in ("Emission Color", "Emission"):
        if socket_name in bsdf.inputs:
            bsdf.inputs[socket_name].default_value = (1.0, 0.07, 0.04, 1.0)
            break
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = 1.0

    return material


def base_image_name(material):
    """재질이 쓰는 베이스 컬러 이미지 이름. 노드가 없으면 `None`."""
    if not material or not material.node_tree:
        return None

    return next(
        (n.image.name for n in material.node_tree.nodes if n.type == "TEX_IMAGE" and n.image),
        None,
    )


def collapse_materials(obj, name):
    """
    재질 슬롯을 하나로 합침.

    glTF 는 재질마다 primitive 를 쪼개고, three 는 primitive 가 둘 이상인 메시를
    **Mesh 가 아니라 Group** 으로 만듦. 런타임은 `getObjectByName` 으로 Mesh 를 찾아
    인스턴싱하므로 Group 이 오면 지오메트리를 못 꺼냄. (황소의 금색 단추가 이 경우
    였음. 같은 아틀라스를 쓰고 metallic 만 달랐음.)

    **같은 텍스처를 쓸 때만** 합침. 다른 텍스처가 섞여 있으면 색이 통째로 바뀌어서
    베이크를 멈춤. 런타임에서 터지는 것보다 여기서 멈추는 쪽이 나음.
    """
    materials = list(obj.data.materials)

    if len(materials) <= 1:
        return

    images = {base_image_name(material) for material in materials}
    images.discard(None)

    if len(images) > 1:
        raise SystemExit(
            f"[error] {name} 의 재질이 서로 다른 텍스처를 씁니다: {sorted(images)}. "
            "아틀라스 하나로 합친 뒤 다시 구우세요."
        )

    print(f"[info] {name} 재질 {len(materials)}개를 1개로 합친다 (텍스처 {images})")
    for polygon in obj.data.polygons:
        polygon.material_index = 0
    while len(obj.data.materials) > 1:
        obj.data.materials.pop(index=len(obj.data.materials) - 1)


def join_group(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    merged = bpy.context.active_object
    merged.name = name
    # glTF 의 meshes[].name 은 오브젝트가 아니라 메시 데이터 이름을 따름.
    merged.data.name = name
    return merged


def resolve_transform(objs):
    """
    키를 HEIGHT 로 맞추고 발바닥을 z=0 에 두는 변환을 구함.

    정점과 본 행렬에 **같은 변환**을 줘야 함. 따로 맞추면 애니메이션이 모델에서
    어긋남. 회전은 전방을 `-Z` 로 돌리기 위한 것임(원본은 `+Z`).
    """
    rotation = Matrix.Rotation(math.pi, 4, "Z")
    corners = [rotation @ o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    zs = [c.z for c in corners]
    scale = HEIGHT / (max(zs) - min(zs))
    lift = -min(zs) * scale

    return Matrix.Translation((0, 0, lift)) @ Matrix.Diagonal((scale,) * 3).to_4x4() @ rotation


def skinning_rows(armature, bones, transform):
    """지금 포즈의 본 스키닝 행렬을 22칸으로 펴서 돌려줌. 남는 칸은 항등 행렬."""
    to_model = transform @ armature.matrix_world
    padding = Matrix.Identity(4)
    rows = []

    for name in bones:
        rest = armature.data.bones[name].matrix_local
        pose = armature.pose.bones[name].matrix
        # 모델 공간에서의 스키닝 행렬. 좌우 변환으로 감싸 정점과 같은 공간에 둠.
        skin = YUP @ to_model @ (pose @ rest.inverted()) @ to_model.inverted() @ YUP.inverted()
        rows.extend(skin[0][:] + skin[1][:] + skin[2][:])
    for _ in range(BONE_SLOTS - len(bones)):
        rows.extend(padding[0][:] + padding[1][:] + padding[2][:])

    return rows


def use_walk_action(armature):
    action = bpy.data.actions[WALK_ACTION]
    armature.data.pose_position = "POSE"
    armature.animation_data.action = action
    if hasattr(armature.animation_data, "action_slot") and action.slots:
        armature.animation_data.action_slot = action.slots[0]

    return action


def release_pose(armature):
    """
    액션을 떼고 모든 본을 레스트로 돌림.

    지오메트리는 레스트 포즈로 구워야 함. 본에 물린 메시는 `matrix_world` 가 포즈를
    따라가서, 켜 둔 채 합치면 마지막 포즈가 모델에 굳음.
    """
    armature.animation_data.action = None
    for pose_bone in armature.pose.bones:
        pose_bone.location = (0, 0, 0)
        pose_bone.rotation_mode = "QUATERNION"
        pose_bone.rotation_quaternion = Quaternion()
        pose_bone.scale = (1, 1, 1)
    armature.data.pose_position = "REST"
    bpy.context.view_layer.update()


def bake_walk_matrices(armature, transform):
    """
    Walk 한 사이클의 본 스키닝 행렬을 프레임마다 구움.

    정점은 단일 본에 100% 묶여 있어서(리지드 바인딩) 셰이더는 행렬 하나만 곱하면
    됨. 정점 위치를 통째로 굽는 VAT 보다 자료가 훨씬 작음.
    """
    action = use_walk_action(armature)
    start, end = (int(round(v)) for v in action.frame_range)
    # 마지막 프레임은 첫 프레임과 같은 포즈라(루프) 빼야 한 박자 안 쉼.
    frames = list(range(start, end))
    bones = [b.name for b in armature.data.bones]
    if len(bones) > BONE_SLOTS:
        raise SystemExit(f"[error] 본 {len(bones)}개 — 셰이더 폭 {BONE_SLOTS}개를 넘음.")
    rows = []

    for frame in frames:
        bpy.context.scene.frame_set(frame)
        rows.extend(skinning_rows(armature, bones, transform))

    release_pose(armature)

    return frames, bones, rows


def rotation_axis(quaternion, fallback):
    """회전축. 거의 안 돌았으면 축이 불안정해 `fallback` 을 씀."""
    axis, angle = quaternion.to_axis_angle()

    return axis.copy() if angle > math.radians(1.0) else fallback


def sample_walk_extremes(armature):
    """
    Walk 에서 오른발이 가장 앞·뒤로 간 프레임의 본 회전과, 무릎이 가장 굽은 회전.

    본 방향이 모델마다 달라 "다리를 앞으로 드는 축"을 숫자로 정할 수 없음. 걷기에서
    오른 허벅지가 앞으로 간 회전의 축이 곧 그 모델의 앞차기 축임.
    """
    action = use_walk_action(armature)
    start, end = (int(round(v)) for v in action.frame_range)
    foot = armature.pose.bones["foot.R"]
    shin = armature.pose.bones["shin.R"]
    best = {"forward": None, "backward": None, "knee": None}

    for frame in range(start, end):
        bpy.context.scene.frame_set(frame)
        # Blender 정면이 -Y 라 y 가 작을수록 앞임.
        forward = -(armature.matrix_world @ foot.head).y
        knee_angle = shin.matrix_basis.to_quaternion().angle
        rotations = {b.name: b.matrix_basis.to_quaternion() for b in armature.pose.bones}
        if best["forward"] is None or forward > best["forward"][0]:
            best["forward"] = (forward, rotations)
        if best["backward"] is None or forward < best["backward"][0]:
            best["backward"] = (forward, rotations)
        if best["knee"] is None or knee_angle > best["knee"][0]:
            best["knee"] = (knee_angle, rotations)

    release_pose(armature)

    return best["forward"][1], best["backward"][1], best["knee"][1]


def scale_rotation(quaternion, factor):
    axis, angle = quaternion.to_axis_angle()

    return Quaternion(axis, angle * factor)


def build_kick_keys(armature):
    """
    발차기 키 포즈 네 개(레스트 → 당김 → 차기 → 레스트).

    오른다리만 크게 움직이고 팔은 걷기의 같은 시점 자세를 키워 균형을 잡음. 왼다리와
    몸통은 레스트에 둠. 디딤발이 흔들리면 미끄러져 보임.
    """
    forward, backward, knee = sample_walk_extremes(armature)
    lateral = Vector((1, 0, 0))
    thigh_axis = rotation_axis(forward["thigh.R"], lateral)
    knee_axis = rotation_axis(knee["shin.R"], lateral)

    windup = {
        "thigh.R": Quaternion(thigh_axis, math.radians(KICK_THIGH_WINDUP_DEG)),
        "shin.R": Quaternion(knee_axis, math.radians(KICK_KNEE_WINDUP_DEG)),
    }
    strike = {
        "thigh.R": Quaternion(thigh_axis, math.radians(KICK_THIGH_STRIKE_DEG)),
        "shin.R": Quaternion(knee_axis, math.radians(KICK_KNEE_STRIKE_DEG)),
    }
    for name in KICK_ARM_BONES:
        if name in backward:
            windup[name] = backward[name].copy()
            strike[name] = scale_rotation(forward[name], KICK_ARM_SCALE)

    return ((0.0, {}), (KICK_WINDUP_AT, windup), (KICK_STRIKE_AT, strike), (1.0, {}))


def smoothstep(t):
    return t * t * (3 - 2 * t)


def resolve_kick_pose(keys, t):
    """`t`(0~1) 시점의 본 회전. 키 사이를 부드럽게 구면 보간함."""
    for (t0, pose0), (t1, pose1) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            local = smoothstep((t - t0) / (t1 - t0))
            names = set(pose0) | set(pose1)
            return {
                name: pose0.get(name, Quaternion()).slerp(pose1.get(name, Quaternion()), local)
                for name in names
            }

    return {}


def bake_kick_matrices(armature, transform):
    """발차기 `KICK_FRAMES` 프레임의 본 스키닝 행렬을 구움. 첫·끝 프레임은 레스트."""
    keys = build_kick_keys(armature)
    bones = [b.name for b in armature.data.bones]
    rows = []

    armature.data.pose_position = "POSE"
    for frame in range(KICK_FRAMES):
        pose = resolve_kick_pose(keys, frame / (KICK_FRAMES - 1))
        for pose_bone in armature.pose.bones:
            pose_bone.location = (0, 0, 0)
            pose_bone.rotation_mode = "QUATERNION"
            pose_bone.rotation_quaternion = pose.get(pose_bone.name, Quaternion())
            pose_bone.scale = (1, 1, 1)
        bpy.context.view_layer.update()
        rows.extend(skinning_rows(armature, bones, transform))

    release_pose(armature)

    return rows


def write_rows(path, rows):
    with open(path, "wb") as handle:
        handle.write(struct.pack(f"<{len(rows)}f", *rows))


def compare_with_existing_walk(path, rows):
    """다시 계산한 Walk 와 기존 `.bin` 의 최대 차이. 없으면 `None`."""
    if not os.path.exists(path):
        return None

    with open(path, "rb") as handle:
        data = handle.read()
    existing = struct.unpack(f"<{len(data) // 4}f", data)

    if len(existing) != len(rows):
        return float("inf")

    return max(abs(a - b) for a, b in zip(existing, rows))
# endregion


bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object else None
armature = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
armature.data.pose_position = "REST"
bpy.context.view_layer.update()
print(f"[info] 가공 전 메시 {len(mesh_objects())}개, 본 {len(armature.data.bones)}개")

transform = resolve_transform(mesh_objects())
kick_path = os.path.join(OUT, f"{PREFIX}-kick.bin")
walk_path = os.path.join(OUT, f"{PREFIX}-walk.bin")

if KICK_ONLY:
    frames, bones, walk_rows = bake_walk_matrices(armature, transform)
    walk_gap = compare_with_existing_walk(walk_path, walk_rows)
    kick_rows = bake_kick_matrices(armature, transform)
    write_rows(kick_path, kick_rows)
    print(f"[check] 기존 {PREFIX}-walk.bin 과 최대 차이 = {walk_gap}")
    print(f"[export] {PREFIX}-kick.bin {os.path.getsize(kick_path)/1024:.0f} KB | "
          f"프레임={KICK_FRAMES} 본={len(bones)}(+{BONE_SLOTS - len(bones)} 패딩)")
    sys.exit(0)

accent = [o for o in mesh_objects() if o.name.lower() in ACCENT_NAMES]
pupil = [o for o in mesh_objects() if o.name.lower() in PUPIL_NAMES]
body = [o for o in mesh_objects() if o not in accent and o not in pupil]
if PUPIL_NAMES and not pupil:
    raise SystemExit(f"[error] 눈동자 메시 {PUPIL_NAMES} 를 찾지 못했습니다.")
if not accent:
    raise SystemExit(
        f"[error] 색을 받을 메시 {ACCENT_NAMES} 를 찾지 못했습니다. 노드 이름을 확인하세요."
    )
print(f"[info] 앞판 {len(accent)}개 / 눈동자 {len(pupil)}개 / 몸통 {len(body)}개")

frames, bones, matrix_rows = bake_walk_matrices(armature, transform)
kick_rows = bake_kick_matrices(armature, transform)

bake_bone_index(mesh_objects(), bones)
body_obj = join_group(body, f"{PREFIX}_body")
accent_obj = join_group(accent, f"{PREFIX}_accent")
pupil_obj = join_group(pupil, f"{PREFIX}_pupil_glint") if pupil else None
if pupil_obj:
    pupil_obj.data.materials.clear()
    pupil_obj.data.materials.append(create_laser_pupil_material(f"{PREFIX}_laser_pupil"))
exported = [body_obj, accent_obj] + ([pupil_obj] if pupil_obj else [])
for obj in exported:
    collapse_materials(obj, obj.name)
    while len(obj.data.uv_layers) > 1:
        obj.data.uv_layers.remove(obj.data.uv_layers[-1])
    # mesh.transform 은 정점과 법선을 같이 돌림. transform_apply 오퍼레이터는
    # 백그라운드 실행에서 선택 상태를 타서 안 씀.
    obj.data.transform(transform @ obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)

bpy.ops.object.select_all(action="DESELECT")
for obj in exported:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body_obj
glb_path = os.path.join(OUT, f"{PREFIX}.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_path, export_format="GLB", use_selection=True, export_apply=True,
    export_yup=True, export_normals=True, export_texcoords=True,
    # 본 번호는 `_BONEINDEX` 커스텀 속성으로 따로 구웠음. 스킨을 남기면 익스포터가
    # 아마추어 모디파이어를 적용해 포즈가 지오메트리에 굳음.
    export_skins=False, export_animations=False, export_attributes=True)

write_rows(walk_path, matrix_rows)
write_rows(kick_path, kick_rows)

tri = sum(len(p.vertices) - 2 for o in exported for p in o.data.polygons)
# 머리 띠는 1.81 m 기준으로 잡은 값이라 키에 맞춰 늘이고 줄임.
head_scale = HEIGHT / DEFAULT_HEIGHT
head = [v.co.z for v in body_obj.data.vertices if 1.40 * head_scale < v.co.z < 1.56 * head_scale]
print(f"[export] {PREFIX}.glb {os.path.getsize(glb_path)/1024:.0f} KB | 삼각형={tri} | 50명={tri*50:,}")
print(f"[export] {PREFIX}-walk.bin {os.path.getsize(walk_path)/1024:.0f} KB | "
      f"프레임={len(frames)} 본={len(bones)}(+{BONE_SLOTS - len(bones)} 패딩)")
print(f"[export] {PREFIX}-kick.bin {os.path.getsize(kick_path)/1024:.0f} KB | 프레임={KICK_FRAMES}")
print(f"[anchor] headCenterY={sum(head)/len(head):.4f}")
