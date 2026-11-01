"""Transfer the soft red pupil glint to the instanced crew model without Blender.

Run after process-voxel-character.py has regenerated crew.glb. The source and soft
GLBs share vertex order; only the two dark pupils' UVs and materials differ.
The existing baked walk matrices remain valid because the rig is unchanged.
"""

import copy
import json
import struct
from pathlib import Path


MODELS = Path(__file__).resolve().parents[2] / "public" / "models"
SOURCE = MODELS / "voxel-crew.glb"
LASER = MODELS / "voxel-crew-laser-eyes-soft.glb"
RUNTIME = MODELS / "crew.glb"
EYE_NAMES = (
    "L_Eye_Dark_Pixel_mesh",
    "R_Eye_Dark_Pixel_mesh",
)
EYE_VERTEX_COUNT = 48
EYE_TRIANGLE_COUNT = 24


def load_glb(path):
    data = path.read_bytes()
    magic, version, declared_length = struct.unpack_from("<III", data)
    if magic != 0x46546C67 or version != 2 or declared_length != len(data):
        raise ValueError(f"Invalid GLB: {path}")
    json_length, json_type = struct.unpack_from("<II", data, 12)
    if json_type != 0x4E4F534A:
        raise ValueError(f"Missing JSON chunk: {path}")
    binary_header = 20 + json_length
    binary_length, binary_type = struct.unpack_from("<II", data, binary_header)
    if binary_type != 0x004E4942:
        raise ValueError(f"Missing BIN chunk: {path}")
    return (
        json.loads(data[20:binary_header]),
        bytearray(data[binary_header + 8 : binary_header + 8 + binary_length]),
    )


def accessor_layout(gltf, accessor_index):
    accessor = gltf["accessors"][accessor_index]
    view = gltf["bufferViews"][accessor["bufferView"]]
    component = {5126: "f", 5125: "I", 5123: "H"}[accessor["componentType"]]
    dimension = {"SCALAR": 1, "VEC2": 2}[accessor["type"]]
    value_format = "<" + component * dimension
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    stride = view.get("byteStride", struct.calcsize(value_format))
    return accessor, value_format, start, stride


def read_accessor(gltf, binary, accessor_index):
    accessor, value_format, start, stride = accessor_layout(gltf, accessor_index)
    return [
        struct.unpack_from(value_format, binary, start + index * stride)
        for index in range(accessor["count"])
    ]


def append_indices(gltf, binary, indices, component_type):
    while len(binary) % 4:
        binary.append(0)
    offset = len(binary)
    component = {5125: "I", 5123: "H"}[component_type]
    binary.extend(struct.pack("<" + component * len(indices), *indices))
    view_index = len(gltf["bufferViews"])
    gltf["bufferViews"].append(
        {"buffer": 0, "byteOffset": offset, "byteLength": len(binary) - offset, "target": 34963}
    )
    accessor_index = len(gltf["accessors"])
    gltf["accessors"].append(
        {
            "bufferView": view_index,
            "componentType": component_type,
            "count": len(indices),
            "type": "SCALAR",
            "min": [min(indices)],
            "max": [max(indices)],
        }
    )
    return accessor_index


def append_texture(gltf, binary, source_gltf, source_binary, source_texture_index):
    source_texture = source_gltf["textures"][source_texture_index]
    source_image = source_gltf["images"][source_texture["source"]]
    source_view = source_gltf["bufferViews"][source_image["bufferView"]]
    while len(binary) % 4:
        binary.append(0)
    offset = len(binary)
    image_start = source_view.get("byteOffset", 0)
    binary.extend(source_binary[image_start : image_start + source_view["byteLength"]])
    view_index = len(gltf["bufferViews"])
    gltf["bufferViews"].append(
        {"buffer": 0, "byteOffset": offset, "byteLength": source_view["byteLength"]}
    )
    image_index = len(gltf["images"])
    gltf["images"].append(
        {"bufferView": view_index, "mimeType": source_image["mimeType"], "name": source_image["name"]}
    )
    texture_index = len(gltf["textures"])
    gltf["textures"].append({"sampler": 0, "source": image_index})
    return texture_index


def save_glb(path, gltf, binary):
    gltf["buffers"][0]["byteLength"] = len(binary)
    json_chunk = json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * (-len(json_chunk) % 4)
    binary += b"\x00" * (-len(binary) % 4)
    total_length = 12 + 8 + len(json_chunk) + 8 + len(binary)
    path.write_bytes(
        struct.pack("<III", 0x46546C67, 2, total_length)
        + struct.pack("<II", len(json_chunk), 0x4E4F534A)
        + json_chunk
        + struct.pack("<II", len(binary), 0x004E4942)
        + binary
    )


