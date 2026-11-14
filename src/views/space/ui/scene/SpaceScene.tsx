"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  memo,
  type ReactNode,
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Group, PerspectiveCamera } from "three";
import {
  createFlatTerrain,
  createLocalPlayerState,
  createSpawnPoint,
  type LocalPlayerState,
  type PlayerTransform,
  resolveAvatarCombat,
  resolveColorIndexFromClientKey,
  SPACE_AVATAR_COLLISION_RADIUS,
  SPACE_AVATAR_MODELS,
  SPACE_BOSS,
  SPACE_BOSS_PLAYER,
  SPACE_HALL,
  SPACE_HEATMAP_FRAME,
  SPACE_MENU_FRAME,
  SPACE_SCREEN_FRAME,
  SPACE_SCREEN_PLACEMENTS,
  type SpaceBossAttack,
  type SpaceCelebration,
  type SpacePeer,
  type SpaceTerrain,
} from "@/entities/space";
import {
  applyCameraDrag,
  applyCameraZoom,
  applyKeyboardYaw,
  approachCollisionDistance,
  type CameraOrbit,
  consumePendingDrag,
  consumePendingZoom,
  createBossKnockback,
  createDefaultCameraOrbit,
  createEmptyMovementInput,
  dampVector,
  interpolatePlayerState,
  isKnockbackActive,
  type Knockback,
  planFixedSteps,
  resolveCameraFocus,
  resolveCameraLookTarget,
  resolveCameraPosition,
  resolveFollowDamping,
  resolveMergedMovementInput,
  type SolidBody,
  SPACE_CAMERA,
  SPACE_MOVEMENT,
  type SpaceInputSource,
  separateFromPlayers,
  separateFromSolidBody,
  stepKnockback,
  stepMovement,
  useCoarsePointer,
  usePointerDrag,
  usePrefersReducedMotion,
  type Vector3Like,
} from "@/features/space-controls";
import { useSpaceSessionContext, useSpaceSessionState } from "@/features/space-session";
import { SPACE_BARISTA } from "@/views/space/lib/barista";
import type { BossPhaseSound } from "@/views/space/lib/bossAttackSounds";
import { SPACE_FRAME_PRIORITY } from "@/views/space/lib/framePriority";
import type { LanternAnchor } from "@/views/space/lib/hallModel";
import type { HallTerrain } from "@/views/space/lib/hallTerrain";
import { resolveNameplateLiftY } from "@/views/space/lib/overlayLayout";
import { resolveRemoteSfxGain, type SpaceSfxName } from "@/views/space/lib/spaceSfx";
import { advanceStressDummies, createStressDummies } from "@/views/space/lib/stressDummies";
import type { PlaySpaceSfx } from "@/views/space/model/useSpaceSfx";
import AvatarSwingTrails from "./AvatarSwingTrails";
import BlockDashboard from "./BlockDashboard";
import BossAttackEffects from "./BossAttackEffects";
import BossDamageNumbers from "./BossDamageNumbers";
import ChatBubbles from "./ChatBubbles";
import Hall from "./Hall";
import MenuGraffiti from "./MenuGraffiti";
import Nameplates from "./Nameplates";
import PlayerAvatar from "./PlayerAvatar";
import PlayerDamageNumbers, { type PlayerDamage } from "./PlayerDamageNumbers";
import PriceBillboard from "./PriceBillboard";
import RaidBoss from "./RaidBoss";
import RemoteAvatars, { type RemoteAvatarHit } from "./RemoteAvatars";
import SceneLighting from "./SceneLighting";
import ScreenCelebration from "./ScreenCelebration";
import SelfHealthBar from "./SelfHealthBar";
import SpaceBarista from "./SpaceBarista";
import SpaceHeatmap from "./SpaceHeatmap";
import SpaceTicker from "./SpaceTicker";

interface SpaceSceneProps {
  celebration: SpaceCelebration | null;
  celebrationClockOffsetMs: number | null;
  inputSource: SpaceInputSource;
  clientKey: string;
  nickname: string;
  /** 접속 전에 보여줄 모델. 서버가 확정하면 그 값이 우선함. */
  modelIndex: number;
  hasRealtimeShadows: boolean;
  /** 개발 전용 더미 아바타 수. 더미 측정 중에는 실제 공간 소켓을 열지 않음. */
  dummyCount: number;
  /** 맵 지형이 잡혔을 때. 입장 로딩 오버레이가 기다림. */
  onReadyMap?: () => void;
  /** 내 캐릭터 모델이 올라왔을 때. 입장 로딩 오버레이가 기다림. */
  onReadyAvatar?: () => void;
  /** 효과음을 틂. 소리를 꺼 둔 사람에게는 아무 일도 안 일어남. */
  playSfx: PlaySpaceSfx;
}

const EMPTY_LANTERN_ANCHORS: readonly LanternAnchor[] = [];
/**
 * 휘두르는 소리를 무기가 닿기 이만큼 전에 틂(초).
 *
 * 누른 순간에 틀면 모션이 긴 버거빠따킹은 방망이를 들기도 전에 소리가 남.
 * 닿는 시점이 이보다 늦은 캐릭터는 그 차이만큼 소리를 늦춤. 버거빠따킹(0.45초)이
 * 0.22초 늦게 나도록 맞춘 값이고, 맥시크루는 0.05초라 티가 안 남.
 */
