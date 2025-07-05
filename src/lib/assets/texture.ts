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
