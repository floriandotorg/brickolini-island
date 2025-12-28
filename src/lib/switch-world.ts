import { engine } from './engine'
import type { NormalWorld, World, WorldName, WorldSpawn } from './world/world'

const worlds = new Map<WorldName, World>()

let lastWorld: WorldSpawn | null = null
let currentWorld: WorldSpawn | null = null

export const switchWorld = async (spawn: WorldSpawn | NormalWorld) => {
  if (engine.hasWorld) {
    engine.currentWorld.skipAllRunningAnimations(true)
  }

  lastWorld = currentWorld

  const transition = engine.hasWorld ? engine.transition() : Promise.resolve()
  const normalizedSpawn: WorldSpawn = typeof spawn === 'string' ? { name: spawn } : spawn

  if (!worlds.has(normalizedSpawn.name)) {
    const newWorld = await (() => {
      switch (normalizedSpawn.name) {
        case 'isle':
          return import('../worlds/isle').then(m => new m.Isle())
        case 'hospital':
          return import('../worlds/hospital').then(m => new m.Hospital())
        case 'garage':
          return import('../worlds/garage').then(m => new m.Garage())
        case 'infomain':
          return import('../worlds/infomain').then(m => new m.InfoMain())
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
      case 'isle':
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
    return switchWorld(lastWorld)
  }
  return Promise.resolve()
}
