import { engine } from './engine'
import type { World, WorldName } from './world/world'

const worlds = new Map<WorldName, World>()

export const switchWorld = async (worldName: WorldName, param?: unknown) => {
  if (engine.hasWorld) {
    engine.currentWorld.skipAllRunningAnimations(true)
  }

  const transition = engine.hasWorld ? engine.transition() : Promise.resolve()

  if (!worlds.has(worldName)) {
    const newWorld = await (() => {
      switch (worldName) {
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
        default: {
          const _exhaustiveCheck: never = worldName
          throw new Error(`Unhandled world: ${worldName}`)
        }
      }
    })()
    worlds.set(worldName, newWorld)
  }

  const world = worlds.get(worldName)
  if (world == null) {
    throw new Error(`World ${worldName} not found`)
  }

  if (!world.initialized) {
    await world.init()
  }

  await transition

  await engine.setWorld(world, param)
}
