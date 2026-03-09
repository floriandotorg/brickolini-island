import type { IsleParam } from '../worlds/isle-base'
import { getSpawnLocation } from './assets/spawn-location'
import { engine } from './engine'
import type { ElevatorEntrance, NormalWorld, World, WorldName, WorldSpawn } from './world/world'

const worlds = new Map<WorldName, World>()

let lastWorld: WorldSpawnInner | null = null
let currentWorld: WorldSpawnInner | null = null

type WorldSpawnInner =
  | {
      name: NormalWorld
    }
  | {
      name: 'elevride'
      floor: ElevatorEntrance
    }
  | {
      name: 'act1'
      spawn: IsleParam
    }
  | {
      name: 'infomain'
      ending: 'bad' | 'good' | null
    }

export const switchWorld = async (spawn: WorldSpawn | NormalWorld) => {
  if (engine.hasWorld) {
    engine.currentWorld.skipAllRunningAnimations(true)
  }

  lastWorld = currentWorld

  if (typeof spawn === 'string') {
    return await switchWorldInner({ name: spawn })
  }
  if ('world' in spawn) {
    return await switchWorldInner({ name: spawn.world })
  }
  if ('floor' in spawn) {
    return await switchWorldInner({ name: 'elevride', floor: spawn.floor })
  }
  if ('spawn' in spawn) {
    return await switchWorldInner({ name: 'act1', spawn: getSpawnLocation(spawn.spawn) })
  }
  if ('ending' in spawn) {
    return await switchWorldInner({ name: 'infomain', ending: spawn.ending })
  }
  const _exhaustiveCheck: never = spawn
  throw new Error(`Unknown world spawn ${spawn}`)
}

const switchWorldInner = async (normalizedSpawn: WorldSpawnInner) => {
  const transition = engine.hasWorld ? engine.transition() : Promise.resolve()

  if (!worlds.has(normalizedSpawn.name)) {
    const newWorld = await (() => {
      switch (normalizedSpawn.name) {
        case 'act1':
          return import('../worlds/act1').then(m => new m.Act1())
        case 'hospital':
          return import('../worlds/hospital').then(m => new m.Hospital())
        case 'garage':
          return import('../worlds/garage').then(m => new m.Garage())
        case 'infomain':
          return import('../worlds/infomain').then(m => new m.InfoMain(normalizedSpawn.ending))
        case 'regbook':
          return import('../worlds/regbook').then(m => new m.RegBook())
        case 'police':
          return import('../worlds/police').then(m => new m.Police())
        case 'elevbott':
          return import('../worlds/elevbott').then(m => new m.ElevBott())
        case 'infodoor':
          return import('../worlds/infodoor').then(m => new m.InfoDoor())
        case 'infoscor':
          return import('../worlds/infoscor').then(m => new m.InfoScor())
        case 'polidoor':
          return import('../worlds/polidoor').then(m => new m.PoliDoor())
        case 'garadoor':
          return import('../worlds/garadoor').then(m => new m.GarDoor())
        case 'copter':
          return import('../worlds/build/copter').then(m => new m.Copter())
        case 'dunecar':
          return import('../worlds/build/dunecar').then(m => new m.Dunecar())
        case 'jetski':
          return import('../worlds/build/jetski').then(m => new m.Jetski())
        case 'racecar':
          return import('../worlds/build/racecar').then(m => new m.Racecar())
        case 'elevride':
          return import('../worlds/elevator/index').then(m => new m.Elevator())
        case 'elevopen':
          return import('../worlds/elevator/elevopen').then(m => new m.ElevOpen())
        case 'seaview':
          return import('../worlds/elevator/seaview').then(m => new m.SeaView())
        case 'observe':
          return import('../worlds/elevator/observe').then(m => new m.Observe())
        case 'elevdown':
          return import('../worlds/elevator/elevdown').then(m => new m.ElevDown())
        case 'carrace':
          return import('../worlds/carrace').then(m => new m.CarRace())
        case 'act2':
          return import('../worlds/act2').then(m => new m.Act2())
        default: {
          const _exhaustiveCheck: never = normalizedSpawn
          throw new Error(`Unhandled world: ${normalizedSpawn}`)
        }
      }
    })()
    worlds.set(normalizedSpawn.name, newWorld)
  }

  const world = worlds.get(normalizedSpawn.name)
  if (world == null) {
    throw new Error(`World ${normalizedSpawn.name} not found`)
  }

  currentWorld = normalizedSpawn

  if (!world.initialized) {
    await world.init()
  }

  await transition

  const param = (() => {
    switch (normalizedSpawn.name) {
      case 'elevride':
        return normalizedSpawn.floor
      case 'act1':
        return normalizedSpawn.spawn
      default:
        return undefined
    }
  })()

  await engine.setWorld(world, param)
}

const invalidPreviousWorlds: WorldName[] = ['elevbott', 'elevride', 'elevopen', 'seaview', 'observe', 'elevdown'] as const

export const switchToPreviousWorld = (): Promise<void> => {
  if (lastWorld != null && !invalidPreviousWorlds.includes(lastWorld.name)) {
    return switchWorldInner(lastWorld)
  }
  return Promise.resolve()
}
