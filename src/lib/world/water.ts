import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { createWaterNormalPixels } from '../graphics.ts'

let waterNormals: THREE.DataTexture | null = null

const getWaterNormals = (): THREE.DataTexture => {
  if (waterNormals == null) {
    const size = 128
    waterNormals = new THREE.DataTexture(createWaterNormalPixels(size), size, size)
    waterNormals.wrapS = THREE.RepeatWrapping
    waterNormals.wrapT = THREE.RepeatWrapping
    waterNormals.magFilter = THREE.LinearFilter
    waterNormals.minFilter = THREE.LinearMipmapLinearFilter
    waterNormals.generateMipmaps = true
    waterNormals.needsUpdate = true
  }
  return waterNormals
}

export const createIslandWater = (geometry: THREE.BufferGeometry): Water => {
  const normals = geometry.getAttribute('normal')
  const normal = new THREE.Vector3(normals.getX(0), normals.getY(0), normals.getZ(0)).normalize()
  const rotation = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1))
  const surface = geometry.clone().applyQuaternion(rotation)
  const water = new Water(surface, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: getWaterNormals(),
    distortionScale: 1.2,
    waterColor: 0x247c98,
    sunColor: 0xfff4df,
    sunDirection: new THREE.Vector3(-1, 2, -1).normalize(),
    fog: true,
  })
  water.quaternion.copy(rotation).invert()
  water.material.uniforms.size.value = 4
  return water
}
