import type { Preset } from './settings'
import { getPreset, getSettings, setPreset, setSettings } from './settings'

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

const updateCheckboxesFromSettings = () => {
  const settings = getSettings()
  realisticWaterCheckbox.checked = settings.realisticWater
  sunCheckbox.checked = settings.sun
  hdTexturesCheckbox.checked = settings.hdTextures
  pbrMaterialsCheckbox.checked = settings.pbrMaterials
  shadowsCheckbox.checked = settings.shadows
  postProcessingCheckbox.checked = settings.postProcessing
  toneMappingCheckbox.checked = settings.toneMapping === 'filmic'
}

const updateSettingsFromCheckboxes = () => {
  setSettings({
    realisticWater: realisticWaterCheckbox.checked,
    sun: sunCheckbox.checked,
    hdTextures: hdTexturesCheckbox.checked,
    pbrMaterials: pbrMaterialsCheckbox.checked,
    shadows: shadowsCheckbox.checked,
    postProcessing: postProcessingCheckbox.checked,
    toneMapping: toneMappingCheckbox.checked ? 'filmic' : 'none',
  })
}

const updatePresetFromLocalStorage = () => {
  presetSelect.value = getPreset()
}

settingsButton.addEventListener('click', () => {
  updatePresetFromLocalStorage()
  updateCheckboxesFromSettings()
  settingsDialog.showModal()
})

closeSettingsButton.addEventListener('click', () => {
  updateSettingsFromCheckboxes()
  settingsDialog.close()
})

presetSelect.addEventListener('change', () => {
  const preset = presetSelect.value as Preset
  if (preset !== 'custom') {
    setPreset(preset)
    updateCheckboxesFromSettings()
  }
})

const checkboxes = [realisticWaterCheckbox, sunCheckbox, hdTexturesCheckbox, pbrMaterialsCheckbox, shadowsCheckbox, postProcessingCheckbox, toneMappingCheckbox]
checkboxes.forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    localStorage.setItem('preset', 'custom')
    updatePresetFromLocalStorage()
    updateSettingsFromCheckboxes()
  })
})
