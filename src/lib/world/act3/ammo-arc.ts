export type Vector = readonly [number, number, number]
export type Plane = readonly [number, number, number, number]
export type AmmoArc = { c0: Vector; c1: Vector; c2: Vector; apex: number }
export type LandingFace = { flags: number; plane: Plane; edges: readonly Plane[] }
const dot = (a: Vector, b: Vector): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const planeDistance = (plane: Plane, point: Vector): number => plane[0] * point[0] + plane[1] * point[1] + plane[2] * point[2] + plane[3]
export const calculateArc = (location: Vector, direction: Vector, up: Vector): AmmoArc | null => {
  if (direction[1] >= -0.000001 || location[1] <= 0) {
    return null
  }
  const ground: Vector = [location[0] - (direction[0] * location[1]) / direction[1], 0, location[2] - (direction[2] * location[1]) / direction[1]]
  const axis = (n: number): number => {
    const delta = ground[n] - location[n]
    const u = (n === 1 ? -1 : 0) - up[n]
    return Math.abs(delta) < 1e-8 ? 0 : (u * u + 2 * u * up[n]) / (4 * delta)
  }
  const c0: Vector = [axis(0), axis(1), axis(2)]
  const horizontal = Math.abs(c0[0]) > 1e-8 ? 0 : 2
  const apex = Math.abs(c0[horizontal]) > 1e-8 ? -up[horizontal] / (2 * c0[horizontal]) : 2 * location[1]
  return Number.isFinite(apex) && apex > 0 ? { c0, c1: up, c2: location, apex } : null
}
export const positionOnArc = (arc: AmmoArc, time: number): [number, number, number] => [arc.c0[0] * time * time + arc.c1[0] * time + arc.c2[0], arc.c0[1] * time * time + arc.c1[1] * time + arc.c2[1], arc.c0[2] * time * time + arc.c1[2] * time + arc.c2[2]]
export const findLanding = <T extends LandingFace>(arc: AmmoArc, boundaries: readonly T[]): { boundary: T; time: number } | null => {
  let best: { boundary: T; time: number } | null = null
  for (const boundary of boundaries) {
    if ((boundary.flags & 4) !== 0) {
      continue
    }
    const normal: Vector = [boundary.plane[0], boundary.plane[1], boundary.plane[2]]
    const a = dot(arc.c0, normal)
    if (Math.abs(a) < 0.001) {
      continue
    }
    const b = dot(arc.c1, normal)
    const c = planeDistance(boundary.plane, arc.c2)
    const discriminant = b * b - 4 * a * c
    if (discriminant < -0.001) {
      continue
    }
    const root = Math.sqrt(Math.max(0, discriminant))
    const first = (root - b) / (2 * a)
    const second = (-root - b) / (2 * a)
    const time = first >= 0 && first <= arc.apex ? first : second >= 0 && second <= arc.apex ? second : null
    if (time == null || (best != null && time >= best.time)) {
      continue
    }
    const point = positionOnArc(arc, time)
    if (boundary.edges.some(plane => planeDistance(plane, point) < -0.001) || dot(normal, [arc.c2[0] - point[0], arc.c2[1] - point[1], arc.c2[2] - point[2]]) < 0) {
      continue
    }
    best = { boundary, time }
  }
  return best
}