def main():
    source, source_binary = load_glb(SOURCE)
    laser, laser_binary = load_glb(LASER)
    runtime, runtime_binary = load_glb(RUNTIME)
    if len(runtime["meshes"]) != 2:
        raise ValueError("Expected fresh two-mesh crew.glb; regenerate it before applying eyes")

    eye_uvs = {}
    for name in EYE_NAMES:
        source_mesh = next(mesh for mesh in source["meshes"] if mesh["name"] == name)
        laser_mesh = next(mesh for mesh in laser["meshes"] if mesh["name"] == name)
        source_primitive = source_mesh["primitives"][0]
        laser_primitive = laser_mesh["primitives"][0]
        source_uvs = read_accessor(source, source_binary, source_primitive["attributes"]["TEXCOORD_0"])
        laser_uvs = read_accessor(laser, laser_binary, laser_primitive["attributes"]["TEXCOORD_0"])
        if len(source_uvs) != len(laser_uvs):
            raise ValueError(f"Eye vertex count changed: {name}")
        material_name = laser["materials"][laser_primitive["material"]]["name"]
        for source_uv, laser_uv in zip(source_uvs, laser_uvs):
            key = struct.pack("<2f", *source_uv)
            value = (material_name, laser_uv)
            if key in eye_uvs and eye_uvs[key] != value:
                raise ValueError(f"Ambiguous eye UV in {name}")
            eye_uvs[key] = value
    if len(eye_uvs) != EYE_VERTEX_COUNT:
        raise ValueError(f"Expected {EYE_VERTEX_COUNT} distinct eye vertices, got {len(eye_uvs)}")

    body = next(mesh for mesh in runtime["meshes"] if mesh["name"] == "crew_body")
    primitive = body["primitives"][0]
    uv_accessor = primitive["attributes"]["TEXCOORD_0"]
    uv_values = read_accessor(runtime, runtime_binary, uv_accessor)
    vertex_material = {}
    _, uv_format, uv_start, uv_stride = accessor_layout(runtime, uv_accessor)
    for index, uv in enumerate(uv_values):
        replacement = eye_uvs.get(struct.pack("<2f", *uv))
        if replacement:
            material_name, laser_uv = replacement
            vertex_material[index] = material_name
            struct.pack_into(uv_format, runtime_binary, uv_start + index * uv_stride, *laser_uv)
    if len(vertex_material) != EYE_VERTEX_COUNT:
        raise ValueError(f"Expected {EYE_VERTEX_COUNT} runtime eye vertices, got {len(vertex_material)}")

    body_index_accessor = primitive["indices"]
    original_indices = [value[0] for value in read_accessor(runtime, runtime_binary, body_index_accessor)]
    grouped_indices = {"Crew_Pixel_PBR": [], "Subtle_Red_Pupil": []}
    for offset in range(0, len(original_indices), 3):
        triangle = original_indices[offset : offset + 3]
        materials = {vertex_material.get(index, "Crew_Pixel_PBR") for index in triangle}
        if len(materials) != 1:
            raise ValueError(f"Eye/body triangle is mixed at index {offset}")
        grouped_indices[materials.pop()].extend(triangle)
    if len(grouped_indices["Subtle_Red_Pupil"]) != EYE_TRIANGLE_COUNT * 3:
        raise ValueError("Eye triangle count changed")

    accessor, index_format, index_start, index_stride = accessor_layout(runtime, body_index_accessor)
    component_size = struct.calcsize(index_format)
    if index_stride != component_size:
        raise ValueError("Interleaved index buffers are unsupported")
    body_indices = grouped_indices["Crew_Pixel_PBR"]
    struct.pack_into("<" + index_format[1:] * len(body_indices), runtime_binary, index_start, *body_indices)
    accessor["count"] = len(body_indices)
    accessor["min"] = [min(body_indices)]
    accessor["max"] = [max(body_indices)]

    material_name = "Subtle_Red_Pupil"
    material = copy.deepcopy(next(item for item in laser["materials"] if item["name"] == material_name))
    material["emissiveTexture"]["index"] = append_texture(
        runtime, runtime_binary, laser, laser_binary, material["emissiveTexture"]["index"]
    )
    material["pbrMetallicRoughness"]["baseColorTexture"]["index"] = append_texture(
        runtime, runtime_binary, laser, laser_binary,
        material["pbrMetallicRoughness"]["baseColorTexture"]["index"],
    )
    material_index = len(runtime["materials"])
    runtime["materials"].append(material)
    eye_accessor = append_indices(runtime, runtime_binary, grouped_indices[material_name], accessor["componentType"])
    mesh_index = len(runtime["meshes"])
    runtime["meshes"].append(
        {
            "name": "crew_pupil_glint",
            "primitives": [
                {
                    "attributes": copy.deepcopy(primitive["attributes"]),
                    "indices": eye_accessor,
                    "material": material_index,
                }
            ],
        }
    )
    runtime["scenes"][0]["nodes"].append(len(runtime["nodes"]))
    runtime["nodes"].append({"mesh": mesh_index, "name": "crew_pupil_glint"})

    for extension in laser.get("extensionsUsed", []):
        if extension not in runtime.setdefault("extensionsUsed", []):
            runtime["extensionsUsed"].append(extension)
    save_glb(RUNTIME, runtime, runtime_binary)
    print(f"Updated {RUNTIME}: {len(body_indices) // 3} body triangles, {EYE_TRIANGLE_COUNT} softly emissive pupil triangles")


if __name__ == "__main__":
    main()
