/** 플로팅 소식지 한 건. 출처(사고 연표 등)마다 이 모양으로 바꿔서 넘김. */
export interface NewsItem {
  id: string;
  /** 짧은 머리말. 예: 거래소 사고 */
  label: string;
  title: string;
  /** 누르면 이동할 앱 내부 경로. */
  href: string;
}
