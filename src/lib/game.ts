import * as THREE from 'three'
import { type Boundary, boundaryMap, colorAliases, copyWithAlpha, get2DSoundAnimation, getBoundary, getBuildings, getDashboard, getModelObject, getMusic, getPart, getTexture } from './assets'
import { Dashboard, Dashboards, dashboardForModel } from './dashboard'
import type { FLC } from './flc'
import { MusicKeys } from './music'
import { Plant } from './plant'
import { setDebugData } from './store'
import type { WDB } from './wdb'

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

class FLCTexture {
  private readonly _animation: FLC
  private readonly _stillImage: Uint8Array
  private readonly _canvas: HTMLCanvasElement
  private readonly _context: CanvasRenderingContext2D
  public readonly texture: THREE.CanvasTexture

  private _animationState: { frameIndex: number; startTime: number } | null

  public constructor(animation: FLC, stillImage: WDB.Gif) {
    this._animation = animation
    this._stillImage = new Uint8Array(stillImage.image.length)
    const STEP_WIDTH = 3
    for (let index = 0; index < stillImage.image.length; index += STEP_WIDTH * stillImage.width) {
      const srcIndex = stillImage.image.length - index - STEP_WIDTH * stillImage.width
      this._stillImage.set(stillImage.image.subarray(srcIndex, srcIndex + STEP_WIDTH * stillImage.width), index)
    }
    this._canvas = document.createElement('canvas')
    this._canvas.width = animation.width
    this._canvas.height = animation.height
    const flcContext = this._canvas.getContext('2d')
    if (flcContext == null) {
      throw new Error('Animation context not found')
    }
    this._context = flcContext
    this.texture = new THREE.CanvasTexture(this._canvas)
    this._animationState = null
    this.draw(this._stillImage)
  }

  public dispose() {
    this.texture.dispose()
  }

  public get running() {
    return this._animationState != null
  }

  public updateAnimation(currentTime: number, forceReset = false) {
    const newFrame = (() => {
      if (this._animationState == null || forceReset === true) {
        this._animationState = { frameIndex: 0, startTime: currentTime }
        return true
      }
      const elapsedTime = currentTime - this._animationState.startTime
      const msPerFrame = 1 / this._animation.frameRate
      const frameIndex = Math.floor(elapsedTime / msPerFrame)
      if (frameIndex === this._animationState.frameIndex) {
        return false
      }
      if (frameIndex >= this._animation.numFrames) {
        this._animationState = null
      } else {
        this._animationState.frameIndex = frameIndex
      }
      return true
    })()
    if (newFrame) {
      const frame = this._animationState != null ? this._animation.frames()[this._animationState.frameIndex] : this._stillImage
      this.draw(frame)
    }
  }

  private draw(frame: Uint8Array) {
    const imageData = this._context.getImageData(0, 0, this._animation.width, this._animation.height)
    copyWithAlpha(frame, imageData.data)
    this._context.putImageData(imageData, 0, 0)
    this.texture.needsUpdate = true
  }
}

