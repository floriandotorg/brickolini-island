import { initAssets } from './assets'
import { playCutscene } from './cutscene'
import { initGame } from './game'
import { setMode } from './store'

export const loadFromISO = async (file: File) => {
  setMode('loading')
  await initAssets(file)

  if (!import.meta.env.DEV) {
    await playCutscene('Lego_Movie')
    await playCutscene('Mindscape_Movie')
    await playCutscene('Intro_Movie')
  }

  setMode('in-game')
  await initGame()
}
