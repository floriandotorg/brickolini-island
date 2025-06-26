export interface Settings {
  realisticWater: boolean
  sun: boolean
  hdTextures: boolean
  pbrMaterials: boolean
  shadows: boolean
  postProcessing: boolean
  toneMapping: 'none' | 'filmic'
}

export type Preset = 'original' | 'hd' | 'next-gen' | 'custom'

export const setSettings = (settings: Settings) => {
  localStorage.setItem('settings.realisticWater', settings.realisticWater ? 'true' : 'false')
  localStorage.setItem('settings.sun', settings.sun ? 'true' : 'false')
  localStorage.setItem('settings.hdTextures', settings.hdTextures ? 'true' : 'false')
  localStorage.setItem('settings.pbrMaterials', settings.pbrMaterials ? 'true' : 'false')
  localStorage.setItem('settings.shadows', settings.shadows ? 'true' : 'false')
  localStorage.setItem('settings.postProcessing', settings.postProcessing ? 'true' : 'false')
  localStorage.setItem('settings.toneMapping', settings.toneMapping)
}

export const setPreset = (preset: Preset) => {
  localStorage.setItem('preset', preset)

  switch (preset) {
    case 'original':
      setSettings({ realisticWater: false, sun: false, hdTextures: false, pbrMaterials: false, shadows: false, toneMapping: 'none', postProcessing: false })
      break
    case 'hd':
      setSettings({ realisticWater: false, sun: false, hdTextures: true, pbrMaterials: false, shadows: true, toneMapping: 'filmic', postProcessing: false })
      break
    case 'next-gen':
      setSettings({ realisticWater: true, sun: true, hdTextures: true, pbrMaterials: true, shadows: true, toneMapping: 'filmic', postProcessing: true })
      break
  }
}

export const getPreset = (): Preset => {
  if (localStorage.getItem('preset') == null) {
    setPreset(import.meta.env.VITE_HD_ASSETS_AVAILABLE === 'true' ? 'hd' : 'original')
  }

  return localStorage.getItem('preset') as Preset
}

export const getSettings = (): Settings => {
  getPreset() // ensure preset is set

  return {
    realisticWater: localStorage.getItem('settings.realisticWater') === 'true',
    sun: localStorage.getItem('settings.sun') === 'true',
    hdTextures: localStorage.getItem('settings.hdTextures') === 'true',
    pbrMaterials: localStorage.getItem('settings.pbrMaterials') === 'true',
    shadows: localStorage.getItem('settings.shadows') === 'true',
    toneMapping: localStorage.getItem('settings.toneMapping') as 'none' | 'filmic',
    postProcessing: localStorage.getItem('settings.postProcessing') === 'true',
  }
}
