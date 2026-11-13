"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  Object3D,
  type Texture,
} from "three";
import { SPACE_BOSS, type SpaceBossState } from "@/entities/space";
import {
  type BossDustPuff,
  type BossShockwave,
  type BossSlash,
  createBossImpactTracker,
} from "@/views/space/lib/bossImpacts";

/** 동시에 띄우는 충격파 수. 돌진의 시작·끝이 겹칠 수 있어 둘보다 하나 더 둠. */
const SHOCKWAVE_COUNT = 3;
/** 동시에 띄우는 눈보라 수. 돌진 한 번에 8개가 나오고 0.8초씩 떠 있음. */
const DUST_COUNT = 12;
/** 충격파 하나가 튀기는 눈덩이 수. */
const DEBRIS_PER_SHOCKWAVE = 14;
const SHOCKWAVE_SECONDS = 0.7;
const DUST_SECONDS = 0.8;
/** 눈덩이가 떨어지는 가속도(m/s²). 실제보다 세게 잡아야 묵직해 보임. */
const DEBRIS_GRAVITY = 18;
/** 바닥 예고 표시(최대 5.4 cm)보다 위에 깔아 예고에 가리지 않게 함. */
const IMPACT_LIFT_Y = 0.07;
const TEXTURE_SIZE = 128;
/** 안뜰이 눈밭이라 눈 색으로 냄. */
const SNOW_COLOR = "#eef4fb";
/** 할퀸 자국이 떠 있는 시간(초). 짧아야 날카로워 보임. */
const SLASH_SECONDS = 0.32;
/** 할퀸 자국의 높이(m). 유저 가슴께임. */
const SLASH_HEIGHT = 1.3;
/** 발톱 자국 세 줄의 반지름(m). 부채꼴(3.5 m) 안쪽에 듦. */
const SLASH_CLAW_RADII = [2.05, 2.6, 3.15] as const;
/** 자국 한 줄의 가장 굵은 곳 반폭(m). 양 끝으로 갈수록 가늘어짐. */
const SLASH_CLAW_HALF_WIDTH = 0.12;
/** 자국 한 줄이 덮는 각도(rad). */
const SLASH_ARC_ANGLE = (80 * Math.PI) / 180;
/** 자국이 한쪽에서 반대쪽으로 쓸고 가는 각도(rad). 팔이 지나가는 느낌을 냄. */
const SLASH_SWEEP_ANGLE = (50 * Math.PI) / 180;
const SLASH_ARC_SEGMENTS = 18;
/** 발톱 자국 색. 더하기 혼합이라 밝은 주황으로 빛남. */
const SLASH_COLOR = "#ff9a4d";

interface ActiveShockwave extends BossShockwave {
  startedAt: number;
}

interface ActiveDust extends BossDustPuff {
  startedAt: number;
}

interface ActiveSlash extends BossSlash {
  startedAt: number;
}

interface BossAttackEffectsProps {
  /** 보스 상태. 같은 객체를 제자리에서 고쳐 넘기므로 `useFrame` 안에서만 읽음. */
  bossState: SpaceBossState;
}

// region [Privates]
const easeOutCubic = (ratio: number): number => 1 - (1 - ratio) ** 3;

/** 번호로 뽑는 0…1 난수. 눈덩이마다 방향·세기를 다르게 주되 프레임마다 같아야 함. */
const resolveNoise = (seed: number): number => {
  const value = Math.sin(seed * 127.1) * 43_758.5453;

  return value - Math.floor(value);
};

/** 가운데서 가장자리로 그린 방사형 텍스처. `stops` 는 `[위치, 불투명도]` 임. */
const createRadialTexture = (stops: readonly (readonly [number, number])[]): Texture => {
  const canvasElement = document.createElement("canvas");

  canvasElement.width = TEXTURE_SIZE;
  canvasElement.height = TEXTURE_SIZE;

  const context = canvasElement.getContext("2d");

  if (!context) {
    return new CanvasTexture(canvasElement);
  }

  const center = TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);

  for (const [offset, opacity] of stops) {
    gradient.addColorStop(offset, `rgba(255, 255, 255, ${opacity})`);
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  return new CanvasTexture(canvasElement);
};

/**
 * 발톱 자국 세 줄. 초승달 모양 띠를 한 메시로 합침.
 *
 * 수평면(XZ)에 그림. 앞(−Z)을 가운데로 좌우로 휘고, 양 끝은 폭이 0 으로 줄어듦.
 */
