import * as THREE from 'three'
import type { Action } from '../../actions/types'
import { getActionFileUrl, manager } from './load'

const imageLoader = new THREE.ImageLoader(manager)

export const getImage = async (action: { id: number; siFile: string; fileType: Action.FileType.STL; presenter: string | null }): Promise<HTMLImageElement> => imageLoader.loadAsync(getActionFileUrl(action))
