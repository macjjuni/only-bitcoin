import { SPACE_HALL } from "@/entities/space";

/**
 * 커피 바의 바리스타 NPC. 말을 걸면 홀 배경음악을 바꾸거나 폭죽을 터뜨릴 수 있음.
 *
 * 서버에는 없고 클라이언트가 정해진 자리에 세워 둠. 위치는 맵 GLB 의 충돌 메시에서 읽었음 —
 * 카운터(높이 1 m)가 z 13.5 ~ 15 에 가로로 놓여 있고 그 뒤 z 15.3 ~ 19 가 빈 바닥임.
 * 메뉴판(`SPACE_MENU_FRAME`, x −14.5) 바로 아래에 세워 손님 쪽(−Z)을 보게 함.
 */
export const SPACE_BARISTA = {
  name: "바리스타",
  x: -12.5,
  y: SPACE_HALL.floorY,
  z: 16.1,
  /** 전방이 −Z 인 규약이라 0 이면 홀 쪽을 봄. */
  yaw: 0,
  /**
   * 임시로 쓰는 아바타 모델과 앞치마 색. 앞치마를 두른 맥시크루가 가장 바리스타 같음.
   *
   * 전용 모델이 준비되면 이 둘을 지우고 그 모델을 그림.
   */
  modelIndex: 0,
  colorIndex: 3,
  /**
   * 이 거리 안에 들어오면 말을 걸 수 있음(m). 카운터 너머 손님 자리(스툴, z 12.75)에서 3.4 m 임.
   *
   * 나갈 때는 조금 더 멀어져야 닫힘. 경계에 서 있을 때 버튼이 깜빡이지 않게 함.
   */
  talkRadius: 5,
  leaveRadius: 6,
  /** 이 높이 차 안이어야 함(m). 바로 위 발코니에 선 사람은 빠짐. */
  heightTolerance: 2.5,
} as const;

/**
 * 바리스타에게 말을 걸 수 있는 자리인지.
 *
 * @param wasNear 직전에 가까이 있었는지. 가까이 있었으면 조금 더 멀어져야 벗어난 것으로 봄.
 */
export const resolveBaristaProximity = (
  wasNear: boolean,
  position: { x: number; y: number; z: number } | null,
): boolean => {
  if (!position || Math.abs(position.y - SPACE_BARISTA.y) > SPACE_BARISTA.heightTolerance) {
    return false;
  }

  const distance = Math.hypot(position.x - SPACE_BARISTA.x, position.z - SPACE_BARISTA.z);

  return distance <= (wasNear ? SPACE_BARISTA.leaveRadius : SPACE_BARISTA.talkRadius);
};
