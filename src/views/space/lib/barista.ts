import { resolveBaristaProximity, SPACE_AVATAR, SPACE_BARISTA_SPOT } from "@/entities/space";

/**
 * 커피 바의 바리스타 NPC. 말을 걸면 홀 배경음악을 바꾸거나 폭죽을 터뜨릴 수 있음.
 *
 * 서버에는 없고 클라이언트가 정해진 자리에 세워 둠. **선 자리와 말 걸 수 있는 거리는
 * `SPACE_BARISTA_SPOT`(`entities/space/model/barista.ts`)에 있음.** 서버도 같은 값으로
 * 요청한 사람이 앞에 있는지 봐서, 자리를 옮기면 워커도 다시 배포해야 함.
 */
export const SPACE_BARISTA = {
  ...SPACE_BARISTA_SPOT,
  name: "바리스타",
  /** 전방이 −Z 인 규약이라 0 이면 홀 쪽을 봄. */
  yaw: 0,
  /** 모델 전체 높이(배율 전, m). `public/models/barista-skirt.glb` 에서 읽은 값. 발바닥이 원점임. */
  modelHeight: 1.7,
  /**
   * 그릴 때 곱하는 배율. 유저 아바타와 같은 값을 써서 나란히 섰을 때 체격이 맞음.
   *
   * 배율을 곱하면 2.04 m 로, 유저(2.17 m)보다 조금 작음.
   */
  modelScale: SPACE_AVATAR.scale,
  /**
   * 몸통 반지름(m). 유저가 이 안으로 못 들어와 겹쳐 서지 않음.
   *
   * 어깨 폭(배율 곱해 0.87 m)의 절반쯤임. 유저 반지름을 더해서 보므로 실제로는 조금 더 떨어져 섬.
   */
  bodyRadius: 0.4,
} as const;

export { resolveBaristaProximity };

/**
 * 바리스타 대사. 메뉴를 열면 대화상자에 한 글자씩 찍힘.
 *
 * `greetings` 는 말을 걸 때마다 하나를 골라 씀. 대사를 더하려면 배열에 줄을 더하면 됨.
 */
export const SPACE_BARISTA_LINES = {
  greetings: ["어서 오세요! 음악을 바꾸거나 폭죽을 터뜨려 드릴 수 있어요."],
  /** 배경음악 설정으로 들어갔을 때. */
  bgm: "어떤 곡으로 틀어 드릴까요?",
} as const;

/**
 * 이번에 할 인사말을 고름.
 *
 * @param random 0 이상 1 미만의 난수.
 */
export const pickBaristaGreeting = (random: number): string => {
  const { greetings } = SPACE_BARISTA_LINES;

  return greetings[Math.min(greetings.length - 1, Math.floor(random * greetings.length))];
};
