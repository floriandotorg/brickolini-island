import type { AudioType } from './engine'

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
    textureFiltering: boolean
    highDpi: boolean
    distanceFog: boolean
    contactShadows: boolean
    ambientOcclusion: boolean
  }
  volume: Record<AudioType, number>
  music: boolean
  sound3d: boolean
  gamepad: boolean
  gamepadIndex: number
  pauseOnBlur: boolean
  islandQuality: 'low' | 'medium' | 'high'
  freeRoam: boolean
  fill: boolean
}

let snapshotDepth = 0
let snapshot: Settings | null = null

export const withSettingsSnapshot = <T>(callback: () => T): T => {
  ++snapshotDepth
  try {
    return callback()
  } finally {
    --snapshotDepth
    if (snapshotDepth === 0) {
      snapshot = null
    }
  }
}

export const setSettings = (settings: Partial<Settings>) => {
  snapshot = null
  for (const key of ['music', 'sound3d', 'gamepad', 'gamepadIndex', 'pauseOnBlur', 'islandQuality'] as const) {
    if (settings[key] != null) {
      localStorage.setItem(`settings.${key}`, String(settings[key]))
    }
  }
  if (settings.graphics != null) {
    localStorage.setItem('settings.graphics.preset', settings.graphics.preset)
    localStorage.setItem('settings.graphics.realisticWater', settings.graphics.realisticWater ? 'true' : 'false')
    localStorage.setItem('settings.graphics.sun', settings.graphics.sun ? 'true' : 'false')
    localStorage.setItem('settings.graphics.hdTextures', settings.graphics.hdTextures ? 'true' : 'false')
    localStorage.setItem('settings.graphics.pbrMaterials', settings.graphics.pbrMaterials ? 'true' : 'false')
    localStorage.setItem('settings.graphics.shadows', settings.graphics.shadows ? 'true' : 'false')
    localStorage.setItem('settings.graphics.postProcessing', settings.graphics.postProcessing ? 'true' : 'false')
    localStorage.setItem('settings.graphics.toneMapping', settings.graphics.toneMapping)
    for (const key of ['textureFiltering', 'highDpi', 'distanceFog', 'contactShadows', 'ambientOcclusion'] as const) {
      localStorage.setItem(`settings.graphics.${key}`, String(settings.graphics[key]))
    }
  }
  if (settings.volume != null) {
    for (const [audioType, volume] of Object.entries(settings.volume)) {
      localStorage.setItem(`settings.volume.${audioType}`, volume.toString())
    }
  }
  if (settings.freeRoam != null) {
    localStorage.setItem('settings.freeRoam', settings.freeRoam ? 'true' : 'false')
  }
  if (settings.fill != null) {
    localStorage.setItem('settings.fill', settings.fill ? 'true' : 'false')
  }
}

export const setPreset = (preset: Preset) => {
  snapshot = null
  localStorage.setItem('preset', preset)

  switch (preset) {
    case 'original':
      setSettings({ graphics: { preset: 'original', realisticWater: false, sun: false, hdTextures: false, pbrMaterials: false, shadows: false, toneMapping: 'none', postProcessing: false, textureFiltering: false, highDpi: false, distanceFog: false, contactShadows: false, ambientOcclusion: false } })
      break
    case 'hd':
      setSettings({ graphics: { preset: 'hd', realisticWater: false, sun: false, hdTextures: true, pbrMaterials: false, shadows: true, toneMapping: 'filmic', postProcessing: false, textureFiltering: true, highDpi: true, distanceFog: true, contactShadows: true, ambientOcclusion: false } })
      break
    case 'next-gen':
      setSettings({ graphics: { preset: 'next-gen', realisticWater: true, sun: true, hdTextures: true, pbrMaterials: true, shadows: true, toneMapping: 'filmic', postProcessing: true, textureFiltering: true, highDpi: true, distanceFog: true, contactShadows: true, ambientOcclusion: true } })
      break
    case 'custom':
      localStorage.setItem('settings.graphics.preset', 'custom')
      break
  }
}

export const getSettings = (): Settings => {
  if (snapshotDepth > 0 && snapshot != null) {
    return snapshot
  }
  if (!['original', 'hd', 'next-gen', 'custom'].includes(localStorage.getItem('settings.graphics.preset') ?? '')) {
    setPreset('hd')
  }

  const preset = localStorage.getItem('settings.graphics.preset')
  const enhanced = preset !== 'original'
  const graphicsOption = (key: string, fallback: boolean): boolean => {
    const value = localStorage.getItem(`settings.graphics.${key}`)
    return value == null ? fallback : value === 'true'
  }

  const parseVolume = (audioType: AudioType): number => {
    const volumeString = localStorage.getItem(`settings.volume.${audioType}`)
    const volume = volumeString != null ? Number.parseFloat(volumeString) : 1
    return Number.isNaN(volume) ? 1 : volume
  }

  const settings: Settings = {
    graphics: {
      preset: localStorage.getItem('settings.graphics.preset') as Preset,
      realisticWater: localStorage.getItem('settings.graphics.realisticWater') === 'true',
      sun: localStorage.getItem('settings.graphics.sun') === 'true',
      hdTextures: localStorage.getItem('settings.graphics.hdTextures') === 'true',
      pbrMaterials: localStorage.getItem('settings.graphics.pbrMaterials') === 'true',
      shadows: localStorage.getItem('settings.graphics.shadows') === 'true',
      toneMapping: localStorage.getItem('settings.graphics.toneMapping') as 'none' | 'filmic',
      postProcessing: localStorage.getItem('settings.graphics.postProcessing') === 'true',
      textureFiltering: graphicsOption('textureFiltering', enhanced),
      highDpi: graphicsOption('highDpi', enhanced),
      distanceFog: graphicsOption('distanceFog', enhanced),
      contactShadows: graphicsOption('contactShadows', enhanced),
      ambientOcclusion: graphicsOption('ambientOcclusion', preset === 'next-gen'),
    },
    volume: {
      music: parseVolume('music'),
      effects: parseVolume('effects'),
      speech: parseVolume('speech'),
      animations: parseVolume('animations'),
      cutscene: parseVolume('cutscene'),
    },
    music: localStorage.getItem('settings.music') !== 'false',
    sound3d: localStorage.getItem('settings.sound3d') !== 'false',
    gamepad: localStorage.getItem('settings.gamepad') === 'true',
    gamepadIndex: Number.parseInt(localStorage.getItem('settings.gamepadIndex') ?? '-1', 10),
    pauseOnBlur: localStorage.getItem('settings.pauseOnBlur') !== 'false',
    islandQuality: localStorage.getItem('settings.islandQuality') === 'low' ? 'low' : localStorage.getItem('settings.islandQuality') === 'medium' ? 'medium' : 'high',
    freeRoam: localStorage.getItem('settings.freeRoam') === 'true',
    fill: localStorage.getItem('settings.fill') === 'true',
  }
  if (snapshotDepth > 0) {
    snapshot = settings
  }
  return settings
}
