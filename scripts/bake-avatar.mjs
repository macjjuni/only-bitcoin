/**
 * 리깅된 아바타 GLB 를 게임용으로 굽는다.
 *
 * 아바타는 `InstancedMesh` 로 그려서 three 의 스킨 경로를 못 쓴다. 그래서 본 행렬을
 * 프레임마다 미리 계산해 텍스처로 굽고, 셰이더가 정점마다 그 행렬을 읽어 곱한다.
 *
 * 만드는 것 (`public/models/<id>.*`):
 *   - `<id>.glb`        스킨·모션을 뗀 메시. 정점마다 따라갈 본 번호(`_BONEINDEX`)가 붙는다.
 *   - `<id>-clips.bin`  모든 모션의 본 행렬. 가로 한 줄이 한 프레임이고 모션을 세로로 이어 붙였다.
 *
 * 끝나면 모션별 시작 줄·프레임 수를 찍는다. 그 표를 `avatarModel.ts` 에 옮겨 적는다.
 * 어긋나면 `crewModel.test.ts` 가 `.bin` 크기와 표를 맞대어 잡아낸다.
 *
 * 원본은 `assets/originals/avatars/` 에 둔다. `assets` 는 깃이 추적하지 않아서 이 폴더가
 * 유일한 보관처다. 지우면 다시 구울 수 없다.
 *
 * 사용:
 *   node scripts/bake-avatar.mjs assets/originals/avatars/nightshift-rigged.glb nightshift
 *   node scripts/bake-avatar.mjs assets/originals/avatars/red-crew-laser-large-wrench.glb redcrew \
 *     --body "Body,Combination wrench" --accent Apron --eyes "Laser eyes"
 *   node scripts/bake-avatar.mjs assets/originals/avatars/pepe-flyswatter.glb pepe \
 *     --body pepe_body --weapon Flyswatter
 *
 * 원본은 glTF 관례대로 +Z 를 본다. 게임의 전방은 −Z 라서 메시와 본 행렬을 Y 축으로
 * 반 바퀴 돌려 굽는다. 안 돌리면 아바타가 등을 보인 채 걷는다.
 *
 * 입력 GLB 의 조건:
 *   - 메시 이름이 `<id>_body` · `<id>_weapon`(선택) · `<id>_accent` · `<id>_eyes`(선택).
 *     다르면 `--body` · `--accent` · `--eyes` 로 알려 준다(쉼표로 여러 개).
 *   - 무기는 보통 `--body` 에 같이 적어 몸통에 합친다. 몸통이 텍스처를 쓰고 무기가 단색
 *     재질이라 못 합칠 때만 `--weapon` 으로 따로 굽는다(`<id>_weapon` 메시가 하나 더 나옴).
 *   - 부위 하나에 재질이 여러 개면 재질 색을 정점 색으로 구워 하나로 합친다
 *   - 정점 하나가 본 하나에만 100% 묶여 있음(리지드). 섞인 정점은 가장 센 본에 붙이고 알린다.
 *   - 클립 이름이 `Idle` · `Walk` · `Run` · `Attack` · `Hit` · `Death` · `Revive`
 */
