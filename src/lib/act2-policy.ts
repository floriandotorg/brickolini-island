const neighbours = [
  [3, 7],
  [2, 4],
  [3, 6],
  [5, 1],
  [7, 0],
  [6, 1],
  [0, 4],
  [2, 5],
  [0, 4],
]
export const nextChaseLocation = (current: number, cleared: readonly boolean[], choice: number): number => {
  const count = cleared.filter(Boolean).length
  if (count === 8 && current !== 8) {
    return 8
  }
  let next = neighbours[current][choice === 0 ? 0 : 1]
  if (count < 7 || cleared[current]) {
    for (let n = 0; n < 8 && (cleared[next] || next === current); ++n) {
      next = (next + 1) % 8
    }
  }
  return next
}
export const huntBrickPositions = (random = Math.random): [number, number, number][] => [
  random() < 0.5 ? [-79.0625, 0.5, -19.75] : [-67.62728, 0.917197, 11.49833],
  random() < 0.5 ? [53.9328, 2.372259, -61.2073] : [30.9856, 0.30453, -47.4378],
  random() < 0.5 ? [71.2397, 7.319758, -23] : [59.5102, 14.37329, 24.70311],
  random() < 0.5 ? (random() < 0.5 ? [-74.0625, 1.5, -91.125] : [20.4375, 0.5, -82.5625]) : random() < 0.5 ? [-80.46174, 0.6, -59.50533] : [-84, 4.5, 26],
]
