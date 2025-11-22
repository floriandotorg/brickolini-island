import { Intro_Movie, Lego_Movie, Mindscape_Movie } from './actions/intro'
import { engine, getURLParam } from './lib/engine'
import './lib/settings-dialog'
import './style.css'
import { getSpawnLocation, isSpawnLocation, type SpawnLocation } from './lib/assets/spawn-location'
import { switchWorld } from './lib/switch-world'
import { ElevatorEntrance, type WorldName, type WorldSpawn } from './lib/world/world'

const playButton = document.getElementById('play-button')
if (playButton == null || !(playButton instanceof HTMLButtonElement)) {
  throw new Error('Play button not found')
}

const start = async () => {
  playButton.disabled = true
  document.getElementById('menu')?.classList.add('hidden')

  engine.start()

  if (!import.meta.env.DEV) {
    await engine.playCutscene(Lego_Movie)
    await engine.playCutscene(Mindscape_Movie)
    await engine.playCutscene(Intro_Movie)
  }

  const world = (getURLParam('world') ?? ('infomain' satisfies WorldName)) as WorldName
  const spawn: WorldSpawn = (() => {
    switch (world) {
      case 'isle': {
        const spawnParam = getURLParam('spawn')
        const spawnLocation: SpawnLocation = spawnParam != null && isSpawnLocation(spawnParam) ? spawnParam : 'pizzeriaExterior'
        return { name: 'isle', spawn: getSpawnLocation(spawnLocation) }
      }
      case 'elevride':
        return { name: 'elevride', floor: ElevatorEntrance.First }
      default:
        return { name: world }
    }
  })()
  await switchWorld(spawn)
}

playButton.addEventListener('click', start)

if (import.meta.env.DEV) {
  start()
}
