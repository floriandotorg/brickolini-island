import { type AudioType, AudioTypes, engine } from './engine'
import { importOriginalFiles } from './original-save-loader'
import { getScoreHistory } from './score-history'
import { infocenterState, resetSession } from './session-state'
import type { Preset } from './settings'
import { getSettings, setPreset, setSettings } from './settings'
import { switchWorld } from './switch-world'

const settingsButton = document.getElementById('settings-button')
if (settingsButton == null || !(settingsButton instanceof HTMLButtonElement)) {
  throw new Error('Settings button not found')
}

const settingsDialog = document.getElementById('settings-dialog')
if (settingsDialog == null || !(settingsDialog instanceof HTMLDialogElement)) {
  throw new Error('Settings dialog not found')
}

const closeSettingsButton = document.getElementById('close-settings-button')
if (closeSettingsButton == null || !(closeSettingsButton instanceof HTMLButtonElement)) {
  throw new Error('Close settings button not found')
}

const importSavesButton = document.getElementById('import-saves-button')
const importFiles = document.getElementById('original-save-files')
const importStatus = document.getElementById('save-import-status')
if (!(importSavesButton instanceof HTMLButtonElement) || !(importFiles instanceof HTMLInputElement) || importStatus == null) {
  throw new Error('Save import controls not found')
}
let resetAfterImport = false
let importedPlayer: string | null = null
const openImportedPlayer = (): void => {
  if (!resetAfterImport) {
    return
  }
  resetAfterImport = false
  if (importedPlayer != null) {
    engine.loadSaveGame(importedPlayer)
    infocenterState.state = 'selectedSave'
  } else {
    resetSession()
  }
  importedPlayer = null
  void switchWorld({ ending: null })
}
importSavesButton.addEventListener('click', () => importFiles.click())
importFiles.addEventListener('change', async () => {
  const files = Array.from(importFiles.files ?? [])
  if (files.length === 0) {
    return
  }
  importSavesButton.disabled = true
  importStatus.textContent = 'Importing saved games...'
  const previousPlayer = engine.currentSaveGame.isUnloaded ? null : engine.currentSaveGame.name
  try {
    engine.storeSaveGames()
    const result = await importOriginalFiles(files, localStorage, engine.playerDirectory, getScoreHistory(), () => {
      resetAfterImport = true
      if (engine.hasWorld) {
        engine.currentWorld.deactivate()
      }
    })
    importedPlayer = result.players[0] ?? (resetAfterImport ? previousPlayer : null)
    const message = result.players.length === 0 ? (result.files > 0 && result.errors.length === 0 ? 'Score history imported.' : 'No players imported.') : `Imported ${result.players.length} player${result.players.length === 1 ? '' : 's'}. Close Settings to open ${importedPlayer}.`
    importStatus.textContent = [message, ...result.errors].join('\n')
  } catch (error) {
    importedPlayer = resetAfterImport ? previousPlayer : null
    importStatus.textContent = error instanceof Error ? error.message : 'Could not import saved games.'
  } finally {
    importSavesButton.disabled = false
    importFiles.value = ''
    if (!settingsDialog.open) {
      openImportedPlayer()
    }
  }
})

const presetSelect = document.getElementById('preset-select')
if (presetSelect == null || !(presetSelect instanceof HTMLSelectElement)) {
  throw new Error('Preset select not found')
}

const realisticWaterCheckbox = document.getElementById('realistic-water-checkbox')
if (realisticWaterCheckbox == null || !(realisticWaterCheckbox instanceof HTMLInputElement)) {
  throw new Error('Realistic water checkbox not found')
}

const sunCheckbox = document.getElementById('sun-checkbox')
if (sunCheckbox == null || !(sunCheckbox instanceof HTMLInputElement)) {
  throw new Error('Sun checkbox not found')
}

const hdTexturesCheckbox = document.getElementById('hd-textures-checkbox')
if (hdTexturesCheckbox == null || !(hdTexturesCheckbox instanceof HTMLInputElement)) {
  throw new Error('HD textures checkbox not found')
}

const pbrMaterialsCheckbox = document.getElementById('pbr-materials-checkbox')
if (pbrMaterialsCheckbox == null || !(pbrMaterialsCheckbox instanceof HTMLInputElement)) {
  throw new Error('PBR materials checkbox not found')
}

