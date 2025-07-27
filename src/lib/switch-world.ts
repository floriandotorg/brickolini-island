import { engine } from './engine'
import type { World } from './world/world'

export type WorldName = 'isle' | 'hospital' | 'garage' | 'infomain' | 'infodoor' | 'infoscor' | 'elevbott' | 'police'

const worlds = new Map<WorldName, World>()

export const switchWorld = async (worldName: WorldName, param?: unknown) => {
  const transition = engine.hasWorld ? engine.transition() : Promise.resolve()

  let world: World | null = worlds.get(worldName) ?? null
  if (world == null) {
    switch (worldName) {
      case 'isle':
        world = await import('../worlds/isle').then(m => new m.Isle())
        break
      case 'hospital':
        world = await import('../worlds/hospital').then(m => new m.Hospital())
        break
      case 'garage':
        world = await import('../worlds/garage').then(m => new m.Garage())
        break
      case 'infomain':
        world = await import('../worlds/infomain').then(m => new m.InfoMain())
        break
      case 'police':
        world = await import('../worlds/police').then(m => new m.Police())
        break
    }
  }

  if (world == null) {
    throw new Error(`World ${worldName} not found`)
  }

  if (!world.initialized) {
    await world.init()
  }

  await transition

  await engine.setWorld(world, param)
}
