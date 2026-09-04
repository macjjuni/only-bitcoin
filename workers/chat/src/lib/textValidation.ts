import { ADULT_TERM_RULES, type AdultTermRule } from "../adultTerms.ko";

const graphemeSegmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
const textEncoder = new TextEncoder();
const extendedPictographicPattern = /\p{Extended_Pictographic}/u;
const emojiSequencePattern =
  /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u;
const forbiddenNicknamePattern =
  /(운영자|관리자|시스템|공지|admin|administrator|moderator|mod|staff|official)/iu;
const isForbiddenControlCodePoint = (codePoint: number): boolean => {
  return (
    (codePoint >= 0 && codePoint <= 8) ||
    (codePoint >= 11 && codePoint <= 31) ||
    (codePoint >= 127 && codePoint <= 159) ||
    codePoint === 0x200b ||
    codePoint === 0x2060 ||
    codePoint === 0xfeff ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  );
};

const removeForbiddenControls = (value: string): string => {
  return Array.from(value)
    .filter((character) => !isForbiddenControlCodePoint(character.codePointAt(0) ?? 0))
    .join("");
};

export class ChatValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ChatValidationError";
  }
}

// region [Privates]
const splitGraphemes = (value: string): string[] => {
  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
};

const removeInvalidJoiners = (value: string): string => {
  return splitGraphemes(value)
    .map((grapheme) => {
      if (!grapheme.includes("\u200D")) {
        return grapheme;
      }

      const pictographicCount = Array.from(grapheme).filter((character) => {
        return extendedPictographicPattern.test(character);
      }).length;
      return pictographicCount >= 2 ? grapheme : grapheme.replaceAll("\u200D", "");
    })
    .join("");
};

const collapseRepeatedGraphemes = (value: string): string => {
  const graphemes = splitGraphemes(value);
  const retainedGraphemes: string[] = [];
  let previousGrapheme = "";
  let repeatedCount = 0;

  for (const grapheme of graphemes) {
    repeatedCount = grapheme === previousGrapheme ? repeatedCount + 1 : 1;
    previousGrapheme = grapheme;

    if (repeatedCount <= 10) {
      retainedGraphemes.push(grapheme);
    }
  }

  return retainedGraphemes.join("");
};

const createScanView = (graphemes: string[]): { scanValue: string; sourceIndexes: number[] } => {
  let scanValue = "";
  const sourceIndexes: number[] = [];

  graphemes.forEach((grapheme, graphemeIndex) => {
    const normalizedGrapheme = grapheme.normalize("NFKC").toLocaleLowerCase("ko-KR");
    scanValue += normalizedGrapheme;

    for (let characterIndex = 0; characterIndex < normalizedGrapheme.length; characterIndex += 1) {
      sourceIndexes.push(graphemeIndex);
    }
  });

  return { scanValue, sourceIndexes };
};

const escapeRegularExpression = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const createAdultTermPattern = (rule: AdultTermRule): RegExp => {
  const termCharacters = Array.from(rule.term.normalize("NFKC").toLocaleLowerCase("ko-KR"));
  const separatorPattern = rule.allowSeparators ? "[\\s._·-]*" : "";
  const termPattern = termCharacters.map(escapeRegularExpression).join(separatorPattern);

  switch (rule.mode) {
    case "exact-token":
      return new RegExp(`(?<![\\p{L}\\p{N}])${termPattern}(?![\\p{L}\\p{N}])`, "giu");
    case "bounded-phrase":
      return new RegExp(`(?<![\\p{L}\\p{N}])${termPattern}(?![\\p{L}\\p{N}])`, "giu");
    case "substring":
      return new RegExp(termPattern, "giu");
    default:
      throw new Error("Unsupported adult term match mode");
  }
};

const mergeRanges = (ranges: Array<{ start: number; end: number }>) => {
  const sortedRanges = [...ranges].sort(
    (leftRange, rightRange) => leftRange.start - rightRange.start,
  );
  const mergedRanges: Array<{ start: number; end: number }> = [];

  for (const currentRange of sortedRanges) {
    const previousRange = mergedRanges.at(-1);

    if (!previousRange || currentRange.start > previousRange.end + 1) {
      mergedRanges.push({ ...currentRange });
    } else {
      previousRange.end = Math.max(previousRange.end, currentRange.end);
    }
  }

  return mergedRanges;
};

const containsContactOrLink = (scanValue: string): boolean => {
  const normalizedContactValue = scanValue
    .replace(/\[\s*\.\s*\]|\(\s*\.\s*\)|\s*점\s*/gu, ".")
    .replace(/[\u200C\u200D]/gu, "");
  const linkPatterns = [
    /(?:https?|hxxp):?\/\//iu,
    /(?:^|\s)www\./iu,
    /(?:t\.me|telegram\.me|open\.kakao\.com)/iu,
    /(?:[a-z0-9가-힣-]+\.)+(?:com|net|org|io|app|kr|co\.kr)(?:\b|\/)/iu,
    /xn--[a-z0-9-]+/iu,
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/iu,
    /(?:\+?82[- .]?)?0?1[016789][-. ]?\d{3,4}[-. ]?\d{4}/u,
    /(?:카톡|오픈톡|텔레그램|디스코드|라인).{0,12}(?:id|아이디|문의|초대)/iu,
    /(?:\d{1,3}\.){3}\d{1,3}(?::\d+|\/)/u,
    /\[[0-9a-f:]+\](?::\d+|\/)/iu,
  ];

  return linkPatterns.some((linkPattern) => linkPattern.test(normalizedContactValue));
};
// endregion