const shadowsCheckbox = document.getElementById('shadows-checkbox')
if (shadowsCheckbox == null || !(shadowsCheckbox instanceof HTMLInputElement)) {
  throw new Error('Shadows checkbox not found')
}

const postProcessingCheckbox = document.getElementById('post-processing-checkbox')
if (postProcessingCheckbox == null || !(postProcessingCheckbox instanceof HTMLInputElement)) {
  throw new Error('Post processing checkbox not found')
}

const toneMappingCheckbox = document.getElementById('tone-mapping-checkbox')
if (toneMappingCheckbox == null || !(toneMappingCheckbox instanceof HTMLInputElement)) {
  throw new Error('Tone mapping checkbox not found')
}

const graphicsCheckboxIds = {
  textureFiltering: 'texture-filtering-checkbox',
  highDpi: 'high-dpi-checkbox',
  distanceFog: 'distance-fog-checkbox',
  contactShadows: 'contact-shadows-checkbox',
  ambientOcclusion: 'ambient-occlusion-checkbox',
} as const
const graphicsKeys = ['textureFiltering', 'highDpi', 'distanceFog', 'contactShadows', 'ambientOcclusion'] as const
const graphicsCheckbox = (key: (typeof graphicsKeys)[number]): HTMLInputElement => {
  const element = document.getElementById(graphicsCheckboxIds[key])
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Graphics checkbox missing: ${key}`)
  }
  return element
}

const freeRoamCheckbox = document.getElementById('free-roam-checkbox')
if (freeRoamCheckbox == null || !(freeRoamCheckbox instanceof HTMLInputElement)) {
  throw new Error('Free roam checkbox not found')
}

const fillCheckbox = document.getElementById('fill-checkbox')
if (fillCheckbox == null || !(fillCheckbox instanceof HTMLInputElement)) {
  throw new Error('Fill checkbox not found')
}

const optionCheckboxes = ['music', 'interiors3d', 'sound3d', 'gamepad', 'pauseOnBlur'] as const
const checkboxIds = { music: 'music-checkbox', interiors3d: 'interiors-3d-checkbox', sound3d: 'sound3d-checkbox', gamepad: 'gamepad-checkbox', pauseOnBlur: 'pause-on-blur-checkbox' }
const optionCheckbox = (key: (typeof optionCheckboxes)[number]): HTMLInputElement => {
  const element = document.getElementById(checkboxIds[key])
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Settings checkbox missing: ${key}`)
  }
  return element
}
const gamepadIndex = document.getElementById('gamepad-index')
const islandQuality = document.getElementById('island-quality')
if (!(gamepadIndex instanceof HTMLInputElement) || !(islandQuality instanceof HTMLSelectElement)) {
  throw new Error('Navigation settings missing')
}
const fullscreenButton = document.getElementById('fullscreen-button')
if (fullscreenButton instanceof HTMLButtonElement) {
  fullscreenButton.disabled = !document.fullscreenEnabled
}
fullscreenButton?.addEventListener('click', () => {
  if (document.fullscreenElement == null) {
    void document.documentElement.requestFullscreen?.().catch(() => {})
  } else {
    void document.exitFullscreen?.().catch(() => {})
  }
})

const volumeSlider = (audioType: AudioType): HTMLInputElement => {
  const slider = document.getElementById(`${audioType}-volume-slider`)
  if (slider == null || !(slider instanceof HTMLInputElement)) {
    throw new Error(`Volume slider ${audioType} not found`)
  }
  return slider
}

const volumeSliders: Record<AudioType, HTMLInputElement> = {
  music: volumeSlider('music'),
  effects: volumeSlider('effects'),
  speech: volumeSlider('speech'),
  animations: volumeSlider('animations'),
  cutscene: volumeSlider('cutscene'),
}

const updateControlsFromSettings = () => {
  const settings = getSettings()
  for (const key of optionCheckboxes) {
    optionCheckbox(key).checked = settings[key]
  }
  gamepadIndex.value = String(settings.gamepadIndex)
  islandQuality.value = settings.islandQuality
  presetSelect.value = settings.graphics.preset
  realisticWaterCheckbox.checked = settings.graphics.realisticWater
  sunCheckbox.checked = settings.graphics.sun
  hdTexturesCheckbox.checked = settings.graphics.hdTextures
  pbrMaterialsCheckbox.checked = settings.graphics.pbrMaterials
  shadowsCheckbox.checked = settings.graphics.shadows
  postProcessingCheckbox.checked = settings.graphics.postProcessing
  toneMappingCheckbox.checked = settings.graphics.toneMapping === 'filmic'
  for (const key of graphicsKeys) {
    graphicsCheckbox(key).checked = settings.graphics[key]
  }
  freeRoamCheckbox.checked = settings.freeRoam
  fillCheckbox.checked = settings.fill
  for (const audioType of AudioTypes) {
    volumeSliders[audioType].value = settings.volume[audioType].toString()
  }
}

