export const getRenderSize = (width: number, height: number, pixelRatio: number, highDpi: boolean, maxSize: number): { width: number; height: number } => {
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const density = highDpi && Number.isFinite(pixelRatio) ? Math.min(2, Math.max(1, pixelRatio)) : 1
  const scale = Math.min(density, maxSize / safeWidth, maxSize / safeHeight)
  return { width: Math.max(1, Math.round(safeWidth * scale)), height: Math.max(1, Math.round(safeHeight * scale)) }
}

export const getSurfaceProperties = (name: string) => {
  const surface = name.toLowerCase()
  const terrain = ['grass', 'rock', 'sand', 'ocean', 'cave', 'beach', 'mites', 'pebble'].some(value => surface.includes(value))
  const glass = surface.includes('windo')
  const rubber = surface.includes('rubber') || surface.includes('tire')
  return {
    metalness: 0,
    roughness: terrain ? 0.95 : rubber ? 0.8 : glass ? 0.12 : 0.32,
    clearcoat: terrain || rubber ? 0 : glass ? 0.4 : 0.25,
    clearcoatRoughness: 0.2,
    specularIntensity: glass ? 0.8 : 0.45,
    iridescence: 0,
  }
}

export const createWaterNormalPixels = (size: number): Uint8Array => {
  const pixels = new Uint8Array(size * size * 4)
  for (let n = 0; n < size * size; ++n) {
    const x = ((n % size) / (size - 1)) * Math.PI * 2
    const y = (Math.floor(n / size) / (size - 1)) * Math.PI * 2
    const dx = 0.22 * Math.cos(x + 2 * y) + 0.1 * Math.cos(3 * x - y)
    const dy = 0.44 * Math.cos(x + 2 * y) - 0.033 * Math.cos(3 * x - y)
    const length = Math.hypot(dx, dy, 1)
    pixels[n * 4] = Math.round((dx / length + 1) * 127.5)
    pixels[n * 4 + 1] = Math.round((dy / length + 1) * 127.5)
    pixels[n * 4 + 2] = Math.round((1 / length + 1) * 127.5)
    pixels[n * 4 + 3] = 255
  }
  return pixels
}

export const createAmbientOcclusionSamples = (): Float32Array => {
  const samples = new Float32Array(36)
  for (let n = 0; n < 12; ++n) {
    const angle = Math.fround(n * Math.fround(2.39996323))
    samples.set([Math.cos(angle), Math.sin(angle), Math.sqrt(Math.fround((n + 0.5) / 12))], n * 3)
  }
  return samples
}
