/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend URL for production builds, e.g. https://vedicmath-ai.onrender.com */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