export const initGame = async () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
  if (!canvas) {
    throw new Error('Canvas not found')
  }

  const audioContext = new AudioContext()
  const musicGain = audioContext.createGain()
  musicGain.connect(audioContext.destination)
  const MAX_MUSIC_GAIN = 0.3
  let defaultMusicGain = MAX_MUSIC_GAIN
  musicGain.gain.value = defaultMusicGain

  let backgroundMusic: { key: MusicKeys; gain: GainNode; audioSource: AudioBufferSourceNode } | null = null
  const switchBackgroundMusic = (nextMusicKey: MusicKeys) => {
    const fadeInTime = 2
    const fadeOutTime = 2
    if (backgroundMusic == null || backgroundMusic.key !== nextMusicKey) {
      if (backgroundMusic != null) {
        backgroundMusic.gain.gain.setTargetAtTime(0, audioContext.currentTime, fadeOutTime / 3)
        backgroundMusic.audioSource.stop(audioContext.currentTime + fadeOutTime)
        backgroundMusic = null
      }
      if (nextMusicKey != null) {
        const gain = audioContext.createGain()
        gain.connect(musicGain)
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
  }

  switchBackgroundMusic(MusicKeys.CentralNorthRoad_Music)

  const resolutionRatio = 4 / 3

  const hudCanvas = document.createElement('canvas')
  hudCanvas.width = 640
  hudCanvas.height = 480
  const hudContext = hudCanvas.getContext('2d')
  if (hudContext == null) {
    throw new Error('HUD canvas context not found')
  }
  const hudScene = new THREE.Scene()
  const hudTexture = new THREE.CanvasTexture(hudCanvas)
  hudTexture.colorSpace = THREE.SRGBColorSpace
  const hudMaterial = new THREE.MeshBasicMaterial({ map: hudTexture, transparent: true })
  const hudMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hudMaterial)
  hudMesh.position.z = -1
  const hudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
  hudScene.add(hudMesh)

  let dashboard: { group: THREE.Group; dashboard: Dashboard } | null = null

  const clickableGroups: { group: THREE.Group; onClick: (alternative: boolean) => Promise<void> }[] = []

  canvas.addEventListener('pointerup', () => {
    if (isTransitioning) {
      return
    }

    dashboard?.dashboard.pointerUp()
  })

  const clickedOnCar = (hitGroup: THREE.Group, dashboardId: Dashboards): (() => Promise<void>) => {
    return async () => {
      await transition()
      hitGroup.visible = false
      const { dashboardObj, backgroundObj } = getDashboard(dashboardId)
      dashboard = { dashboard: await Dashboard.create(dashboardObj, hudContext, audioContext, backgroundObj), group: hitGroup }
      dashboard.dashboard.drawBackground()
      hudTexture.needsUpdate = true
      camera.position.copy(hitGroup.position.clone().add(new THREE.Vector3(0, 1, 0)))
      camera.quaternion.copy(hitGroup.quaternion)
      placeCameraOnGround()
    }
  }

  canvas.addEventListener('pointerdown', event => {
    if (isTransitioning) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * hudCanvas.width
    const y = ((event.clientY - rect.top) / rect.height) * hudCanvas.height
    dashboard?.dashboard.pointerDown(x, y)
  })

  canvas.addEventListener('click', async event => {
    event.preventDefault()

    if (isTransitioning) {
      return
    }

    if (dashboard != null) {
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * hudCanvas.width
      const y = ((event.clientY - rect.top) / rect.height) * hudCanvas.height
      if (dashboard.dashboard.checkClick(x, y) === 'exit') {
        dashboard.group.position.copy(camera.position).sub(new THREE.Vector3(0, CAM_HEIGHT, 0))
        dashboard.group.quaternion.copy(camera.quaternion)
        dashboard.group.visible = true
        dashboard.dashboard.clear()
        dashboard = null
      }
    } else {
      const rect = canvas.getBoundingClientRect()
      const relativeX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const relativeY = -((event.clientY - rect.top) / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(relativeX, relativeY), camera)
      const intersects = raycaster.intersectObjects(clickableGroups.map(({ group }) => group).filter(group => group.visible))
      let obj: THREE.Object3D | null = intersects[0]?.object
      while (obj != null) {
        if (obj instanceof THREE.Group) {
          const hitGroup = clickableGroups.find(({ group }) => group === obj) ?? null
          if (hitGroup) {
            hitGroup.onClick(event.getModifierState('Control'))
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

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, resolutionRatio, 0.1, 1000)
  camera.rotation.order = 'YXZ'
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.autoClear = false
  renderer.toneMapping = THREE.NoToneMapping

  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    samples: 4,
  })
  const postScene = new THREE.Scene()
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const postMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      uMosaicProgress: { value: 0.0 },
      uTileSize: { value: 1.0 },
    },
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uMosaicProgress;
      uniform float uTileSize;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 texSize = vec2(textureSize(tDiffuse, 0));

        if (uMosaicProgress > 0.0) {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 mosaicCoord = floor(fragCoord / uTileSize) * uTileSize;
          mosaicCoord.y += uTileSize - 1.0;

          if (hash(mosaicCoord) < uMosaicProgress) {
            vec2 uv = mosaicCoord / texSize;
            vec3 color = texture2D(tDiffuse, uv).rgb;

            gl_FragColor = linearToOutputTexel(vec4(color, 1.0));
            return;
          }
        }
        
        vec2 uv = gl_FragCoord.xy / texSize;
        gl_FragColor = linearToOutputTexel(texture2D(tDiffuse, uv));
      }
    `,
  })
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial))

  let isTransitioning = false
  const transition = (): Promise<void> =>
    new Promise(resolve => {
      isTransitioning = true
      postMaterial.uniforms.uTileSize.value = Math.ceil(Math.max(canvas.width / 640, canvas.height / 480) * 10)
      const progressPerTick = 1 / 16

      const start = performance.now()
      const advance = () => {
        const ticks = Math.floor((performance.now() - start) / 50)
        postMaterial.uniforms.uMosaicProgress.value = progressPerTick * ticks
        if (postMaterial.uniforms.uMosaicProgress.value < 1.0) {
          requestAnimationFrame(advance)
        } else {
          // arbitrary wait time to give the transition more weight (the original had loading times, here everything is instant)
          setTimeout(() => {
            isTransitioning = false
            postMaterial.uniforms.uMosaicProgress.value = 0.0
            resolve()
          }, 200)
        }
      }
      advance()
    })

  postMaterial.uniforms.uMosaicProgress.value = 0.0

  const setRendererSize = () => {
    let width = Math.floor(window.innerHeight * resolutionRatio)
    let height = window.innerHeight
    if (width > window.innerWidth) {
      width = window.innerWidth
      height = Math.floor(window.innerWidth / resolutionRatio)
    }
    renderer.setSize(width, height)
    renderTarget.setSize(width, height)
  }

  setRendererSize()

  const isle = getModelObject('isle_hi')
  scene.add(isle)

  const colliderGroup = new THREE.Group()
  scene.add(colliderGroup)

  let transformationMatrix = new THREE.Matrix4()
  for (const buildingData of getBuildings()) {
    try {
      const model = getModelObject(buildingData.modelName)
      console.log(buildingData.modelName)
      if (buildingData.modelName === 'Bike') {
        const boundary = getBoundary('ISLE.SI', 'INT44')
        if (boundary == null) {
          throw new Error('Boundary not found')
        }
        transformationMatrix = boundary.getActorPlacement(2, 0.5, 0, 0.5)
      } else if (buildingData.modelName === 'MotoBk') {
        const boundary = getBoundary('ISLE.SI', 'INT43')
        if (boundary == null) {
          throw new Error('Boundary not found')
        }
        transformationMatrix = boundary.getActorPlacement(4, 0.5, 1, 0.5)
      } else if (buildingData.modelName === 'skate') {
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

      const modelDashboard = dashboardForModel(buildingData.modelName)
      if (modelDashboard) {
        clickableGroups.push({ group: model, onClick: clickedOnCar(model, modelDashboard) })
      }

      scene.add(model)
    } catch (e) {
      console.log(`Couldn't place ${buildingData.modelName}: ${e}`)
    }
  }

  const bugy = getModelObject('dunebugy')
  bugy.position.set(-25.5, 0, -3.4)
  scene.add(bugy)
  clickableGroups.push({
    group: bugy,
    onClick: clickedOnCar(bugy, Dashboards.DuneCar),
  })

  for (const plant of Plant.locationsPerPair(Plant.World.ACT1)) {
    const plantName = Plant.partName(plant.variant, plant.color)
    const part = getPart(plantName, 'global', null, null)
    for (const plantInfo of plant.plants) {
      calculateTransformationMatrix(plantInfo.locationAndDirection.location, plantInfo.locationAndDirection.direction, plantInfo.locationAndDirection.up, transformationMatrix)
      const partInstance = part.clone()
      const plantGroup = new THREE.Group()
      plantGroup.applyMatrix4(transformationMatrix)
      plantGroup.add(partInstance)
      scene.add(plantGroup)
      clickableGroups.push({
        group: plantGroup,
        onClick: async (alternative: boolean) => {
          console.log(`clicked plant with ${alternative}`)
          if (alternative) {
            Plant.switchColor(plantInfo)
          } else {
            Plant.switchVariant(plantInfo)
          }
          plantGroup.clear()
          const newPlant = getPart(Plant.partName(plantInfo.variant, plantInfo.color), 'global', null, null)
          plantGroup.add(newPlant)
        },
      })
    }
  }

  const debugObjectGroup = new THREE.Group()
  debugObjectGroup.visible = import.meta.env.DEV
  scene.add(debugObjectGroup)

  const debugDrawArrow = (from: THREE.Vector3, to: THREE.Vector3, color: string): THREE.ArrowHelper => {
    const dir = to.clone().sub(from).normalize()
    const length = from.distanceTo(to)
    const arrow = new THREE.ArrowHelper(dir, from, length, color)
    debugObjectGroup.add(arrow)
    return arrow
  }

  const debugDrawSphere = (position: THREE.Vector3, color: string, radius = 1): THREE.Mesh => {
    const sphere = new THREE.SphereGeometry(radius)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(sphere, material)
    mesh.position.copy(position)
    debugObjectGroup.add(mesh)
    return mesh
  }

  const debugDrawPlane = (anchor: THREE.Vector3, normal: THREE.Vector3, color: string): THREE.Mesh => {
    const planeGeometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    const mesh = new THREE.Mesh(planeGeometry, material)
    mesh.position.copy(anchor)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
    debugObjectGroup.add(mesh)
    return mesh
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

  const boundaryGroup = new THREE.Group()
  scene.add(boundaryGroup)
  const meshToBoundary: Map<THREE.Mesh, Boundary> = new Map()
  const allBoundaries = boundaryMap.get('ISLE.SI')
  if (!allBoundaries) {
    throw new Error('No boundaries found')
  }
  for (const [name, boundary] of allBoundaries.entries()) {
    if (boundary == null) {
      throw new Error('Boundary not found')
    }

    const mesh = boundary.createMesh()
    boundaryGroup.add(mesh)
    meshToBoundary.set(mesh, boundary)

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
    const downRay = new THREE.Raycaster(camera.position, new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObject(isle)[0]
    if (hit) {
      camera.position.copy(hit.point.clone().add(new THREE.Vector3(0, CAM_HEIGHT, 0)))
    }
  }

  camera.position.set(20, CAM_HEIGHT, 30)
  camera.lookAt(60, 0, 0)
  placeCameraOnGround()

  const { audio, animation } = get2DSoundAnimation('ISLE.SI', 'sba001bu_RunAnim')

  const listener = new THREE.AudioListener()
  camera.add(listener)
  const buffer = await audioContext.decodeAudioData(audio)

  const hatParts = ['baseball', 'chef', 'cap', 'cophat', 'helmet', 'ponytail', 'pageboy', 'shrthair', 'bald', 'flower', 'cboyhat', 'cuphat', 'cathat', 'backbcap', 'pizhat', 'caprc', 'capch', 'capdb', 'capjs', 'capmd', 'sheet', 'phat', 'icap']
  let hatPartIndex = hatParts.indexOf('icap')

  const lods: [string, string | { red: number; green: number; blue: number; alpha: number }, string, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number][] = [
    ['top', 'top', 'top', 0, 0.000267, 0.780808, -0.01906, 0.951612, -0.461166, -0.002794, -0.299442, 0.4617, 1.56441, 0.261321, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0],
    ['body', 'infochst.gif', 'bodyred', 1, 0.00158332, 0.401828, -0.00048697, 0.408071, -0.287507, 0.150419, -0.147452, 0.289219, 0.649774, 0.14258, -0.00089, 0.436353, 0.007277, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0],
    ['infohat', colorAliases['lego red'], 'icap', 2, 0.0, -0.00938, -0.01955, 0.35, -0.231822, -0.140237, -0.320954, 0.234149, 0.076968, 0.249083, 0.000191, 1.519793, 0.001767, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0],
    ['infogron', colorAliases['lego white'], 'infogron', 2, 0.0, 0.11477, 0.00042, 0.26, -0.285558, -0.134391, -0.142231, 0.285507, 0.152986, 0.143071, -0.00089, 0.436353, 0.007277, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0],
    ['head', 'smile.gif', 'head', 1, 0.0, -0.03006, 0.0, 0.3, -0.189506, -0.209665, -0.189824, 0.189532, 0.228822, 0.194945, -0.00105, 1.293115, 0.001781, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0],
    ['arm-lft', colorAliases['lego black'], 'arm-lft', 2, -0.06815, -0.0973747, 0.0154655, 0.237, -0.137931, -0.282775, -0.105316, 0.000989, 0.100221, 0.140759, -0.225678, 0.963312, 0.023286, -0.003031, -0.017187, 0.999848, 0.173622, 0.984658, 0.017453],
    ['arm-rt', colorAliases['lego black'], 'arm-rt', 2, 0.0680946, -0.097152, 0.0152722, 0.237, 0.00141, -0.289604, -0.100831, 0.138786, 0.09291, 0.145437, 0.223494, 0.963583, 0.018302, 0.0, 0.0, 1.0, -0.173648, 0.984808, 0.0],
    ['claw-lft', colorAliases['lego white'], 'claw-lft', 2, 0.000773381, -0.101422, -0.0237761, 0.15, -0.089838, -0.246208, -0.117735, 0.091275, 0.000263, 0.07215, -0.341869, 0.700355, 0.092779, 0.000001, 0.000003, 1.0, 0.190812, 0.981627, -0.000003],
    ['claw-rt', colorAliases['lego white'], 'claw-lft', 2, 0.000773381, -0.101422, -0.0237761, 0.15, -0.095016, -0.245349, -0.117979, 0.086528, 0.00067, 0.069743, 0.343317, 0.69924, 0.096123, 0.00606, -0.034369, 0.999391, -0.190704, 0.981027, 0.034894],
    ['leg-lft', colorAliases['lego white'], 'leg', 2, 0.00433584, -0.177404, -0.0313928, 0.33, -0.129782, -0.440428, -0.184207, 0.13817, 0.118415, 0.122607, -0.156339, 0.436087, 0.006822, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0],
    ['leg-rt', colorAliases['lego white'], 'leg', 2, 0.00433584, -0.177404, -0.0313928, 0.33, -0.132864, -0.437138, -0.183944, 0.134614, 0.12043, 0.121888, 0.151154, 0.436296, 0.007373, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0],
  ]
  // name / parent:name / flags / boundingsphere / boundngbox/ pos / dir /up 22

  const headTexture = (() => {
    for (const lod of lods) {
      if (lod[0] === 'head' && typeof lod[1] === 'string') {
        const stillImage = getTexture(lod[1], 'image')
        return new FLCTexture(animation, stillImage)
      }
    }
    throw new Error('Cannot find head')
  })()

  const top = new THREE.Group()
  const genPart = (lod: (typeof lods)[number]): THREE.Group => {
    const texture = lod[0] === 'head' ? headTexture.texture : typeof lod[1] === 'string' ? (lod[2] === lod[1] ? null : lod[1]) : null
    const partName = lod[0] === 'infohat' ? hatParts[hatPartIndex] : lod[2]
    const part = getPart(partName, 'global', typeof lod[1] === 'string' ? null : lod[1], texture)
    calculateTransformationMatrix([-lod[13], lod[14], lod[15]], [-lod[16], lod[17], lod[18]], [-lod[19], lod[20], lod[21]], transformationMatrix)
    part.applyMatrix4(transformationMatrix)
    part.name = lod[0]
    return part
  }
  const infogron = genPart(lods[3])
  const body = genPart(lods[1])
  const armRt = genPart(lods[6])
  const clawRt = genPart(lods[8])
  // armRt.add(clawRt)

  const armLft = genPart(lods[5])
  const clawLft = genPart(lods[7])
  // armLft.add(clawLft)

  const head = genPart(lods[4])
  let infohat = genPart(lods[2])
  // head.add(infohat)

  // body.add(head)
  // body.add(armRt)
  // body.add(armLft)
  // infogron.add(body)

  const legLft = genPart(lods[9])
  const legRt = genPart(lods[10])
  top.add(infogron)
  top.add(legLft)
  top.add(legRt)

  top.add(body)
  top.add(head)
  top.add(armRt)
  top.add(armLft)
  top.add(clawRt)
  top.add(clawLft)
  top.add(infohat)

  clickableGroups.push({
    group: top,
    onClick: async () => {
      hatPartIndex++
      if (hatPartIndex >= hatParts.length) {
        hatPartIndex = 0
      }
      top.remove(infohat)
      infohat = genPart(lods[2])
      top.add(infohat)
    },
  })

  const cameraDirection = new THREE.Vector3()
  camera.getWorldDirection(cameraDirection)
  const pos = camera.position.clone().add(cameraDirection.multiplyScalar(6))
  pos.y -= 1

  const lod = lods[0]
  // top.applyMatrix4(calculateTransformationMatrix([-lod[13], lod[14], lod[15]], [-lod[16], lod[17], lod[18]], [-lod[19], lod[20], lod[21]]))
  // top.scale.set(1, 1, 1)
  // top.quaternion.set(0, 0, 0, 1)
  const minifig = new THREE.Group()
  minifig.add(top)
  scene.add(minifig)
  minifig.rotateX(-Math.PI / 2)
  minifig.rotateZ(-Math.PI)
  minifig.position.copy(pos)

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

  document.addEventListener('keydown', async event => {
    event.preventDefault()

    if (isTransitioning) {
      return
    }

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
        camera.position.y = 100
        placeCameraOnGround()
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

    if (event.key === 'm') {
      defaultMusicGain -= 0.1
      if (defaultMusicGain < -0.05) {
        defaultMusicGain = MAX_MUSIC_GAIN
      }
      musicGain.gain.value = defaultMusicGain * (headTexture.running != null ? 0.5 : 1)
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
    dashboard?.dashboard.drawMeters(vel / maxVelCurrent, 0.5, hudContext)
    hudTexture.needsUpdate = true

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

    const fromPos = camera.position.clone()
    let toPos = fromPos.clone()
    const moveVec = forward.clone().multiplyScalar(linearVel * delta)
    moveVec.y += verticalVel * delta
    if (moveVec.length() > 0) {
      if (slewMode) {
        camera.position.add(moveVec)
      } else {
        const slideMove = collideAndSlide(camera.position, moveVec)
        if (slideMove.length() > EPSILON) {
          camera.position.add(slideMove)
          toPos = camera.position.clone()
        }
      }
    }

    if (!slewMode) {
      placeCameraOnGround()
    }

    let currentBoundary: Boundary | null = null
    for (const boundary of boundaryGroup.children) {
      boundary.visible = false
    }
    const downRay = new THREE.Raycaster(camera.position, new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObject(boundaryGroup)[0]
    if (hit) {
      currentBoundary = meshToBoundary.get(hit.object as THREE.Mesh) ?? null

      if (showDebugMenu) {
        hit.object.visible = true
      }
    }

    if (showDebugMenu) {
      const debugVec = (vec: THREE.Vector3): string => {
        return `x: ${vec.x.toFixed(4)}, y: ${vec.y.toFixed(4)}, z: ${vec.z.toFixed(4)}`
      }
      setDebugData({ position: debugVec(camera.position), direction: debugVec(new THREE.Vector3(0, 0, 1).applyEuler(camera.rotation)), slewMode })
    } else {
      setDebugData(null)
    }

    const music = [
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
      MusicKeys.Quiet_Audio,
    ]

    const triggersReff: [number, number][] = [
      [11, 10],
      [6, 10],
      [3, 1],
      [4, 1],
      [1, 4],
      [1, 4],
      [13, 2],
      [13, 2],
      [13, 2],
      [4, 10],
      [11, 9],
      [9, 7],
      [8, 7],
      [8, 5],
      [5, 2],
      [2, 4],
      [4, 2],
      [4, 5],
      [11, 4],
      [12, 10],
      [10, 12],
      [10, 12],
      [14, 2],
      [14, 2],
    ]

    if (currentBoundary?.direction != null && currentBoundary.triggers.length > 0) {
      const ccw = currentBoundary.edges[0].getCCWVertex(currentBoundary)

      const dot1 = fromPos.clone().sub(ccw).dot(currentBoundary.direction)
      const dot2 = toPos.clone().sub(ccw).dot(currentBoundary.direction)

      for (const trigger of currentBoundary.triggers) {
        if (dot2 > dot1 && trigger.triggerProjection >= dot1 && trigger.triggerProjection < dot2) {
          console.log(`trigger: ${trigger.struct.name} ${trigger.data}`)
          if (trigger.struct.name[2] === 'M') {
            switchBackgroundMusic(music[triggersReff[trigger.data - 1][0] - 1])
          }
        }

        if (dot2 < dot1 && trigger.triggerProjection >= dot2 && trigger.triggerProjection < dot1) {
          console.log(`trigger: ${trigger.struct.name} ${trigger.data}`)
          if (trigger.struct.name[2] === 'M') {
            switchBackgroundMusic(music[triggersReff[trigger.data - 1][1] - 1])
          }
        }
      }
    }

    if (!headTexture.running) {
      const worldPos = new THREE.Vector3()
      head.getWorldPosition(worldPos)
      if (camera.position.distanceToSquared(worldPos) < 10) {
        musicGain.gain.value = defaultMusicGain * 0.5

        headTexture.updateAnimation(audioContext.currentTime, true)

        const sound = new THREE.PositionalAudio(listener)
        sound.setBuffer(buffer)
        sound.gain.gain.value = 0.2
        sound.setRefDistance(20)
        sound.play()
        head.add(sound)
      }
    } else {
      headTexture.updateAnimation(audioContext.currentTime)
      if (!headTexture.running) {
        musicGain.gain.value = defaultMusicGain
      } else {
        const worldPos = new THREE.Vector3()
        head.getWorldPosition(worldPos)
        const dx = camera.position.x - worldPos.x
        const dz = camera.position.z - worldPos.z

        const angle = Math.atan2(dx, dz)
        head.rotation.y = angle
      }
    }

    renderer.setRenderTarget(renderTarget)
    renderer.clear()
    renderer.render(scene, camera)
    renderer.render(hudScene, hudCamera)

    renderer.setRenderTarget(null)
    renderer.clear()
    renderer.render(postScene, postCamera)
  }

  animate()
}
