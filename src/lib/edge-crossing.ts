type Point = readonly [number, number]
export const crossesEdge = (from: Point, to: Point, a: Point, b: Point): boolean => {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const ex = b[0] - a[0]
  const ey = b[1] - a[1]
  const denominator = dx * ey - dy * ex
  if (Math.abs(denominator) < 1e-9) {
    return false
  }
  const ax = a[0] - from[0]
  const ay = a[1] - from[1]
  const alongMove = (ax * ey - ay * ex) / denominator
  const alongEdge = (ax * dy - ay * dx) / denominator
  return alongMove > 0 && alongMove <= 1 && alongEdge >= 0 && alongEdge <= 1
}
