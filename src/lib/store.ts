import Alpine from 'alpinejs'

export type Mode = 'welcome' | 'loading' | 'in-game' | 'cutscene'

export const initStores = () => {
  Alpine.store('state', {
    mode: 'welcome' as Mode,

    setMode(mode: Mode) {
      ;(this as { mode: Mode }).mode = mode
    },
  })
}

export const setMode = (mode: Mode) => {
  ;(Alpine.store('state') as { mode: Mode }).mode = mode
}
