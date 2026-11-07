import { ScoreActors, type ScoreMission, ScoreMissions } from './score.ts'

export const ScorePalette = ['#b9b9b9', '#ffb900', '#00548c', '#cb1220'] as const
const columns = [
  { x: 47, width: 37 },
  { x: 86, width: 41 },
  { x: 129, width: 39 },
  { x: 170, width: 40 },
  { x: 212, width: 40 },
]
const rows = [
  { y: 171, height: 42 },
  { y: 130, height: 39 },
  { y: 87, height: 41 },
  { y: 44, height: 41 },
  { y: 0, height: 42 },
]

export const getCubeCells = (getScore: (mission: ScoreMission, actor: (typeof ScoreActors)[number]) => number) =>
  ScoreActors.flatMap((actor, actorIndex) => ScoreMissions.map((mission, missionIndex) => ({ ...columns[missionIndex], ...rows[actorIndex], color: ScorePalette[getScore(mission, actor)] ?? ScorePalette[0] })))

export const getHistoryPosition = (index: number) => ({ x: index < 10 ? 144 : 344, y: 121 + 27 * (index % 10) })
