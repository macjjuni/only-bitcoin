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
  swing: { src: "/audio/space-sfx/swing.mp3", volume: 0.18 },
  hit: { src: "/audio/space-sfx/hit.mp3", volume: 0.4 },
  hurt: { src: "/audio/space-sfx/hurt.mp3", volume: 0.45 },
  bossSwipe: { src: "/audio/space-sfx/boss-swipe.mp3", volume: 0.4 },
  bossSlam: { src: "/audio/space-sfx/boss-slam.mp3", volume: 0.45 },
  bossCharge: { src: "/audio/space-sfx/boss-charge.mp3", volume: 0.3 },
  knockout: { src: "/audio/space-sfx/knockout.mp3", volume: 0.5 },
  bossSpawn: { src: "/audio/space-sfx/boss-spawn.mp3", volume: 0.4 },
  bossEnrage: { src: "/audio/space-sfx/boss-enrage.mp3", volume: 0.4 },
  bossStagger: { src: "/audio/space-sfx/boss-stagger.mp3", volume: 0.35 },
  bossDeath: { src: "/audio/space-sfx/boss-death.mp3", volume: 0.4 },
  victory: { src: "/audio/space-sfx/victory.mp3", volume: 0.3 },
};

export interface SpaceSfxPlayer {
  /**
   * 켜져 있고 음원이 준비됐을 때만 소리가 남. 아니면 조용히 넘어감.
   *
   * `delaySeconds` 를 주면 그만큼 뒤에 틂. 타이머가 아니라 오디오 시계에 예약해서 안 밀림.
   */
  play: (name: SpaceSfxName, delaySeconds?: number) => void;
  setEnabled: (isEnabled: boolean) => void;
  /** 첫 터치·키 입력에서 부름. 브라우저가 그 전에는 소리를 막음. */
  unlock: () => void;
  dispose: () => void;
}

export const createSpaceSfxPlayer = (): SpaceSfxPlayer => {
  const buffers = new Map<SpaceSfxName, AudioBuffer>();
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

  const play = (name: SpaceSfxName, delaySeconds: number = 0): void => {
    const buffer = buffers.get(name);

    if (!isEnabled || !context || context.state !== "running" || !buffer) {
      return;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = buffer;
    gain.gain.value = SPACE_SFX[name].volume;
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
    void context?.close().catch(() => {});
    context = null;
  };

  return { play, setEnabled, unlock, dispose };
};
