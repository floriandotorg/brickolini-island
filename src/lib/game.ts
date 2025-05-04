import * as THREE from 'three'
import { getBuildings, getModelObject } from './assets'
import { setPosition } from './store'

export const initGame = () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
  if (!canvas) {
    throw new Error('Canvas not found')
  }

  const resolutionRatio = 4 / 3

  const setRendererSize = () => {
    const width = Math.floor(window.innerHeight * resolutionRatio)
    if (width > window.innerWidth) {
      const height = Math.floor(window.innerWidth / resolutionRatio)
      renderer.setSize(window.innerWidth, height)
    } else {
      renderer.setSize(width, window.innerHeight)
    }
  }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, resolutionRatio, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  setRendererSize()
  const obj = getModelObject('isle_hi')
  scene.add(obj)

  for (const buildingData of getBuildings()) {
    try {
      const model = getModelObject(buildingData.model_name)
      model.position.set(-buildingData.location[0], buildingData.location[1], buildingData.location[2])
      const direction = new THREE.Vector3(-buildingData.direction[0], buildingData.direction[1], buildingData.direction[2])
      const target = model.position.clone().add(direction)
      model.lookAt(target)
      scene.add(model)
    } catch (e) {
      console.log(`Couldn't place ${buildingData.model_name}: ${e}`)
    }
  }

  const ambientLight = new THREE.AmbientLight(new THREE.Color(0.3, 0.3, 0.3))
  scene.add(ambientLight)
  const sunLight = new THREE.PointLight(0xffffff, 1, 1000, 0)
  scene.add(sunLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff)
  scene.add(directionalLight)

  const CAM_HEIGHT = 1

  const placeCameraOnGround = () => {
    const downRay = new THREE.Raycaster(new THREE.Vector3(camera.position.x, camera.position.y + 50, camera.position.z), new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObject(obj)[0]
    if (hit) {
      camera.position.copy(hit.point.clone().add(new THREE.Vector3(0, CAM_HEIGHT, 0)))
    }
  }

  camera.position.set(20, 10, 30)
  camera.lookAt(60, 0, 0)
  placeCameraOnGround()

  const keyStates = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  }

  scene.background = new THREE.Color(0.56, 0.54, 0.68)
  const getSkyColor = () => {
    if (!(scene.background instanceof THREE.Color)) {
      throw new Error('Scene background is not a Color')
    }
    const hsl = { h: 0, s: 0, l: 0 }
    scene.background.getHSL(hsl)
    return hsl
  }
  const setSkyColor = (hsl: { h: number; s: number; l: number }) => {
    const color = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l)
    scene.background = color
    const lightColor = new THREE.Color(Math.min(color.r * (1 / 0.23), 1), Math.min(color.g * (1 / 0.63), 1), Math.min(color.b * (1 / 0.85), 1))
    directionalLight.color = lightColor
    sunLight.color = lightColor
  }
  setSkyColor({ h: 0.56, s: 0.54, l: 0.68 })

  let lightIndex = 0
  const setLightPosition = (index: number) => {
    const lights: [number, number, number, number, number, number][] = [
      [1.0, 0.0, 0.0, -150.0, 50.0, -50.0],
      [0.809, -0.588, 0.0, -75.0, 50.0, -50.0],
      [0.0, -1.0, 0.0, 0.0, 150.0, -150.0],
      [-0.309, -0.951, 0.0, 25.0, 50.0, -50.0],
      [-0.809, -0.588, 0.0, 75.0, 50.0, -50.0],
      [-1.0, 0.0, 0.0, 150.0, 50.0, -50.0],
    ]
    sunLight.position.set(lights[index][3], lights[index][4], lights[index][5])
    sunLight.lookAt(lights[index][0], lights[index][1], lights[index][2])
    directionalLight.position.set(lights[index][0], lights[index][1], lights[index][2])
  }
  setLightPosition(lightIndex)

  let showDebugMenu = import.meta.env.DEV

  document.addEventListener('keydown', event => {
    if (event.key in keyStates) {
      keyStates[event.key as keyof typeof keyStates] = true
    }

    if (event.key === 'c') {
      const hsl = getSkyColor()
      hsl.h += 0.01
      if (hsl.h > 1) {
        hsl.h = -1
      }
      setSkyColor(hsl)
    }

    if (event.key === 'v') {
      const hsl = getSkyColor()
      hsl.s = Math.min(hsl.s + 0.1, 1)
      setSkyColor(hsl)
    }

    if (event.key === 'b') {
      const hsl = getSkyColor()
      hsl.s = Math.max(hsl.s - 0.1, 0.1)
      setSkyColor(hsl)
    }

    if (event.key === 'n') {
      lightIndex = (lightIndex + 1) % 6
      setLightPosition(lightIndex)
    }

    if (event.key === 'd') {
      showDebugMenu = !showDebugMenu
    }
  })

  document.addEventListener('keyup', event => {
    if (event.key in keyStates) {
      keyStates[event.key as keyof typeof keyStates] = false
    }
  })

  window.addEventListener('resize', _ => {
    setRendererSize()
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
    camera.rotation.x = 0
    camera.rotation.z = 0

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)

    const moveVec = forward.clone().multiplyScalar(linearVel * delta)
    if (moveVec.length() > 0) {
      const ray = new THREE.Raycaster(camera.position, moveVec.clone().normalize(), 0, moveVec.length() + 0.5)
      const hit = ray.intersectObject(obj)[0]
      if (!hit) {
        camera.position.add(moveVec)
      }
    }

    placeCameraOnGround()

    if (showDebugMenu) {
      const debugVec = (vec: THREE.Vector3): string => {
        return `x: ${vec.x.toFixed(4)}, y: ${vec.y.toFixed(4)}, z: ${vec.z.toFixed(4)}`
      }
      setPosition(`position: ${debugVec(camera.position)}`)
    } else {
      setPosition('')
    }

    renderer.render(scene, camera)
  }

  animate()
}
