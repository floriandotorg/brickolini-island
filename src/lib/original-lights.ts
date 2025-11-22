import type * as THREE from 'three'

const ORIGINAL_LIGHTS: [number, number, number, number, number, number][] = [
  [1.0, 0.0, 0.0, -150.0, 50.0, -50.0],
  [0.809, -0.588, 0.0, -75.0, 50.0, -50.0],
  [0.0, -1.0, 0.0, 0.0, 150.0, -150.0],
  [-0.309, -0.951, 0.0, 25.0, 50.0, -50.0],
  [-0.809, -0.588, 0.0, 75.0, 50.0, -50.0],
  [-1.0, 0.0, 0.0, 150.0, 50.0, -50.0],
]
export const NUM_ORIGINAL_LIGHTS = ORIGINAL_LIGHTS.length

export const applyLights = (index: number, sunLight: THREE.PointLight, directionalLight: THREE.DirectionalLight) => {
  sunLight.position.set(ORIGINAL_LIGHTS[index][3], ORIGINAL_LIGHTS[index][4], ORIGINAL_LIGHTS[index][5])
  sunLight.lookAt(ORIGINAL_LIGHTS[index][0], ORIGINAL_LIGHTS[index][1], ORIGINAL_LIGHTS[index][2])
  directionalLight.position.set(ORIGINAL_LIGHTS[index][0], ORIGINAL_LIGHTS[index][1], ORIGINAL_LIGHTS[index][2])
}
