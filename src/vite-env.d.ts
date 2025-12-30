/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_MODE: string;
  readonly VITE_TITLE: string;
  readonly VITE_URL: string;
  readonly VITE_FEEDBACK_URL: string;
  readonly VITE_GA_TRAKING_ID: string;
  readonly VITE_ADSENSE_ID: string;
  readonly VITE_MEME_IMAGE_URL: string;
  readonly VITE_DONATION_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}