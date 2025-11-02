/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  // 可以在这里添加自定义环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

