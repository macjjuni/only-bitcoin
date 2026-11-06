"""
머슼크 재킷 등판에 빨간 테슬라 로고를 그려 넣음.

삼각형을 늘리지 않으려고 메시를 붙이지 않고 아틀라스에 픽셀로 그림. 등판 면이
쓰던 아틀라스 영역은 옆판·앞판 안쪽 면도 겹쳐 쓰고 있어 그 자리에 그리면 다른
면에도 찍힘. 그래서 빈 칸에 등판 천을 복사해 로고를 그리고 **등판 바깥 면 하나만**
그 칸을 가리키게 UV 를 옮김.

실행 — 원본을 고쳐 저장한 뒤 평소처럼 굽는다
  blender --background assets/avatars/voxel-elon.blend \
      --python scripts/blender/apply-tesla-logo-to-elon.py
  blender --background assets/avatars/voxel-elon.blend \
      --python scripts/blender/process-voxel-character.py -- public/models elon \
      Plain_black_Tshirt_core,Tshirt_crewneck --height=1.8

두 번 돌려도 한 번만 그림(오브젝트 커스텀 속성으로 표시).
"""
import bpy

BACK_OBJECT = "Bomber_broad_back"
APPLIED_FLAG = "tesla_logo_applied"
# 등판 바깥 면(+Y)이 쓰던 영역. 60 x 64 px.
SOURCE_ORIGIN = (552, 8)
REGION_SIZE = (60, 64)
# 아틀라스에서 아무 면도 안 쓰는 칸. `find_free` 로 확인한 자리.
TARGET_ORIGIN = (260, 4)
# 테슬라 레드 #E31937 (sRGB). 8비트 아틀라스라 pixels 도 sRGB 값 그대로임.
LOGO_COLOR = (0.890, 0.098, 0.216, 1.0)
CELL_PX = 2
# 위에서 아래로. 위쪽 호, 휜 가로대, 세로 기둥. 좌우 대칭이라 뒤에서 봐도 안 뒤집힘.
LOGO_ROWS = (
    "..############..",
    ".#............#.",
    "................",
    ".##############.",
    ".###...##...###.",
    ".#.....##.....#.",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
)
# 등판 위쪽 가운데. 면 아래에서 로고 윗변까지 px(면 높이 64 px = 0.49 m).
LOGO_TOP_PX = 54


# region [Privates]
def find_atlas():
    return next(image for image in bpy.data.images if "Atlas" in image.name)


def find_back_face(obj):
    """등판 바깥 면. Blender 정면이 -Y 라 등은 +Y 쪽."""
    rotation = obj.matrix_world.to_3x3()

    return next(p for p in obj.data.polygons if (rotation @ p.normal).y > 0.9)


def copy_region(pixels, width, source, target, size):
    """등판 천 무늬를 빈 칸으로 그대로 옮김. 로고 바깥은 원래 천과 같아야 함."""
    for row in range(size[1]):
        for col in range(size[0]):
            src = ((source[1] + row) * width + source[0] + col) * 4
            dst = ((target[1] + row) * width + target[0] + col) * 4
            pixels[dst : dst + 4] = pixels[src : src + 4]


def paint_logo(pixels, width, origin, size):
    """
    로고를 가운데 맞춰 칠함.

    이미지 픽셀은 아래 행부터라 UV v 와 방향이 같음. 등판 UV 도 v 가 클수록 위라
    맨 윗줄을 큰 y 에 두면 똑바로 섬.
    """
    logo_width = len(LOGO_ROWS[0]) * CELL_PX
    left = origin[0] + (size[0] - logo_width) // 2
    top = origin[1] + LOGO_TOP_PX

    for row_index, row in enumerate(LOGO_ROWS):
        for col_index, cell in enumerate(row):
            if cell != "#":
                continue
            for dy in range(CELL_PX):
                for dx in range(CELL_PX):
                    x = left + col_index * CELL_PX + dx
                    y = top - row_index * CELL_PX - dy
                    index = (y * width + x) * 4
                    pixels[index : index + 4] = LOGO_COLOR


def move_face_uv(obj, face, width, height):
    """등판 면 UV 만 새 칸으로 평행 이동. 방향은 그대로 둠."""
    du = (TARGET_ORIGIN[0] - SOURCE_ORIGIN[0]) / width
    dv = (TARGET_ORIGIN[1] - SOURCE_ORIGIN[1]) / height
    uv = obj.data.uv_layers.active.data

    for loop_index in face.loop_indices:
        uv[loop_index].uv.x += du
        uv[loop_index].uv.y += dv
# endregion


back = bpy.data.objects[BACK_OBJECT]

if back.get(APPLIED_FLAG):
    print("[info] 테슬라 로고가 이미 들어가 있음. 건너뜀.")
else:
    atlas = find_atlas()
    width, height = atlas.size
    pixels = list(atlas.pixels)

    copy_region(pixels, width, SOURCE_ORIGIN, TARGET_ORIGIN, REGION_SIZE)
    paint_logo(pixels, width, TARGET_ORIGIN, REGION_SIZE)
    atlas.pixels[:] = pixels
    atlas.update()
    # 굽는 쪽이 패킹된 원본을 읽으므로 고친 픽셀로 다시 패킹해야 반영됨.
    atlas.pack()

    move_face_uv(back, find_back_face(back), width, height)
    back[APPLIED_FLAG] = True
    bpy.ops.wm.save_mainfile()
    print(f"[export] 테슬라 로고 → {atlas.name} ({TARGET_ORIGIN[0]}, {TARGET_ORIGIN[1]}) 저장 완료")
