"""
세일러 `.blend` 의 단일 메시를 가공 스크립트가 받을 수 있게 부위별로 쪼갬.

`build_saylor_v2.py` 가 만든 원본은 몸 전체가 메시 하나(`Saylor`)임. 그런데
`process-voxel-character.py` 는 플레이어 색을 받을 앞판과 발광시킬 눈동자를
**오브젝트 이름**으로 골라내므로, 메시가 하나면 색을 받을 메시를 못 찾아 멈춤.

재질도 하나(`Saylor_Pixel_PBR`)라 재질로는 가를 수 없음. 대신 모든 면이
4 x 4 픽셀 아틀라스의 어느 타일을 보는지로 부위를 알 수 있어, 면의 평균 UV 가
속한 타일로 가름.

출력은 `<입력>-split.blend` 이고 원본은 건드리지 않음. 가공 스크립트는 이
결과를 입력으로 받음.

실행
  blender --background assets/avatars/saylor_v2/saylor_v2.blend \
      --python scripts/blender/split-saylor-parts.py
"""
import bmesh
import bpy
import os

# `build_saylor_v2.py` 의 타일 순서. 인덱스를 4 로 나눠 (행, 열) 이 되고,
# 행은 위에서부터임(`tile_rect`). 순서가 어긋나면 엉뚱한 부위가 갈림.
TILES = (
    "suit", "suit_d", "pants", "shirt",
    "beard", "tie", "tie_d", "skin",
    "skin_d", "hair", "stache", "eye",
    "eye_w", "shoe", "sole", "lip",
)
GRID = 4

SOURCE_MESH = "Saylor"
UV_LAYER = "PixelUV"

# 쪼갤 부위. (새 오브젝트 이름, 가져갈 타일)
#
# 셔츠는 흰색(#f1efe9)이라 플레이어 색이 가장 잘 올라옴. 눈동자는 레이저아이용
# 발광 메시로 떼어 냄. 가공 스크립트가 여기에 단색 발광 재질을 입힘.
SPLIT_PARTS = (
    ("saylor_shirt_front", ("shirt",)),
    ("saylor_eye_pixel", ("eye",)),
)


def resolve_tile_name(mean_u, mean_v):
    """면의 평균 UV 가 보는 아틀라스 타일 이름."""
    column = min(GRID - 1, int(mean_u * GRID))
    row = min(GRID - 1, int((1 - mean_v) * GRID))

    return TILES[row * GRID + column]


def select_faces_by_tiles(obj, tile_names):
    """해당 타일을 보는 면만 선택하고 선택된 면 수를 돌려줌."""
    bpy.ops.object.mode_set(mode="EDIT")
    mesh = bmesh.from_edit_mesh(obj.data)
    uv_layer = mesh.loops.layers.uv[UV_LAYER]
    selected = 0

    for face in mesh.faces:
        face.select = False

    for face in mesh.faces:
        loops = face.loops
        mean_u = sum(loop[uv_layer].uv[0] for loop in loops) / len(loops)
        mean_v = sum(loop[uv_layer].uv[1] for loop in loops) / len(loops)

        if resolve_tile_name(mean_u, mean_v) in tile_names:
            face.select = True
            selected += 1

    bmesh.update_edit_mesh(obj.data)

    return selected


def split_part(source, part_name, tile_names):
    """선택한 면을 새 오브젝트로 떼어 냄. 버텍스 그룹과 리그 부모는 따라감."""
    bpy.ops.object.select_all(action="DESELECT")
    source.select_set(True)
    bpy.context.view_layer.objects.active = source

    selected = select_faces_by_tiles(source, tile_names)

    if not selected:
        raise SystemExit(f"[error] 타일 {tile_names} 을 보는 면이 없습니다.")

    before = set(bpy.data.objects)
    bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")

    created = (set(bpy.data.objects) - before).pop()
    created.name = created.data.name = part_name
    print(f"[split] {part_name} ← 타일 {tile_names} / 면 {selected}개")

    return created


source_obj = bpy.data.objects[SOURCE_MESH]
# 바닥은 리그에 묶여 있지 않아 가공 스크립트가 알아서 걸러냄. 여기서는 안 건드림.
for part_name, tile_names in SPLIT_PARTS:
    split_part(source_obj, part_name, tile_names)

source_obj.name = source_obj.data.name = "saylor_body_part"
print(f"[split] 몸통 남은 면 {len(source_obj.data.polygons)}개")

source_path = bpy.data.filepath
output_path = f"{os.path.splitext(source_path)[0]}-split.blend"
bpy.ops.wm.save_as_mainfile(filepath=output_path)
print(f"[split] 저장 {output_path}")
