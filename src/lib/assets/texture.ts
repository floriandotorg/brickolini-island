import * as THREE from 'three'
import type { ImageAction } from '../action-types'
import { getActionFileUrl } from './load'
import { textureLoader } from './mesh'

export const createTexture = (action: ImageAction): THREE.Texture =>
  textureLoader.load(getActionFileUrl(action), texture => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
  })

export const createTextureAsync = async (action: ImageAction): Promise<THREE.Texture> => {
  const texture = await textureLoader.loadAsync(getActionFileUrl(action))
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
