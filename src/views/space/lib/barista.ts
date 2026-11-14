import { resolveBaristaProximity, SPACE_BARISTA_SPOT } from "@/entities/space";

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
  /**
   * 임시로 쓰는 아바타 모델과 앞치마 색. 앞치마를 두른 맥시크루가 가장 바리스타 같음.
   *
   * 전용 모델이 준비되면 이 둘을 지우고 그 모델을 그림.
   */
  modelIndex: 0,
  colorIndex: 3,
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
