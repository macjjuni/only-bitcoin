"""
우주선 스프라이트 베이커.

`assets/spaceships/` 의 Quaternius 팩(.blend)을 열어 전장 캔버스가 쓸 2D 스프라이트로
굽는다. 런타임 틴트를 쓰지 않고 진영별 텍스처 변형(Green/Red)을 그대로 렌더한다.

카메라는 정사영 탑다운이다. 유닛이 화면에서 좌우로만 움직이므로 위에서 내려다본
실루엣이 가장 넓게 잡히고, small 유닛이 8px 로 줄어도 형태가 남는다. 원근을 쓰면
크기마다 왜곡이 달라져 등급 비교가 흐려지므로 쓰지 않는다.

기수 방향은 기체를 Z축으로 돌려서 만든다. 카메라와 조명은 고정이라 두 진영의 광원
방향이 화면 기준으로 같게 유지된다. 좌우 반전이 아니므로 문양도 뒤집히지 않는다.

사용:
    blender --background --python scripts/bake-ship-sprites.py -- [옵션]

옵션:
    --ships all             기체 11종 전부 렌더. 실루엣 보고 4종 고를 때 씀
    --ships Dispatcher,Omen 지정한 기체만 렌더
    --sides buy,sell        진영. 생략하면 둘 다
    --size 256              출력 한 변(px)
    --samples 64            Cycles 샘플 수
    --tilt 15               탑다운에서 기울인 각도(도). 0 이면 완전 수직
    --yaw 90                모델 기수 보정각(도). MODEL_FORWARD_YAW_IN_DEGREES 를 덮어씀
    --out <경로>            출력 폴더. 생략하면 assets/rendered/ships/

예:
    blender --background --python scripts/bake-ship-sprites.py -- --ships all --size 192
"""

import math
import os
import sys

import bpy
from mathutils import Vector

# region [Config]

REPOSITORY_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPACESHIP_PACK_DIRECTORY = os.path.join(REPOSITORY_ROOT, "assets", "spaceships")
DEFAULT_OUTPUT_DIRECTORY = os.path.join(REPOSITORY_ROOT, "assets", "rendered", "ships")

# 체결 규모별로 쓸 기체.
#
# 8px 까지 줄었을 때 남는 건 외곽선뿐이라 실루엣 계열이 겹치지 않는 쪽으로 골랐다.
# 화살촉(omen) -> 날개 달린 전투기(challenger) -> 돔 얹은 순양함(insurgent) ->
# 가로로 긴 모함(imperial) 순으로 등급이 올라간다.
SHIP_NAME_BY_MAGNITUDE = {
    "small": "Omen",
    "medium": "Challenger",
    "large": "Insurgent",
    "huge": "Imperial",
}

# 진영별 텍스처 변형. 팩에 Blue/Green/Orange/Purple/Red 다섯 벌이 들어 있다.
TEXTURE_VARIANT_BY_SIDE = {"buy": "Green", "sell": "Red"}

# 진영별 기수 방향(도). 매수는 화면 오른쪽, 매도는 왼쪽으로 나아간다.
NOSE_YAW_IN_DEGREES_BY_SIDE = {"buy": 0.0, "sell": 180.0}

# 팩 전 기체가 기수를 Blender -Y 로 두고 있다. 화면 오른쪽(+X)으로 돌리는 보정값.
# 축은 바운딩 박스로 확인했고(X 는 양끝 단면이 완전 대칭인 날개폭축), 방향은 측면
# 렌더로 확인했다. `--tilt 90` 으로 옆모습을 뽑으면 캐노피와 엔진 노즐이 바로 보인다.
MODEL_FORWARD_YAW_IN_DEGREES = 90.0

# 프레임 여백 비율. 1.0 이면 기체가 화면에 꽉 차서 안티에일리어싱이 잘린다.
FRAMING_MARGIN_RATIO = 1.08

# 정사영이라 거리는 크기에 영향이 없다. 클리핑만 피하면 되는 값.
CAMERA_DISTANCE = 100.0

# endregion


# region [Privates]


def parse_arguments(argument_list):
    """`--` 뒤 인자만 옵션으로 읽는다. 앞쪽은 blender 자신의 인자다."""
    options = {
        "ships": None,
        "sides": ["buy", "sell"],
        "size": 256,
        "samples": 64,
        "tilt": 15.0,
        "yaw": MODEL_FORWARD_YAW_IN_DEGREES,
        "out": DEFAULT_OUTPUT_DIRECTORY,
    }

    index = 0
    while index < len(argument_list):
        key = argument_list[index].lstrip("-")
        if key not in options or index + 1 >= len(argument_list):
            index += 1
            continue

        value = argument_list[index + 1]
        if key in ("size", "samples"):
            options[key] = int(value)
        elif key in ("tilt", "yaw"):
            options[key] = float(value)
        elif key in ("ships", "sides"):
            options[key] = [item.strip() for item in value.split(",") if item.strip()]
        else:
            options[key] = value
        index += 2

    return options


