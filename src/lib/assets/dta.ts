import { extraCharacters, extraVehicles } from '../world/extras-data'
import { BinaryReader } from './binary-reader'
import { getFile, getFileUrl } from './load'

export namespace DTA {
  export interface ModelInfo {
    name: string
    actorType: number
    location: [number, number, number]
    direction: [number, number, number]
    up: [number, number, number]
    canBeIndexed: number
  }

  export interface AnimationInfo {
    name: string
    objectId: number
    location: number
    hasCameraAnimation: boolean
    unused0b: number
    actorMask: number
    unused0d: number
    position: [number, number, number]
    radius: number
    modelCount: number
    modelInfo: ModelInfo[]
    characterIndex: number
    vehicleIndices: number[]
    numPlayed: number
    active: boolean
  }
}

const parseModelInfo = (reader: BinaryReader): DTA.ModelInfo => ({
  name: reader.readString('u8'),
  actorType: reader.readUint8(),
  location: reader.readVector3(),
  direction: reader.readVector3(),
  up: reader.readVector3(),
  canBeIndexed: reader.readUint8(),
})

const parseAnimation = (reader: BinaryReader): DTA.AnimationInfo => {
  const name = reader.readString('u8')
  const objectId = reader.readUint32()
  const location = reader.readInt16()
  const hasCameraAnimation = reader.readUint8() !== 0
  const unused0b = reader.readUint8()
  const actorMask = reader.readUint8()
  const unused0d = reader.readUint8()
  const position = reader.readVector3()
  const radius = reader.readFloat32()
  const modelCount = reader.readUint8()

  const modelInfo: DTA.ModelInfo[] = []
  for (let n = 0; n < modelCount; ++n) {
    modelInfo.push(parseModelInfo(reader))
  }

  return {
    name,
    objectId,
    location,
    hasCameraAnimation,
    unused0b,
    actorMask,
    unused0d,
    position,
    radius,
    modelCount,
    modelInfo,
    characterIndex: extraCharacters.findIndex(character => character.name.slice(0, 2) === name.slice(-2).toLowerCase()),
    vehicleIndices: modelInfo
      .filter(model => model.canBeIndexed !== 0)
      .flatMap(model => extraVehicles.flatMap((vehicle, n) => (vehicle === model.name.toLowerCase() ? [n] : [])))
      .slice(0, 3),
    numPlayed: 0,
    active: false,
  }
}

export type DtaWorldName = 'BLDD' | 'BLDH' | 'BLDJ' | 'BLDR' | 'HOSP' | 'POLICE' | 'GMAIN' | 'ICUBE' | 'IELEV' | 'IISLE' | 'IMAIN' | 'IREG' | 'RACC' | 'RACJ' | 'ACT1' | 'ACT2' | 'ACT3'

export const loadAnimationInfoFromDTA = async (worldName: DtaWorldName): Promise<DTA.AnimationInfo[]> => {
  const reader = new BinaryReader(await getFile(getFileUrl(`${worldName}INF.DTA`)))

  const version = reader.readUint32()
  if (version !== 3) {
    throw new Error(`Invalid DTA version: ${version}`)
  }

  const numAnimations = reader.readUint16()

  const animations: DTA.AnimationInfo[] = []
  for (let n = 0; n < numAnimations; ++n) {
    animations.push(parseAnimation(reader))
  }

  return animations
}