import fs from "node:fs";
import path from "node:path";
import { AnimationMixer, DataUtils, LoopOnce, Matrix4 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** 본 칸 수. 셰이더의 텍셀 조회 폭이라 모든 모델이 같아야 한다(`CREW_WALK.boneCount`). */
const BONE_SLOT_COUNT = 22;
/** 굽는 초당 프레임. 원본 모션과 같다. 사이는 셰이더가 보간한다. */
const BAKE_FPS = 24;
/** 굽는 모션. 이 순서로 세로로 쌓는다. `Dodge` · `CombatIdle` 은 쓰는 곳이 없어 뺐다. */
const CLIPS = [
  ["idle", "Idle"],
  ["walk", "Walk"],
  ["run", "Run"],
  ["attack", "Attack"],
  ["hit", "Hit"],
  ["death", "Death"],
  ["revive", "Revive"],
];

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const COMPONENT_READERS = {
  5121: [Uint8Array, 1],
  5123: [Uint16Array, 2],
  5125: [Uint32Array, 4],
  5126: [Float32Array, 4],
};
const TYPE_SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/**
 * Y 축 반 바퀴 회전의 대각 성분. x 와 z 의 부호만 뒤집힌다.
 *
 * 회전이라 면의 앞뒤(감는 방향)는 그대로다.
 */
const HALF_TURN = [-1, 1, -1];

const [sourcePath, modelID, ...options] = process.argv.slice(2);

if (!sourcePath || !modelID) {
  console.error(
    "사용: node scripts/bake-avatar.mjs <리깅된 glb> <모델 id> [--body 메시,메시] [--accent 메시] [--eyes 메시] [--weapon 메시]",
  );
  process.exit(1);
}

// region [GLB 읽기]
const readGlb = (file) => {
  const buffer = fs.readFileSync(file);

  if (buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error(`${file} 은 GLB 가 아닙니다.`);
  }
  const jsonLength = buffer.readUInt32LE(12);

  return {
    json: JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8")),
    binary: buffer.subarray(20 + jsonLength + 8),
  };
};

/** 액세서를 숫자 배열로 읽는다. 인터리브(byteStride)도 처리한다. */
const readAccessor = ({ json, binary }, accessorIndex) => {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  const [ArrayType, componentBytes] = COMPONENT_READERS[accessor.componentType];
  const size = TYPE_SIZES[accessor.type];
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? size * componentBytes;
  const values = new ArrayType(accessor.count * size);
  const reader = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);

  for (let row = 0; row < accessor.count; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const offset = start + row * stride + column * componentBytes;

      values[row * size + column] =
        componentBytes === 4 && ArrayType === Float32Array
          ? reader.getFloat32(offset, true)
          : componentBytes === 4
            ? reader.getUint32(offset, true)
            : componentBytes === 2
              ? reader.getUint16(offset, true)
              : reader.getUint8(offset);
    }
  }

  return values;
};
// endregion

// region [메시 굽기]
/** 벡터 배열을 반 바퀴 돌린다. */
const turn = (values) => values.map((value, index) => value * HALF_TURN[index % 3]);

/**
 * 정점 색을 0…1 실수 RGB 로 읽는다.
 *
 * 내보내는 도구에 따라 8·16비트 정수로 담기고 알파가 붙기도 한다.
 */
const readColors = (glb, accessorIndex) => {
  const accessor = glb.json.accessors[accessorIndex];
  const raw = readAccessor(glb, accessorIndex);
  const size = TYPE_SIZES[accessor.type];
  const scale = accessor.componentType === 5123 ? 65535 : accessor.componentType === 5121 ? 255 : 1;
  const colors = new Float32Array(accessor.count * 3);

  for (let vertex = 0; vertex < accessor.count; vertex += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      colors[vertex * 3 + channel] = raw[vertex * size + channel] / scale;
    }
  }

  return colors;
};

/** 본 칸 번호(스킨의 관절 순서)별 부모 칸 번호. 뿌리는 −1. */
const readBoneParents = (glb) => {
  const { joints } = glb.json.skins[0];

  return joints.map((nodeIndex) => {
    const parentNode = glb.json.nodes.findIndex((node) => node.children?.includes(nodeIndex));

    return joints.indexOf(parentNode);
  });
};

/**
 * 본 여러 개에 묶인 정점이 따라갈 본 하나를 고른다. `influences` 는 센 순서다.
 *
 * 보통은 가장 센 본이다. 다만 위 둘이 비슷하게 세면(좌우 허벅지에 반반 묶인 앞치마
 * 가운데 같은 경우) 둘 중 하나를 고르면 한쪽 다리만 따라가 비대칭으로 흔들린다.
 * 그때는 후보 중에 나머지의 조상인 본(골반)이 있으면 그쪽에 붙인다.
 */
