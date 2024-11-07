import { dateUtil } from "kku-util";

const { formatConfig, getFormatDate, convertToTimestamp, getCurrentDate, calcCurrentDateDifference } = dateUtil;

function formatDate(date: Date | string | number) {
  return getFormatDate(date, formatConfig.detail);
}

export { formatConfig, formatDate, convertToTimestamp, getCurrentDate, calcCurrentDateDifference };
