import * as THREE from 'three'
import { getFileUrl } from './assets/load.ts'
import type { SaveGame } from './save-game.ts'
import { getCubeCells } from './score-layout.ts'

export const paintScoreCube = async (root: THREE.Object3D, save: SaveGame): Promise<THREE.Texture> => {
  const image = await new THREE.ImageLoader().loadAsync(getFileUrl('world/model_textures/bigcube.gif.png'))
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (context == null) {
    throw new Error('Score cube canvas unavailable')
  }
  context.drawImage(image, 0, 0)
  for (const cell of getCubeCells(save.getHighScore)) {
    context.fillStyle = cell.color
    context.fillRect((cell.x * image.width) / 256, (cell.y * image.height) / 256, (cell.width * image.width) / 256, (cell.height * image.height) / 256)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.name = 'bigcube.gif'
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  root.traverse(object => {
    if (object instanceof THREE.Mesh) {
      const materials: unknown[] = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        if ((material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial || material instanceof THREE.MeshLambertMaterial) && material.map?.name === texture.name) {
          material.map = texture
          material.needsUpdate = true
        }
      }
    }
  })
  return texture
}
