import { engine } from './engine'
import type { World, WorldName } from './world/world'

const worlds = new Map<WorldName, World>()

export const switchWorld = async (worldName: WorldName, param?: unknown) => {
  if (engine.hasWorld) {
    engine.currentWorld.skipAllRunningAnimations()
  }

  const transition = engine.hasWorld ? engine.transition() : Promise.resolve()

  if (!worlds.has(worldName)) {
    switch (worldName) {
      case 'isle':
        worlds.set('isle', await import('../worlds/isle').then(m => new m.Isle()))
        break
      case 'hospital':
        worlds.set('hospital', await import('../worlds/hospital').then(m => new m.Hospital()))
        break
      case 'garage':
        worlds.set('garage', await import('../worlds/garage').then(m => new m.Garage()))
        break
      case 'infomain':
        worlds.set('infomain', await import('../worlds/infomain').then(m => new m.InfoMain()))
        break
      case 'regbook':
        worlds.set('regbook', await import('../worlds/regbook').then(m => new m.RegBook()))
        break
      case 'police':
        worlds.set('police', await import('../worlds/police').then(m => new m.Police()))
        break
      case 'elevbott':
        worlds.set('elevbott', await import('../worlds/elevbott').then(m => new m.ElevBott()))
        break
      case 'infodoor':
        worlds.set('infodoor', await import('../worlds/infodoor').then(m => new m.InfoDoor()))
        break
      case 'infoscor':
        worlds.set('infoscor', await import('../worlds/infoscor').then(m => new m.InfoScor()))
        break
      case 'polidoor':
        worlds.set('polidoor', await import('../worlds/polidoor').then(m => new m.PoliDoor()))
        break
      case 'garadoor':
        worlds.set('garadoor', await import('../worlds/garadoor').then(m => new m.GarDoor()))
        break
      case 'copter':
        worlds.set('copter', await import('../worlds/build/copter').then(m => new m.Copter()))
        break
      case 'dunecar':
        worlds.set('dunecar', await import('../worlds/build/dunecar').then(m => new m.Dunecar()))
        break
      case 'jetski':
        worlds.set('jetski', await import('../worlds/build/jetski').then(m => new m.Jetski()))
        break
      case 'racecar':
        worlds.set('racecar', await import('../worlds/build/racecar').then(m => new m.Racecar()))
        break
      default: {
        const _exhaustiveCheck: never = worldName
        throw new Error(`Unhandled world: ${worldName}`)
      }
    }
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