def resolve_ship_names(requested_ships):
    """렌더 대상 기체 목록을 정한다. 미지정이면 등급 매핑에 걸린 기체만 굽는다."""
    available_ships = sorted(
        entry
        for entry in os.listdir(SPACESHIP_PACK_DIRECTORY)
        if os.path.isdir(os.path.join(SPACESHIP_PACK_DIRECTORY, entry))
    )

    if requested_ships is None:
        return [name for name in SHIP_NAME_BY_MAGNITUDE.values() if name in available_ships]

    if len(requested_ships) == 1 and requested_ships[0].lower() == "all":
        return available_ships

    return [name for name in requested_ships if name in available_ships]


def clear_cameras_and_lights():
    """팩에 딸린 카메라·조명을 지운다. 기체마다 달라서 그대로 두면 렌더가 안 맞는다."""
    for scene_object in list(bpy.data.objects):
        if scene_object.type in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(scene_object, do_unlink=True)


def get_mesh_objects():
    return [scene_object for scene_object in bpy.data.objects if scene_object.type == "MESH"]


def apply_texture_variant(ship_name, variant_name):
    """머티리얼의 이미지 텍스처를 진영 색 변형으로 갈아끼운다."""
    texture_path = os.path.join(
        SPACESHIP_PACK_DIRECTORY, ship_name, "Textures", f"{ship_name}_{variant_name}.png"
    )

    if not os.path.exists(texture_path):
        raise FileNotFoundError(f"텍스처 없음: {texture_path}")

    variant_image = bpy.data.images.load(texture_path, check_existing=True)
    swapped_node_count = 0

    for material in bpy.data.materials:
        if material.node_tree is None:
            continue
        for node in material.node_tree.nodes:
            if node.type == "TEX_IMAGE":
                node.image = variant_image
                swapped_node_count += 1

    if swapped_node_count == 0:
        raise RuntimeError(f"{ship_name}: 이미지 텍스처 노드를 못 찾음")


def orient_ship(side, forward_yaw_in_degrees):
    """기체를 화면 진행 방향으로 돌린다. 카메라가 아니라 기체를 돌려야 광원이 고정된다."""
    yaw_in_radians = math.radians(forward_yaw_in_degrees + NOSE_YAW_IN_DEGREES_BY_SIDE[side])

    for scene_object in bpy.data.objects:
        if scene_object.parent is not None:
            continue
        scene_object.rotation_mode = "XYZ"
        scene_object.rotation_euler.z += yaw_in_radians

    bpy.context.view_layer.update()


def get_world_bounding_box():
    """전 메시의 월드 공간 바운딩 박스 꼭짓점. 모델 원점이 중심에 없어서 직접 구한다."""
    corner_points = [
        scene_object.matrix_world @ Vector(corner)
        for scene_object in get_mesh_objects()
        for corner in scene_object.bound_box
    ]

    if not corner_points:
        raise RuntimeError("메시가 없음")

    return corner_points


def build_camera(tilt_in_degrees):
    """바운딩 박스에 딱 맞춘 정사영 탑다운 카메라를 만든다."""
    tilt_in_radians = math.radians(tilt_in_degrees)
    corner_points = get_world_bounding_box()

    center = sum(corner_points, Vector((0.0, 0.0, 0.0))) / len(corner_points)

    # 카메라 로컬 -Z 가 시선이다. X축으로만 기울여서 화면 가로축이 월드 X 로 유지된다.
    view_direction = Vector((0.0, math.sin(tilt_in_radians), -math.cos(tilt_in_radians)))

    camera_data = bpy.data.cameras.new("BakeCamera")
    camera_data.type = "ORTHO"
    camera_data.clip_start = 0.1
    camera_data.clip_end = CAMERA_DISTANCE * 4

    camera_object = bpy.data.objects.new("BakeCamera", camera_data)
    camera_object.rotation_euler = (tilt_in_radians, 0.0, 0.0)
    camera_object.location = center - view_direction * CAMERA_DISTANCE

    bpy.context.scene.collection.objects.link(camera_object)
    bpy.context.scene.camera = camera_object
    bpy.context.view_layer.update()

    # 정사영은 거리와 무관하므로 카메라 공간 좌표만으로 배율을 정할 수 있다.
    world_to_camera = camera_object.matrix_world.inverted()
    projected_points = [world_to_camera @ point for point in corner_points]
    half_width = max(abs(point.x) for point in projected_points)
    half_height = max(abs(point.y) for point in projected_points)

    camera_data.ortho_scale = max(half_width, half_height) * 2 * FRAMING_MARGIN_RATIO


