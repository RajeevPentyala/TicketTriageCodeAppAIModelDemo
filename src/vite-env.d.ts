/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TICKET_TRIAGE_MODEL_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
