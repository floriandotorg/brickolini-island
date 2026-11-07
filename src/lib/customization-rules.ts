export type ClickKind = 'actor' | 'plant' | 'building'
export type ClickState = { sound: number; move: number; mood: number }

export const advanceClickState = <T extends ClickState>(state: T, player: string, kind: ClickKind): T => {
  const next = { ...state }
  if (player === 'mama') {
    next.sound = (next.sound + 1) % (kind === 'actor' ? 9 : kind === 'plant' ? 8 : 6)
  } else if (player === 'papa') {
    next.move = (next.move + 1) % (kind === 'actor' ? 4 : 3)
  } else if (player === 'laura') {
    next.mood = (next.mood + 1) % 4
  }
  return next
}

export const clickSoundIds = (kind: ClickKind, state: Pick<ClickState, 'sound' | 'mood'>, mood: boolean): number[] => {
  const normal = (kind === 'actor' ? 50 : kind === 'plant' ? 56 : 60) + state.sound
  return mood ? [66 + (kind === 'plant' ? state.mood & 1 : state.mood), normal] : [normal]
}

export const clickAnimationId = (kind: ClickKind, move: number, index = 0): number => (kind === 'actor' ? 10 + move : kind === 'plant' ? 30 + index * 3 + move : index >= 9 && index <= 14 ? 70 + (index - 9) * 3 + move : 0)

export const colorPart = (name: string): string => (name === 'head' ? 'infohat' : name === 'body' ? 'infogron' : name === 'claw-lft' ? 'arm-lft' : name === 'claw-rt' ? 'arm-rt' : name)
