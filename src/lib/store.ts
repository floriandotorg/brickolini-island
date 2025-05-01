import Alpine from 'alpinejs'

export type Mode = 'welcome' | 'loading' | 'in-game' | 'cutscene'
export type Loading = {
  progress: number
  message: string
} | null

export const initStores = () => {
  Alpine.store('state', {
    mode: 'welcome' as Mode,
    loading: null,
    position: '',
  })
}

export const setMode = (mode: Mode) => {
  ;(Alpine.store('state') as { mode: Mode }).mode = mode
}

export const setLoading = (loading: Loading) => {
  ;(Alpine.store('state') as { loading: Loading }).loading = loading
}

export const setPosition = (position: string) => {
  ;(Alpine.store('state') as { position: string }).position = position
}
