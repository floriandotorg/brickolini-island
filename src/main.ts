import { Intro_Movie, Lego_Movie, Mindscape_Movie } from './actions/intro'
import { engine } from './lib/engine'
import './lib/settings-dialog'
import './style.css'
import { switchWorld } from './lib/switch-world'
import type { WorldName } from './lib/world/world'

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

  const world = new URLSearchParams(window.location.search).get('world') ?? ('infomain' satisfies WorldName)
  await switchWorld(world as WorldName)
}

playButton.addEventListener('click', start)

if (import.meta.env.DEV) {
  start()
}
