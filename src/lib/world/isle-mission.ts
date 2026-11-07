export interface IsleMission {
  readonly missionActive: boolean
  readonly isInCutscene: boolean
  abort(): void
  handleSpace(): void
}
