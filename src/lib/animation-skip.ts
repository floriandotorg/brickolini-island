export type ManagedAnimation = { managed: boolean; capturesPlayer: boolean; location: number; hasCameraTrack: boolean; released: boolean }
export const skipDecision = (animation: ManagedAnimation, release: boolean): 'ignore' | 'release' | 'stop' => {
  if (!animation.managed) {
    return 'ignore'
  }
  return release && animation.capturesPlayer && animation.location !== -1 && !animation.hasCameraTrack && !animation.released ? 'release' : 'stop'
}
