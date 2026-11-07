import type { CharacterName } from './character'

export const extraVehicles = ['bikebd', 'bikepg', 'bikerd', 'bikesy', 'motoni', 'motola', 'board'] as const
type ExtraVehicle = (typeof extraVehicles)[number]

export const extraCharacters: {
  name: CharacterName
  vehicleId: ExtraVehicle | null
  canSpawnAsExtra: boolean
  duration: number
  maxLifetime: number
  vehicleProbability: number
  cycleIndex: number
}[] = [
  { name: 'pepper', vehicleId: 'board', canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 50, cycleIndex: 1 },
  { name: 'mama', vehicleId: null, canSpawnAsExtra: false, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 2 },
  { name: 'papa', vehicleId: null, canSpawnAsExtra: false, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 3 },
  { name: 'nick', vehicleId: 'motoni', canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 20, cycleIndex: 4 },
  { name: 'laura', vehicleId: 'motola', canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 20, cycleIndex: 5 },
  { name: 'brickstr', vehicleId: null, canSpawnAsExtra: false, duration: 1000, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 6 },
  { name: 'studs', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'rhoda', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'valerie', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'snap', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'pt', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'mg', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'bu', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'ml', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'nu', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'na', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'cl', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'en', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 're', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'ro', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'd1', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'd2', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'd3', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'd4', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'l1', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'l2', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'l3', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'l4', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'l5', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'l6', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'b1', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'b2', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'b3', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'b4', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'cm', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'gd', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'rd', vehicleId: 'bikerd', canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 50, cycleIndex: 9 },
  { name: 'pg', vehicleId: 'bikepg', canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 50, cycleIndex: 8 },
  { name: 'bd', vehicleId: 'bikebd', canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 100, cycleIndex: 7 },
  { name: 'sy', vehicleId: 'bikesy', canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 100, cycleIndex: 10 },
  { name: 'gn', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'df', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'bs', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'lt', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'st', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'bm', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
  { name: 'jk', vehicleId: null, canSpawnAsExtra: true, duration: 1500, maxLifetime: 20000, vehicleProbability: 0, cycleIndex: 0 },
]
