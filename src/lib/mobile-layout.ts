export const getTouchDirections = (x: number, y: number): string[] => {
  const keys: string[] = []
  if (y < -0.25) {
    keys.push('ArrowUp')
  }
  if (y > 0.25) {
    keys.push('ArrowDown')
  }
  if (x < -0.25) {
    keys.push('ArrowLeft')
  }
  if (x > 0.25) {
    keys.push('ArrowRight')
  }
  return keys
}

export const getMobileViewport = (width: number, height: number, touch: boolean, safeTop = 0, safeBottom = 0, safeLeft = 0, safeRight = 0) => {
  const top = touch ? 52 + safeTop : 0
  const bottom = touch ? (height > width ? 180 : 0) + safeBottom : 0
  const left = touch ? safeLeft : 0
  const right = touch ? safeRight : 0
  return { left, top, width: Math.max(1, width - left - right), height: Math.max(1, height - top - bottom) }
}
