import * as THREE from 'three'
import type { ImageAction } from '../action-types'
import { getActionFileUrl, manager } from './load'

const imageLoader = new THREE.ImageLoader(manager)

export const getImage = async (action: ImageAction): Promise<HTMLImageElement> => imageLoader.loadAsync(getActionFileUrl(action))
