import { dateUtil } from "kku-util";

const {
  formatConfig,
  getFormatDate,
  convertToTimestamp,
  getCurrentDate,
  calcCurrentDateDifference,
  calcDate,
} = dateUtil;

function formatDate(
  date: Date | string | number | undefined | null,
  format: string = formatConfig.detail,
) {
  if (!date) {
    return "-";
  }

  try {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      console.warn(`Invalid date value passed to formatDate: ${date}`);
      return "-";
    }

    return getFormatDate(d, format);
  } catch (error) {
    console.error("formatDate error:", error);
    return "-";
  }
}

/**
 * KST(Asia/Seoul) 기준 오늘 날짜를 YYYY-MM-DD 로 반환한다.
 *
 * `getCurrentDate` 는 실행 환경의 로컬 타임존을 따르므로, 서버가 UTC 인 배포 환경에서는
 * 한국 시간 자정~오전 9시 사이에 하루 전 날짜가 나온다. 서버에서 만들어 내려보내는
 * 날짜(예: 환율 조회 일자)는 타임존과 무관하게 KST 로 고정한다.
 */
function getCurrentDateKST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export {
  calcCurrentDateDifference,
  calcDate,
  convertToTimestamp,
  formatConfig,
  formatDate,
  getCurrentDate,
  getCurrentDateKST,
};