const pickRigidBone = (glb, influences) => {
  const [strongest, second] = influences;

  if (!second || strongest.weight - second.weight > 0.05) {
    return strongest.bone;
  }
  const parents = readBoneParents(glb);
  const isAncestor = (ancestor, bone) => {
    for (let current = parents[bone]; current >= 0; current = parents[current]) {
      if (current === ancestor) {
        return true;
      }
    }

    return false;
  };
  const shared = influences.find((candidate) =>
    influences.every((other) => other === candidate || isAncestor(candidate.bone, other.bone)),
  );

  return (shared ?? strongest).bone;
};

/**
 * 메시의 프리미티브들을 꺼내 본 번호를 정점 속성으로 바꾼다. 스킨의 관절 순서가 곧 본 칸 번호다.
 *
 * 메시가 없으면 빈 배열을 준다. 재질이 여러 개인 메시는 프리미티브가 여러 개다.
 */
const readParts = (glb, meshName) => {
  // 뼈와 메시 이름이 같을 수 있다(무기 뼈 `Flyswatter` 와 무기 메시 `Flyswatter`). 메시가 달린 쪽을 찾는다.
  const node = glb.json.nodes.find(
    (candidate) => candidate.name === meshName && candidate.mesh !== undefined,
  );

  if (!node) {
    return [];
  }

  return glb.json.meshes[node.mesh].primitives.map((primitive, primitiveIndex) => {
    const joints = readAccessor(glb, primitive.attributes.JOINTS_0);
    const weights = readAccessor(glb, primitive.attributes.WEIGHTS_0);
    const vertexCount = joints.length / 4;
    const boneIndices = new Float32Array(vertexCount);

    let snappedCount = 0;

    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const influences = [0, 1, 2, 3]
        .map((slot) => ({ bone: joints[vertex * 4 + slot], weight: weights[vertex * 4 + slot] }))
        .filter((influence) => influence.weight > 0)
        .sort((first, second) => second.weight - first.weight);
      const total = influences.reduce((sum, influence) => sum + influence.weight, 0);

      if (influences[0].weight / total < 0.999) {
        snappedCount += 1;
      }
      boneIndices[vertex] = pickRigidBone(glb, influences);
    }
    if (snappedCount > 0) {
      // 런타임은 정점당 본 하나만 읽는다. 섞인 정점은 가장 센 본에 붙인다.
      console.log(
        `[bake] '${meshName}' #${primitiveIndex}: 본 여러 개에 묶인 정점 ${snappedCount}/${vertexCount}개를 본 하나로 붙임. 이 부위는 덜 부드럽게 접힘.`,
      );
    }

    return {
      positions: turn(readAccessor(glb, primitive.attributes.POSITION)),
      normals: turn(readAccessor(glb, primitive.attributes.NORMAL)),
      uvs:
        primitive.attributes.TEXCOORD_0 === undefined
          ? null
          : readAccessor(glb, primitive.attributes.TEXCOORD_0),
      colors:
        primitive.attributes.COLOR_0 === undefined
          ? null
          : readColors(glb, primitive.attributes.COLOR_0),
      boneIndices,
      indices: Uint32Array.from(readAccessor(glb, primitive.indices)),
      materialIndex: primitive.material,
    };
  });
};

/**
 * 조각들을 메시 하나로 합친다. 런타임은 부위마다 메시 하나·재질 하나만 받는다.
 *
 * 재질이 전부 같으면(아틀라스 하나를 같이 쓰는 경우) 그대로 이어 붙인다.
 * 재질이 섞여 있으면 재질 색을 **정점 색으로 구워** 재질 하나로 만든다. 금속감 같은
 * 재질별 차이는 사라지고 색만 남는다. 텍스처를 쓰는 재질은 이렇게 구울 수 없어 멈춘다.
 */
