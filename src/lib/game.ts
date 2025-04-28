import * as THREE from 'three'
import { getModel, getTexture } from './assets'
import type { Gif } from './wdb'


const createTexture = (image: Gif): THREE.DataTexture => {
  const data = new Uint8Array(image.width * image.height * 4)

  for (let row = 0; row < image.height; row++) {
    for (let col = 0; col < image.width; col++) {
      const texIndex = (row * image.width + (image.width - col - 1)) * 4
      const gifIndex = (row * image.width + col) * 3
      data.set(image.image.subarray(gifIndex, gifIndex + 3), texIndex)
      data[texIndex + 3] = 0xff;
    }
  }

  const tex = new THREE.DataTexture(data, image.width, image.height)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

export const initGame = () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
  if (!canvas) {
    throw new Error('Canvas not found')
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ canvas })
  renderer.setSize(Math.floor((window.innerHeight * 4) / 3), window.innerHeight)
  const lod = getModel('post')?.lods[2]
  if (!lod) {
    throw new Error("Couldn't find lod")
  }
  const group = new THREE.Group()
  for (const mesh of lod.meshes) {
    const vertices: number[] = mesh.vertices.flat()
    const indices: number[] = mesh.indices
    const uvs: number[] = mesh.uvs.flat()
    const color = (mesh.color.red << 16) | (mesh.color.green << 8) | mesh.color.blue
    const material = new THREE.MeshBasicMaterial({ color: color })
    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    if (mesh.textureName) {
      material.map = createTexture(getTexture(mesh.textureName))
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
    }
    const cube = new THREE.Mesh(geometry, material)
    group.add(cube)
  }
  scene.add(group)
  camera.position.z = 5

  const keyStates = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  }

  document.addEventListener('keydown', event => {
    if (event.key in keyStates) {
      keyStates[event.key as keyof typeof keyStates] = true
    }
  })

  document.addEventListener('keyup', event => {
    if (event.key in keyStates) {
      keyStates[event.key as keyof typeof keyStates] = false
    }
  })

  const animate = () => {
    requestAnimationFrame(animate)

    const moveSpeed = 0.1
    const rotateSpeed = 0.05

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)

    if (keyStates.ArrowUp) {
      camera.position.addScaledVector(forward, moveSpeed)
    }
    if (keyStates.ArrowDown) {
      camera.position.addScaledVector(forward, -moveSpeed)
    }
    if (keyStates.ArrowLeft) {
      camera.rotation.y += rotateSpeed
    }
    if (keyStates.ArrowRight) {
      camera.rotation.y -= rotateSpeed
    }

    renderer.render(scene, camera)
  }

  animate()
}
