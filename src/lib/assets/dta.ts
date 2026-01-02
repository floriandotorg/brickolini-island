import { BinaryReader } from './binary-reader'
import { getFile, getFileUrl } from './load'

export namespace DTA {
  export interface ModelInfo {
    name: string
    unknown1: number
    location: [number, number, number]
    direction: [number, number, number]
    up: [number, number, number]
    unknown2: number
  }

  export interface AnimationInfo {
    name: string
    objectId: number
    location: number
    hasCameraAnimation: boolean
    unknown2: number
    actorMask: number
    unknown4: number
    unknownPosition: [number, number, number]
    unknownRadius: number
    modelCount: number
    modelInfo: ModelInfo[]
    numPlayed: number
    active: boolean
  }
}

const parseModelInfo = (reader: BinaryReader): DTA.ModelInfo => ({
  name: reader.readString('u8'),
  unknown1: reader.readUint8(),
  location: reader.readVector3(),
  direction: reader.readVector3(),
  up: reader.readVector3(),
  unknown2: reader.readUint8(),
})

const parseAnimation = (reader: BinaryReader): DTA.AnimationInfo => {
  const name = reader.readString('u8')
  const objectId = reader.readUint32()
  const location = reader.readInt16()
  const hasCameraAnimation = reader.readUint8() !== 0
  const unknown2 = reader.readUint8()
  const actorMask = reader.readUint8()
  const unknown4 = reader.readUint8()
  const unknownPosition = reader.readVector3()
  const unknownRadius = reader.readFloat32()
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
    unknown2,
    actorMask,
    unknown4,
    unknownPosition,
    unknownRadius,
    modelCount,
    modelInfo,
    numPlayed: 0,
    active: false,
  }
}

export const loadAnimationInfoFromDTA = async (worldName: 'BLDD' | 'BLDH' | 'BLDJ' | 'BLDR' | 'HOSP' | 'POLICE' | 'GMAIN' | 'ICUBE' | 'IELEV' | 'IISLE' | 'IMAIN' | 'IREG' | 'RACC' | 'RACJ' | 'ACT1' | 'ACT2' | 'ACT3'): Promise<DTA.AnimationInfo[]> => {
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
