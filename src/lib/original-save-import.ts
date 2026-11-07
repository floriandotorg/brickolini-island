import { Matrix4, Quaternion, Vector3 } from 'three'
import { BinaryReader } from './assets/binary-reader.ts'
import { ColorTableNames, isColorName } from './color-table.ts'
import type { ScoreMission } from './score.ts'
import type { ScoreHistoryEntry } from './score-history.ts'

const actors = ['pepper', 'mama', 'papa', 'nick', 'laura'] as const
const characters = [
  'pepper',
  'mama',
  'papa',
  'nick',
  'laura',
  'infoman',
  'brickstr',
  'studs',
  'rhoda',
  'valerie',
  'snap',
  'pt',
  'mg',
  'bu',
  'ml',
  'nu',
  'na',
  'cl',
  'en',
  're',
  'ro',
  'd1',
  'd2',
  'd3',
  'd4',
  'l1',
  'l2',
  'l3',
  'l4',
  'l5',
  'l6',
  'b1',
  'b2',
  'b3',
  'b4',
  'cm',
  'gd',
  'rd',
  'pg',
  'bd',
  'sy',
  'gn',
  'df',
  'bs',
  'lt',
  'st',
  'bm',
  'jk',
  'ghost',
  'ghost01',
  'ghost02',
  'ghost03',
  'ghost04',
  'ghost05',
  'hg',
  'pntgy',
  'pep',
  'cop01',
  'actor_01',
  'actor_02',
  'actor_03',
  'actor_04',
  'actor_05',
  'btmncycl',
  'cboycycl',
  'boatman',
]
const areas = [
  'previousArea',
  'isle',
  'infomain',
  'infodoor',
  'infocenterExited',
  'elevbott',
  'elevride',
  'elevride2',
  'elevopen',
  'seaview',
  'observe',
  'elevdown',
  'regbook',
  'infoscor',
  'jetrace',
  'jetraceFinished',
  'jetraceExterior',
  'jetskibuildExited',
  'carrace',
  'carraceExterior',
  'racecarbuildExited',
  'carraceFinished',
  'pizzeriaExterior',
  'unkInPizzeria',
  'unkFacingPizzeria',
  'garageExterior',
  'garage',
  'garadoor',
  'garageExited',
  'hospitalExterior',
  'hospital',
  'hospitalExited',
  'policeExterior',
  'policeExited',
  'police',
  'polidoor',
  'copterbuild',
  'dunecarbuild',
  'jetskibuild',
  'racecarbuild',
  'helicopterSpawn',
  'helicopterLanded',
  'helicopterTakenOff',
  'dunebuggySpawn',
  'racecarSpawn',
  'jetskiSpawn',
  'act2main',
  'act3script',
  'unkCrash48',
  'unkCrash49',
  'pepperSpawnAct2',
  'unkInFrontGasStationFacingLeft2',
  'towTrackHookedUp',
  'jukeboxw',
  'jukeboxExterior',
  'helicopterExited',
  'histbook',
  'bike',
  'dunecar',
  'motocycle',
  'copter',
  'skateboard',
  'ambulance',
  'towtrack',
  'jetski',
  null,
  'vehicleExited',
]
const check = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message)
  }
}
const count = (value: number, maximum: number, label: string): number => {
  check(Number.isInteger(value) && value >= 0 && value <= maximum, `Invalid ${label}`)
  return value
}
const complete = (reader: BinaryReader): void => check(reader.position === reader.length, 'Unexpected trailing save data')
const username = (reader: BinaryReader): string => {
  let name = ''
  let ended = false
  for (let n = 0; n < 7; ++n) {
    const letter = reader.readInt16()
    if (letter === -1) {
      ended = true
    } else {
      check(!ended && letter >= 0 && letter < 26, 'Unsupported letter in player name')
      name += String.fromCharCode(65 + letter)
    }
  }
  check(name.length > 0, 'Empty player name')
  return name
}
export const parseOriginalPlayers = (buffer: ArrayBuffer): string[] => {
  const reader = new BinaryReader(buffer)
  const names = Array.from({ length: count(reader.readInt16(), 9, 'player count') }, () => username(reader))
  check(new Set(names).size === names.length, 'Duplicate player name')
  complete(reader)
  return names
}
export const parseOriginalHistory = (buffer: ArrayBuffer): { nextPlayerId: number; entries: ScoreHistoryEntry[] } => {
  const reader = new BinaryReader(buffer)
  const nextPlayerId = count(reader.readInt16(), 32767, 'next player id')
  const entries = Array.from({ length: count(reader.readInt16(), 20, 'history count') }, () => {
    reader.readInt16()
    reader.readInt16()
    const scores = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => count(reader.readUint8(), 3, 'score')))
    const name = username(reader)
    const playerId = count(reader.readInt16(), 32767, 'player id')
    return { name, playerId, scores, totalScore: scores.flat().reduce((total, value) => total + value, 0) }
  })
  complete(reader)
  return { nextPlayerId, entries }
}
export const parseOriginalSave = (buffer: ArrayBuffer): Record<string, string> => {
  const reader = new BinaryReader(buffer)
  check(reader.readInt32() === 0x1000c, 'Unsupported original save version')
  const values: Record<string, string> = {}
  const put = (key: string, value: unknown): void => {
    values[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
  const score = (mission: ScoreMission, player: string, kind: 'current' | 'high', value: number): void => put(`score.${mission}.${kind}.${player}`, count(value, 3, 'score'))
  put('playerId', count(reader.readInt16(), 32767, 'player id'))
  put('act', count(reader.readUint16(), 2, 'act') + 1)
  const actorId = count(reader.readUint8(), 5, 'actor id')
  if (actorId > 0) {
    put('player', actors[actorId - 1])
  }
  let variablesEnded = false
  for (let n = 0; n < 256; ++n) {
    const name = reader.readString('u8')
    if (name === 'END_OF_VARIABLES') {
      variablesEnded = true
      break
    }
    const value = reader.readString('u8')
    const key = name.toLowerCase()
    if (ColorTableNames.some(name => name === key) && isColorName(value.toLowerCase())) {
      put(`color.${key}`, value.toLowerCase())
    } else if (key === 'lightposition') {
      put('sun', count(Number(value), 5, 'light position'))
    } else if (key === 'backgroundcolor') {
      const parts = value.trim().split(/\s+/).slice(1).map(Number)
      check(parts.length === 3 && parts.every(value => Number.isFinite(value) && value >= 0 && value <= 100), 'Invalid background color')
      put('backgroundColor', { h: parts[0] / 100, s: parts[1] / 100, v: parts[2] / 100 })
    }
  }
  check(variablesEnded, 'Missing variable end marker')
  const variants: Record<string, unknown> = {}
  for (const name of characters) {
    const sound = count(reader.readInt32(), 8, 'character sound')
    const move = count(reader.readInt32(), 3, 'character move')
    const mood = count(reader.readUint8(), 3, 'character mood')
    const hatPart = count(reader.readUint8(), name === 'pepper' || name === 'pep' ? 20 : 19, 'hat part')
    const colors = Array.from({ length: 6 }, () => count(reader.readUint8(), 7, 'character color'))
    variants[name] = { sound, move, mood, hatPart, hatColor: colors[0], torsoColor: colors[1], armLeftColor: colors[2], armRightColor: colors[3], legLeftColor: colors[4], legRightColor: colors[5] }
  }
  put('characters', variants)
  put(
    'plants',
    Array.from({ length: 81 }, () => ({
      variant: count(reader.readUint8(), 3, 'plant variant'),
      sound: count(reader.readUint32(), 7, 'plant sound'),
      move: count(reader.readUint32(), 2, 'plant move'),
      mood: count(reader.readUint8(), 3, 'plant mood'),
      color: count(reader.readUint8(), 4, 'plant color'),
      counter: reader.readInt8(),
    })),
  )
  const buildings = Array.from({ length: 16 }, () => ({ sound: count(reader.readUint32(), 5, 'building sound'), move: count(reader.readUint32(), 2, 'building move'), mood: count(reader.readUint8(), 3, 'building mood'), counter: reader.readInt8() }))
  put('buildings', { entries: buildings, nextVariant: count(reader.readUint8(), 4, 'house variant') })
  const states = count(reader.readInt16(), 64, 'state count')
  const builds: Record<string, string | undefined> = { LegoCopterBuildState: 'helicopter', LegoDuneCarBuildState: 'dunecar', LegoJetskiBuildState: 'jetski', LegoRaceCarBuildState: 'racecar' }
  const texture = (): void => {
    reader.readString('u16')
    const width = count(reader.readUint32(), 8192, 'texture width')
    const height = count(reader.readUint32(), 8192, 'texture height')
    const palette = count(reader.readUint32(), 256, 'texture palette')
    reader.skip(palette * 3 + width * height)
  }
  for (let n = 0; n < states; ++n) {
    const name = reader.readString('u16')
    if (name === 'PizzeriaState') {
      for (const player of actors) {
        put(`pizzeria.playlist.${player}`, count(reader.readInt16(), 2, 'playlist index'))
      }
    } else if (name === 'PizzaMissionState') {
      for (const player of actors) {
        reader.readInt16()
        put(`pizza.counter.${player}`, Math.max(1, reader.readInt16()))
        score('pizza', player, 'current', reader.readInt16())
        score('pizza', player, 'high', reader.readInt16())
      }
    } else if (name === 'TowTrackMissionState' || name === 'AmbulanceMissionState') {
      const mission = name === 'TowTrackMissionState' ? 'towTrack' : 'ambulance'
      for (const kind of ['current', 'high'] as const) {
        for (const player of actors) {
          score(mission, player, kind, reader.readInt16())
        }
      }
    } else if (name === 'HospitalState') {
      reader.readInt16()
      for (const player of actors) {
        put(`hospital.visit.${player}`, count(reader.readInt16(), 5, 'hospital visit'))
      }
    } else if (name === 'GasStationState') {
      for (const player of actors) {
        put(`gasstation.visit.${player}`, count(reader.readInt16(), 5, 'gas station visit'))
      }
    } else if (name === 'PoliceState') {
      const script = reader.readInt32()
      if (script === 500 || script === 501) {
        put('police.nextAnimation', script === 500 ? 'nps001ni' : 'nps002la')
      }
    } else if (name === 'CarRaceState' || name === 'JetskiRaceState') {
      for (let n = 0; n < 5; ++n) {
        const player = count(reader.readUint8(), 5, 'race actor') - 1
        check(player >= 0, 'Missing race actor')
        score(name === 'CarRaceState' ? 'carRace' : 'jetskiRace', actors[player], 'current', reader.readInt16())
        score(name === 'CarRaceState' ? 'carRace' : 'jetskiRace', actors[player], 'high', reader.readInt16())
      }
    } else if (name === 'AnimState') {
      const extraCharacterId = count(reader.readUint32(), 46, 'extra character')
      const playCounts = Array.from({ length: count(reader.readUint32(), 65536, 'animation count') }, () => reader.readUint16())
      const locationsPlayed = Array.from({ length: count(reader.readUint32(), 65536, 'location count') }, () => reader.readUint8() !== 0)
      put('anim', { extraCharacterId, playCounts, locationsPlayed })
    } else if (name === 'Act1State') {
      const planes = ['moto', 'bike', 'skate', 'helicopter', 'jetski', 'dunecar', 'racecar'].map(vehicle => {
        const boundary = reader.readString('u16')
        const position = reader.readVector3()
        const direction = new Vector3(...reader.readVector3())
        const up = new Vector3(...reader.readVector3())
        if (boundary.length > 0) {
          check([...position, ...direction.toArray(), ...up.toArray()].every(Number.isFinite) && direction.lengthSq() > 0.001 && up.lengthSq() > 0.001, 'Invalid vehicle placement')
          direction.normalize()
          const right = new Vector3().crossVectors(up, direction).normalize()
          up.crossVectors(direction, right).normalize()
          const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, up, direction))
          put(`vehicle.placement.${vehicle}`, [...position, ...quaternion.toArray()])
        }
        return boundary.length > 0
      })
      for (const [index, total] of [
        [3, 3],
        [4, 2],
        [5, 1],
        [6, 3],
      ]) {
        if (planes[index]) {
          for (let n = 0; n < total; ++n) {
            texture()
          }
        }
      }
      put('cptClickDialogueIndex', count(reader.readInt16(), 2, 'captain dialogue'))
      put('playedExitExplanation', reader.readUint8() !== 0)
    } else {
      const vehicle = builds[name]
      if (vehicle == null) {
        throw new Error(`Unknown original save state: ${name}`)
      }
      const introductionCounter = reader.readUint8()
      const finishedBuild = reader.readUint8() !== 0
      const playedExitScript = reader.readUint8() !== 0
      put(`build.${vehicle}`, { introductionCounter, finishedBuild, playedExitScript })
      put(`vehicle.progress.${vehicle}`, reader.readUint8())
    }
  }
  const previous = reader.readInt16()
  if (previous >= 0 && previous < areas.length && areas[previous] != null) {
    put('savedPreviousArea', areas[previous])
  }
  complete(reader)
  return values
}
