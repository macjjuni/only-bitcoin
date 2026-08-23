export const env = {
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || "https://only-btc.app",
  NEXT_PUBLIC_TITLE: process.env.NEXT_PUBLIC_TITLE || "Only Bitcoin",
  /** `.env` 가 아니라 `next.config.ts` 가 `package.json` 버전에서 주입한다. */
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "",
  NEXT_PUBLIC_GA_TRACKING_ID: process.env.NEXT_PUBLIC_GA_TRACKING_ID || "",
  NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID || "",
  NEXT_PUBLIC_MEME_IMAGE_URL: process.env.NEXT_PUBLIC_MEME_IMAGE_URL || "",
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
  NEXT_PUBLIC_DONATION_ADDRESS: process.env.NEXT_PUBLIC_DONATION_ADDRESS || "",
  NEXT_PUBLIC_FEEDBACK_URL: process.env.NEXT_PUBLIC_FEEDBACK_URL || "https://x.com/a7w2en7z_",
  NEXT_PUBLIC_LOGO: process.env.NEXT_PUBLIC_LOGO || "",
} as const;
