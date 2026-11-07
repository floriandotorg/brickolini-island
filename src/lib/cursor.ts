export type CursorKind = 'arrow' | 'busy' | 'no' | 'none'

export const setCursor = (kind: CursorKind): void => {
  const canvas = document.getElementById('game')
  if (!(canvas instanceof HTMLCanvasElement)) {
    return
  }
  const fallback = { arrow: 'default', busy: 'wait', no: 'not-allowed', none: 'none' }
  const hotspot = kind === 'arrow' ? '1 1' : '16 16'
  canvas.style.cursor = kind === 'none' ? 'none' : `url(/cursors/${kind}.cur) ${hotspot}, ${fallback[kind]}`
}
