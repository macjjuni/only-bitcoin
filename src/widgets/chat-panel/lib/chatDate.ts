const CHAT_TIME_ZONE = "Asia/Seoul";

const chatDateLabelFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: CHAT_TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const chatDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHAT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getChatDatePart = (
  dateParts: Intl.DateTimeFormatPart[],
  partType: Intl.DateTimeFormatPartTypes,
): string => {
  const datePart = dateParts.find((part) => part.type === partType);

  if (!datePart) {
    throw new Error(`채팅 날짜에서 ${partType} 값을 찾을 수 없습니다.`);
  }

  return datePart.value;
};

/**
 * 서버 타임스탬프를 채팅 표시 기준 시간대의 달력 날짜 키로 변환한다.
 */
export const formatChatDateKey = (timestampInMilliseconds: number): string => {
  const dateParts = chatDateKeyFormatter.formatToParts(timestampInMilliseconds);
  const year = getChatDatePart(dateParts, "year");
  const month = getChatDatePart(dateParts, "month");
  const day = getChatDatePart(dateParts, "day");

  return `${year}-${month}-${day}`;
};

export const formatChatDateLabel = (timestampInMilliseconds: number): string => {
  return chatDateLabelFormatter.format(timestampInMilliseconds);
};

/**
 * 첫 메시지이거나 바로 이전 메시지와 한국 날짜가 달라졌을 때만 구분선을 표시한다.
 */
export const shouldRenderChatDateSeparator = (
  timestampInMilliseconds: number,
  previousTimestampInMilliseconds?: number,
): boolean => {
  if (previousTimestampInMilliseconds === undefined) {
    return true;
  }

  return (
    formatChatDateKey(timestampInMilliseconds) !==
    formatChatDateKey(previousTimestampInMilliseconds)
  );
};
