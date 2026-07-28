import type { IsleParam } from '../../worlds/isle-base'

export const SpawnLocations = [
  'pizzeriaExterior',
  'infocenterExited',
  'jetraceExterior',
  'jetskibuildExited',
  'carraceExterior',
  'racecarbuildExited',
  'garageExterior',
  'garageExited',
  'hospitalExterior',
  'hospitalExited',
  'policeExterior',
  'policeExited',
  'helicopterSpawn',
  'dunebuggySpawn',
  'racecarSpawn',
  'jetskiSpawn',
  'helicopterTakenOff',
  'helicopterLanded',
  'helicopterExited',
  'jukeboxExterior',
] as const
export type SpawnLocation = (typeof SpawnLocations)[number]
export const isSpawnLocation = (name: string): name is SpawnLocation => SpawnLocations.includes(name as SpawnLocation)

export const getSpawnLocation = (location: SpawnLocation): IsleParam => {
  switch (location) {
    case 'pizzeriaExterior':
      return { position: { boundaryName: 'INT35', source: 2, sourceScale: 0.6, destination: 4, destinationScale: 0.4 } }
    case 'infocenterExited':
      return { position: { boundaryName: 'INT46', source: 0, sourceScale: 0.5, destination: 2, destinationScale: 0.5 } }
    case 'jetraceExterior':
      return { position: { boundaryName: 'EDG00_46', source: 0, sourceScale: 0.95, destination: 2, destinationScale: 0.19 } }
    case 'jetskibuildExited':
      return { position: { boundaryName: 'EDG00_46', source: 3, sourceScale: 0.625, destination: 2, destinationScale: 0.03 } }
    case 'carraceExterior':
      return { position: { boundaryName: 'INT15', source: 5, sourceScale: 0.65, destination: 1, destinationScale: 0.68 } }
    case 'racecarbuildExited':
      return { position: { boundaryName: 'INT16', source: 4, sourceScale: 0.1, destination: 2, destinationScale: 0 } }
    case 'garageExterior':
      return { position: { boundaryName: 'INT24', source: 0, sourceScale: 0.55, destination: 2, destinationScale: 0.71 } }
    case 'garageExited':
      return { position: { boundaryName: 'INT24', source: 2, sourceScale: 0.73, destination: 4, destinationScale: 0.71 } }
    case 'hospitalExterior':
      return { position: { boundaryName: 'INT19', source: 0, sourceScale: 0.85, destination: 1, destinationScale: 0.28 } }
    case 'hospitalExited':
      return { position: { boundaryName: 'EDG02_28', source: 3, sourceScale: 0.37, destination: 1, destinationScale: 0.52 } }
    case 'policeExterior':
      return { position: { boundaryName: 'INT33', source: 0, sourceScale: 0.88, destination: 2, destinationScale: 0.74 } }
    case 'policeExited':
      return { position: { boundaryName: 'EDG02_64', source: 2, sourceScale: 0.24, destination: 0, destinationScale: 0.84 } }
    case 'helicopterSpawn':
      return { position: { boundaryName: 'EDG02_51', source: 2, sourceScale: 0.63, destination: 3, destinationScale: 0.01 } }
    case 'dunebuggySpawn':
      return { position: { boundaryName: 'EDG02_35', source: 2, sourceScale: 0.8, destination: 0, destinationScale: 0.2 } }
    case 'racecarSpawn':
      return { position: { boundaryName: 'EDG03_01', source: 2, sourceScale: 0.25, destination: 0, destinationScale: 0.75 } }
    case 'jetskiSpawn':
      return { position: { boundaryName: 'EDG10_70', source: 3, sourceScale: 0.25, destination: 0, destinationScale: 0.7 } }
    case 'helicopterTakenOff':
      return { position: { boundaryName: 'inv_05', source: 2, sourceScale: 0.25, destination: 0, destinationScale: 0.19 } }
    case 'helicopterLanded':
      return { position: { boundaryName: 'edg02_51', source: 2, sourceScale: 0.63, destination: 0, destinationScale: 0.4 } }
    case 'helicopterExited':
      return { position: { boundaryName: 'edg02_50', source: 2, sourceScale: 0.8, destination: 1, destinationScale: 0.3 } }
    case 'jukeboxExterior':
      return { position: { boundaryName: 'INT36', source: 0, sourceScale: 0.2, destination: 4, destinationScale: 0.4 } }
  }
}
