import { SPACE_MAX_OCCUPANTS, type SpacePresence } from "@/entities/space";

/** 접속 표시에 쓸 문구와 점 색. */
export interface PresenceDisplay {
  /** 점 옆에 붙는 짧은 문구. */
  label: string;
  /** 스크린리더용 전체 문구. */
  accessibleLabel: string;
  dotClassName: string;
  /** 연결 중에는 점을 깜빡여 진행 중임을 알린다. */
  isPulsing: boolean;
}

/**
 * 접속 상태를 표시 문구로 바꾼다.
 *
 * 숫자만 띄우면 네트워크가 없는 1단계에서도 접속자가 있는 것처럼 읽힌다.
 * 상태에 따라 문구 자체를 바꾼다.
 */
export const resolvePresenceDisplay = (presence: SpacePresence): PresenceDisplay => {
  switch (presence.status) {
    case "online":
      return {
        label: `${presence.occupantCount} / ${SPACE_MAX_OCCUPANTS}`,
        accessibleLabel: `접속자 ${presence.occupantCount}명, 정원 ${SPACE_MAX_OCCUPANTS}명`,
        dotClassName: "bg-up",
        isPulsing: false,
      };
    case "connecting":
      return {
        label: "연결 중",
        accessibleLabel: "공간에 연결하는 중",
        dotClassName: "bg-bitcoin",
        isPulsing: true,
      };
    case "offline":
      return {
        label: "오프라인",
        accessibleLabel: "공간에 연결되지 않음",
        dotClassName: "bg-white/40",
        isPulsing: false,
      };
    default:
      throw new Error(`알 수 없는 접속 상태입니다: ${presence.status}`);
  }
};
