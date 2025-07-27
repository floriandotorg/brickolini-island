import { Intro_Movie, Lego_Movie, Mindscape_Movie } from './actions/intro'
import { engine } from './lib/engine'
import './lib/settings-dialog'
import './style.css'
import { switchWorld, type WorldName } from './lib/switch-world'

const playButton = document.getElementById('play-button')
if (playButton == null || !(playButton instanceof HTMLButtonElement)) {
  throw new Error('Play button not found')
}

const start = async () => {
  playButton.disabled = true

  const world = new URLSearchParams(window.location.search).get('world') ?? ('infomain' satisfies WorldName)

  await switchWorld(world as WorldName)

  engine.start()

  document.getElementById('menu')?.classList.add('hidden')

  if (!import.meta.env.DEV) {
    await engine.playCutscene(Lego_Movie)
    await engine.playCutscene(Mindscape_Movie)
    await engine.playCutscene(Intro_Movie)
  }
}

playButton.addEventListener('click', start)

if (import.meta.env.DEV) {
  start()
}
