import { Beach_Music, CentralNorthRoad_Music, GarageArea_Music, Hospital_Music, InformationCenter_Music, PoliceStation_Music, Quiet_Audio } from '../../actions/jukebox'
import type { IsleParam } from '../../worlds/isle-base'
import type { AudioAction } from '../action-types'

export const SpawnLocations = [
  'pizzeriaExterior',
  'unkInPizzeria',
  'unkFacingPizzeria',
  'unkCrash48',
  'unkCrash49',
  'pepperSpawnAct2',
  'unkInFrontGasStationFacingLeft2',
  'infocenterExited',
  'jetraceExterior',
  'jetraceFinished',
  'jetskibuildExited',
  'carraceExterior',
  'carraceFinished',
  'racecarbuildExited',
  'garageExterior',
  'garageExited',
  'towTrackHookedUp',
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

const getPlacement = (location: SpawnLocation): IsleParam => {
  switch (location) {
    case 'unkInPizzeria':
      return { position: { boundaryName: 'edg00_49', source: 1, sourceScale: 0.43, destination: 2, destinationScale: 0.6 } }
    case 'unkFacingPizzeria':
      return { position: { boundaryName: 'edg00_191', source: 2, sourceScale: 0.5, destination: 0, destinationScale: 0.55 } }
    case 'unkCrash48':
      return getPlacement('helicopterLanded')
    case 'unkCrash49':
      return getPlacement('helicopterTakenOff')
    case 'pepperSpawnAct2':
      return { position: { boundaryName: 'EDG02_51', source: 0, sourceScale: 0.64, destination: 1, destinationScale: 0.37 } }
    case 'unkInFrontGasStationFacingLeft2':
      return { position: { boundaryName: 'edg02_32', source: 0, sourceScale: 0.5, destination: 2, destinationScale: 0.5 } }
    case 'pizzeriaExterior':
      return { position: { boundaryName: 'INT35', source: 2, sourceScale: 0.6, destination: 4, destinationScale: 0.4 } }
    case 'infocenterExited':
      return { position: { boundaryName: 'INT46', source: 0, sourceScale: 0.5, destination: 2, destinationScale: 0.5 } }
    case 'jetraceFinished':
      return { position: { boundaryName: 'EDG10_63', source: 0, sourceScale: 0.26, destination: 1, destinationScale: 0.01 } }
    case 'jetraceExterior':
      return { position: { boundaryName: 'EDG00_46', source: 0, sourceScale: 0.95, destination: 2, destinationScale: 0.19 } }
    case 'jetskibuildExited':
      return { position: { boundaryName: 'EDG00_46', source: 3, sourceScale: 0.625, destination: 2, destinationScale: 0.03 } }
    case 'carraceFinished':
      return { position: { boundaryName: 'INT62', source: 2, sourceScale: 0.1, destination: 3, destinationScale: 0.7 } }
    case 'carraceExterior':
      return { position: { boundaryName: 'INT15', source: 5, sourceScale: 0.65, destination: 1, destinationScale: 0.68 } }
    case 'racecarbuildExited':
      return { position: { boundaryName: 'INT16', source: 4, sourceScale: 0.1, destination: 2, destinationScale: 0 } }
    case 'garageExterior':
      return { position: { boundaryName: 'INT24', source: 0, sourceScale: 0.55, destination: 2, destinationScale: 0.71 } }
    case 'towTrackHookedUp':
      return { position: { boundaryName: 'edg02_19', source: 2, sourceScale: 0.5, destination: 0, destinationScale: 0.5 } }
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
      return { position: { boundaryName: 'inv_05', source: 2, sourceScale: 0.75, destination: 0, destinationScale: 0.19 } }
    case 'helicopterLanded':
      return { position: { boundaryName: 'edg02_51', source: 2, sourceScale: 0.63, destination: 0, destinationScale: 0.4 } }
    case 'helicopterExited':
      return { position: { boundaryName: 'edg02_50', source: 2, sourceScale: 0.8, destination: 1, destinationScale: 0.3 } }
    case 'jukeboxExterior':
      return { position: { boundaryName: 'INT36', source: 0, sourceScale: 0.2, destination: 4, destinationScale: 0.4 } }
  }
}

const spawnMetadata: Partial<Record<SpawnLocation, { camLocation: number; music: AudioAction }>> = {
  pizzeriaExterior: { camLocation: 0x2a, music: Quiet_Audio },
  unkInPizzeria: { camLocation: 0x27, music: Quiet_Audio },
  unkFacingPizzeria: { camLocation: 0x26, music: Quiet_Audio },
  infocenterExited: { camLocation: 0x10, music: InformationCenter_Music },
  jetraceExterior: { camLocation: 0x17, music: Beach_Music },
  jetskibuildExited: { camLocation: 0x18, music: Beach_Music },
  carraceExterior: { camLocation: 0x33, music: CentralNorthRoad_Music },
  racecarbuildExited: { camLocation: 0x34, music: CentralNorthRoad_Music },
  carraceFinished: { camLocation: 0x36, music: CentralNorthRoad_Music },
  garageExterior: { camLocation: 0x08, music: GarageArea_Music },
  garageExited: { camLocation: 0x0a, music: GarageArea_Music },
  hospitalExterior: { camLocation: 0, music: Hospital_Music },
  hospitalExited: { camLocation: 0x0c, music: Hospital_Music },
  policeExterior: { camLocation: 0x22, music: PoliceStation_Music },
  policeExited: { camLocation: 0x23, music: PoliceStation_Music },
}
export const getSpawnLocation = (location: SpawnLocation): IsleParam => ({ ...getPlacement(location), ...spawnMetadata[location], spawn: location })
