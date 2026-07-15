import type { NilaApi } from '@shared/api'
import type { AutomationTask } from '@shared/types'

declare global {
  interface Window {
    nila: NilaApi
    nilaEvents: {
      onList(cb: (tasks: AutomationTask[]) => void): () => void
    }
  }
}

export {}