const createSlashGeometry = (): BufferGeometry => {
  const positions: number[] = [];
  const indices: number[] = [];

  SLASH_CLAW_RADII.forEach((radius, clawIndex) => {
    const baseIndex = clawIndex * (SLASH_ARC_SEGMENTS + 1) * 2;

    for (let segment = 0; segment <= SLASH_ARC_SEGMENTS; segment += 1) {
      const ratio = segment / SLASH_ARC_SEGMENTS;
      const angle = (ratio - 0.5) * SLASH_ARC_ANGLE;
      const halfWidth = SLASH_CLAW_HALF_WIDTH * Math.sin(ratio * Math.PI);

      for (const edgeRadius of [radius - halfWidth, radius + halfWidth]) {
        positions.push(Math.sin(angle) * edgeRadius, 0, -Math.cos(angle) * edgeRadius);
      }
      if (segment < SLASH_ARC_SEGMENTS) {
        const vertexIndex = baseIndex + segment * 2;

        indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
        indices.push(vertexIndex + 1, vertexIndex + 3, vertexIndex + 2);
      }
    }
  });

  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  return geometry;
};
// endregion

/**
 * 보스 공격 연출.
 *
 * - 휘두르기: 앞을 쓸고 가는 발톱 자국 세 줄.
 * - 내려찍기: 예고 원 자리에서 고리가 퍼지고 눈덩이가 튐.
 * - 돌진: 박차는 순간 작은 고리, 달리는 길에 눈보라, 멈춰 서며 고리와 눈덩이.
 *
 * 보기만 하는 연출이라 판정과 무관함. 메시를 미리 만들어 두고 돌려 써서 공격 때마다
 * 새로 만들지 않음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function BossAttackEffects({ bossState }: BossAttackEffectsProps): ReactNode {
  // region [Hooks]
  const impactTracker = useMemo(() => createBossImpactTracker(), []);
  /** 가장자리 가까이에만 띠가 있는 고리. */
  const ringTexture = useMemo(
    () => createRadialTexture([[0, 0], [0.55, 0], [0.82, 0.95], [0.94, 0.35], [1, 0]]),
    [],
  );
  /** 가운데가 진한 뭉치. 번쩍임과 눈보라에 같이 씀. */
  const puffTexture = useMemo(() => createRadialTexture([[0, 0.9], [0.5, 0.4], [1, 0]]), []);
  const debrisDummy = useMemo(() => new Object3D(), []);
  const slashGeometry = useMemo(() => createSlashGeometry(), []);
  const slashGroupRef = useRef<Group>(null);
  const slashMaterialRef = useRef<MeshBasicMaterial>(null);
  /** 휘두르기는 겹치지 않아 하나만 둠. */
  const slashRef = useRef<ActiveSlash | null>(null);
  const ringMeshesRef = useRef<(Mesh | null)[]>([]);
  const flashMeshesRef = useRef<(Mesh | null)[]>([]);
  const dustMeshesRef = useRef<(Mesh | null)[]>([]);
  const debrisMeshRef = useRef<InstancedMesh>(null);
  const shockwavesRef = useRef<(ActiveShockwave | null)[]>(Array(SHOCKWAVE_COUNT).fill(null));
  const dustPuffsRef = useRef<(ActiveDust | null)[]>(Array(DUST_COUNT).fill(null));
  const nextShockwaveIndexRef = useRef<number>(0);
  const nextDustIndexRef = useRef<number>(0);
  /** 눈덩이 행렬을 다시 써야 하는지. 처음 한 번은 전부 크기 0 으로 치워야 함. */
  const isDebrisDirtyRef = useRef<boolean>(true);
  // endregion


  // region [Privates]
  /** 새 연출을 빈 자리에 넣음. 꽉 찼으면 가장 오래된 것을 덮음. */
  const collectImpacts = (now: number): void => {
    for (const impact of impactTracker.step(bossState, now)) {
      if (impact.kind === "shockwave") {
        shockwavesRef.current[nextShockwaveIndexRef.current] = { ...impact, startedAt: now };
        nextShockwaveIndexRef.current = (nextShockwaveIndexRef.current + 1) % SHOCKWAVE_COUNT;
      } else if (impact.kind === "dust") {
        dustPuffsRef.current[nextDustIndexRef.current] = { ...impact, startedAt: now };
        nextDustIndexRef.current = (nextDustIndexRef.current + 1) % DUST_COUNT;
      } else {
        slashRef.current = { ...impact, startedAt: now };
      }
    }
  };

  /** 바닥에 깐 판 하나를 놓음. `opacity` 가 0 이하면 숨김. */
  const placeGroundQuad = (
    mesh: Mesh | null,
    x: number,
    z: number,
    diameter: number,
    opacity: number,
  ): void => {
    if (!mesh) {
      return;
    }

    mesh.visible = opacity > 0;

    if (!mesh.visible) {
      return;
    }

    mesh.position.set(x, SPACE_BOSS.arena.floorY + IMPACT_LIFT_Y, z);
    mesh.scale.set(diameter, diameter, 1);
    (mesh.material as MeshBasicMaterial).opacity = opacity;
  };

  /** 충격파 하나에 딸린 눈덩이들을 포물선으로 날림. 끝났거나 없으면 크기 0 으로 치움. */
  const applyDebris = (slot: number, shockwave: ActiveShockwave | null, ratio: number): void => {
    const debrisMesh = debrisMeshRef.current;

    if (!debrisMesh) {
      return;
    }

    const isFlying = shockwave?.hasDebris === true && ratio < 1;
    const seconds = ratio * SHOCKWAVE_SECONDS;

    for (let index = 0; index < DEBRIS_PER_SHOCKWAVE; index += 1) {
      const instanceIndex = slot * DEBRIS_PER_SHOCKWAVE + index;

      if (!isFlying || !shockwave) {
        debrisDummy.scale.setScalar(0);
        debrisDummy.updateMatrix();
        debrisMesh.setMatrixAt(instanceIndex, debrisDummy.matrix);
        continue;
      }

      const angle = ((index + resolveNoise(instanceIndex)) / DEBRIS_PER_SHOCKWAVE) * Math.PI * 2;
      // 고리 안쪽 절반쯤에서 솟아 바깥으로 흩어짐. 큰 충격일수록 멀리 감.
      const startDistance = shockwave.radius * (0.25 + 0.3 * resolveNoise(instanceIndex + 31));
      const outwardSpeed = shockwave.radius * (0.6 + 0.7 * resolveNoise(instanceIndex + 57));
      const upwardSpeed = 4 + 3 * resolveNoise(instanceIndex + 83);
      const distance = startDistance + outwardSpeed * seconds;
      const height = Math.max(0, upwardSpeed * seconds - 0.5 * DEBRIS_GRAVITY * seconds * seconds);

      debrisDummy.position.set(
        shockwave.x + Math.cos(angle) * distance,
        SPACE_BOSS.arena.floorY + height,
        shockwave.z + Math.sin(angle) * distance,
      );
      debrisDummy.rotation.set(seconds * 7 + index, seconds * 5, index);
      debrisDummy.scale.setScalar((0.14 + 0.2 * resolveNoise(instanceIndex + 11)) * (1 - ratio));
      debrisDummy.updateMatrix();
      debrisMesh.setMatrixAt(instanceIndex, debrisDummy.matrix);
    }
  };

  const applyShockwaves = (now: number): void => {
    let hasFlyingDebris = false;

    shockwavesRef.current.forEach((shockwave, slot) => {
      const ratio = shockwave ? (now - shockwave.startedAt) / 1000 / SHOCKWAVE_SECONDS : 1;
      const isActive = shockwave !== null && ratio < 1;
      const diameter = (shockwave?.radius ?? 0) * 2;

      placeGroundQuad(
        ringMeshesRef.current[slot] ?? null,
        shockwave?.x ?? 0,
        shockwave?.z ?? 0,
        diameter * (0.25 + 0.95 * easeOutCubic(ratio)),
        isActive ? 0.85 * (1 - ratio) ** 2 : 0,
      );
      // 번쩍임은 처음 1/3 만. 길면 바닥이 하얗게 떠 보임.
      placeGroundQuad(
        flashMeshesRef.current[slot] ?? null,
        shockwave?.x ?? 0,
        shockwave?.z ?? 0,
        diameter * 0.9,
        isActive ? 0.55 * (1 - ratio * 3) : 0,
      );

      if (isActive && shockwave.hasDebris) {
        hasFlyingDebris = true;
      }
      if (hasFlyingDebris || isDebrisDirtyRef.current) {
        applyDebris(slot, shockwave, ratio);
      }
      if (!isActive) {
        shockwavesRef.current[slot] = null;
      }
    });

    if ((hasFlyingDebris || isDebrisDirtyRef.current) && debrisMeshRef.current) {
      debrisMeshRef.current.instanceMatrix.needsUpdate = true;
      // 날던 게 끝난 프레임에 한 번 더 써서 치움.
      isDebrisDirtyRef.current = hasFlyingDebris;
    }
  };

  const applyDustPuffs = (now: number): void => {
    dustPuffsRef.current.forEach((dustPuff, slot) => {
      const ratio = dustPuff ? (now - dustPuff.startedAt) / 1000 / DUST_SECONDS : 1;
      const isActive = dustPuff !== null && ratio < 1;

      placeGroundQuad(
        dustMeshesRef.current[slot] ?? null,
        dustPuff?.x ?? 0,
        dustPuff?.z ?? 0,
        1.2 + 2.4 * easeOutCubic(ratio),
        isActive ? 0.5 * (1 - ratio) : 0,
      );

      if (!isActive) {
        dustPuffsRef.current[slot] = null;
      }
    });
  };

  /** 발톱 자국을 한쪽에서 반대쪽으로 쓸며 흐리게 함. */
  const applySlash = (now: number): void => {
    const slashGroup = slashGroupRef.current;
    const slashMaterial = slashMaterialRef.current;
    const slash = slashRef.current;

    if (!slashGroup || !slashMaterial) {
      return;
    }

    const ratio = slash ? (now - slash.startedAt) / 1000 / SLASH_SECONDS : 1;

    slashGroup.visible = slash !== null && ratio < 1;

    if (!slash || ratio >= 1) {
      slashRef.current = null;
      return;
    }

    const sweep = (0.5 - easeOutCubic(ratio)) * SLASH_SWEEP_ANGLE;
    const scale = 0.92 + 0.14 * ratio;

    slashGroup.position.set(slash.x, SPACE_BOSS.arena.floorY + SLASH_HEIGHT, slash.z);
    slashGroup.rotation.set(0, slash.yaw + sweep, 0);
    slashGroup.scale.setScalar(scale);
    // 앞 절반은 또렷하게, 뒤 절반에서 사라짐.
    slashMaterial.opacity = Math.min(1, (1 - ratio) * 2);
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    return () => {
      ringTexture.dispose();
      puffTexture.dispose();
      slashGeometry.dispose();
    };
  }, [ringTexture, puffTexture, slashGeometry]);

  useFrame(() => {
    const now = performance.now();

    collectImpacts(now);
    applyShockwaves(now);
    applyDustPuffs(now);
    applySlash(now);
  });
  // endregion

  return (
    <>
      {Array.from({ length: SHOCKWAVE_COUNT }, (_, slot) => (
        <group key={slot}>
          <mesh
            ref={(mesh) => {
              ringMeshesRef.current[slot] = mesh;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
            renderOrder={3}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={ringTexture} color={SNOW_COLOR} transparent depthWrite={false} />
          </mesh>
          <mesh
            ref={(mesh) => {
              flashMeshesRef.current[slot] = mesh;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
            renderOrder={3}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={puffTexture} color={SNOW_COLOR} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}

      {Array.from({ length: DUST_COUNT }, (_, slot) => (
        <mesh
          key={slot}
          ref={(mesh) => {
            dustMeshesRef.current[slot] = mesh;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          renderOrder={3}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={puffTexture} color={SNOW_COLOR} transparent depthWrite={false} />
        </mesh>
      ))}

      {/* 발톱 자국. 살짝 기울여 비스듬히 긋는 것처럼 보이게 함. */}
      <group ref={slashGroupRef} visible={false}>
        <mesh geometry={slashGeometry} rotation={[0, 0, 0.3]} renderOrder={4} frustumCulled={false}>
          <meshBasicMaterial
            ref={slashMaterialRef}
            color={SLASH_COLOR}
            transparent
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
          />
        </mesh>
      </group>

      {/* 눈덩이. 위치가 매번 달라 경계 계산이 안 맞으니 시야 밖 제거를 끔. */}
      <instancedMesh
        ref={debrisMeshRef}
        args={[undefined, undefined, SHOCKWAVE_COUNT * DEBRIS_PER_SHOCKWAVE]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={SNOW_COLOR} />
      </instancedMesh>
    </>
  );
}

const MemoizedBossAttackEffects = memo(BossAttackEffects);
MemoizedBossAttackEffects.displayName = "BossAttackEffects";

export default MemoizedBossAttackEffects;
