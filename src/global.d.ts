declare global {
  interface Window {
    Alpine: typeof Alpine
    skipCutscene: () => void
  }
}

export {}
