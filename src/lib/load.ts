import { setMode } from './store'
import { initAssets } from './assets'
import { playCutscene } from './cutscene'

export const loadFromISO = async (file: File) => {
  setMode('loading')
  await initAssets(file)

  await playCutscene('Mindscape_Movie')
  await playCutscene('Lego_Movie')
}
