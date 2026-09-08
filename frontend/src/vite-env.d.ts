/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string;
  readonly DEV: boolean;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
