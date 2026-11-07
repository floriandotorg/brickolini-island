export const changeSkyLightness = (lightness: number, sun: boolean): number => {
  const next = Math.round((lightness + (sun ? 0.1 : -0.1)) * 100) / 100
  return sun && next > 0.9 ? 1 : Math.max(0.1, next)
}
export const cycleSkyHue = (hue: number): number => {
  const next = Math.round((hue + 0.05) * 100) / 100
  return next > 1 ? Math.round((next - 1) * 100) / 100 : next
}
