import { memo } from "react";
import type { IconTypes } from "./icon";

/**
 * 원화 아이콘.
 *
 * `₩`( U+20A9 ) 문자를 쓰면 프로젝트 폰트( Roboto Mono · Pretendard )에 글리프가 없어
 * 기기마다 다른 시스템 폰트로 그려진다. 공유 카드는 이미지로 캡처돼 그대로 퍼지므로
 * 글자 대신 도형으로 고정한다.
 */
const WonIcon = ({ size = "100%", color = "currentColor", className = "", style }: IconTypes) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill={color}
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon points="17.74 16 17.22 18 18.85 18 18.32 16 17.74 16" />
      <polygon points="11.94 18 14.63 18 15.16 16 11.41 16 11.94 18" />
      <polygon points="13.29 23.1 14.1 20 12.47 20 13.29 23.1" />
      <polygon points="21.44 18 24.13 18 24.66 16 20.91 16 21.44 18" />
      <polygon points="22.78 23.1 23.6 20 21.97 20 22.78 23.1" />
      <path d="M18,2A16,16,0,1,0,34,18,16,16,0,0,0,18,2ZM29,20H26.19L24,28.32a1.25,1.25,0,0,1-2.42,0L19.38,20H16.69l-2.19,8.32a1.25,1.25,0,0,1-2.42,0L9.88,20H7a1,1,0,0,1,0-2H9.35l-.53-2H7a1,1,0,0,1,0-2H8.3l-1-3.68a1.25,1.25,0,0,1,2.42-.64L10.88,14h4.8l1.14-4.32a1.25,1.25,0,0,1,2.42,0L20.38,14h4.8l1.14-4.32a1.25,1.25,0,0,1,2.42.64l-1,3.68H29a1,1,0,0,1,0,2H27.24l-.53,2H29a1,1,0,0,1,0,2Z" />
    </svg>
  );
};

export default memo(WonIcon);
