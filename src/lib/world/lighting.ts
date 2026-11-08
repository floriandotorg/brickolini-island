import * as THREE from 'three'
import { installContactHardening } from '../effect/pcss.ts'
import { getSettings } from '../settings.ts'

const direction = new THREE.Vector3()
const forward = new THREE.Vector3()
const focus = new THREE.Vector3()
const right = new THREE.Vector3()
const up = new THREE.Vector3()
const worldUp = new THREE.Vector3(0, 1, 0)
const radius = 70

export const configureShadow = (light: THREE.DirectionalLight): void => {
  if (getSettings().graphics.preset !== 'original') {
    installContactHardening()
  }
  light.castShadow = true
  light.shadow.mapSize.set(4096, 4096)
  light.shadow.bias = -0.0001
  light.shadow.normalBias = 0.04
  light.shadow.radius = 2.5
  light.shadow.camera.near = 1
  light.shadow.camera.far = 400
  light.shadow.camera.left = -radius
  light.shadow.camera.right = radius
  light.shadow.camera.top = radius
  light.shadow.camera.bottom = -radius
  light.shadow.camera.updateProjectionMatrix()
}

export const updateFocusedShadow = (light: THREE.DirectionalLight, camera: THREE.PerspectiveCamera): void => {
  direction.subVectors(light.position, light.target.position).normalize()
  if (direction.lengthSq() === 0) {
    direction.set(0.5, 1, 0.5).normalize()
  }
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()
  camera.getWorldPosition(focus).addScaledVector(forward, 30)
  right.crossVectors(worldUp, direction)
  if (right.lengthSq() < 0.0001) {
    right.set(1, 0, 0)
  }
  right.normalize()
  up.crossVectors(direction, right).normalize()
  const texel = (radius * 2) / light.shadow.mapSize.x
  const horizontal = focus.dot(right)
  const vertical = focus.dot(up)
  focus.addScaledVector(right, Math.round(horizontal / texel) * texel - horizontal)
  focus.addScaledVector(up, Math.round(vertical / texel) * texel - vertical)
  light.target.position.copy(focus)
  light.target.updateMatrixWorld()
  light.position.copy(focus).addScaledVector(direction, 200)
  light.updateWorldMatrix(true, false)
}
