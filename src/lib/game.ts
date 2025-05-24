import * as THREE from 'three'
import { boundaryMap, getBoundary, getBuildings, getDashboard, getModel, getModelInstanced, getModelObject, getMusic } from './assets'
import { Dashboard, type Dashboards, dashboardForModel } from './dashboard'
import { MusicKeys } from './music'
import { Plant } from './plant'
import { setDebugData } from './store'

const calculateTransformationMatrix = (location: [number, number, number], direction: [number, number, number], up: [number, number, number], matrix?: THREE.Matrix4): THREE.Matrix4 => {
  const locationVector = new THREE.Vector3(...location)
  const directionVector = new THREE.Vector3(...direction).normalize()
  const upVector = new THREE.Vector3(...up).normalize()

  const right = new THREE.Vector3().crossVectors(upVector, directionVector).normalize()
  const newUp = new THREE.Vector3().crossVectors(directionVector, right).normalize()

  const transformationMatrix = matrix ?? new THREE.Matrix4()
  transformationMatrix.makeBasis(right, newUp, directionVector)
  transformationMatrix.setPosition(locationVector)
  return transformationMatrix
}

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

  let backgroundMusic: { key: MusicKeys; gain: GainNode; audioSource: AudioBufferSourceNode } | null = null
  let nextBackgroundMusicSwitch = 0

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
      const canvasX = (x * overlay.width) / overlay.clientWidth
      const canvasY = (y * overlay.height) / overlay.clientHeight
      if (dashboard.dashboard.checkClick(canvasX, canvasY)) {
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
  camera.rotation.order = 'YXZ'
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  setRendererSize()
  const obj = getModelObject('isle_hi')
  scene.add(obj)

  const colliderGroup = new THREE.Group()
  scene.add(colliderGroup)

  let transformationMatrix = new THREE.Matrix4()
  for (const buildingData of getBuildings()) {
    try {
      const model = getModelObject(buildingData.model_name)
      console.log(buildingData.model_name)
      if (buildingData.model_name === 'Bike') {
        const boundary = getBoundary('ISLE.SI', 'INT44')
        if (boundary == null) {
          throw new Error('Boundary not found')
        }
        transformationMatrix = boundary.getActorPlacement(2, 0.5, 0, 0.5)
      } else if (buildingData.model_name === 'MotoBk') {
        const boundary = getBoundary('ISLE.SI', 'INT43')
        if (boundary == null) {
          throw new Error('Boundary not found')
        }
        transformationMatrix = boundary.getActorPlacement(4, 0.5, 1, 0.5)
      } else if (buildingData.model_name === 'skate') {
        const boundary = getBoundary('ISLE.SI', 'EDG02_84')
        if (boundary == null) {
          throw new Error('Boundary not found')
        }
        transformationMatrix = boundary.getActorPlacement(4, 0.5, 0, 0.5)
      } else {
        const position = new THREE.Vector3(-buildingData.location[0], buildingData.location[1], buildingData.location[2])
        calculateTransformationMatrix([position.x, position.y, position.z], [-buildingData.direction[0], buildingData.direction[1], buildingData.direction[2]], [-buildingData.up[0], buildingData.up[1], buildingData.up[2]], transformationMatrix)
      }
      model.applyMatrix4(transformationMatrix)

      if (buildingData.model_name === 'skate') {
        console.log(model.position)
      }

      const modelDashboard = dashboardForModel(buildingData.model_name)
      if (modelDashboard) {
        carsWithDashboard.push({ group: model, dashboard: modelDashboard })
      }

      scene.add(model)
    } catch (e) {
      console.log(`Couldn't place ${buildingData.model_name}: ${e}`)
    }
  }

  for (const plant of Plant.locationsPerPair(Plant.World.ACT1)) {
    const plantName = Plant.modelName(plant.variant, plant.color)
    if (plantName) {
      const plantInstance = getModelInstanced(plantName, plant.locations.length)
      for (const [index, { location, direction, up }] of plant.locations.entries()) {
        calculateTransformationMatrix(location, direction, up, transformationMatrix)
        plantInstance.setMatrixAt(index, transformationMatrix)
      }
      plantInstance.addTo(scene)
    }
  }

  const debugObjectGroup = new THREE.Group()
  debugObjectGroup.visible = import.meta.env.DEV
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

  const debugDrawPlane = (anchor: THREE.Vector3, normal: THREE.Vector3, color: string) => {
    const planeGeometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(planeGeometry, material)
    mesh.position.copy(anchor)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
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

  const allBoundaries = boundaryMap.get('ISLE.SI')
  if (!allBoundaries) {
    throw new Error('No boundaries found')
  }
  for (const [name, boundary] of allBoundaries.entries()) {
    if (boundary == null) {
      throw new Error('Boundary not found')
    }

    if (boundary.triggers.some(trigger => trigger.struct.name[2] === 'M') && boundary.direction != null) {
      for (const trigger of boundary.triggers) {
        debugDrawArrow(boundary.edges[0].pointA, boundary.edges[0].pointA.clone().add(boundary.direction.clone().normalize().multiplyScalar(trigger.triggerProjection)), 'yellow')
      }
    }

    for (let n = 0; n < boundary.edges.length; ++n) {
      const edge = boundary.edges[n]

      debugDrawArrow(edge.pointA, edge.pointB, edge.flags & 0x02 ? 'red' : 'blue')

      if (!(edge.flags & 0x03)) {
        const p0 = edge.pointA.clone().sub(new THREE.Vector3(0, 1, 0))
        const p1 = edge.pointB.clone().sub(new THREE.Vector3(0, 1, 0))
        const p2 = edge.pointB.clone().add(new THREE.Vector3(0, 2, 0))
        const p3 = edge.pointA.clone().add(new THREE.Vector3(0, 2, 0))

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p0.x, p0.y, p0.z]), 3))
        geometry.computeVertexNormals()

        const material = new THREE.MeshStandardMaterial({ visible: false })
        const wall = new THREE.Mesh(geometry, material)

        colliderGroup.add(wall)
      }

      // console.log(boundary, edge)

      // if (edge.faceA != null && edge.faceA.ccwEdgeIndex < boundary.edges.length) {
      //   debugDrawArrow(boundary.edges[edge.faceA.ccwEdgeIndex].pointA, boundary.edges[edge.faceA.ccwEdgeIndex].pointB, 'blue')
      // }

      // if (edge.faceA != null && edge.faceA.cwEdgeIndex < boundary.edges.length) {
      //   debugDrawArrow(boundary.edges[edge.faceA.cwEdgeIndex].pointA, boundary.edges[edge.faceA.cwEdgeIndex].pointB, 'green')
      // }

      // if (edge.faceB != null && edge.faceB.ccwEdgeIndex < boundary.edges.length) {
      //   debugDrawArrow(boundary.edges[edge.faceB.ccwEdgeIndex].pointA, boundary.edges[edge.faceB.ccwEdgeIndex].pointB, 'green')
      // }

      // debugDrawArrow(edge.pointA, edge.pointB, 'red')
      // debugDrawArrow(edge.pointA, edge.unknown, 'blue')
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

  camera.position.set(20, CAM_HEIGHT, 30)
  camera.lookAt(60, 0, 0)
  placeCameraOnGround()

  const keyStates = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    s: false,
    q: false,
    e: false,
  }

  let slewMode = false
  let verticalVel = 0
  let pitchVel = 0

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

    if (event.key === 'f' && import.meta.env.DEV) {
      slewMode = !slewMode
      if (!slewMode) {
        linearVel = 0
        rotVel = 0
        verticalVel = 0
        pitchVel = 0
      }
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

  // collide-and-slide helper for smoother movement along obstacles
  const collideAndSlide = (startPos: THREE.Vector3, moveVec: THREE.Vector3): THREE.Vector3 => {
    const totalMove = new THREE.Vector3()
    const remaining = moveVec.clone()
    const pos = startPos.clone()
    const MAX_ITERATIONS = 5
    for (let n = 0; n < MAX_ITERATIONS && remaining.length() > EPSILON; ++n) {
      const dir = remaining.clone().normalize()
      const ray = new THREE.Raycaster(pos, dir, 0, remaining.length() + 0.0001)
      const hit = ray.intersectObjects([...colliderGroup.children])[0]
      if (!hit) {
        totalMove.add(remaining)
        break
      }

      const dist = Math.max(hit.distance - 0.0001, 0)
      const moveAllowed = dir.clone().multiplyScalar(dist)
      totalMove.add(moveAllowed)
      pos.add(moveAllowed)

      const m3 = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
      const normal = hit.face?.normal.clone().applyMatrix3(m3).normalize() ?? new THREE.Vector3()

      remaining.sub(moveAllowed)
      const projection = remaining.clone().sub(normal.multiplyScalar(remaining.dot(normal)))
      remaining.copy(projection)
    }
    return totalMove
  }

  const animate = () => {
    requestAnimationFrame(animate)

    const now = performance.now()
    const delta = (now - lastTime) / 1000
    lastTime = now

    const speedMultiplier = slewMode ? 4 : 1

    const targetLinearVel = (keyStates.ArrowUp ? MAX_LINEAR_VEL : keyStates.ArrowDown ? -MAX_LINEAR_VEL : 0) * speedMultiplier

    const targetRotVel = keyStates.ArrowLeft ? MAX_ROT_VEL : keyStates.ArrowRight ? -MAX_ROT_VEL : 0

    const targetVerticalVel = slewMode ? (keyStates.q ? MAX_LINEAR_VEL * speedMultiplier : keyStates.e ? -MAX_LINEAR_VEL * speedMultiplier : 0) : 0

    const targetPitchVel = slewMode ? (keyStates.w ? MAX_ROT_VEL : keyStates.s ? -MAX_ROT_VEL : 0) : 0

    const linearAccel = targetLinearVel !== 0 ? MAX_LINEAR_ACCEL : MAX_LINEAR_DECEL
    const rotAccel = (targetRotVel !== 0 ? MAX_ROT_ACCEL : MAX_ROT_DECEL) * 40

    const pitchAccel = (targetPitchVel !== 0 ? MAX_ROT_ACCEL : MAX_ROT_DECEL) * 40

    if (slewMode) {
      linearVel = targetLinearVel
      rotVel = targetRotVel
      verticalVel = targetVerticalVel
      pitchVel = targetPitchVel
    } else {
      linearVel = calculateNewVel(targetLinearVel, linearVel, linearAccel, delta)
      rotVel = calculateNewVel(targetRotVel, rotVel, rotAccel, delta)
      verticalVel = calculateNewVel(targetVerticalVel, verticalVel, linearAccel, delta)
      pitchVel = calculateNewVel(targetPitchVel, pitchVel, pitchAccel, delta)
    }

    const vel = linearVel < 0 ? -linearVel : linearVel
    const maxVelCurrent = MAX_LINEAR_VEL * (slewMode ? 4 : 1)
    dashboard?.dashboard.drawMeters(vel / maxVelCurrent, 0.5, overlayContext)

    camera.rotation.y += THREE.MathUtils.degToRad(rotVel * delta)
    if (slewMode) {
      camera.rotation.x += THREE.MathUtils.degToRad(pitchVel * delta)
      if (camera.rotation.x > Math.PI / 2) {
        camera.rotation.x = Math.PI / 2
      }
      if (camera.rotation.x < -Math.PI / 2) {
        camera.rotation.x = -Math.PI / 2
      }
    } else {
      camera.rotation.x = 0
    }
    camera.rotation.z = 0

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    if (slewMode) {
      forward.y = 0
      forward.normalize()
    }

    const moveVec = forward.clone().multiplyScalar(linearVel * delta)
    moveVec.y += verticalVel * delta
    if (moveVec.length() > 0) {
      if (slewMode) {
        camera.position.add(moveVec)
      } else {
        const slideMove = collideAndSlide(camera.position, moveVec)
        if (slideMove.length() > EPSILON) {
          camera.position.add(slideMove)
        }
      }
    }

    if (!slewMode) {
      placeCameraOnGround()
    }

    if (showDebugMenu) {
      const debugVec = (vec: THREE.Vector3): string => {
        return `x: ${vec.x.toFixed(4)}, y: ${vec.y.toFixed(4)}, z: ${vec.z.toFixed(4)}`
      }
      setDebugData({ position: debugVec(camera.position), direction: debugVec(new THREE.Vector3(0, 0, 1).applyEuler(camera.rotation)), slewMode })
    } else {
      setDebugData(null)
    }

    if (audioContext.currentTime >= nextBackgroundMusicSwitch) {
      const fadeInTime = 2
      const fadeOutTime = 2
      const possibleKeys = [
        MusicKeys.ResidentalArea_Music,
        MusicKeys.BeachBlvd_Music,
        MusicKeys.Cave_Music,
        MusicKeys.CentralRoads_Music,
        MusicKeys.Jail_Music,
        MusicKeys.Hospital_Music,
        MusicKeys.InformationCenter_Music,
        MusicKeys.PoliceStation_Music,
        MusicKeys.Park_Music,
        MusicKeys.CentralNorthRoad_Music,
        MusicKeys.GarageArea_Music,
        MusicKeys.RaceTrackRoad_Music,
        MusicKeys.Beach_Music,
        MusicKeys.JetskiRace_Music,
      ]
      const nextMusicKeyIndex = Math.floor(Math.random() * (possibleKeys.length + 1))
      const nextMusicKey = nextMusicKeyIndex < possibleKeys.length ? possibleKeys[nextMusicKeyIndex] : null
      if (backgroundMusic == null || backgroundMusic.key !== nextMusicKey) {
        if (backgroundMusic != null) {
          backgroundMusic.gain.gain.setTargetAtTime(0, audioContext.currentTime, fadeOutTime / 3)
          backgroundMusic.audioSource.stop(audioContext.currentTime + fadeOutTime)
          backgroundMusic = null
        }
        if (nextMusicKey != null) {
          const gain = audioContext.createGain()
          gain.connect(audioContext.destination)
          gain.gain.value = 0
          gain.gain.setTargetAtTime(1, audioContext.currentTime, fadeInTime / 3)
          const audioSource = audioContext.createBufferSource()
          audioSource.buffer = getMusic(nextMusicKey)
          audioSource.loop = true
          audioSource.connect(gain)
          audioSource.start()
          backgroundMusic = { key: nextMusicKey, gain, audioSource }
        }
      }
      nextBackgroundMusicSwitch = audioContext.currentTime + 30
    }

    renderer.render(scene, camera)
  }

  animate()
}
