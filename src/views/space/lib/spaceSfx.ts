import { toVersionedAudioUrl } from "./audioAssetUrl";

/**
 * 스페이스 효과음. 배경음악과 달리 짧은 소리를 겹쳐 틀어서 Web Audio 로 냄.
 *
 * `<audio>` 는 같은 소리를 겹쳐 못 틀고 시작이 늦음. 연타하는 타격음에는 못 씀.
 * 음원은 다 합쳐 수백 KB 라 배경음악처럼 CDN 으로 빼지 않고 `public/` 에 둠.
 */

export type SpaceSfxName =
  | "swing"
  | "hit"
  | "hurt"
  | "knockout"
  | "bossSwipe"
  | "bossSlam"
  | "bossCharge"
  | "bossSpawn"
  | "bossEnrage"
  | "bossStagger"
  | "bossDeath"
  | "victory";

interface SpaceSfxSource {
  src: string;
  /** 0 ~ 1. 음원마다 녹음 크기가 달라 따로 맞춤. */
  volume: number;
}

/** `boss-slam` 만 직접 가져온 음원이고 나머지는 ElevenLabs Sound Effects 로 만들었음. */
export const SPACE_SFX: Record<SpaceSfxName, SpaceSfxSource> = {
  swing: { src: toVersionedAudioUrl("/audio/space-sfx/swing.mp3"), volume: 0.18 },
  hit: { src: toVersionedAudioUrl("/audio/space-sfx/hit.mp3"), volume: 0.4 },
  hurt: { src: toVersionedAudioUrl("/audio/space-sfx/hurt.mp3"), volume: 0.45 },
  bossSwipe: { src: toVersionedAudioUrl("/audio/space-sfx/boss-swipe.mp3"), volume: 0.4 },
  bossSlam: { src: toVersionedAudioUrl("/audio/space-sfx/boss-slam.mp3"), volume: 0.45 },
  bossCharge: { src: toVersionedAudioUrl("/audio/space-sfx/boss-charge.mp3"), volume: 0.3 },
  knockout: { src: toVersionedAudioUrl("/audio/space-sfx/knockout.mp3"), volume: 0.5 },
  bossSpawn: { src: toVersionedAudioUrl("/audio/space-sfx/boss-spawn.mp3"), volume: 0.4 },
  bossEnrage: { src: toVersionedAudioUrl("/audio/space-sfx/boss-enrage.mp3"), volume: 0.4 },
  bossStagger: { src: toVersionedAudioUrl("/audio/space-sfx/boss-stagger.mp3"), volume: 0.35 },
  bossDeath: { src: toVersionedAudioUrl("/audio/space-sfx/boss-death.mp3"), volume: 0.4 },
  victory: { src: toVersionedAudioUrl("/audio/space-sfx/victory.mp3"), volume: 0.3 },
};

/**
 * 남이 낸 소리의 크기. 내 소리를 1 로 봤을 때의 비율임.
 *
 * 가까이서도 내 소리의 절반만 냄. 여럿이 같이 때리면 내 타격음이 묻혀서 내가 때리는지
 * 알 수 없게 됨. `fullDistance` 안에서는 그 크기 그대로고, `silentDistance` 에서 0 이 됨.
 */
export const SPACE_REMOTE_SFX = {
  gain: 0.5,
  fullDistance: 4,
  silentDistance: 18,
} as const;

/** 남이 낸 같은 소리를 동시에 겹쳐 트는 상한. 여럿이 연타해도 소리가 뭉개지지 않게 함. */
export const MAXIMUM_SFX_VOICES_PER_NAME = 3;

interface SfxPoint {
  x: number;
  z: number;
}

/** 듣는 사람과 소리 난 자리의 거리로 남의 소리 크기를 정함. 0 이면 안 틂. */
export const resolveRemoteSfxGain = (listener: SfxPoint, source: SfxPoint): number => {
  const { gain, fullDistance, silentDistance } = SPACE_REMOTE_SFX;
  const distance = Math.hypot(source.x - listener.x, source.z - listener.z);
  const falloff = 1 - (distance - fullDistance) / (silentDistance - fullDistance);

  return gain * Math.min(1, Math.max(0, falloff));
};

