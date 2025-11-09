import type { IsleParam } from '../../worlds/isle-base'

export const SpawnLocations = ['infocenterExited', 'jetskibuildExited', 'racecarbuildExited', 'garageExited', 'hospitalExited', 'policeExited'] as const
export type SpawnLocation = (typeof SpawnLocations)[number]

export const getSpawnLocation = (location: SpawnLocation): IsleParam => {
  switch (location) {
    case 'infocenterExited':
      return { position: { boundaryName: 'INT46', source: 0, sourceScale: 0.5, destination: 2, destinationScale: 0.5 } }
    case 'jetskibuildExited':
      return { position: { boundaryName: 'EDG00_46', source: 3, sourceScale: 0.625, destination: 2, destinationScale: 0.03 } }
    case 'racecarbuildExited':
      return { position: { boundaryName: 'INT16', source: 4, sourceScale: 0.1, destination: 2, destinationScale: 0 } }
    case 'garageExited':
      return { position: { boundaryName: 'INT24', source: 2, sourceScale: 0.73, destination: 4, destinationScale: 0.71 } }
    case 'hospitalExited':
      return { position: { boundaryName: 'EDG02_28', source: 3, sourceScale: 0.37, destination: 1, destinationScale: 0.52 } }
    case 'policeExited':
      return { position: { boundaryName: 'EDG02_64', source: 2, sourceScale: 0.24, destination: 0, destinationScale: 0.84 } }
  }
}
