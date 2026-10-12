/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_API_URL?: string;
  readonly VITE_BFF_API_VERSION?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