const updateSettingsFromCheckboxes = () => {
  setSettings({
    graphics: {
      preset: presetSelect.value as Preset,
      realisticWater: realisticWaterCheckbox.checked,
      sun: sunCheckbox.checked,
      hdTextures: hdTexturesCheckbox.checked,
      pbrMaterials: pbrMaterialsCheckbox.checked,
      shadows: shadowsCheckbox.checked,
      postProcessing: postProcessingCheckbox.checked,
      toneMapping: toneMappingCheckbox.checked ? 'filmic' : 'none',
      textureFiltering: graphicsCheckbox('textureFiltering').checked,
      highDpi: graphicsCheckbox('highDpi').checked,
      distanceFog: graphicsCheckbox('distanceFog').checked,
      contactShadows: graphicsCheckbox('contactShadows').checked,
      ambientOcclusion: graphicsCheckbox('ambientOcclusion').checked,
    },
    volume: {
      music: Number.parseFloat(volumeSliders.music.value),
      effects: Number.parseFloat(volumeSliders.effects.value),
      speech: Number.parseFloat(volumeSliders.speech.value),
      animations: Number.parseFloat(volumeSliders.animations.value),
      cutscene: Number.parseFloat(volumeSliders.cutscene.value),
    },
    music: optionCheckbox('music').checked,
    interiors3d: optionCheckbox('interiors3d').checked,
    sound3d: optionCheckbox('sound3d').checked,
    gamepad: optionCheckbox('gamepad').checked,
    pauseOnBlur: optionCheckbox('pauseOnBlur').checked,
    gamepadIndex: Number.isInteger(gamepadIndex.valueAsNumber) ? gamepadIndex.valueAsNumber : -1,
    islandQuality: islandQuality.value === 'low' ? 'low' : islandQuality.value === 'medium' ? 'medium' : 'high',
    freeRoam: freeRoamCheckbox.checked,
    fill: fillCheckbox.checked,
  })
  engine.updateVolumes()
}

settingsButton.addEventListener('click', () => {
  updateControlsFromSettings()
  engine.setPaused(true, 'settings')
  settingsDialog.showModal()
})

document.addEventListener('keydown', event => {
  if (event.code === 'F2' && !event.repeat) {
    event.preventDefault()
    if (!settingsDialog.open && !engine.paused) {
      updateControlsFromSettings()
      engine.setPaused(true, 'settings')
      settingsDialog.showModal()
    }
  }
})

settingsDialog.addEventListener('close', () => {
  updateSettingsFromCheckboxes()
  engine.setPaused(false, 'settings')
  openImportedPlayer()
})

for (const key of optionCheckboxes) {
  optionCheckbox(key).addEventListener('change', updateSettingsFromCheckboxes)
}
gamepadIndex.addEventListener('change', updateSettingsFromCheckboxes)
islandQuality.addEventListener('change', updateSettingsFromCheckboxes)

closeSettingsButton.addEventListener('click', () => {
  updateSettingsFromCheckboxes()
  settingsDialog.close()
})

presetSelect.addEventListener('change', () => {
  setPreset(presetSelect.value as Preset)
  updateControlsFromSettings()
})

for (const checkbox of [realisticWaterCheckbox, sunCheckbox, hdTexturesCheckbox, pbrMaterialsCheckbox, shadowsCheckbox, postProcessingCheckbox, toneMappingCheckbox, ...graphicsKeys.map(graphicsCheckbox)]) {
  checkbox.addEventListener('change', () => {
    setPreset('custom')
    presetSelect.value = 'custom'
    updateSettingsFromCheckboxes()
  })
}

freeRoamCheckbox.addEventListener('change', () => {
  updateSettingsFromCheckboxes()
})

fillCheckbox.addEventListener('change', () => {
  updateSettingsFromCheckboxes()
  engine.resize()
})
