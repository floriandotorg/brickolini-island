import * as THREE from 'three'
import { Action } from '../../actions/types'

THREE.Cache.enabled = !import.meta.env.DEV

const hdFiles = new Set<string>([
  'jukebox/0.m4a',
  'jukebox/1.m4a',
  'jukebox/11.m4a',
  'jukebox/12.m4a',
  'jukebox/13.m4a',
  'jukebox/3.m4a',
  'jukebox/4.m4a',
  'jukebox/5.m4a',
  'jukebox/55.m4a',
  'jukebox/56.m4a',
  'jukebox/57.m4a',
  'jukebox/58.m4a',
  'jukebox/59.m4a',
  'jukebox/6.m4a',
  'jukebox/60.m4a',
  'jukebox/8.m4a',
  'jukebox/9.m4a',
])

export const manager = new THREE.LoadingManager()
const fileLoader = new THREE.FileLoader(manager)
fileLoader.setResponseType('arraybuffer')

export const getFileUrl = (path: string) => {
  if (import.meta.env.VITE_USE_HD_ASSETS === 'true' && hdFiles.has(path)) {
    return `hd/${path}`
  }
  return `/org/${path}`
}

export const getFile = async (path: string): Promise<ArrayBuffer> => {
  const res = await fileLoader.loadAsync(path)
  if (!(res instanceof ArrayBuffer)) {
    throw new Error(`Failed to load ${path}`)
  }
  return res
}

const getExtension = (fileType: Action.FileType) => {
  switch (fileType) {
    case Action.FileType.SMK:
      return 'mp4'
    case Action.FileType.WAV:
      return 'm4a'
    case Action.FileType.OBJ:
      return 'gph'
    case Action.FileType.STL:
      return 'png'
  }

  throw new Error(`Unknown file type: ${fileType}`)
}

export const getActionFileUrl = (action: { id: number; siFile: string; fileType: Action.FileType }) => getFileUrl(`${action.siFile}/${action.id}.${getExtension(action.fileType)}`)

export const getAction = async (action: { id: number; siFile: string; fileType: Action.FileType }): Promise<ArrayBuffer> => getFile(getActionFileUrl(action))
