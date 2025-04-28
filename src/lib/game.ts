import * as THREE from 'three'
import { getModel } from './assets'

export const initGame = () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
  if (!canvas) {
    throw new Error('Canvas not found')
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ canvas })
  renderer.setSize(Math.floor((window.innerHeight * 4) / 3), window.innerHeight)
  const lod = getModel("post")?.lods[2]
  if (!lod) {
    throw new Error('Couldn\'t find lod')
  }
  const group = new THREE.Group()
  for (const mesh of lod.meshes) {
    const vertices: number[] = mesh.vertices.flat()
    const indices: number[] = mesh.indices
    const color = mesh.color.red << 16 | mesh.color.green << 8 | mesh.color.blue
    const material = new THREE.MeshBasicMaterial({ color: color })
    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    const cube = new THREE.Mesh(geometry, material)
    group.add(cube)
  }
  scene.add(group)
  camera.position.z = 5
  renderer.render(scene, camera)
}