export interface SpaceSfxPlayer {
  /**
   * 켜져 있고 음원이 준비됐을 때만 소리가 남. 아니면 조용히 넘어감.
   *
   * `delaySeconds` 를 주면 그만큼 뒤에 틂. 타이머가 아니라 오디오 시계에 예약해서 안 밀림.
   * `gainScale` 은 음원 기본 음량에 곱함. 남이 낸 소리를 작게 틀 때 씀.
   */
  play: (name: SpaceSfxName, delaySeconds?: number, gainScale?: number) => void;
  setEnabled: (isEnabled: boolean) => void;
  /** 첫 터치·키 입력에서 부름. 브라우저가 그 전에는 소리를 막음. */
  unlock: () => void;
  dispose: () => void;
}

export const createSpaceSfxPlayer = (): SpaceSfxPlayer => {
  const buffers = new Map<SpaceSfxName, AudioBuffer>();
  /** 소리마다 지금 나고 있는(예약된 것 포함) 수. */
  const voiceCounts = new Map<SpaceSfxName, number>();
  let context: AudioContext | null = null;
  let isEnabled = false;
  let isUnlocked = false;
  let isDisposed = false;

  const loadBuffer = async (audioContext: AudioContext, name: SpaceSfxName): Promise<void> => {
    try {
      const response = await fetch(SPACE_SFX[name].src);

      if (!response.ok) {
        return;
      }
      const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());

      if (!isDisposed) {
        buffers.set(name, buffer);
      }
    } catch {
      // 못 받은 소리는 안 냄. 효과음 하나 때문에 화면을 막지 않음.
    }
  };

  /** 소리를 켠 사람이 처음 조작했을 때 한 번만 만듦. 꺼 둔 사람은 음원을 안 받음. */
  const prepare = (): void => {
    if (isDisposed || !isEnabled || !isUnlocked) {
      return;
    }
    if (!context) {
      context = new AudioContext();
      for (const name of Object.keys(SPACE_SFX) as SpaceSfxName[]) {
        void loadBuffer(context, name);
      }
    }
    // 모바일은 앱 전환·전화 뒤에 멈춰 있음. 다음 조작에서 다시 깨움.
    if (context.state === "suspended") {
      void context.resume().catch(() => {});
    }
  };

  const play = (name: SpaceSfxName, delaySeconds: number = 0, gainScale: number = 1): void => {
    const buffer = buffers.get(name);
    const voiceCount = voiceCounts.get(name) ?? 0;

    if (!isEnabled || !context || context.state !== "running" || !buffer || gainScale <= 0) {
      return;
    }
    // 상한은 남의 소리에만 건다. 남들 소리로 자리가 찼다고 내 타격음이 빠지면 안 됨.
    if (gainScale < 1 && voiceCount >= MAXIMUM_SFX_VOICES_PER_NAME) {
      return;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    gain.gain.value = SPACE_SFX[name].volume * gainScale;
    voiceCounts.set(name, voiceCount + 1);
    source.onended = (): void => {
      voiceCounts.set(name, Math.max(0, (voiceCounts.get(name) ?? 1) - 1));
    };
    source.connect(gain);
    gain.connect(context.destination);
    source.start(context.currentTime + Math.max(0, delaySeconds));
  };

  const setEnabled = (nextIsEnabled: boolean): void => {
    isEnabled = nextIsEnabled;
    prepare();
  };

  const unlock = (): void => {
    isUnlocked = true;
    prepare();
  };

  const dispose = (): void => {
    isDisposed = true;
    buffers.clear();
    voiceCounts.clear();
    void context?.close().catch(() => {});
    context = null;
  };

  return { play, setEnabled, unlock, dispose };
};
