import * as THREE from 'three'

export const initGame = () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
  if (!canvas) {
    throw new Error('Canvas not found')
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ canvas })
  renderer.setSize(Math.floor((window.innerHeight * 4) / 3), window.innerHeight)
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube)
  camera.position.z = 5
  renderer.render(scene, camera)
}
