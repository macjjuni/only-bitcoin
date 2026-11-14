import { SPACE_HALL } from "./spaceWorld";

/**
 * 커피 바 바리스타 NPC 가 선 자리. 서버 판정과 클라이언트 연출이 같이 씀.
 *
 * 바리스타는 클라이언트가 그리지만, 말을 걸어야 할 수 있는 일(홀 배경음악 바꾸기)은 서버가
 * 요청한 사람이 정말 그 앞에 있는지 한 번 더 봄. 안 보면 어디서든 프레임만 보내 곡을 바꿀 수 있음.
 *
 * 위치는 맵 GLB 의 충돌 메시에서 읽었음 — 카운터(높이 1 m)가 z 13.5 ~ 15 에 가로로 놓여 있고
 * 그 뒤 z 15.3 ~ 19 가 빈 바닥임. 메뉴판(`SPACE_MENU_FRAME`, x −14.5) 아래에서 손님 쪽(−Z)을 봄.
 */
export const SPACE_BARISTA_SPOT = {
  x: -12.5,
  y: SPACE_HALL.floorY,
  z: 16.1,
  /**
   * 이 거리 안에 들어오면 말을 걸 수 있음(m). 카운터 너머 손님 자리(스툴, z 12.75)에서 3.4 m 임.
   *
   * 나갈 때는 조금 더 멀어져야 닫힘. 경계에 서 있을 때 버튼이 깜빡이지 않게 함.
   * 서버는 넓은 쪽(`leaveRadius`)으로 봄. 서버가 아는 위치는 조금 늦어서 여유가 필요함.
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
  if (
    !position ||
    Math.abs(position.y - SPACE_BARISTA_SPOT.y) > SPACE_BARISTA_SPOT.heightTolerance
  ) {
    return false;
  }

  const distance = Math.hypot(position.x - SPACE_BARISTA_SPOT.x, position.z - SPACE_BARISTA_SPOT.z);

  return distance <= (wasNear ? SPACE_BARISTA_SPOT.leaveRadius : SPACE_BARISTA_SPOT.talkRadius);
};
