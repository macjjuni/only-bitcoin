import { dateUtil } from "kku-util";

const { formatConfig, getFormatDate, convertToTimestamp, getCurrentDate, calcCurrentDateDifference, calcDate } = dateUtil;

function formatDate(
  date: Date | string | number | undefined | null,
  format: string = formatConfig.detail
) {
  if (!date) {
    return "-";
  }

  try {
    const d = new Date(date);

    if (isNaN(d.getTime())) {
      console.warn(`Invalid date value passed to formatDate: ${date}`);
      return "-";
    }

    return getFormatDate(d, format);
  } catch (error) {
    console.error("formatDate error:", error);
    return "-";
  }
}

export { formatConfig, formatDate, convertToTimestamp, getCurrentDate, calcCurrentDateDifference, calcDate };
