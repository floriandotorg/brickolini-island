import type { Preset } from './settings'
import { getSettings, setPreset, setSettings } from './settings'

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

const freeRoamCheckbox = document.getElementById('free-roam-checkbox')
if (freeRoamCheckbox == null || !(freeRoamCheckbox instanceof HTMLInputElement)) {
  throw new Error('Free roam checkbox not found')
}

const updateControlsFromSettings = () => {
  const settings = getSettings()
  presetSelect.value = settings.graphics.preset
  realisticWaterCheckbox.checked = settings.graphics.realisticWater
  sunCheckbox.checked = settings.graphics.sun
  hdTexturesCheckbox.checked = settings.graphics.hdTextures
  pbrMaterialsCheckbox.checked = settings.graphics.pbrMaterials
  shadowsCheckbox.checked = settings.graphics.shadows
  postProcessingCheckbox.checked = settings.graphics.postProcessing
  toneMappingCheckbox.checked = settings.graphics.toneMapping === 'filmic'
  freeRoamCheckbox.checked = settings.freeRoam
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
    },
    freeRoam: freeRoamCheckbox.checked,
  })
}

settingsButton.addEventListener('click', () => {
  updateControlsFromSettings()
  settingsDialog.showModal()
})

closeSettingsButton.addEventListener('click', () => {
  updateSettingsFromCheckboxes()
  settingsDialog.close()
})

presetSelect.addEventListener('change', () => {
  setPreset(presetSelect.value as Preset)
  updateControlsFromSettings()
})

for (const checkbox of [realisticWaterCheckbox, sunCheckbox, hdTexturesCheckbox, pbrMaterialsCheckbox, shadowsCheckbox, postProcessingCheckbox, toneMappingCheckbox]) {
  checkbox.addEventListener('change', () => {
    setPreset('custom')
    presetSelect.value = 'custom'
    updateSettingsFromCheckboxes()
  })
}

freeRoamCheckbox.addEventListener('change', () => {
  updateSettingsFromCheckboxes()
})