def build_lighting():
    """
    키·필·림 3점 조명.

    화면 위쪽에서 키를 넣고 반대편을 약한 필로 들어올린다. 우주 배경이라 주변광이
    거의 없어서 필이 없으면 그늘이 완전히 검게 죽는다.
    """
    light_rig = [
        ("Key", "SUN", 6.0, (math.radians(38.0), 0.0, math.radians(150.0))),
        ("Fill", "SUN", 2.0, (math.radians(62.0), 0.0, math.radians(-40.0))),
        ("Rim", "SUN", 3.5, (math.radians(115.0), 0.0, math.radians(20.0))),
    ]

    for light_name, light_type, light_energy, light_rotation in light_rig:
        light_data = bpy.data.lights.new(light_name, type=light_type)
        light_data.energy = light_energy
        light_data.angle = math.radians(6.0)

        light_object = bpy.data.objects.new(light_name, light_data)
        light_object.rotation_euler = light_rotation
        bpy.context.scene.collection.objects.link(light_object)

    # 월드는 은은한 청색 환경광만 담당한다. film_transparent 라 배경으로는 안 찍힌다.
    world = bpy.data.worlds.new("BakeWorld")
    world.use_nodes = True
    background_node = world.node_tree.nodes["Background"]
    background_node.inputs[0].default_value = (0.18, 0.22, 0.34, 1.0)
    background_node.inputs[1].default_value = 0.45
    bpy.context.scene.world = world


def configure_render(size_in_px, sample_count):
    """
    투명 배경 PNG 로 뽑는다.

    EEVEE 는 headless 에서 GPU 가 없으면 실패하는 경우가 있어 Cycles CPU 로 간다.
    256px 짜리 몇 장이라 샘플을 올려도 오래 안 걸린다.
    """
    scene = bpy.context.scene

    scene.render.engine = "CYCLES"
    scene.cycles.samples = sample_count
    scene.cycles.use_denoising = True
    scene.cycles.film_transparent_glass = True

    scene.render.film_transparent = True
    scene.render.resolution_x = size_in_px
    scene.render.resolution_y = size_in_px
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 100

    scene.view_settings.view_transform = "Standard"


def bake_one_sprite(ship_name, side, options):
    """기체 한 대를 진영 하나로 렌더한다. .blend 를 매번 새로 열어 상태가 안 섞이게 한다."""
    blend_path = os.path.join(SPACESHIP_PACK_DIRECTORY, ship_name, "Blend", f"{ship_name}.blend")

    if not os.path.exists(blend_path):
        print(f"  건너뜀: {blend_path} 없음")
        return

    bpy.ops.wm.open_mainfile(filepath=blend_path)

    clear_cameras_and_lights()
    apply_texture_variant(ship_name, TEXTURE_VARIANT_BY_SIDE[side])
    orient_ship(side, options["yaw"])
    build_camera(options["tilt"])
    build_lighting()
    configure_render(options["size"], options["samples"])

    output_path = os.path.join(options["out"], f"{ship_name.lower()}_{side}.png")
    bpy.context.scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)

    print(f"  구움: {output_path}")


# endregion


# region [Transactions]


def main():
    raw_arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    options = parse_arguments(raw_arguments)

    if not os.path.isdir(SPACESHIP_PACK_DIRECTORY):
        raise SystemExit(f"에셋 팩 없음: {SPACESHIP_PACK_DIRECTORY}")

    # Blender 는 상대 렌더 경로를 열려 있는 .blend 기준으로 풀어버린다. 여기서 절대경로로 못박는다.
    options["out"] = os.path.abspath(options["out"])

    ship_names = resolve_ship_names(options["ships"])

    if not ship_names:
        raise SystemExit("렌더할 기체가 없음. --ships 값을 확인할 것")

    os.makedirs(options["out"], exist_ok=True)

    print(f"기체 {len(ship_names)}종 x 진영 {len(options['sides'])}개 -> {options['out']}")

    for ship_name in ship_names:
        print(f"[{ship_name}]")
        for side in options["sides"]:
            bake_one_sprite(ship_name, side, options)

    print("완료")


# endregion


if __name__ == "__main__":
    main()
