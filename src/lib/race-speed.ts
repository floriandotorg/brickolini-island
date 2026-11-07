export const raceTargetSpeed = (maximum: number, curve: boolean, waypoint: number, playerWaypoint: number, curveFactor: number, rubberBandFactor: number): number => {
  let target = maximum * (curve ? curveFactor : 1)
  const difference = waypoint - playerWaypoint
  if (difference > 1) {
    target *= 1 - rubberBandFactor * (Math.min(difference, 3) - 1) * 0.25
  } else if (difference < -1) {
    target *= 1.3
  }
  return target
}
export const approachRaceSpeed = (speed: number, target: number, milliseconds: number, acceleration: number): number => Math.min(target, speed + milliseconds * acceleration * (target < speed ? -1 : 1))
