import { dateUtil } from "kku-util";

const { formatConfig, getFormatDate, convertToTimestamp, getCurrentDate, calcCurrentDateDifference, calcDate } = dateUtil;

function formatDate(date: Date | string | number, format: string = formatConfig.detail) {
  return getFormatDate(date, format);
}

export { formatConfig, formatDate, convertToTimestamp, getCurrentDate, calcCurrentDateDifference, calcDate };
