import { Intro_Movie, Lego_Movie, Mindscape_Movie } from './actions/intro'
import { engine } from './lib/engine'
import './lib/settings-dialog'
import { Isle } from './worlds/isle'
import './style.css'
import { InfoCenter } from './worlds/info-center'

const playButton = document.getElementById('play-button')
if (playButton == null || !(playButton instanceof HTMLButtonElement)) {
  throw new Error('Play button not found')
}

const start = async () => {
  playButton.disabled = true

  await engine.setWorld(
    (() => {
      switch (new URLSearchParams(window.location.search).get('world')) {
        case 'info':
          return new InfoCenter()
        default:
          return new Isle()
      }
    })(),
  )

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
