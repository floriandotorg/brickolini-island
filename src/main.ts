import { Intro_Movie, Lego_Movie, Mindscape_Movie } from './actions/intro'
import { engine, getURLParam } from './lib/engine'
import './lib/settings-dialog'
import './style.css'
import { isSpawnLocation, type SpawnLocation } from './lib/assets/spawn-location'
import { switchWorld } from './lib/switch-world'
import { ElevatorEntrance, type WorldName, type WorldSpawn } from './lib/world/world'

if (import.meta.env.DEV) {
  const offset = Number(import.meta.env.VITE_PORT_OFFSET ?? 0)
  const hue = (offset * 47) % 360
  const border = document.createElement('div')
  border.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:9999;border:4px solid hsl(${hue},70%,45%);`
  document.body.append(border)
}

const playButton = document.getElementById('play-button')
if (playButton == null || !(playButton instanceof HTMLButtonElement)) {
  throw new Error('Play button not found')
}

const printSceneGraph = document.getElementById('print-scene-graph')

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
      case 'act1': {
        const spawnParam = getURLParam('spawn')
        const spawnLocation: SpawnLocation = spawnParam != null && isSpawnLocation(spawnParam) ? spawnParam : 'pizzeriaExterior'
        return { spawn: spawnLocation }
      }
      case 'elevride':
        return { floor: ElevatorEntrance.First }
      case 'infomain':
        return { ending: null }
      default:
        return { world }
    }
  })()
  await switchWorld(spawn)
}

playButton.addEventListener('click', start)

printSceneGraph?.addEventListener('click', () => {
  if (engine.hasWorld) {
    engine.currentWorld.debugPrintSceneGraph()
  }
})

if (import.meta.env.DEV) {
  void start()
}
