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
 * 사용: node scripts/bake-avatar.mjs assets/nightshift-rigged.glb nightshift
 *
 * 원본은 glTF 관례대로 +Z 를 본다. 게임의 전방은 −Z 라서 메시와 본 행렬을 Y 축으로
 * 반 바퀴 돌려 굽는다. 안 돌리면 아바타가 등을 보인 채 걷는다.
 *
 * 입력 GLB 의 조건:
 *   - 메시 이름이 `<id>_body` · `<id>_weapon`(선택) · `<id>_accent` · `<id>_eyes`(선택)
 *   - 정점 하나가 본 하나에만 100% 묶여 있음(리지드). 섞여 있으면 멈춘다.
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

const [sourcePath, modelID] = process.argv.slice(2);

if (!sourcePath || !modelID) {
  console.error("사용: node scripts/bake-avatar.mjs <리깅된 glb> <모델 id>");
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
/** 메시 하나를 꺼내 본 번호를 정점 속성으로 바꾼다. 스킨의 관절 순서가 곧 본 칸 번호다. */
const readRigidMesh = (glb, meshName) => {
  const node = glb.json.nodes.find((candidate) => candidate.name === meshName);

  if (!node || node.mesh === undefined) {
    return null;
  }
  const { primitives } = glb.json.meshes[node.mesh];

  if (primitives.length !== 1) {
    throw new Error(`'${meshName}' 은 프리미티브가 ${primitives.length}개입니다. 하나여야 합니다.`);
  }
  const [primitive] = primitives;
  const joints = readAccessor(glb, primitive.attributes.JOINTS_0);
  const weights = readAccessor(glb, primitive.attributes.WEIGHTS_0);
  const vertexCount = joints.length / 4;
  const boneIndices = new Float32Array(vertexCount);

  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    if (weights[vertex * 4] < 0.999) {
      throw new Error(
        `'${meshName}' 정점 ${vertex} 가 본 여러 개에 묶여 있습니다. 리지드여야 합니다.`,
      );
    }
    boneIndices[vertex] = joints[vertex * 4];
  }

  /** 벡터 배열을 반 바퀴 돌린다. */
  const turn = (values) => values.map((value, index) => value * HALF_TURN[index % 3]);

  return {
    positions: turn(readAccessor(glb, primitive.attributes.POSITION)),
    normals: turn(readAccessor(glb, primitive.attributes.NORMAL)),
    uvs: readAccessor(glb, primitive.attributes.TEXCOORD_0),
    boneIndices,
    indices: Uint32Array.from(readAccessor(glb, primitive.indices)),
    material: primitive.material,
  };
};

/** 같은 머티리얼을 쓰는 메시를 하나로 합친다. 드로우 콜 하나를 아낀다. */
const mergeMeshes = (meshes) => {
  const present = meshes.filter(Boolean);
  const [first] = present;

  if (present.some((mesh) => mesh.material !== first.material)) {
    throw new Error("머티리얼이 다른 메시는 합칠 수 없습니다.");
  }
  const concat = (key, ArrayType) => {
    const merged = new ArrayType(present.reduce((sum, mesh) => sum + mesh[key].length, 0));
    let offset = 0;

    for (const mesh of present) {
      merged.set(mesh[key], offset);
      offset += mesh[key].length;
    }

    return merged;
  };
  const indices = new Uint32Array(present.reduce((sum, mesh) => sum + mesh.indices.length, 0));
  let indexOffset = 0;
  let vertexOffset = 0;

  for (const mesh of present) {
    for (let index = 0; index < mesh.indices.length; index += 1) {
      indices[indexOffset + index] = mesh.indices[index] + vertexOffset;
    }
    indexOffset += mesh.indices.length;
    vertexOffset += mesh.boneIndices.length;
  }

  return {
    positions: concat("positions", Float32Array),
    normals: concat("normals", Float32Array),
    uvs: concat("uvs", Float32Array),
    boneIndices: concat("boneIndices", Float32Array),
    indices,
    material: first.material,
  };
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
            _BONEINDEX: pushAccessor(mesh.boneIndices, "SCALAR", 5126, 34962),
          },
          indices: usesShortIndices
            ? pushAccessor(Uint16Array.from(mesh.indices), "SCALAR", 5123, 34963)
            : pushAccessor(mesh.indices, "SCALAR", 5125, 34963),
          material: mesh.material,
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
    materials: source.json.materials,
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
const bakeClips = async (file, bodyMeshName) => {
  const gltf = await new GLTFLoader().parseAsync(stripTextures(file), "");
  let skinnedMesh = null;

  gltf.scene.traverse((object) => {
    if (object.isSkinnedMesh && object.name === bodyMeshName) {
      skinnedMesh = object;
    }
  });
  if (!skinnedMesh) {
    throw new Error(`'${bodyMeshName}' 스킨 메시가 없습니다.`);
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

const outputDirectory = path.join(process.cwd(), "public", "models");
const source = readGlb(sourcePath);
const body = mergeMeshes([
  readRigidMesh(source, `${modelID}_body`),
  readRigidMesh(source, `${modelID}_weapon`),
]);
const accent = readRigidMesh(source, `${modelID}_accent`);
const eyes = readRigidMesh(source, `${modelID}_eyes`);

if (!accent) {
  throw new Error(`'${modelID}_accent' 메시가 없습니다. 플레이어 색을 입힐 부위가 필요합니다.`);
}
const meshes = [
  { name: `${modelID}_body`, mesh: body },
  { name: `${modelID}_accent`, mesh: accent },
  ...(eyes ? [{ name: `${modelID}_pupil_glint`, mesh: eyes }] : []),
];
const clips = await bakeClips(sourcePath, `${modelID}_body`);
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
