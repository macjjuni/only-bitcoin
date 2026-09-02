"""
우주선 스프라이트 아틀라스 패커.

`bake-ship-sprites.py` 가 구운 정사각 PNG 를 내용 영역만 잘라 한 장으로 묶고, 캔버스가
쓸 프레임 좌표표를 TS 모듈로 뽑는다.

베이커는 기체마다 정사각 프레임에 담아 내보내므로 가로로 긴 모함은 위아래가 거의 다
투명이다. 그대로 두면 전송량과 디코딩 메모리를 그만큼 버리게 되어 여기서 잘라낸다.

필요: Pillow (`pip install pillow`). 배포 빌드가 아니라 에셋 갱신할 때만 도는 단계다.

사용:
    python scripts/pack-ship-atlas.py
"""

import json
import os

from PIL import Image

# region [Config]

REPOSITORY_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITE_SOURCE_DIRECTORY = os.path.join(REPOSITORY_ROOT, "assets", "rendered", "ships")
ATLAS_OUTPUT_PATH = os.path.join(REPOSITORY_ROOT, "public", "images", "war", "ship-atlas.webp")
FRAME_TABLE_OUTPUT_PATH = os.path.join(
    REPOSITORY_ROOT, "src", "views", "war", "model", "shipAtlasFrames.ts"
)

# 베이커와 같은 순서로 둔다. 등급이 곧 아틀라스 행이다.
SHIP_NAME_BY_MAGNITUDE = {
    "small": "Omen",
    "medium": "Challenger",
    "large": "Insurgent",
    "huge": "Imperial",
}

SIDES = ["buy", "sell"]

# 프레임 사이 여백. 캔버스가 확대해 그릴 때 옆 칸 픽셀이 새어 들어오는 것을 막는다.
FRAME_PADDING_IN_PX = 2

# WebP 손실 압축 품질.
#
# 스프라이트가 화면에서 8~44px 로 줄어 그려지므로 무손실(223KB)까지 갈 이유가 없다.
# q=92 는 72KB 로 3분의 1이면서 축소된 크기에서는 차이를 분간할 수 없다.
WEBP_QUALITY = 92

# endregion


# region [Privates]


def load_cropped_sprite(magnitude, side):
    """투명 여백을 잘라낸 스프라이트를 읽는다."""
    ship_name = SHIP_NAME_BY_MAGNITUDE[magnitude]
    sprite_path = os.path.join(SPRITE_SOURCE_DIRECTORY, f"{ship_name.lower()}_{side}.png")

    if not os.path.exists(sprite_path):
        raise FileNotFoundError(f"스프라이트 없음: {sprite_path}. 먼저 bake-ship-sprites.py 실행")

    sprite_image = Image.open(sprite_path).convert("RGBA")
    content_box = sprite_image.getbbox()

    if content_box is None:
        raise ValueError(f"내용이 비어 있음: {sprite_path}")

    return sprite_image.crop(content_box)


def build_frame_layout(sprite_by_key):
    """등급을 행, 진영을 열로 놓고 프레임 좌표를 정한다."""
    magnitudes = list(SHIP_NAME_BY_MAGNITUDE.keys())

    column_widths = [
        max(sprite_by_key[(magnitude, side)].width for magnitude in magnitudes) for side in SIDES
    ]
    row_heights = [
        max(sprite_by_key[(magnitude, side)].height for side in SIDES) for magnitude in magnitudes
    ]

    frames = {}
    top_in_px = FRAME_PADDING_IN_PX

    for row_index, magnitude in enumerate(magnitudes):
        left_in_px = FRAME_PADDING_IN_PX

        for column_index, side in enumerate(SIDES):
            sprite_image = sprite_by_key[(magnitude, side)]

            # 칸 안에서 가운데로 맞춘다. 그려질 때 기준점이 기체 중심이어야 흔들림이 없다.
            offset_x = (column_widths[column_index] - sprite_image.width) // 2
            offset_y = (row_heights[row_index] - sprite_image.height) // 2

            frames[f"{magnitude}_{side}"] = {
                "x": left_in_px + offset_x,
                "y": top_in_px + offset_y,
                "width": sprite_image.width,
                "height": sprite_image.height,
            }

            left_in_px += column_widths[column_index] + FRAME_PADDING_IN_PX

        top_in_px += row_heights[row_index] + FRAME_PADDING_IN_PX

    atlas_width = sum(column_widths) + FRAME_PADDING_IN_PX * (len(SIDES) + 1)
    atlas_height = sum(row_heights) + FRAME_PADDING_IN_PX * (len(magnitudes) + 1)

    return frames, atlas_width, atlas_height


def render_frame_table_module(frames, atlas_width, atlas_height):
    """캔버스가 읽을 프레임 좌표표를 TS 모듈로 만든다."""
    frame_entries = "\n".join(
        f"  {key}: {{ xInPx: {frame['x']}, yInPx: {frame['y']}, "
        f"widthInPx: {frame['width']}, heightInPx: {frame['height']} }},"
        for key, frame in frames.items()
    )

    return f"""/**
 * 우주선 아틀라스 프레임 좌표표.
 *
 * `scripts/pack-ship-atlas.py` 가 생성한다. 직접 고치지 말 것.
 */

import type {{ TradeMagnitude, TradeSide }} from "@/entities/order-flow";

export const SHIP_ATLAS_IMAGE_PATH = "/images/war/ship-atlas.webp";

export const SHIP_ATLAS_WIDTH_IN_PX = {atlas_width};
export const SHIP_ATLAS_HEIGHT_IN_PX = {atlas_height};

/** 아틀라스 안에서 스프라이트 한 장이 차지하는 사각형. */
export interface ShipAtlasFrame {{
  xInPx: number;
  yInPx: number;
  widthInPx: number;
  heightInPx: number;
}}

export type ShipAtlasFrameKey = `${{TradeMagnitude}}_${{TradeSide}}`;

export const SHIP_ATLAS_FRAMES: Record<ShipAtlasFrameKey, ShipAtlasFrame> = {{
{frame_entries}
}};
"""


# endregion


# region [Transactions]


def main():
    sprite_by_key = {
        (magnitude, side): load_cropped_sprite(magnitude, side)
        for magnitude in SHIP_NAME_BY_MAGNITUDE
        for side in SIDES
    }

    frames, atlas_width, atlas_height = build_frame_layout(sprite_by_key)

    atlas_image = Image.new("RGBA", (atlas_width, atlas_height), (0, 0, 0, 0))

    for magnitude in SHIP_NAME_BY_MAGNITUDE:
        for side in SIDES:
            frame = frames[f"{magnitude}_{side}"]
            atlas_image.paste(sprite_by_key[(magnitude, side)], (frame["x"], frame["y"]))

    os.makedirs(os.path.dirname(ATLAS_OUTPUT_PATH), exist_ok=True)
    atlas_image.save(ATLAS_OUTPUT_PATH, "WEBP", quality=WEBP_QUALITY, method=6)

    with open(FRAME_TABLE_OUTPUT_PATH, "w", encoding="utf-8") as frame_table_file:
        frame_table_file.write(render_frame_table_module(frames, atlas_width, atlas_height))

    atlas_size_in_kb = os.path.getsize(ATLAS_OUTPUT_PATH) / 1024

    print(f"아틀라스: {ATLAS_OUTPUT_PATH} ({atlas_width}x{atlas_height}, {atlas_size_in_kb:.1f}KB)")
    print(f"좌표표:   {FRAME_TABLE_OUTPUT_PATH}")
    print(json.dumps(frames, indent=2))


# endregion


if __name__ == "__main__":
    main()