const mergeParts = (glb, parts, label) => {
  if (parts.length === 0) {
    return null;
  }
  const materials = glb.json.materials;
  const isSingleMaterial = parts.every((part) => part.materialIndex === parts[0].materialIndex);
  const hasColors = parts.some((part) => part.colors !== null);
  const vertexTotal = parts.reduce((sum, part) => sum + part.boneIndices.length, 0);
  const positions = new Float32Array(vertexTotal * 3);
  const normals = new Float32Array(vertexTotal * 3);
  const uvs = new Float32Array(vertexTotal * 2);
  const colors = isSingleMaterial && !hasColors ? null : new Float32Array(vertexTotal * 3);
  const boneIndices = new Float32Array(vertexTotal);
  const indices = new Uint32Array(parts.reduce((sum, part) => sum + part.indices.length, 0));
  let vertexOffset = 0;
  let indexOffset = 0;

  for (const part of parts) {
    const vertexCount = part.boneIndices.length;
    const material = materials[part.materialIndex] ?? {};
    const pbr = material.pbrMetallicRoughness ?? {};

    if (!isSingleMaterial && pbr.baseColorTexture) {
      throw new Error(
        `${label}: 텍스처를 쓰는 재질('${material.name}')은 다른 재질과 합칠 수 없습니다.`,
      );
    }
    positions.set(part.positions, vertexOffset * 3);
    normals.set(part.normals, vertexOffset * 3);
    boneIndices.set(part.boneIndices, vertexOffset);
    if (part.uvs) {
      uvs.set(part.uvs, vertexOffset * 2);
    }
    if (colors) {
      // 재질을 하나로 줄이므로 재질 색을 정점 색에 곱해 둔다. 한 재질이면 곱하지 않는다.
      const tint = isSingleMaterial ? [1, 1, 1] : (pbr.baseColorFactor ?? [1, 1, 1]);

      for (let vertex = 0; vertex < vertexCount; vertex += 1) {
        for (let channel = 0; channel < 3; channel += 1) {
          const base = part.colors ? part.colors[vertex * 3 + channel] : 1;

          colors[(vertexOffset + vertex) * 3 + channel] = base * tint[channel];
        }
      }
    }
    for (let index = 0; index < part.indices.length; index += 1) {
      indices[indexOffset + index] = part.indices[index] + vertexOffset;
    }
    vertexOffset += vertexCount;
    indexOffset += part.indices.length;
  }

  // 대표 재질은 맨 앞 조각의 것. 그래서 `--body` 에는 몸통을 무기보다 먼저 적는다.
  // 색은 정점 색에 구웠으니 재질 색은 뗀다.
  const sourceMaterial = materials[parts[0].materialIndex];
  const material = isSingleMaterial
    ? sourceMaterial
    : {
        ...sourceMaterial,
        pbrMetallicRoughness: {
          ...sourceMaterial.pbrMetallicRoughness,
          baseColorFactor: undefined,
        },
      };

  if (!isSingleMaterial) {
    console.log(
      `[bake] ${label}: 재질 ${new Set(parts.map((part) => part.materialIndex)).size}개를 정점 색으로 합침 → '${sourceMaterial.name}'`,
    );
  }

  return { positions, normals, uvs, colors, boneIndices, indices, material };
};
// endregion

