/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_MODE: string
  readonly VITE_TITLE: string
  readonly VITE_URL: string
  readonly VITE_UPBIT_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
