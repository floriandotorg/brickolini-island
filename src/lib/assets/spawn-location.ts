import type { IsleParam } from '../../worlds/isle-base'

export const SpawnLocations = ['pizzeriaExterior', 'infocenterExited', 'jetraceExterior', 'jetskibuildExited', 'carraceExterior', 'racecarbuildExited', 'garageExterior', 'garageExited', 'hospitalExterior', 'hospitalExited', 'policeExterior', 'policeExited'] as const
export type SpawnLocation = (typeof SpawnLocations)[number]

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
  }
}
