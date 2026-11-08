import * as THREE from 'three'

export const createGradingLut = (mood: 'dawn' | 'noon' | 'dusk'): THREE.Data3DTexture => {
  const size = 17
  const pixels = new Uint8Array(size ** 3 * 4)
  const warm = mood === 'dawn' ? 0.055 : mood === 'dusk' ? 0.035 : 0
  const saturation = mood === 'noon' ? 1.04 : 0.97
  for (let n = 0; n < size ** 3; ++n) {
    const red = (n % size) / (size - 1)
    const green = (Math.floor(n / size) % size) / (size - 1)
    const blue = Math.floor(n / (size * size)) / (size - 1)
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722
    const shadow = (1 - luma) ** 2
    const highlight = luma * (1 - luma)
    const channels = [luma + (red - luma) * saturation + warm * highlight * 2 - shadow * 0.008, luma + (green - luma) * saturation + (mood === 'noon' ? 0.005 : -0.008) * highlight, luma + (blue - luma) * saturation - warm * highlight + shadow * (mood === 'dusk' ? 0.018 : 0.006)]
    for (let channel = 0; channel < 3; ++channel) {
      pixels[n * 4 + channel] = Math.round(THREE.MathUtils.clamp(channels[channel], 0, 1) * 255)
    }
    pixels[n * 4 + 3] = 255
  }
  const texture = new THREE.Data3DTexture(pixels, size, size, size)
  texture.format = THREE.RGBAFormat
  texture.type = THREE.UnsignedByteType
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}