// region [GLB 쓰기]
/** 스킨·모션 없이 메시와 머티리얼만 담은 GLB 를 만든다. */
const writeStaticGlb = (source, meshes, file) => {
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  let byteLength = 0;

  const pushView = (bytes, target) => {
    const padding = (4 - (byteLength % 4)) % 4;

    if (padding > 0) {
      chunks.push(Buffer.alloc(padding));
      byteLength += padding;
    }
    bufferViews.push({
      buffer: 0,
      byteOffset: byteLength,
      byteLength: bytes.length,
      ...(target ? { target } : {}),
    });
    chunks.push(bytes);
    byteLength += bytes.length;

    return bufferViews.length - 1;
  };
  const pushAccessor = (values, type, componentType, target, withBounds = false) => {
    const size = TYPE_SIZES[type];
    const accessor = {
      bufferView: pushView(
        Buffer.from(values.buffer, values.byteOffset, values.byteLength),
        target,
      ),
      componentType,
      count: values.length / size,
      type,
    };

    if (withBounds) {
      accessor.min = Array.from({ length: size }, () => Number.POSITIVE_INFINITY);
      accessor.max = Array.from({ length: size }, () => Number.NEGATIVE_INFINITY);
      for (let index = 0; index < values.length; index += 1) {
        accessor.min[index % size] = Math.min(accessor.min[index % size], values[index]);
        accessor.max[index % size] = Math.max(accessor.max[index % size], values[index]);
      }
    }
    accessors.push(accessor);

    return accessors.length - 1;
  };

  // 쓰는 재질만 담는다. 합치면서 안 쓰게 된 재질이 남아 있으면 로더가 괜히 만든다.
  const materials = [...new Set(meshes.map(({ mesh }) => mesh.material))];

  const gltfMeshes = meshes.map(({ name, mesh }) => {
    const usesShortIndices = mesh.boneIndices.length <= 0xffff;

    return {
      name,
      primitives: [
        {
          attributes: {
            POSITION: pushAccessor(mesh.positions, "VEC3", 5126, 34962, true),
            NORMAL: pushAccessor(mesh.normals, "VEC3", 5126, 34962),
            TEXCOORD_0: pushAccessor(mesh.uvs, "VEC2", 5126, 34962),
            ...(mesh.colors ? { COLOR_0: pushAccessor(mesh.colors, "VEC3", 5126, 34962) } : {}),
            _BONEINDEX: pushAccessor(mesh.boneIndices, "SCALAR", 5126, 34962),
          },
          indices: usesShortIndices
            ? pushAccessor(Uint16Array.from(mesh.indices), "SCALAR", 5123, 34963)
            : pushAccessor(mesh.indices, "SCALAR", 5125, 34963),
          material: materials.indexOf(mesh.material),
        },
      ],
    };
  });
  // 아틀라스 이미지는 원본 바이트를 그대로 옮긴다.
  const images = (source.json.images ?? []).map((image) => {
    const view = source.json.bufferViews[image.bufferView];
    const start = view.byteOffset ?? 0;

    return {
      name: image.name,
      mimeType: image.mimeType,
      bufferView: pushView(Buffer.from(source.binary.subarray(start, start + view.byteLength))),
    };
  });
  const json = {
    asset: { version: "2.0", generator: "scripts/bake-avatar.mjs" },
    ...(source.json.extensionsUsed ? { extensionsUsed: source.json.extensionsUsed } : {}),
    scene: 0,
    scenes: [{ nodes: gltfMeshes.map((_, index) => index) }],
    nodes: gltfMeshes.map((mesh, index) => ({ name: mesh.name, mesh: index })),
    meshes: gltfMeshes,
    materials,
    ...(source.json.textures ? { textures: source.json.textures } : {}),
    ...(source.json.samplers ? { samplers: source.json.samplers } : {}),
    ...(images.length > 0 ? { images } : {}),
    accessors,
    bufferViews,
    buffers: [{ byteLength }],
  };
  let text = JSON.stringify(json);

  while (Buffer.byteLength(text) % 4 !== 0) {
    text += " ";
  }
  const jsonBytes = Buffer.from(text);
  const binaryPadding = (4 - (byteLength % 4)) % 4;
  const binaryBytes = Buffer.concat([...chunks, Buffer.alloc(binaryPadding)]);
  const header = Buffer.alloc(12);
  const jsonHeader = Buffer.alloc(8);
  const binaryHeader = Buffer.alloc(8);

  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + binaryBytes.length, 8);
  jsonHeader.writeUInt32LE(jsonBytes.length, 0);
  jsonHeader.writeUInt32LE(JSON_CHUNK, 4);
  binaryHeader.writeUInt32LE(binaryBytes.length, 0);
  binaryHeader.writeUInt32LE(BIN_CHUNK, 4);
  fs.writeFileSync(file, Buffer.concat([header, jsonHeader, jsonBytes, binaryHeader, binaryBytes]));
};
// endregion

// region [모션 굽기]
/**
 * 텍스처를 뗀 GLB 를 돌려준다.
 *
 * 노드에는 이미지 디코더가 없어 three 로더가 텍스처에서 죽는다. 본 행렬만 계산할 거라 뗀다.
 */