const SWING_SOUND_LEAD_SECONDS = 0.23;
/** 쓰러지는 소리를 늦추는 시간(초). 맞는 순간에는 보스 공격 소리가 가장 커서 겹치면 묻힘. */
const KNOCKOUT_SOUND_DELAY_SECONDS = 0.2;
const BOSS_ATTACK_SFX: Record<SpaceBossAttack, SpaceSfxName> = {
  swipe: "bossSwipe",
  slam: "bossSlam",
  charge: "bossCharge",
  // 전용 음원이 없어 휘두르기 소리를 같이 씀.
  spin: "bossSwipe",
};
const BOSS_PHASE_SFX: Record<BossPhaseSound, SpaceSfxName> = {
  spawn: "bossSpawn",
  enrage: "bossEnrage",
  stagger: "bossStagger",
  dead: "bossDeath",
};
/** 가장 긴 공격 모션(ms). 남의 공격 기록을 이만큼 들고 있다가 지움. */
const LONGEST_ATTACK_MS =
  Math.max(...SPACE_AVATAR_MODELS.map((model) => model.combat.attackSeconds)) * 1000;
/** 남의 피격 기록을 들고 있는 시간(ms). 쓰러졌다 일어나는 모션이 다 끝난 뒤 지움. */
const REMOTE_HIT_KEEP_MS = SPACE_BOSS_PLAYER.respawnDelayMs + 1_000;
/** 밀리는 동안 대신 넣는 빈 입력. 중력·착지는 그대로 돌아감. */
/** 유저 피해 숫자를 명찰 기준점에서 이만큼 위에 띄움(m). 명찰과 체력바를 안 가림. */
const PLAYER_DAMAGE_NUMBER_LIFT_Y = 0.4;
const EMPTY_MOVEMENT_INPUT = createEmptyMovementInput();
/** 바리스타 몸통. 늘 같은 자리에 서 있어 한 번만 만들어 둠. */
const BARISTA_BODY: SolidBody = {
  x: SPACE_BARISTA.x,
  y: SPACE_BARISTA.y,
  z: SPACE_BARISTA.z,
  radius: SPACE_BARISTA.bodyRadius,
  height: SPACE_BARISTA.modelHeight * SPACE_BARISTA.modelScale,
};
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceScene({
  celebration,
  celebrationClockOffsetMs,
  inputSource,
  clientKey,
  nickname,
  modelIndex,
  hasRealtimeShadows,
  dummyCount,
  onReadyMap,
  onReadyAvatar,
  playSfx,
}: SpaceSceneProps): ReactNode {
  // region [Hooks]
  const canvasElement = useThree((rootState) => rootState.gl.domElement);
  const camera = useThree((rootState) => rootState.camera);
  const viewportSize = useThree((rootState) => rootState.size);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isCoarsePointer = useCoarsePointer();
  /**
   * 세션. 동작(`sendKick` 등)은 컨텍스트의 세션에서 부르고, 상태는 씬이 쓰는 조각만 구독함.
   *
   * 통째로 받으면 대화 내역 · 시계 보정 · 전송 대기처럼 씬과 무관한 변화에도 씬 전체가
   * 다시 그려짐.
   */
  const session = useSpaceSessionContext();
  const self = useSpaceSessionState((snapshot) => snapshot.self);
  const sessionRemotePlayers = useSpaceSessionState((snapshot) => snapshot.remotePlayers);
  const rosterRevision = useSpaceSessionState((snapshot) => snapshot.rosterRevision);
  const bubbleMessages = useSpaceSessionState((snapshot) => snapshot.bubbleMessages);
  const presenceStatus = useSpaceSessionState((snapshot) => snapshot.presence.status);
  const canFightBoss = useSpaceSessionState((snapshot) => snapshot.canFightBoss);
  const selfHealth = useSpaceSessionState((snapshot) => snapshot.selfHealth);
  const deadUntil = useSpaceSessionState((snapshot) => snapshot.deadUntil);
  const selfDamagedAt = useSpaceSessionState((snapshot) => snapshot.selfDamagedAt);
  const selfDamagedBy = useSpaceSessionState((snapshot) => snapshot.selfDamagedBy);

  /** 손가락 기기는 가장 멀리 물러나 시작해 전광판과 라운지가 한 화면에 들어오게 함. */
  const initialCameraDistance = isCoarsePointer
    ? SPACE_CAMERA.touchInitialDistance
    : SPACE_CAMERA.defaultDistance;

  const spawnTransform = useMemo(() => createSpawnPoint(clientKey), [clientKey]);
  const colorIndex = useMemo(() => resolveColorIndexFromClientKey(clientKey), [clientKey]);
  const avatarColorIndex = self?.colorIndex ?? colorIndex;
  /** 서버가 확정한 모델을 씀. 접속 전에는 저장된 선택으로 보여줌. */
  const avatarModelIndex = self?.modelIndex ?? modelIndex;
  const dummies = useMemo(() => createStressDummies(dummyCount), [dummyCount]);
  const remotePlayers = dummyCount > 0 ? dummies : sessionRemotePlayers;
  /** 1단계는 빈 슬롯임. 3단계에서 라이트닝 결제로 채움. */

  const playerStateRef = useRef<LocalPlayerState>(createLocalPlayerState(spawnTransform));
  const cameraOrbitRef = useRef<CameraOrbit>(
    createDefaultCameraOrbit(spawnTransform.yaw, initialCameraDistance),
  );
  const smoothedCameraRef = useRef<Vector3Like>(
    resolveCameraPosition(spawnTransform, cameraOrbitRef.current),
  );
  const accumulatedSecondsRef = useRef<number>(0);
  /** 마지막 걸음을 떼기 직전의 상태. 그릴 자리를 이 상태와 지금 상태 사이에서 구함. */
  const previousStepStateRef = useRef<LocalPlayerState>(playerStateRef.current);
  /**
   * 화면에 그리는 내 상태. 걸음 사이를 이은 값이라 `playerStateRef` 보다 한 걸음 안에서 뒤처짐.
   *
   * 아바타·카메라·명찰처럼 보이는 것은 전부 이걸 씀. 섞어 쓰면 서로 어긋나 떨림.
   * 판정·충돌·서버 전송은 `playerStateRef` 를 씀.
   */
  const renderStateRef = useRef<LocalPlayerState>(playerStateRef.current);
  const playerGroupRef = useRef<Group>(null);
  /** 보스 공격에 맞아 밀리는 중이면 그 밀림. 끝났거나 안 맞았으면 `null`. */
  const knockbackRef = useRef<Knockback | null>(null);
  /** 이미 밀림으로 옮긴 피격 시각. 같은 피격으로 두 번 밀지 않음. */
  const handledDamageAtRef = useRef<number | null>(null);
  /** 쓰러지는 소리를 낸 `deadUntil`. 쓰러질 때마다 한 번만 냄. */
  const soundedDeadUntilRef = useRef<number | null>(null);
  /** 내가 발차기를 시작한 시각. 아바타가 이걸로 동작을 재생함. */
  const kickStartedAtRef = useRef<number | undefined>(undefined);
  /** 다른 사람이 발차기를 시작한 시각(좌석별). 끝난 건 지움. */
  const remoteKickStartsRef = useRef(new Map<number, number>());
  /** 다른 사람이 보스에게 맞은 시각(좌석별). 쓰러졌으면 일어나는 시각도 같이 둠. */
  const remoteHitsRef = useRef(new Map<number, RemoteAvatarHit>());
  /** 보스에게 맞아 아직 숫자로 안 띄운 피해. `PlayerDamageNumbers` 가 비움. */
  const pendingPlayerDamagesRef = useRef<PlayerDamage[]>([]);
  /**
   * 지형 질의.
   *
   * GLB 가 도착하기 전에는 홀 바닥 높이의 평지임. 그 사이에도 걸을 수 있고,
   * 맵이 붙는 순간 발밑이 실제 지형으로 바뀜. 상태가 아니라 ref 인 이유는
   * `useFrame` 안에서만 읽기 때문임 — 상태로 올리면 맵 도착이 씬 전체
   * 리렌더가 됨.
   */
  const terrainRef = useRef<SpaceTerrain>(createFlatTerrain());
  /** 카메라 충돌용. 지형과 달리 평지 대체본이 없어 도착 전에는 건너뜀. */
  const hallTerrainRef = useRef<HallTerrain | null>(null);
  /**
   * 지형이 허용하는 카메라 거리 상한. 막히면 즉시 줄고 풀리면 천천히 늚.
   *
   * 최대 거리로 시작함. 0 으로 두면 첫 프레임에 카메라가 머리에 붙었다가
   * 밀려 나오는 것이 보임.
   */
  const allowedCameraDistanceRef = useRef<number>(SPACE_CAMERA.maxDistance);
  /**
   * 랜턴 자리.
   *
   * 조명 컴포넌트가 `props` 로 받아야 해서 여기서는 상태로 둠. 맵이 도착할
   * 때 한 번만 바뀌고, 그 한 번은 조명이 실제로 다시 그려져야 하는 순간임.
   */
  const [lanternAnchors, setLanternAnchors] =
    useState<readonly LanternAnchor[]>(EMPTY_LANTERN_ANCHORS);

  usePointerDrag(inputSource, canvasElement);
  // endregion

  /** 서버 보정으로 볼 최소 거리(m). 좌표를 1 cm 로 접어 보내므로 그보다 크게 잡음. */
  const SERVER_CORRECTION_THRESHOLD = 0.05;

  // region [Privates]
  const applyServerTransform = useCallback((peer: SpacePeer): void => {
    playerStateRef.current = createLocalPlayerState(peer);
    previousStepStateRef.current = playerStateRef.current;
    renderStateRef.current = playerStateRef.current;
    accumulatedSecondsRef.current = 0;
    smoothedCameraRef.current = resolveCameraPosition(peer, cameraOrbitRef.current);
    // 순간이동 뒤에는 옛 상한에서 천천히 풀릴 이유가 없음.
    allowedCameraDistanceRef.current = SPACE_CAMERA.maxDistance;
    playerGroupRef.current?.position.set(peer.x, peer.y, peer.z);
    playerGroupRef.current?.rotation.set(0, peer.yaw, 0);
  }, []);

  const advanceCameraOrbit = (deltaSeconds: number): CameraOrbit => {
    const { deltaX, deltaY } = consumePendingDrag(inputSource);
    const draggedOrbit = applyCameraDrag(cameraOrbitRef.current, deltaX, deltaY);
    const zoomedOrbit = applyCameraZoom(draggedOrbit, consumePendingZoom(inputSource));
    const nextOrbit =
      inputSource.yawDirection === 0
        ? zoomedOrbit
        : applyKeyboardYaw(zoomedOrbit, inputSource.yawDirection, deltaSeconds);

    cameraOrbitRef.current = nextOrbit;

    return nextOrbit;
  };

  /**
   * 지금 몸으로 막고 서 있는 보스. 막지 않을 때는 `null`.
   *
   * 없거나 쓰러진 보스는 안 막음. **돌진 중에도 안 막음** — 막으면 보스 앞에 선 사람이
   * 12 m/s 로 9 m 를 밀려가는데, 서버의 이동 속도 상한(8.5 m/s)을 넘어 이동이 반려되고
   * 화면이 되감김. 돌진은 몸으로 밀지 않고 치고 지나감(피해는 서버가 줌).
   */
  const resolveBossBody = (): SolidBody | null => {
    const bossState = canFightBoss ? session.bossState : null;

    if (
      !bossState ||
      bossState.phase === "hidden" ||
      bossState.phase === "dead" ||
      bossState.attack === "charge"
    ) {
      return null;
    }

    return {
      x: bossState.x,
      y: SPACE_BOSS.arena.floorY,
      z: bossState.z,
      radius: SPACE_BOSS.bodyRadius,
      height: SPACE_BOSS.height,
    };
  };

  /**
   * 보스에게 쓰러져 리스폰을 기다리는 중인지.
   *
   * 서버가 이 동안 이동·공격을 안 받음. 화면에서만 움직이면 끝났을 때 서버 자리로 되감김.
   */
  const isKnockedOut = (now: number): boolean => {
    return deadUntil !== null && now < deadUntil;
  };

  /**
   * 서버가 새로 알려 준 피격이 있으면 뒤로 밀리기 시작함.
   *
   * 서버 프레임을 받은 뒤에 밀어서 판정과 어긋나지 않음. 쓰러진 피격은 안 밂 — 곧바로
   * 홀로 옮겨지는데 그 전에 밀리면 리스폰 자리에서 미끄러져 보임.
   */
  const startKnockbackIfDamaged = (): void => {
    if (selfDamagedAt === handledDamageAtRef.current) {
      return;
    }
    handledDamageAtRef.current = selfDamagedAt;

    if (selfDamagedAt !== null) {
      playSfx("hurt");
    }
    if (selfDamagedAt === null || selfDamagedBy === null || selfHealth <= 0) {
      return;
    }
    knockbackRef.current = createBossKnockback(
      selfDamagedBy,
      session.bossState,
      playerStateRef.current,
    );
  };

  const advancePlayerState = (
    cameraYaw: number,
    deltaSeconds: number,
    now: number,
  ): LocalPlayerState => {
    if (isKnockedOut(now)) {
      knockbackRef.current = null;
      // 쓰러뜨린 피격은 여기서 받음. 서버가 체력 0 과 리스폰을 연달아 보내서, 다음 프레임에는
      // 이미 쓰러진 상태라 아래 `startKnockbackIfDamaged` 까지 못 감. 여기서 처리해 두지 않으면
      // 일어난 뒤에 묵은 피격으로 뒤늦게 밀림.
      handledDamageAtRef.current = selfDamagedAt;
      // 소리는 피격이 아니라 쓰러진 것 자체에 묶음. 보스 공격 소리에 묻히지 않게 조금 늦춤.
      if (soundedDeadUntilRef.current !== deadUntil) {
        soundedDeadUntilRef.current = deadUntil;
        playSfx("knockout", KNOCKOUT_SOUND_DELAY_SECONDS);
      }
      // 쌓인 시간을 버림. 안 버리면 일어나는 순간 밀린 걸음을 한꺼번에 걸음.
      accumulatedSecondsRef.current = 0;
      previousStepStateRef.current = playerStateRef.current;

      return playerStateRef.current;
    }

    startKnockbackIfDamaged();

    const knockback = knockbackRef.current;
    // 밀리는 동안에는 조작을 안 받음. 내 걸음이 더해지면 서버 속도 상한을 넘김.
    const movementInput = isKnockbackActive(knockback)
      ? EMPTY_MOVEMENT_INPUT
      : resolveMergedMovementInput(inputSource);
    const bossBody = resolveBossBody();

    accumulatedSecondsRef.current += deltaSeconds;

    const stepPlan = planFixedSteps(accumulatedSecondsRef.current);
    accumulatedSecondsRef.current = stepPlan.remainder;

    let nextState = playerStateRef.current;
    const selfSeat = self?.seat ?? 0;

    for (let stepIndex = 0; stepIndex < stepPlan.stepCount; stepIndex += 1) {
      previousStepStateRef.current = nextState;
      nextState = stepMovement(nextState, movementInput, cameraYaw, undefined, terrainRef.current);
      if (isKnockbackActive(knockback)) {
        nextState = stepKnockback(
          nextState,
          knockback,
          SPACE_MOVEMENT.fixedTimeStep,
          terrainRef.current,
        );
      }
      // 화면에 보이는 위치 기준으로 겹친 만큼 나만 비킴.
      nextState = separateFromPlayers(
        nextState,
        remotePlayers,
        selfSeat,
        SPACE_MOVEMENT.fixedTimeStep,
        terrainRef.current,
      );
      // 보스 몸통은 밀고 지나갈 수 없음.
      nextState = separateFromSolidBody(
        nextState,
        bossBody,
        SPACE_AVATAR_COLLISION_RADIUS,
        selfSeat,
        SPACE_MOVEMENT.fixedTimeStep,
        terrainRef.current,
      );
      // 바리스타도 겹쳐 설 수 없음. 서버에는 없는 NPC 라 내 화면에서만 막음.
      nextState = separateFromSolidBody(
        nextState,
        BARISTA_BODY,
        SPACE_AVATAR_COLLISION_RADIUS,
        selfSeat,
        SPACE_MOVEMENT.fixedTimeStep,
        terrainRef.current,
      );
    }

    playerStateRef.current = nextState;

    return nextState;
  };

  /**
   * 남이 휘두르는 소리. 거리에 따라 작게 내고, 내 것과 같이 무기가 닿기 조금 전에 틂.
   *
   * 시작 시각은 서버가 알려 준 값이라 받았을 때 이미 조금 지나 있음. 그만큼 덜 기다림.
   */
  const playRemoteSwing = (seat: number, startedAt: number, now: number): void => {
    const kicker = remotePlayers.find((player) => player.seat === seat);

    if (!kicker) {
      return;
    }
    const { impactSeconds } = resolveAvatarCombat(kicker.modelIndex);
    const elapsedSeconds = (now - startedAt) / 1000;

    playSfx(
      "swing",
      impactSeconds - SWING_SOUND_LEAD_SECONDS - elapsedSeconds,
      resolveRemoteSfxGain(playerStateRef.current, kicker),
    );
  };

  /**
   * 남이 시작한 공격 동작을 받아 둠. 상대 동작도 같은 시작 시각으로 재생함.
   *
   * 내가 찬 건 누른 순간 이미 재생해서 서버가 되돌려준 동작은 무시함. 유저끼리는
   * 맞지 않음. 동작만 보임.
   */
  const applyReceivedKicks = (now: number): void => {
    const selfSeat = self?.seat;

    for (const event of session.drainKickEvents()) {
      if (event.from !== selfSeat) {
        remoteKickStartsRef.current.set(event.from, event.startedAt);
        playRemoteSwing(event.from, event.startedAt, now);
      }
    }

    const animationMs = LONGEST_ATTACK_MS;
    for (const [seat, startedAt] of remoteKickStartsRef.current) {
      if (now - startedAt > animationMs) {
        remoteKickStartsRef.current.delete(seat);
      }
    }
  };

  /**
   * 발차기 입력을 처리함. 쿨다운이면 버림.
   *
   * 누른 순간 내 화면에서 바로 재생함. 서버 왕복을 기다리면 조작이 굼떠 보임.
   */
  const handleKickInput = (now: number, playerState: LocalPlayerState): void => {
    if (!inputSource.isKickRequested) {
      return;
    }
    inputSource.isKickRequested = false;

    if (now < inputSource.kickCooldownUntil || isKnockedOut(now)) {
      return;
    }
    // 전송에 실패해도 내 화면에서는 휘두름. 재접속 중에 버튼이 먹통으로 보였음.
    session.sendKick(playerState);
    // 쿨다운은 캐릭터마다 다름. 서버도 같은 표로 한 번 더 막음.
    const { cooldownMs, impactSeconds } = resolveAvatarCombat(avatarModelIndex);

    playSfx("swing", impactSeconds - SWING_SOUND_LEAD_SECONDS);

    inputSource.kickCooldownMs = cooldownMs;
    inputSource.kickCooldownUntil = now + cooldownMs;
    kickStartedAtRef.current = now;
  };

  /** 맞은 사람 머리 위에 피해 숫자를 띄움. 명찰을 안 가리게 그 위에서 뜸. */
  const queuePlayerDamage = (
    damage: number | undefined,
    isMine: boolean,
    victim: PlayerTransform,
    victimModelIndex: number,
  ): void => {
    // 피해를 안 싣는 옛 서버면 숫자 없이 모션만 틂.
    if (damage === undefined) {
      return;
    }
    pendingPlayerDamagesRef.current.push({
      damage,
      isMine,
      x: victim.x,
      y: victim.y + resolveNameplateLiftY(victimModelIndex) + PLAYER_DAMAGE_NUMBER_LIFT_Y,
      z: victim.z,
    });
  };

  /**
   * 보스에게 맞은 것을 받아 둠. 피해 숫자를 띄우고, 남이면 그 사람 아바타가 움찔하거나 쓰러짐.
   *
   * 쓰러진 사람은 서버가 잠시 뒤 홀로 옮김. 그때까지 그 자리에 누워 있다가, 옮겨진
   * 자리에서 일어나는 모션이 이어짐(내 화면의 내 캐릭터와 같은 흐름).
   */
  const applyReceivedPlayerHits = (now: number): void => {
    for (const event of session.drainPlayerHits()) {
      // 내 체력·모션·소리는 `hp` 프레임이 맡음. 여기서는 숫자만 띄움.
      if (event.seat === self?.seat) {
        queuePlayerDamage(event.damage, true, renderStateRef.current, avatarModelIndex);
        continue;
      }
      const victim = remotePlayers.find((player) => player.seat === event.seat);

      if (victim) {
        queuePlayerDamage(event.damage, false, victim, victim.modelIndex);
        playSfx(
          event.isFatal ? "knockout" : "hurt",
          0,
          resolveRemoteSfxGain(playerStateRef.current, victim),
        );
      }
      remoteHitsRef.current.set(event.seat, {
        hitAt: event.hitAt,
        knockedOutUntil: event.isFatal
          ? event.hitAt + SPACE_BOSS_PLAYER.respawnDelayMs
          : undefined,
      });
    }

    for (const [seat, hit] of remoteHitsRef.current) {
      if (now - hit.hitAt > REMOTE_HIT_KEEP_MS) {
        remoteHitsRef.current.delete(seat);
      }
    }
  };

  const resetKickPresentation = (): void => {
    remoteKickStartsRef.current.clear();
    remoteHitsRef.current.clear();
    pendingPlayerDamagesRef.current = [];
  };

  const applyPlayerTransform = (playerState: LocalPlayerState): void => {
    const playerGroup = playerGroupRef.current;

    if (!playerGroup) {
      return;
    }

    playerGroup.position.set(playerState.x, playerState.y, playerState.z);
    playerGroup.rotation.set(0, playerState.yaw, 0);
  };

  /**
   * 맵 밖으로 빠진 플레이어를 스폰 지점으로 되돌림.
   *
   * 지형이 발밑에 아무것도 없다고 하면(`-Infinity`) 그대로 떨어지는데, 라운지
   * 바닥보다 내려간 순간이 그 신호임. 맵에 뚫린 구멍이 어디든 한 곳에서 받아냄.
   *
   * **`publishMovement` 보다 먼저 돌아야 함.** 서버는 `y < 0` 을 거절하므로
   * 음수 좌표가 한 번이라도 나가면 이동이 반려되고 화면이 튐.
   *
   * 카메라 궤도의 yaw 도 스폰 방향으로 돌림. 거리·피치는 사용자가 맞춰 둔
   * 값이라 건드리지 않음.
   */
  const resolveFallOut = (playerState: LocalPlayerState): LocalPlayerState => {
    if (playerState.y >= SPACE_HALL.fallResetY) {
      return playerState;
    }

    const respawned = createLocalPlayerState(spawnTransform);

    playerStateRef.current = respawned;
    previousStepStateRef.current = respawned;
    accumulatedSecondsRef.current = 0;
    cameraOrbitRef.current = { ...cameraOrbitRef.current, yaw: spawnTransform.yaw };
    smoothedCameraRef.current = resolveCameraPosition(spawnTransform, cameraOrbitRef.current);
    allowedCameraDistanceRef.current = SPACE_CAMERA.maxDistance;
    applyPlayerTransform(respawned);

    return respawned;
  };

  /**
   * 지형을 파고들지 않는 카메라 위치.
   *
   * 감쇠 **뒤에** 걺. 감쇠 전에 걸면 목표만 당겨지고 실제 카메라는 한 박자
   * 늦게 따라와서, 벽에 붙는 순간 한 프레임 동안 벽 안이 보임.
   *
   * 지형이 허용하는 **거리 상한**을 따로 들고 비대칭으로 따라감. 당길 때는
   * 즉시, 풀 때는 감쇠임. 기둥·부스 옆을 지날 때 카메라가 튕기는 것이
   * 멀미의 주범이라 푸는 쪽만 늦춤. 사용자가 줌을 바꾼 거리는 이 상한과
   * 무관하게 `Math.min` 으로 그대로 반영됨 — 상한에 감쇠를 걸었다고
   * 줌아웃까지 늦어지면 조작이 둔해짐.
   */
  const resolveSafeCameraPosition = (
    focus: Vector3Like,
    position: Vector3Like,
    deltaSeconds: number,
  ): Vector3Like => {
    const offsetX = position.x - focus.x;
    const offsetY = position.y - focus.y;
    const offsetZ = position.z - focus.z;
    const desiredDistance = Math.hypot(offsetX, offsetY, offsetZ);

    if (desiredDistance < 1e-3) {
      return position;
    }

    const blocked =
      hallTerrainRef.current?.resolveCameraPosition(focus, position, SPACE_CAMERA.boundaryMargin) ??
      position;
    const blockedDistance = Math.hypot(
      blocked.x - focus.x,
      blocked.y - focus.y,
      blocked.z - focus.z,
    );
    const allowedDistance = approachCollisionDistance(
      allowedCameraDistanceRef.current,
      blockedDistance,
      deltaSeconds,
    );

    allowedCameraDistanceRef.current = allowedDistance;

    const scale = Math.min(desiredDistance, allowedDistance) / desiredDistance;

    return {
      x: focus.x + offsetX * scale,
      y: focus.y + offsetY * scale,
      z: focus.z + offsetZ * scale,
    };
  };
  // endregion


  // region [Events]
  const onReadyTerrain = useCallback(
    (terrain: HallTerrain): void => {
      hallTerrainRef.current = terrain;
      onReadyMap?.();
    },
    [onReadyMap],
  );

  const onReadyLanterns = useCallback((anchors: readonly LanternAnchor[]): void => {
    setLanternAnchors(anchors);
  }, []);

  /** 보스 공격 소리는 안뜰에 나와 있는 사람에게만 냄. 홀 안까지 울리면 뜬금없음. */
  const onBossAttackSound = useCallback(
    (attack: SpaceBossAttack): void => {
      const selfPosition = session.getSelfPosition();

      if (selfPosition && selfPosition.x > SPACE_BOSS_PLAYER.hallMaximumX) {
        playSfx(BOSS_ATTACK_SFX[attack]);
      }
    },
    [playSfx, session.getSelfPosition],
  );

  /** 등장·포효 같은 소리도 안뜰에서만 냄. */
  const onBossPhaseSound = useCallback(
    (phase: BossPhaseSound): void => {
      const selfPosition = session.getSelfPosition();

      if (selfPosition && selfPosition.x > SPACE_BOSS_PLAYER.hallMaximumX) {
        playSfx(BOSS_PHASE_SFX[phase]);
      }
    },
    [playSfx, session.getSelfPosition],
  );

  const onHitBossByMe = useCallback((): void => {
    playSfx("hit");
  }, [playSfx]);

  /** 남이 보스를 때린 소리는 보스가 선 자리에서 나는 것으로 봄. */
  const onHitBossByOthers = useCallback((): void => {
    playSfx("hit", 0, resolveRemoteSfxGain(playerStateRef.current, session.bossState));
  }, [playSfx, session.bossState]);
  // endregion


  // region [Life Cycles]
  useLayoutEffect(() => {
    // 첫 프레임이 원점에서 날아오지 않도록 카메라를 스폰 지점 궤도에 미리 둠.
    const initialPosition = smoothedCameraRef.current;
    const initialFocus = resolveCameraFocus(spawnTransform);
    const initialLookTarget = resolveCameraLookTarget(
      initialFocus,
      initialPosition,
      cameraOrbitRef.current.pitch,
    );

    camera.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
    camera.lookAt(initialLookTarget.x, initialLookTarget.y, initialLookTarget.z);
    // 브라우저 기본 제스처가 드래그 회전을 가로채지 않게 함.
    canvasElement.style.touchAction = "none";
  }, [camera, canvasElement, spawnTransform]);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) {
      return;
    }

    const { width, height } = viewportSize;
    const framingShift = isCoarsePointer
      ? SPACE_CAMERA.touchFramingShift
      : SPACE_CAMERA.desktopFramingShift;

    // 렌즈를 위로 옮기면 화면 속 아바타가 아래로 내려감. 크기가 바뀔 때마다 다시 맞춤.
    if (framingShift > 0 && width > 0 && height > 0) {
      camera.setViewOffset(width, height, 0, -height * framingShift, width, height);
    } else {
      camera.clearViewOffset();
    }

    camera.updateProjectionMatrix();
  }, [camera, viewportSize, isCoarsePointer]);

  useLayoutEffect(() => {
    if (!self) {
      return;
    }
    // 닉네임만 바뀐 peer 프레임에 위치를 되감으면 캐릭터가 뒤로 튐. 서버가
    // 이동을 거절했을 때만 좌표가 실제로 달라지므로 양자화 오차로 가름.
    const state = playerStateRef.current;
    const gap = Math.hypot(self.x - state.x, self.y - state.y, self.z - state.z);

    if (gap > SERVER_CORRECTION_THRESHOLD) {
      applyServerTransform(self);
    }
  }, [self, applyServerTransform]);

  useLayoutEffect(() => {
    resetKickPresentation();
  }, [presenceStatus, self?.seat]);

  useFrame(({ clock }, deltaSeconds) => {
    session.sampleRemotePlayers(performance.now());
    if (dummies.length > 0) {
      advanceStressDummies(dummies, clock.elapsedTime);
    }

    const now = performance.now();
    applyReceivedKicks(now);
    applyReceivedPlayerHits(now);

    const cameraOrbit = advanceCameraOrbit(deltaSeconds);
    const steppedState = advancePlayerState(cameraOrbit.yaw, deltaSeconds, now);

    // 맵 밖으로 빠졌으면 여기서 스폰으로 되돌아옴. 되돌린 궤도를 쓰려고 아래
    // 카메라 계산은 지역 변수가 아니라 ref 를 다시 읽음.
    const playerState = resolveFallOut(steppedState);

    // 공격은 위치를 바로 보내서 되돌린 뒤에 처리함. 음수 높이가 나가면 서버가 반려함.
    handleKickInput(now, playerState);
    session.publishMovement(playerState);
    if (canFightBoss) {
      session.sampleBoss(now);
    }

    // 그리는 자리는 걸음 사이를 이음. 걸음 결과를 그대로 그리면 프레임마다 가는 거리가 달라 덜컥거림.
    const renderState = interpolatePlayerState(
      previousStepStateRef.current,
      playerState,
      accumulatedSecondsRef.current / SPACE_MOVEMENT.fixedTimeStep,
    );

    renderStateRef.current = renderState;
    applyPlayerTransform(renderState);

    const focus = resolveCameraFocus(renderState);
    const targetPosition = resolveCameraPosition(renderState, cameraOrbitRef.current);
    const dampedPosition = dampVector(
      smoothedCameraRef.current,
      targetPosition,
      resolveFollowDamping(prefersReducedMotion),
      deltaSeconds,
    );
    smoothedCameraRef.current = dampedPosition;

    const safePosition = resolveSafeCameraPosition(focus, dampedPosition, deltaSeconds);
    camera.position.set(safePosition.x, safePosition.y, safePosition.z);

    // 궤도 한계보다 위를 보면 카메라는 멈추고 시선만 듦. 벽 충돌은 위에서 머리
    // 기준으로 이미 끝났으니 바라보는 방향만 바꿈.
    const lookTarget = resolveCameraLookTarget(focus, safePosition, cameraOrbitRef.current.pitch);
    camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
  }, SPACE_FRAME_PRIORITY.simulation);
  // endregion

  return (
    <>
      <SceneLighting
        hasRealtimeShadows={hasRealtimeShadows}
        playerStateRef={playerStateRef}
        lanternAnchors={lanternAnchors}
      />

      {/*
        맵은 따로 매달아 둔다. Draco 를 푸는 동안 씬 전체가 멈추면 아바타도
        안 보임. 그 사이 발밑은 홀 바닥 높이의 평지라 걸어다닐 수는 있다.
      */}
      <Suspense fallback={null}>
        <Hall
          terrainRef={terrainRef}
          onReadyTerrain={onReadyTerrain}
          onReadyLanterns={onReadyLanterns}
        />
      </Suspense>

      {/* 메인 전광판 액자(28 × 10.5) 왼쪽 반쪽에 시세판을 끼움. */}
      <group
        position={SPACE_SCREEN_PLACEMENTS.billboard.position}
        rotation={[0, SPACE_SCREEN_PLACEMENTS.billboard.rotationY, 0]}
        scale={SPACE_SCREEN_PLACEMENTS.billboard.scale}
      >
        <PriceBillboard />
      </group>

      {/* 액자 위 가로 띠(28 × 2)에 지표 티커를 흘림. */}
      <SpaceTicker />

      <SpaceHeatmap />
      <ScreenCelebration
        celebration={celebration}
        clockOffsetMs={celebrationClockOffsetMs}
        frame={SPACE_SCREEN_FRAME}
      />
      <ScreenCelebration
        celebration={celebration}
        clockOffsetMs={celebrationClockOffsetMs}
        frame={SPACE_HEATMAP_FRAME}
      />

      {/* 같은 액자 오른쪽 반쪽에 네트워크 현황판을 끼움. */}
      <group
        position={SPACE_SCREEN_PLACEMENTS.blockDashboard.position}
        rotation={[0, SPACE_SCREEN_PLACEMENTS.blockDashboard.rotationY, 0]}
        scale={SPACE_SCREEN_PLACEMENTS.blockDashboard.scale}
      >
        <BlockDashboard />
      </group>

      {/* 커피 바 메뉴판 자리(6 × 2.5)에 분필 낙서판을 끼움. */}
      <group position={SPACE_MENU_FRAME.position} rotation={[0, SPACE_MENU_FRAME.rotationY, 0]}>
        <MenuGraffiti />
      </group>

      <group ref={playerGroupRef}>
        {/*
          아바타를 처음 받는 모델로 바꾸면 여기서 서스펜드함. 경계가 없으면 씬
          전체가 비고, 있으면 아바타만 잠깐 빠짐.
        */}
        <Suspense fallback={null}>
          <PlayerAvatar
            colorIndex={avatarColorIndex}
            modelIndex={avatarModelIndex}
            hasRealtimeShadows={hasRealtimeShadows}
            playerStateRef={playerStateRef}
            kickStartedAtRef={kickStartedAtRef}
            damagedAt={selfDamagedAt}
            knockedOutUntil={deadUntil}
            onReady={onReadyAvatar}
          />
        </Suspense>
      </group>

      {/* 보스 모델을 받는 동안 씬이 비지 않게 따로 매달아 둠. */}
      {canFightBoss && (
        <Suspense fallback={null}>
          <RaidBoss bossState={session.bossState} getBossHealth={session.getBossHealth} />
        </Suspense>
      )}

      {canFightBoss && (
        <BossAttackEffects
          bossState={session.bossState}
          onAttackSound={onBossAttackSound}
          onPhaseSound={onBossPhaseSound}
        />
      )}

      {canFightBoss && (
        <BossDamageNumbers
          bossState={session.bossState}
          drainBossHits={session.drainBossHits}
          selfSeat={self?.seat}
          onHitByMe={onHitBossByMe}
          onHitByOthers={onHitBossByOthers}
        />
      )}

      {canFightBoss && <PlayerDamageNumbers pendingRef={pendingPlayerDamagesRef} />}

      {/* 모델을 받는 동안 씬 전체가 멈추지 않게 따로 감쌈. */}
      <Suspense fallback={null}>
        <SpaceBarista isCoarsePointer={isCoarsePointer} />
      </Suspense>
      <AvatarSwingTrails
        selfTransformRef={renderStateRef}
        selfModelIndex={avatarModelIndex}
        selfKickStartedAtRef={kickStartedAtRef}
        remotePlayers={remotePlayers}
        remoteKickStartsRef={remoteKickStartsRef}
      />
      <RemoteAvatars
        players={remotePlayers}
        rosterRevision={rosterRevision}
        terrainRef={terrainRef}
        kickStartsRef={remoteKickStartsRef}
        hitsRef={remoteHitsRef}
      />
      <Nameplates
        players={remotePlayers}
        selfNickname={nickname}
        selfModelIndex={avatarModelIndex}
        isCoarsePointer={isCoarsePointer}
        rosterRevision={rosterRevision}
        viewerTransformRef={renderStateRef}
      />
      <SelfHealthBar
        modelIndex={avatarModelIndex}
        isCoarsePointer={isCoarsePointer}
        viewerTransformRef={renderStateRef}
      />
      <ChatBubbles
        messages={bubbleMessages}
        isCoarsePointer={isCoarsePointer}
        players={remotePlayers}
        self={self}
        viewerTransformRef={renderStateRef}
      />
    </>
  );
}

const MemoizedSpaceScene = memo(SpaceScene);
MemoizedSpaceScene.displayName = "SpaceScene";

export default MemoizedSpaceScene;
