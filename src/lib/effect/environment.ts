import * as THREE from 'three'

const generators = new WeakMap<THREE.WebGLRenderer, THREE.PMREMGenerator>()

export const getEnvironmentGenerator = (renderer: THREE.WebGLRenderer): THREE.PMREMGenerator => {
  let generator = generators.get(renderer)
  if (generator == null) {
    generator = new THREE.PMREMGenerator(renderer)
    generators.set(renderer, generator)
  }
  return generator
}
