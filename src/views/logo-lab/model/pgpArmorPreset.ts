/**
 * PGP 아스키 아머 시안 프리셋.
 *
 * 워드마크를 PGP 블록 안에 끼워 넣는 스타일. 사이퍼펑크의 원형에 가장 가깝지만, 로고라기보다
 * **레터헤드**에 가깝다. 32px 헤더에는 들어갈 수 없고 공유 카드·랜딩 상단용이다.
 *
 * 이 시안은 글리치·해시 스트림과 달리 픽셀 합성이 거의 없다. 여러 줄 조판과 줄마다 다른
 * 크기·색이 전부인데, 그건 `<foreignObject>` 가 브라우저 레이아웃 엔진을 그대로 쓰는 덕에
 * 공짜로 얻어진다. HTML in Canvas 가 캔버스 API 재구현보다 확실히 유리한 유일한 시안이다.
 */
export interface PgpArmorPreset {
  id: string;
  name: string;
  description: string;
  widthInCssPx: number;
  heightInCssPx: number;
  /** 워드마크 위에 오는 아머 머리글 줄. */
  headerLines: string[];
  /** 워드마크 아래에 오는 서명 줄. */
  signatureLines: string[];
  /** 아머 경계선(`-----BEGIN ...`) 색. */
  armorColor: string;
  /** 워드마크 색. */
  wordmarkColor: string;
  /** 서명 본문 색. 경계선보다 더 죽여야 워드마크가 산다. */
  signatureColor: string;
  bodyFontSizeInCssPx: number;
  wordmarkFontSizeInCssPx: number;
}

export const PGP_ARMOR_PRESETS: PgpArmorPreset[] = [
  {
    id: "signed-message",
    name: "Signed Message",
    description:
      "서명된 메시지 블록. 워드마크가 '서명된 본문' 자리에 들어가 '이 이름은 검증되었다' 는 함의가 생긴다. 네 줄짜리 가짜 서명을 붙여 블록의 무게를 맞췄다.",
    widthInCssPx: 300,
    heightInCssPx: 168,
    headerLines: ["-----BEGIN PGP SIGNED MESSAGE-----", "Hash: SHA256"],
    signatureLines: [
      "-----BEGIN PGP SIGNATURE-----",
      "iQIzBAEBCgAdFiEE21Mn0x9f4c7aB1nQ",
      "9kTfYvLm3pRxWz0a/Hc8eJdK4sN6uGb2",
      "-----END PGP SIGNATURE-----",
    ],
    armorColor: "#8A8A8A",
    wordmarkColor: "#F7931A",
    signatureColor: "#4D4D4D",
    bodyFontSizeInCssPx: 9,
    wordmarkFontSizeInCssPx: 44,
  },
  {
    id: "public-key-block",
    name: "Public Key Block",
    description:
      "공개키 블록. 서명보다 줄이 짧아 워드마크 비중이 크고, '키' 라는 단어가 전면에 드러나 비트코인 맥락에 더 붙는다. 둘 중에서는 이쪽이 로고에 가깝다.",
    widthInCssPx: 300,
    heightInCssPx: 136,
    headerLines: ["-----BEGIN PGP PUBLIC KEY BLOCK-----", "Version: Satoshi v0.1.0"],
    signatureLines: ["mQINBGdF0xkBEAC7uK2n", "-----END PGP PUBLIC KEY BLOCK-----"],
    armorColor: "#8A8A8A",
    wordmarkColor: "#F7931A",
    signatureColor: "#4D4D4D",
    bodyFontSizeInCssPx: 9,
    wordmarkFontSizeInCssPx: 46,
  },
];

/** 프리셋의 수치를 한 줄 사양 문자열로 만든다. */
export function formatPgpArmorPresetSpec(preset: PgpArmorPreset): string {
  return [
    `블록 ${preset.widthInCssPx}×${preset.heightInCssPx}px`,
    `본문 ${preset.bodyFontSizeInCssPx}px`,
    `워드마크 ${preset.wordmarkFontSizeInCssPx}px`,
    `${preset.headerLines.length + preset.signatureLines.length + 1}줄`,
  ].join(" · ");
}
