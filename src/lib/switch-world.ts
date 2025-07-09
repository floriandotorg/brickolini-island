import { engine } from './engine'
import type { World } from './world/world'

type WorldName = 'isle' | 'hospital' | 'garage' | 'info-center'

const worlds = new Map<WorldName, World>()

export const switchWorld = async (worldName: WorldName) => {
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
      case 'info-center':
        world = await import('../worlds/info-center').then(m => new m.InfoCenter())
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

  await engine.setWorld(world)
}
