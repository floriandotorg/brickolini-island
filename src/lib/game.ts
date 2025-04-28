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
      data[texIndex + 3] = 0xff
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
  const lod = getModel('isle_hi')?.lods[0]
  if (!lod) {
    throw new Error("Couldn't find lod")
  }
  const group = new THREE.Group()
  const collidable: THREE.Mesh[] = []
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
    collidable.push(cube)
  }
  scene.add(group)

  const CAM_HEIGHT = 1

  const placeCameraOnGround = () => {
    const downRay = new THREE.Raycaster(new THREE.Vector3(camera.position.x, camera.position.y + 50, camera.position.z), new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObjects(collidable, false)[0]
    if (hit) {
      camera.position.copy(hit.point.clone().add(new THREE.Vector3(0, CAM_HEIGHT, 0)))
    }
  }

  camera.position.set(20, 0, 30)
  camera.lookAt(60, 0, 0)
  placeCameraOnGround()

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

  const MAX_LINEAR_VEL = 10
  const MAX_ROT_VEL = 80
  const MAX_LINEAR_ACCEL = 15
  const MAX_ROT_ACCEL = 30
  const MAX_LINEAR_DECEL = 50
  const MAX_ROT_DECEL = 50
  const EPSILON = 0.0001

  let linearVel = 0
  let rotVel = 0
  let lastTime = performance.now()

  const calculateNewVel = (targetVel: number, currentVel: number, accel: number, delta: number) => {
    let newVel = currentVel
    const velDiff = targetVel - currentVel
    if (Math.abs(velDiff) > EPSILON) {
      const vSign = velDiff > 0 ? 1 : -1
      const deltaVel = accel * delta
      newVel = currentVel + deltaVel * vSign
      newVel = vSign > 0 ? Math.min(newVel, targetVel) : Math.max(newVel, targetVel)
    }
    return newVel
  }

  const animate = () => {
    requestAnimationFrame(animate)

    const now = performance.now()
    const delta = (now - lastTime) / 1000
    lastTime = now

    const targetLinearVel = keyStates.ArrowUp ? MAX_LINEAR_VEL : keyStates.ArrowDown ? -MAX_LINEAR_VEL : 0

    const targetRotVel = keyStates.ArrowLeft ? MAX_ROT_VEL : keyStates.ArrowRight ? -MAX_ROT_VEL : 0

    const linearAccel = targetLinearVel !== 0 ? MAX_LINEAR_ACCEL : MAX_LINEAR_DECEL
    const rotAccel = (targetRotVel !== 0 ? MAX_ROT_ACCEL : MAX_ROT_DECEL) * 40

    linearVel = calculateNewVel(targetLinearVel, linearVel, linearAccel, delta)
    rotVel = calculateNewVel(targetRotVel, rotVel, rotAccel, delta)

    camera.rotation.y += THREE.MathUtils.degToRad(rotVel * delta)

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)

    const moveVec = forward.clone().multiplyScalar(linearVel * delta)
    if (moveVec.length() > 0) {
      const ray = new THREE.Raycaster(camera.position, moveVec.clone().normalize(), 0, moveVec.length() + 0.5)
      const hit = ray.intersectObjects(collidable, false)[0]
      if (!hit) {
        camera.position.add(moveVec)
      }
    }

    placeCameraOnGround()

    renderer.render(scene, camera)
  }

  animate()
}
