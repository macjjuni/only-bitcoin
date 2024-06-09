/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_MODE: string;
  readonly VITE_TITLE: string;
  readonly VITE_URL: string;
  readonly VITE_UPBIT_API_URL: string;
  readonly VITE_FEEDBACK_URL: string;
  readonly VITE_GA_TRAKING_ID: string;
  readonly VITE_MVRV_URL: string;
  readonly VITE_GIT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