export const countGraphemes = (value: string): number => {
  return splitGraphemes(value).length;
};

export const filterAdultTerms = (value: string): string => {
  const graphemes = splitGraphemes(value);
  const { scanValue, sourceIndexes } = createScanView(graphemes);
  const matchedRanges: Array<{ start: number; end: number }> = [];

  for (const adultTermRule of ADULT_TERM_RULES) {
    const allowWords = adultTermRule.allowWords ?? [];

    if (allowWords.some((allowWord) => scanValue.includes(allowWord))) {
      continue;
    }

    const adultTermPattern = createAdultTermPattern(adultTermRule);
    for (const matchedTerm of scanValue.matchAll(adultTermPattern)) {
      const matchStart = matchedTerm.index;
      const matchEnd = matchStart + matchedTerm[0].length - 1;
      const sourceStart = sourceIndexes[matchStart];
      const sourceEnd = sourceIndexes[matchEnd];

      if (sourceStart !== undefined && sourceEnd !== undefined) {
        matchedRanges.push({ start: sourceStart, end: sourceEnd });
      }
    }
  }

  if (matchedRanges.length === 0) {
    return value;
  }

  const ranges = mergeRanges(matchedRanges);
  const filteredGraphemes: string[] = [];
  let rangeIndex = 0;
  let graphemeIndex = 0;

  while (graphemeIndex < graphemes.length) {
    const currentRange = ranges[rangeIndex];

    if (currentRange && graphemeIndex === currentRange.start) {
      filteredGraphemes.push("🔞");
      graphemeIndex = currentRange.end + 1;
      rangeIndex += 1;
    } else {
      filteredGraphemes.push(graphemes[graphemeIndex]);
      graphemeIndex += 1;
    }
  }

  return filteredGraphemes.join("");
};

export const normalizeChatMessage = (rawMessage: string): string => {
  if (textEncoder.encode(rawMessage).byteLength > 8 * 1024) {
    throw new ChatValidationError("FRAME_TOO_LARGE", "메시지가 너무 깁니다.");
  }

  let normalizedMessage = rawMessage.replace(/\r\n?/g, "\n");
  normalizedMessage = removeForbiddenControls(normalizedMessage);
  normalizedMessage = removeInvalidJoiners(normalizedMessage).normalize("NFC").trim();
  normalizedMessage = normalizedMessage.replace(/\n{3,}/g, "\n\n");

  const newlineCount = Array.from(normalizedMessage).filter(
    (character) => character === "\n",
  ).length;
  if (newlineCount > 5) {
    throw new ChatValidationError("TOO_MANY_LINES", "줄바꿈은 최대 5개까지 사용할 수 있어요.");
  }

  normalizedMessage = collapseRepeatedGraphemes(normalizedMessage);
  const messageGraphemeCount = countGraphemes(normalizedMessage);

  if (messageGraphemeCount < 1 || normalizedMessage.trim().length === 0) {
    throw new ChatValidationError("EMPTY_BODY", "메시지를 입력해 주세요.");
  }
  if (messageGraphemeCount > 300) {
    throw new ChatValidationError("BODY_TOO_LONG", "메시지는 최대 300자까지 작성할 수 있어요.");
  }

  const { scanValue } = createScanView(splitGraphemes(normalizedMessage));
  if (containsContactOrLink(scanValue)) {
    throw new ChatValidationError("LINK_OR_CONTACT", "링크와 연락처는 작성할 수 없어요.");
  }

  const filteredMessage = filterAdultTerms(normalizedMessage).trim();
  if (countGraphemes(filteredMessage) < 1 || countGraphemes(filteredMessage) > 300) {
    throw new ChatValidationError("INVALID_BODY", "메시지 형식을 확인해 주세요.");
  }

  return filteredMessage;
};

export const normalizeNickname = (rawNickname: string): string => {
  let normalizedNickname = removeForbiddenControls(rawNickname).normalize("NFC").trim();

  if (
    !normalizedNickname ||
    normalizedNickname.includes("#") ||
    countGraphemes(normalizedNickname) > 10
  ) {
    throw new ChatValidationError("INVALID_NICKNAME", "닉네임 형식을 확인해 주세요.");
  }

  const { scanValue } = createScanView(splitGraphemes(normalizedNickname));
  const normalizedDecomposedNickname = normalizedNickname.normalize("NFD");

  if (
    forbiddenNicknamePattern.test(scanValue) ||
    /\p{M}{3,}/u.test(normalizedDecomposedNickname) ||
    emojiSequencePattern.test(normalizedNickname) ||
    containsContactOrLink(scanValue)
  ) {
    throw new ChatValidationError("INVALID_NICKNAME", "사용할 수 없는 닉네임입니다.");
  }

  normalizedNickname = filterAdultTerms(normalizedNickname);
  if (!normalizedNickname || countGraphemes(normalizedNickname) > 10) {
    throw new ChatValidationError("INVALID_NICKNAME", "닉네임 형식을 확인해 주세요.");
  }

  return normalizedNickname;
};

export const createReplySnippet = (messageBody: string): string => {
  const singleLineBody = messageBody.replace(/\s+/gu, " ").trim();
  return splitGraphemes(singleLineBody).slice(0, 40).join("");
};
