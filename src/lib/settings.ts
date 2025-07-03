export type Preset = 'original' | 'hd' | 'next-gen' | 'custom'

export interface Settings {
  graphics: {
    preset: Preset
    realisticWater: boolean
    sun: boolean
    hdTextures: boolean
    pbrMaterials: boolean
    shadows: boolean
    postProcessing: boolean
    toneMapping: 'none' | 'filmic'
  }
  musicVolume: number
  freeRoam: boolean
}

export const setSettings = (settings: Partial<Settings>) => {
  console.log('setting settings', settings)
  if (settings.graphics != null) {
    localStorage.setItem('settings.graphics.preset', settings.graphics.preset)
    localStorage.setItem('settings.graphics.realisticWater', settings.graphics.realisticWater ? 'true' : 'false')
    localStorage.setItem('settings.graphics.sun', settings.graphics.sun ? 'true' : 'false')
    localStorage.setItem('settings.graphics.hdTextures', settings.graphics.hdTextures ? 'true' : 'false')
    localStorage.setItem('settings.graphics.pbrMaterials', settings.graphics.pbrMaterials ? 'true' : 'false')
    localStorage.setItem('settings.graphics.shadows', settings.graphics.shadows ? 'true' : 'false')
    localStorage.setItem('settings.graphics.postProcessing', settings.graphics.postProcessing ? 'true' : 'false')
    localStorage.setItem('settings.graphics.toneMapping', settings.graphics.toneMapping)
  }
  if (settings.musicVolume != null) {
    localStorage.setItem('settings.musicVolume', settings.musicVolume.toString())
  }
  if (settings.freeRoam != null) {
    localStorage.setItem('settings.freeRoam', settings.freeRoam ? 'true' : 'false')
  }
}

export const setPreset = (preset: Preset) => {
  localStorage.setItem('preset', preset)

  switch (preset) {
    case 'original':
      setSettings({ graphics: { preset: 'original', realisticWater: false, sun: false, hdTextures: false, pbrMaterials: false, shadows: false, toneMapping: 'none', postProcessing: false } })
      break
    case 'hd':
      setSettings({ graphics: { preset: 'hd', realisticWater: false, sun: false, hdTextures: true, pbrMaterials: false, shadows: true, toneMapping: 'filmic', postProcessing: false } })
      break
    case 'next-gen':
      setSettings({ graphics: { preset: 'next-gen', realisticWater: true, sun: true, hdTextures: true, pbrMaterials: true, shadows: true, toneMapping: 'filmic', postProcessing: true } })
      break
    case 'custom':
      localStorage.setItem('settings.graphics.preset', 'custom')
      break
  }
}

export const getSettings = (): Settings => {
  if (!['original', 'hd', 'next-gen', 'custom'].includes(localStorage.getItem('settings.graphics.preset') ?? '')) {
    setPreset(import.meta.env.VITE_HD_ASSETS_AVAILABLE === 'true' ? 'hd' : 'original')
  }

  const musicVolume = localStorage.getItem('settings.musicVolume')

  return {
    graphics: {
      preset: localStorage.getItem('settings.graphics.preset') as Preset,
      realisticWater: localStorage.getItem('settings.graphics.realisticWater') === 'true',
      sun: localStorage.getItem('settings.graphics.sun') === 'true',
      hdTextures: localStorage.getItem('settings.graphics.hdTextures') === 'true',
      pbrMaterials: localStorage.getItem('settings.graphics.pbrMaterials') === 'true',
      shadows: localStorage.getItem('settings.graphics.shadows') === 'true',
      toneMapping: localStorage.getItem('settings.graphics.toneMapping') as 'none' | 'filmic',
      postProcessing: localStorage.getItem('settings.graphics.postProcessing') === 'true',
    },
    musicVolume: musicVolume != null ? parseInt(musicVolume) : 1,
    freeRoam: localStorage.getItem('settings.freeRoam') === 'true',
  }
}