const stripTextures = (file) => {
  const buffer = fs.readFileSync(file);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  const rest = buffer.subarray(20 + jsonLength);

  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const material of json.materials ?? []) {
    delete material.pbrMetallicRoughness?.baseColorTexture;
    delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
  }
  let text = JSON.stringify(json);

  while (Buffer.byteLength(text) % 4 !== 0) {
    text += " ";
  }
  const jsonBytes = Buffer.from(text);
  const header = Buffer.alloc(20);

  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + jsonBytes.length + rest.length, 8);
  header.writeUInt32LE(jsonBytes.length, 12);
  header.writeUInt32LE(JSON_CHUNK, 16);

  const bytes = Buffer.concat([header, jsonBytes, rest]);

  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

/**
 * 모든 모션의 본 행렬을 굽는다.
 *
 * 한 줄이 한 프레임이고, 본 하나가 텍셀 3개(4x4 행렬의 위 3행)를 쓴다. 반복 모션도
 * 끝 프레임(= 첫 프레임과 같은 자세)까지 담는다. 그래야 셰이더가 다음 줄과 보간할 때
 * 끝에서 처음으로 돌아가는 계산을 따로 안 해도 된다.
 */
const bakeClips = async (file) => {
  const gltf = await new GLTFLoader().parseAsync(stripTextures(file), "");
  let skinnedMesh = null;

  gltf.scene.traverse((object) => {
    // 메시들이 전부 같은 뼈대를 쓴다. 아무거나 하나면 된다.
    if (object.isSkinnedMesh && !skinnedMesh) {
      skinnedMesh = object;
    }
  });
  if (!skinnedMesh) {
    throw new Error("스킨 메시가 없습니다.");
  }
  const { skeleton } = skinnedMesh;

  if (skeleton.bones.length > BONE_SLOT_COUNT) {
    throw new Error(`본이 ${skeleton.bones.length}개입니다. 최대 ${BONE_SLOT_COUNT}개여야 합니다.`);
  }
  gltf.scene.updateMatrixWorld(true);
  if (
    !skinnedMesh.matrixWorld.equals(new Matrix4()) ||
    !skinnedMesh.bindMatrix.equals(new Matrix4())
  ) {
    throw new Error("메시에 변환이 걸려 있습니다. 변환을 적용(Apply)한 뒤 다시 내보내세요.");
  }

  const mixer = new AnimationMixer(gltf.scene);
  const rowFloats = BONE_SLOT_COUNT * 3 * 4;
  const rows = [];
  const table = {};
  const boneMatrix = new Matrix4();

  for (const [key, clipName] of CLIPS) {
    const clip = gltf.animations.find((candidate) => candidate.name === clipName);

    if (!clip) {
      throw new Error(`'${clipName}' 모션이 없습니다.`);
    }
    const frameCount = Math.round(clip.duration * BAKE_FPS) + 1;
    const action = mixer.clipAction(clip);

    table[key] = { startFrame: rows.length, frameCount, seconds: Number(clip.duration.toFixed(4)) };
    for (let frame = 0; frame < frameCount; frame += 1) {
      mixer.stopAllAction();
      action.reset();
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      // 정확히 끝 시각을 넣으면 재생이 끝난 것으로 보고 자세를 풀어 버린다. 살짝 앞에서 읽는다.
      mixer.setTime(Math.min(frame / BAKE_FPS, clip.duration - 1e-5));
      gltf.scene.updateMatrixWorld(true);
      skeleton.update();

      const row = new Float32Array(rowFloats);

      for (let slot = 0; slot < BONE_SLOT_COUNT; slot += 1) {
        // 안 쓰는 칸은 단위행렬. 그 칸을 가리키는 정점은 없지만 읽혀도 안 터지게 한다.
        const elements =
          slot < skeleton.bones.length
            ? boneMatrix.fromArray(skeleton.boneMatrices, slot * 16).elements
            : boneMatrix.identity().elements;

        // three 는 열 우선으로 들고 있다. 행으로 풀어 위 3행만 담는다.
        // 메시를 반 바퀴 돌렸으니 행렬도 같은 회전으로 감싼다(R·M·R). 대각 행렬이라
        // 원소마다 행·열의 부호를 곱하면 된다. 이동 성분(4번째 열)은 행 부호만 받는다.
        for (let matrixRow = 0; matrixRow < 3; matrixRow += 1) {
          for (let column = 0; column < 4; column += 1) {
            const sign = HALF_TURN[matrixRow] * (column < 3 ? HALF_TURN[column] : 1);

            row[(slot * 3 + matrixRow) * 4 + column] = sign * elements[column * 4 + matrixRow];
          }
        }
      }
      rows.push(row);
    }
  }

  // 반정밀도로 담는다. 행렬 원소 오차가 0.05% 라 1 m 떨어진 정점이 0.5 mm 어긋나는 정도다.
  const data = new Uint16Array(rows.length * rowFloats);

  rows.forEach((row, rowIndex) => {
    for (let index = 0; index < rowFloats; index += 1) {
      data[rowIndex * rowFloats + index] = DataUtils.toHalfFloat(row[index]);
    }
  });

  return { data, table, frameCount: rows.length };
};
// endregion

