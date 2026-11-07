export const ScoreColors = ['grey', 'yellow', 'blue', 'red'] as const
export type ScoreColor = (typeof ScoreColors)[number]
export const scoreColorValue = (color: ScoreColor): number => ScoreColors.indexOf(color)
export const ScoreMissions = ['carRace', 'jetskiRace', 'pizza', 'towTrack', 'ambulance'] as const
export type ScoreMission = (typeof ScoreMissions)[number]
export const ScoreActors = ['pepper', 'mama', 'papa', 'nick', 'laura'] as const
