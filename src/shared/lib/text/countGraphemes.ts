const koreanGraphemeSegmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

export const splitGraphemes = (value: string): string[] => {
  return Array.from(koreanGraphemeSegmenter.segment(value), ({ segment }) => segment);
};

export const countGraphemes = (value: string): number => {
  return splitGraphemes(value).length;
};

export const truncateGraphemes = (value: string, maximumGraphemeCount: number): string => {
  return splitGraphemes(value).slice(0, maximumGraphemeCount).join("");
};