/**
 * `--body A,B` 같은 옵션을 읽는다. 없으면 `<id>_body` 식의 기본 이름을 쓴다.
 *
 * 원본마다 메시 이름이 달라서, 어느 메시가 몸통·색 부위·눈인지 받아야 한다.
 */
const readOption = (name, fallback) => {
  const index = options.indexOf(`--${name}`);

  return index >= 0 && options[index + 1] ? options[index + 1].split(",") : fallback;
};

const outputDirectory = path.join(process.cwd(), "public", "models");
const source = readGlb(sourcePath);
const readMerged = (role, meshNames) =>
  mergeParts(
    source,
    meshNames.flatMap((meshName) => readParts(source, meshName)),
    `${modelID} ${role}`,
  );
const body = readMerged("몸통", readOption("body", [`${modelID}_body`, `${modelID}_weapon`]));
const accent = readMerged("색 부위", readOption("accent", [`${modelID}_accent`]));
const eyes = readMerged("눈", readOption("eyes", [`${modelID}_eyes`]));
// 무기를 몸통에 못 합칠 때만 따로 둔다. 몸통은 아틀라스 텍스처를 쓰는데 무기는 단색
// 재질이면 한 재질로 합칠 수 없다. 따로 두면 드로우 콜이 하나 는다.
const weapon = readMerged("무기", readOption("weapon", []));

if (accent) {
  // 런타임은 이 부위를 플레이어 색 단색으로 칠한다. 원본 재질의 텍스처는 안 쓰여서 뗀다.
  accent.material = {
    ...accent.material,
    pbrMetallicRoughness: { ...accent.material.pbrMetallicRoughness, baseColorTexture: undefined },
  };
}

if (!body || !accent) {
  throw new Error(
    "몸통이나 플레이어 색 부위 메시를 못 찾았습니다. --body · --accent 로 메시 이름을 알려 주세요.",
  );
}
const meshes = [
  { name: `${modelID}_body`, mesh: body },
  { name: `${modelID}_accent`, mesh: accent },
  ...(eyes ? [{ name: `${modelID}_pupil_glint`, mesh: eyes }] : []),
  ...(weapon ? [{ name: `${modelID}_weapon`, mesh: weapon }] : []),
];
const clips = await bakeClips(sourcePath);
const triangleCount = meshes.reduce((sum, { mesh }) => sum + mesh.indices.length / 3, 0);
const headTop = body.positions.reduce(
  (highest, value, index) => (index % 3 === 1 ? Math.max(highest, value) : highest),
  0,
);

writeStaticGlb(source, meshes, path.join(outputDirectory, `${modelID}.glb`));
fs.writeFileSync(
  path.join(outputDirectory, `${modelID}-clips.bin`),
  Buffer.from(clips.data.buffer, clips.data.byteOffset, clips.data.byteLength),
);

console.log(
  `[bake] ${modelID}: 삼각형 ${triangleCount}, 키 ${headTop.toFixed(3)} m, 모션 ${clips.frameCount}프레임`,
);
console.log("[bake] avatarModel.ts 에 옮겨 적을 값:");
console.log(
  JSON.stringify({ triangleCount, clipFrameCount: clips.frameCount, clips: clips.table }, null, 2),
);
