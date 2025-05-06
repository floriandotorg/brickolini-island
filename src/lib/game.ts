import * as THREE from 'three'
import { boundaryMap, getBoundary, getBuildings, getDashboard, getModelObject } from './assets'
import { Dashboard, type Dashboards, dashboardForModel } from './dashboard'
import { setPosition } from './store'

export const initGame = () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
  if (!canvas) {
    throw new Error('Canvas not found')
  }

  const overlay = document.getElementById('overlay-canvas') as HTMLCanvasElement
  if (canvas == null) {
    throw new Error('Overlay canvas not found')
  }

  const overlayContext = overlay.getContext('2d')
  if (overlayContext == null) {
    throw new Error('Overlay canvas context not found')
  }

  const audioContext = new AudioContext()

  const resolutionRatio = 4 / 3

  let dashboard: { group: THREE.Group; dashboard: Dashboard } | null = null

  const carsWithDashboard: { group: THREE.Group; dashboard: Dashboards }[] = []

  overlay.addEventListener('mouseup', _ => {
    if (dashboard) {
      dashboard.dashboard.mouseUp()
    }
  })

  overlay.addEventListener('mousedown', async event => {
    const x = event.offsetX
    const y = event.offsetY
    if (dashboard) {
      const guessX = (x * overlay.width) / overlay.clientWidth
      const guessY = (y * overlay.height) / overlay.clientHeight
      if (dashboard.dashboard.checkClick(guessX, guessY)) {
        dashboard.group.position.copy(camera.position).sub(new THREE.Vector3(0, CAM_HEIGHT, 0))
        dashboard.group.quaternion.copy(camera.quaternion)
        dashboard.group.visible = true
        dashboard.dashboard.clear()
        dashboard = null
      }
    } else {
      const relativeX = (event.offsetX / overlay.clientWidth) * 2 - 1
      const relativeY = -(event.offsetY / overlay.clientHeight) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(relativeX, relativeY), camera)
      const intersects = raycaster.intersectObjects(carsWithDashboard.map(({ group }) => group).filter(group => group.visible))
      let obj: THREE.Object3D | null = intersects[0]?.object
      while (obj) {
        if (obj instanceof THREE.Group) {
          const hitGroup = carsWithDashboard.find(({ group }) => group === obj) ?? null
          if (hitGroup) {
            hitGroup.group.visible = false
            const dashboardObj = getDashboard(hitGroup.dashboard)
            dashboard = { dashboard: await Dashboard.create(dashboardObj, overlayContext, audioContext), group: hitGroup.group }
            dashboard.dashboard.drawBackground()
            camera.position.copy(hitGroup.group.position)
            camera.quaternion.copy(hitGroup.group.quaternion)
            break
          }
        }
        obj = obj.parent
        if (obj instanceof THREE.Scene) {
          obj = null
        }
      }
    }
  })

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

  let specialModel = 0
  for (const buildingData of getBuildings()) {
    try {
      const group = getModelObject(buildingData.model_name)
      const position = new THREE.Vector3(-buildingData.location[0], buildingData.location[1], buildingData.location[2])
      const direction = new THREE.Vector3(-buildingData.direction[0], buildingData.direction[1], buildingData.direction[2])

      if (position.equals(new THREE.Vector3(0, 0, 0))) {
        group.position.set(specialModel * 2, 0, 3)
        specialModel++
      } else {
        group.position.copy(position)
      }

      const target = group.position.clone().add(direction)
      group.lookAt(target)

      const modelDashboard = dashboardForModel(buildingData.model_name)
      if (modelDashboard) {
        carsWithDashboard.push({ group, dashboard: modelDashboard })
      }

      scene.add(group)
    } catch (e) {
      console.log(`Couldn't place ${buildingData.model_name}: ${e}`)
    }
  }

  const debugObjectGroup = new THREE.Group()
  scene.add(debugObjectGroup)

  const debugDrawArrow = (from: THREE.Vector3, to: THREE.Vector3, color: string) => {
    const dir = to.clone().sub(from).normalize()
    const length = from.distanceTo(to)
    const arrow = new THREE.ArrowHelper(dir, from, length, color)
    debugObjectGroup.add(arrow)
  }

  const debugDrawSphere = (position: THREE.Vector3, color: string, radius = 1) => {
    const sphere = new THREE.SphereGeometry(radius)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(sphere, material)
    mesh.position.copy(position)
    debugObjectGroup.add(mesh)
  }

  const debugDrawText = (position: THREE.Vector3, text: string, color: string) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }))
    sprite.position.copy(position)
    sprite.scale.set(2, 1, 1)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx == null) {
      throw new Error('Context not found')
    }
    ctx.font = '20px sans-serif'
    const metrics = ctx.measureText(text)
    canvas.width = Math.ceil(metrics.width) + 16
    canvas.height = 32
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 32, 16)
    const texture = new THREE.CanvasTexture(canvas)
    sprite.material.map = texture
    sprite.material.needsUpdate = true
    debugObjectGroup.add(sprite)
  }

  // const boundary = getBoundary('ISLE.SI', 'INT43')
  const allBoundaries = boundaryMap.get('ISLE.SI')
  if (!allBoundaries) {
    throw new Error('No boundaries found')
  }
  for (const [name, boundary] of allBoundaries.entries()) {
    if (boundary == null) {
      throw new Error('Boundary not found')
    }
    for (let n = 0; n < boundary.edges.length; ++n) {
      const edge = boundary.edges[n]

      debugDrawArrow(edge.pointA, edge.pointB, 'red')
      // debugDrawText(edge.pointA.clone().add(new THREE.Vector3(0, 1 + n * 0.4, 0)), name, 'red')
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
      debugObjectGroup.visible = showDebugMenu
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

    const vel = linearVel < 0 ? -linearVel : linearVel
    dashboard?.dashboard.drawMeters(vel / MAX_LINEAR_VEL, 0.5, overlayContext)

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
      setPosition({ position: debugVec(camera.position), direction: debugVec(new THREE.Vector3(0, 0, 1).applyEuler(camera.rotation)) })
    } else {
      setPosition(null)
    }

    renderer.render(scene, camera)
  }

  animate()
}
