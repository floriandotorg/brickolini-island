import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import type { Water } from 'three/addons/objects/Water.js'
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js'
import { Chptr_Model } from '../actions/copter'
import { DuneBugy_Model } from '../actions/dunecar'
import { NoPizaz_Texture, NoPizza_Texture } from '../actions/isle'
import { Jsuser_Model } from '../actions/jetski'
import { Rcuser_Model } from '../actions/racecar'
import { act1State } from '../lib/act1-state'
import { type ActionBase, type ActorAction, type AnimationAction, type EntityAction, getExtraValue, isActorAction, isAnimationAction, isBoundaryAction, isEntityAction, isPositionalAudioAction, type ModelAction, type RunAnimationAction, type SerialAction } from '../lib/action-types'
import { type Boundary, type Edge, getBoundaries } from '../lib/assets/boundary'
import { type DTA, type DtaWorldName, loadAnimationInfoFromDTA } from '../lib/assets/dta'
import { manager } from '../lib/assets/load'
import { calculateTransformationMatrix, getModel, getWorld, Roi3D, type WdbWorldName } from '../lib/assets/model'
import type { SpawnLocation } from '../lib/assets/spawn-location'
import { createTexture } from '../lib/assets/texture'
import type { Composer } from '../lib/effect/composer'
import { engine, getURLParam, type NormalizedMouseEvent } from '../lib/engine'
import { type Location, locations } from '../lib/locations'
import { applyLights, NUM_ORIGINAL_LIGHTS } from '../lib/original-lights'
import { getSettings } from '../lib/settings'
import { type Actor, ColliderType } from '../lib/world/actor'
import { PathActor } from '../lib/world/actors/path-actor'
import type { Vehicle } from '../lib/world/actors/vehicle'
import type { Character, CharacterName } from '../lib/world/character'
import { Dashboard, type VehicleType } from '../lib/world/dashboard'
import type { Entity } from '../lib/world/entity'
import { Plants } from '../lib/world/plants'
import type { PlayerMovement } from '../lib/world/player-movement'
import { World, type WorldName } from '../lib/world/world'

export type IsleParam = {
  position: {
    boundaryName: string
    source: number
    sourceScale: number
    destination: number
    destinationScale: number
  }
}
const SECONDS_PER_DAY = 24 * 60

export type CarBuildVehicleType = 'dunecar' | 'helicopter' | 'jetski' | 'racecar'
export const CAR_BUILD_VEHICLES: { readonly type: CarBuildVehicleType; readonly model: ModelAction; readonly spawn: SpawnLocation; readonly createActor: (model: Roi3D, islebase: IsleBase) => Promise<Actor> }[] = [
  {
    type: 'dunecar',
    model: DuneBugy_Model,
    spawn: 'dunebuggySpawn',
    createActor: async (model: Roi3D, islebase: IsleBase) => new (await import('../lib/world/actors/dunebugy')).DuneBugy(model, islebase),
  },
  {
    type: 'helicopter',
    model: Chptr_Model,
    spawn: 'helicopterSpawn',
    createActor: async (model: Roi3D, islebase: IsleBase) => new (await import('../lib/world/actors/helicopter')).Helicopter(model, islebase),
  },
  {
    type: 'jetski',
    model: Jsuser_Model,
    spawn: 'jetskiSpawn',
    createActor: async (model: Roi3D, islebase: IsleBase) => new (await import('../lib/world/actors/jetski')).Jetski(model, islebase),
  },
  {
    type: 'racecar',
    model: Rcuser_Model,
    spawn: 'racecarSpawn',
    createActor: async (model: Roi3D, islebase: IsleBase) => new (await import('../lib/world/actors/racecar')).RaceCar(model, islebase),
  },
]

export abstract class IsleBase extends World {
  protected _groundGroup: THREE.Object3D[] = []
  protected _plantGroup: THREE.Group = new THREE.Group()
  protected _dashboard = new Dashboard()
  protected _sun:
    | {
        type: 'original'
        sunLight: THREE.PointLight
        directionalLight: THREE.DirectionalLight
      }
    | {
        type: 'modern'
        sky: Sky
        sunLight: THREE.DirectionalLight
      }
    | {
        type: 'none'
      } = { type: 'none' }
  protected _ambientLight: THREE.AmbientLight | null = null
  protected _water: Water | null = null
  private _temporarySkyColor: { h: number; s: number; l: number } | null = null
  protected _isleMesh: THREE.Object3D | null = null
  protected _bikeRoi: Roi3D | null = null
  protected _motobkRoi: Roi3D | null = null
  protected _skateRoi: Roi3D | null = null
  protected _ambulanceRoi: Roi3D | null = null
  protected _towtruckRoi: Roi3D | null = null
  private _animationInfos: DTA.AnimationInfo[] = []
  private readonly _wdbWorldName: WdbWorldName | null
  private readonly _dtaWorldName: DtaWorldName | null
  private _currentVehicle: Vehicle | null = null
  private _cachedAnimations = new Map<string, AnimationAction>()
  protected _cameraAnimationPlaying = false
  protected _jukeboxEntity: import('../lib/world/entities/jukebox').JukeBoxEntity | null = null

  public get currentVehicle(): Vehicle | null {
    return this._currentVehicle
  }

  public set currentVehicle(vehicle: Vehicle | null) {
    this._currentVehicle = vehicle
  }

  public get canExit(): boolean {
    const vehicleType = this._currentVehicle?.type
    if (vehicleType === 'ambul' || vehicleType === 'towtk') {
      return false
    }
    return act1State.value === 'none'
  }

  public abortMission(): void {}

  public get dashboard(): Dashboard {
    return this._dashboard
  }

  public cameraAnimationTriggerEnabled = true

  public set water(water: Water) {
    this._water = water
  }

  public get animationInfos(): DTA.AnimationInfo[] {
    return this._animationInfos
  }

  public getCachedAnimation(name: string): AnimationAction {
    const animation = this._cachedAnimations.get(name.toLowerCase())
    if (animation == null) {
      throw new Error(`Animation not found: ${name}`)
    }
    return animation
  }

  constructor(
    name: WorldName,
    {
      wdbWorldName,
      dtaWorldName,
      ignoreEntityClick,
    }: {
      wdbWorldName?: WdbWorldName
      dtaWorldName?: DtaWorldName
      ignoreEntityClick?: boolean
    } = {},
  ) {
    super(name, ignoreEntityClick ?? false)
    this._wdbWorldName = wdbWorldName ?? null
    this._dtaWorldName = dtaWorldName ?? null
  }

  protected async handleStartUpAction(action: SerialAction<ActionBase>, cb: ((child: ActionBase) => Promise<boolean>) | null = null): Promise<void> {
    for (const child of action.children) {
      if (cb != null && (await cb(child))) {
        continue
      }

      if (isBoundaryAction(child)) {
        this.boundaryManager.loadBoundaries(await getBoundaries(child))
      } else if (isActorAction(child) || isEntityAction(child)) {
        await this.handleActorAction(child)
      } else if (isAnimationAction(child)) {
        this._cachedAnimations.set(child.name.toLowerCase(), child)
      } else if (child.presenter === 'LegoLoadCacheSoundPresenter' && isPositionalAudioAction(child)) {
        await this.cachePositionalAudio(child)
      } else {
        console.warn('Unknown action type:', child)
      }
    }
  }

  override async init(): Promise<void> {
    await super.init()

    if (getSettings().graphics.pbrMaterials) {
      new THREE.CubeTextureLoader(manager).load(
        [...Array(6).keys()].map(f => `hd/isle-cubemap/face_${f}.png`),
        async cubeTexture => {
          const lightProbe = LightProbeGenerator.fromCubeTexture(cubeTexture)
          lightProbe.intensity = 0.1
          this.scene.add(lightProbe)
        },
      )

      manager.onLoad = () => {
        this.scene.environment = new THREE.PMREMGenerator(engine.renderer).fromScene(this.scene, 0, 0.1, 1000, {
          size: 1024,
          position: new THREE.Vector3(-15, 10, -1),
        }).texture
        this.scene.environmentIntensity = 0.3
      }
    }

    if (this._wdbWorldName != null) {
      this.worldGroup = await getWorld(this._wdbWorldName)
    }

    this._plantGroup = await Plants.place(this, Plants.World.ACT1)
    this.scene.add(this._plantGroup)
    if (import.meta.hot) {
      import.meta.hot.accept('../lib/world/plants', async newModule => {
        if (newModule == null) {
          return
        }
        this.scene.remove(this._plantGroup)
        this._plantGroup = await newModule.Plants.place(this, Plants.World.ACT1)
        this.scene.add(this._plantGroup)
      })
    }

    if (this._dtaWorldName != null) {
      this._animationInfos = await loadAnimationInfoFromDTA(this._dtaWorldName)
      for (const animationInfo of this._animationInfos) {
        animationInfo.active = true
      }
    }

    if (getURLParam('generate-cubemap') === 'true') {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1), 2)
      this.scene.add(ambientLight)
      this.scene.background = new THREE.Color(1, 1, 1)

      const size = 1024
      const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(size)
      const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget)
      cubeCamera.position.set(0, 10, 0)
      this.scene.add(cubeCamera)

      cubeCamera.update(engine.renderer, this.scene)

      const save = (canvas: HTMLCanvasElement, name: string): void => {
        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            const a: HTMLAnchorElement = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = name
            a.click()
          }
        }, 'image/png')
      }

      ;[...Array(6).keys()].forEach((face: number) => {
        const buffer: Uint8Array = new Uint8Array(4 * size * size)
        engine.renderer.readRenderTargetPixels(cubeRenderTarget, 0, 0, size, size, buffer, face)

        const canvas: HTMLCanvasElement = document.createElement('canvas')
        canvas.width = size
        canvas.height = size

        const context: CanvasRenderingContext2D | null = canvas.getContext('2d')
        if (context) {
          const img = context.createImageData(size, size)
          img.data.set(buffer)
          context.putImageData(img, 0, 0)
        }

        save(canvas, `face_${face}.png`)
      })

      return
    }

    const settings = getSettings()
    if (settings.graphics.sun) {
      const sky = new Sky()
      sky.scale.setScalar(10000)
      this.scene.add(sky)
      sky.material.uniforms.turbidity.value = 10
      sky.material.uniforms.rayleigh.value = 2
      sky.material.uniforms.mieCoefficient.value = 0.005
      sky.material.uniforms.mieDirectionalG.value = 0.8

      if (!settings.graphics.pbrMaterials) {
        this._ambientLight = new THREE.AmbientLight()
        this.scene.add(this._ambientLight)
      }

      const sunLight = new THREE.DirectionalLight()
      if (settings.graphics.shadows) {
        sunLight.castShadow = true
        sunLight.shadow.mapSize.set(4096, 4096)
        sunLight.shadow.radius = 1.5
        sunLight.shadow.camera.near = 0.5
        sunLight.shadow.camera.far = 500
        sunLight.shadow.camera.left = -200
        sunLight.shadow.camera.right = 200
        sunLight.shadow.camera.top = 200
        sunLight.shadow.camera.bottom = -200
      }
      this.scene.add(sunLight)

      this._sun = {
        type: 'modern',
        sunLight,
        sky,
      }

      this._updateSun()
    } else {
      const ambientLight = new THREE.AmbientLight(new THREE.Color(0.3, 0.3, 0.3))
      this.scene.add(ambientLight)
      const sunLight = new THREE.PointLight(0xffffff, 1, 1000, 0)
      this.scene.add(sunLight)
      const directionalLight = new THREE.DirectionalLight(0xffffff)
      if (settings.graphics.shadows) {
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.set(4096, 4096)
        directionalLight.shadow.radius = 1.5
        directionalLight.shadow.camera.near = 0.5
        directionalLight.shadow.camera.far = 500
        directionalLight.shadow.camera.left = -200
        directionalLight.shadow.camera.right = 200
        directionalLight.shadow.camera.top = 200
        directionalLight.shadow.camera.bottom = -200
      }
      this.scene.add(directionalLight)

      this._sun = {
        type: 'original',
        sunLight,
        directionalLight,
      }

      this._updateSun()
    }

    // spell-checker: ignore brdg jailbrdg racebrdg
    for (const name of ['isle_hi', 'inf-brdg', 'jailbrdg', 'racebrdg']) {
      const object = this.scene.getObjectByName(name)
      if (object == null || !(object instanceof THREE.Object3D)) {
        continue
      }
      this._groundGroup.push(object)
    }
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    super.activate(composer, _param)

    this._dashboard.activate(composer)

    const noPizzaSign = this.scene.getObjectByName('nopizza')?.children[0]
    if (noPizzaSign instanceof THREE.Mesh) {
      noPizzaSign.material.map = engine.currentSaveGame.player === 'pepper' ? createTexture(NoPizaz_Texture) : createTexture(NoPizza_Texture)
    }
  }

  public getVehicleRoi(vehicle: VehicleType): Roi3D | null {
    switch (vehicle) {
      case 'bike':
        return this._bikeRoi ?? null
      case 'moto':
        return this._motobkRoi ?? null
      case 'skate':
        return this._skateRoi ?? null
      case 'ambul':
        return this._ambulanceRoi ?? null
      case 'towtk':
        return this._towtruckRoi ?? null
      default:
        return null
    }
  }

  public placeVehicle(vehicle: VehicleType, boundaryName: string, src: number, srcScale: number, dst: number, _dstScale: number, ignoreSave = false): void {
    const vehicleRoi = this.getVehicleRoi(vehicle)
    if (vehicleRoi == null) {
      return
    }
    const { position, quaternion } = (() => {
      const vehiclePlacement = ignoreSave ? null : engine.currentSaveGame.getVehiclePlacement(vehicle)
      if (vehiclePlacement != null) {
        return vehiclePlacement
      }
      return this.boundaryManager.getObjectPlacement(boundaryName, src, srcScale, dst, _dstScale)
    })()
    vehicleRoi.moveRoiTo(position, quaternion)
  }

  protected _updateCameraProjection(position: [number, number, number], direction: [number, number, number], up: [number, number, number], fov: number) {
    const mat = calculateTransformationMatrix(position, direction, up)
    mat.decompose(this.camera.position, this.camera.quaternion, this.camera.scale)
    this.camera.rotateY(Math.PI)
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
  }

  protected get _modernDayTime(): number {
    return (engine.elapsedTimeSeconds / SECONDS_PER_DAY + engine.currentSaveGame.sunPosition / NUM_ORIGINAL_LIGHTS) % 1
  }

  protected get _currentSunPosition(): number {
    switch (this._sun.type) {
      case 'original':
        return engine.currentSaveGame.sunPosition
      case 'modern':
        return Math.floor(this._modernDayTime * NUM_ORIGINAL_LIGHTS)
      case 'none':
        throw new Error('Invalid sun type')
    }

    throw new Error('Invalid sun type')
  }

  protected _updateSun(): void {
    if (this._temporarySkyColor != null) {
      this._applySkyColor(this._temporarySkyColor)
    }

    switch (this._sun.type) {
      case 'original': {
        const index = engine.currentSaveGame.sunPosition
        applyLights(index, this._sun.sunLight, this._sun.directionalLight)
        if (this._temporarySkyColor == null) {
          this._applySkyColor({ h: 0.56, s: 0.54, l: 0.68 })
        }
        break
      }
      case 'modern': {
        const dayTime = this._modernDayTime
        const elevationDeg = Math.sin(Math.PI * dayTime) * 90 // 0-90-0°
        const phi = THREE.MathUtils.degToRad(90 - elevationDeg)
        const theta = THREE.MathUtils.degToRad(135) // fixed azimuth

        const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta)

        this._sun.sky.material.uniforms.sunPosition.value.copy(sunDir)
        this._sun.sky.visible = this._temporarySkyColor == null

        const intensity = 0.25 + 0.75 * Math.sin(Math.PI * dayTime) // 0.25-1-0.25
        const warm = new THREE.Color(0xff9f46) // ≈ 2500 K
        const cold = new THREE.Color(0xfffefa) // ≈ 6500 K
        const color = warm.clone().lerp(cold, Math.sin(Math.PI * dayTime)) // warm → cold → warm

        this.scene.environmentIntensity = 0.15 * intensity

        if (this._ambientLight != null) {
          this._ambientLight.intensity = 0.4
          this._ambientLight.color.copy(color)
        }

        const lightElevationDeg = Math.max(elevationDeg, 20)
        const lightPhi = THREE.MathUtils.degToRad(90 - lightElevationDeg)
        const lightDir = new THREE.Vector3().setFromSphericalCoords(1, lightPhi, theta)

        this._sun.sunLight.position.copy(lightDir).multiplyScalar(100)
        this._sun.sunLight.intensity = intensity
        this._sun.sunLight.color.copy(color)

        if (getSettings().graphics.shadows && this._sun.sunLight.shadow) {
          const frustumScale = 1 + (1 - elevationDeg / 90) * 3
          const baseFrustum = 200
          const scaledFrustum = baseFrustum * frustumScale

          this._sun.sunLight.shadow.camera.left = -scaledFrustum
          this._sun.sunLight.shadow.camera.right = scaledFrustum
          this._sun.sunLight.shadow.camera.top = scaledFrustum
          this._sun.sunLight.shadow.camera.bottom = -scaledFrustum

          this._sun.sunLight.shadow.camera.far = 500 + (1 - elevationDeg / 90) * 500
        }

        if (this._water != null) {
          this._water.material.uniforms.sunColor.value.copy(color)
          this._water.material.uniforms.sunDirection.value.copy(sunDir.normalize())
        }
        break
      }
      case 'none':
        throw new Error('Invalid sun type')
    }
  }

  public setTemporarySkyColor(hsl: { h: number; s: number; l: number }): void {
    this._temporarySkyColor = hsl
    this._applySkyColor(hsl)
  }

  public resetTemporarySkyColor(): void {
    this._temporarySkyColor = null
    if (this._sun.type === 'original') {
      this._applySkyColor({ h: 0.56, s: 0.54, l: 0.68 })
    } else if (this._sun.type === 'modern') {
      this._sun.sky.visible = true
      this.scene.background = null
    }
  }

  private _applySkyColor(hsl: { h: number; s: number; l: number }): void {
    const color = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l).convertSRGBToLinear()
    this.scene.background = color
    if (this._sun.type === 'original') {
      const lightColor = new THREE.Color(Math.min(color.r * (1 / 0.23), 1), Math.min(color.g * (1 / 0.63), 1), Math.min(color.b * (1 / 0.85), 1))
      this._sun.directionalLight.color = lightColor
      this._sun.sunLight.color = lightColor
    }
  }

  public getGroundPosition(): THREE.Vector3 {
    throw new Error('Not implemented')
  }

  public placeOnGround(_object: THREE.Object3D) {
    throw new Error('Not implemented')
  }

  protected get playerMovement(): PlayerMovement | null {
    return null
  }

  public async playCameraAnimation(action: RunAnimationAction, animationInfo?: DTA.AnimationInfo, location?: Location, lockOnly = false): Promise<void> {
    if (animationInfo == null) {
      animationInfo = this.animationInfos.find(a => a.objectId === action.id)
      if (animationInfo == null) {
        throw new Error(`Animation info not found for action ${action.name}`)
      }
      location = locations.at(animationInfo.location)
    }

    this.playerMovement?.resetVelocities()

    this._cameraAnimationPlaying = true
    ++animationInfo.numPlayed
    if (location != null) {
      location.animationPlayedAtLocation = true
    }
    const extraTracks = lockOnly
      ? undefined
      : (() => {
          if (location == null || !animationInfo.hasCameraAnimation) {
            return undefined
          }
          const matrix = calculateTransformationMatrix(location.position, location.direction, location.up)
          const position = new THREE.Vector3()
          const quaternion = new THREE.Quaternion()
          matrix.decompose(position, quaternion, new THREE.Vector3())
          // for some reason we need to rotate yaw by 180 degrees
          const rotationQuaternion = new THREE.Quaternion()
          rotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
          quaternion.premultiply(rotationQuaternion)
          quaternion.normalize()
          const cameraQuaternion = new THREE.Quaternion()
          cameraQuaternion.copy(this.camera.quaternion)
          cameraQuaternion.normalize()
          // ensure shortest path
          if (cameraQuaternion.dot(quaternion) < 0) {
            quaternion.x *= -1
            quaternion.y *= -1
            quaternion.z *= -1
            quaternion.w *= -1
          }
          return [
            new THREE.VectorKeyframeTrack('camera.position', [0, 1], [this.camera.position.x, this.camera.position.y, this.camera.position.z, position.x, position.y, position.z]),
            new THREE.QuaternionKeyframeTrack('camera.quaternion', [0, 1], [this.camera.quaternion.x, this.camera.quaternion.y, this.camera.quaternion.z, this.camera.quaternion.w, quaternion.x, quaternion.y, quaternion.z, quaternion.w]),
          ]
        })()
    return this.playAnimation(action, {
      extraTracks,
      lockCamera: lockOnly || extraTracks != null,
    }).then(() => {
      this._cameraAnimationPlaying = false
    })
  }

  public async handleActorAction(action: ActorAction | EntityAction): Promise<Actor | null> {
    let model: Roi3D | Character | null = null
    const modelName = getExtraValue(action.children[0], 'DB_CREATE')
    if (modelName != null) {
      const roi = this.findRoi(modelName)
      if (roi == null) {
        console.warn(`Model not found: ${modelName}`)
        return null
      }
      model = roi
    }
    const characterName = getExtraValue(action.children[0], 'AUTO_CREATE')
    if (characterName != null) {
      if (model != null) {
        throw new Error('Actor action with both model and character is not supported')
      }
      model = await this.getCharacter(characterName.toLowerCase() as CharacterName)
    }
    if (model == null) {
      model = await getModel(action.children[0])
      for (const subModel of model.getAllModels()) {
        this.worldGroup.add(subModel)
      }
    }
    if (model == null) {
      console.warn('Action without model is not supported', action)
      return null
    }
    const visibility = getExtraValue(action, 'Visibility')
    if (visibility != null) {
      if (visibility !== 'FALSE') {
        throw new Error('Visibility should only be FALSE')
      }
      model.visible = false
    }
    let positionalAudio: THREE.PositionalAudio | null = null
    const sound = getExtraValue(action, 'Sound')
    if (sound != null) {
      if (!(model instanceof Roi3D)) {
        console.warn('Cannot attach sound to character', action)
        return null
      }
      try {
        positionalAudio = await this.playPositionalAudio(sound.toLowerCase(), model.model)
      } catch (error) {
        console.warn('Failed to play sound', error)
        return null
      }
    }
    const mute = getExtraValue(action, 'Mute')
    if (mute != null) {
      if (positionalAudio == null) {
        throw new Error('Mute can only be used with Sound')
      }
      positionalAudio.gain.gain.value = 0
    }
    const path = getExtraValue(action, 'Path')
    let destination: {
      boundary: Boundary
      edge: Edge
      scale: number
    } | null = null
    if (path != null) {
      const pathMatch = path.match(/^([^;]+);([^;]+);([^;]+);([^;]+);([^;]+)$/)
      if (!pathMatch) {
        console.warn(`Path string does not match expected format: ${path}`)
        return null
      }
      const pathId = pathMatch[1]
      const src = Number.parseFloat(pathMatch[2])
      const srcScale = Number.parseFloat(pathMatch[3])
      const dst = Number.parseFloat(pathMatch[4])
      const dstScale = Number.parseFloat(pathMatch[5])
      const { position, quaternion, ...rest } = this.boundaryManager.getObjectPlacement(pathId, src, srcScale, dst, dstScale)
      model.moveRoiTo(position, quaternion)
      destination = {
        boundary: rest.boundary,
        edge: rest.destinationEdge,
        scale: dstScale,
      }
    }
    const objectScript = getExtraValue(action, 'Object')
    if (objectScript == null) {
      return null
    }
    if (!(model instanceof Roi3D)) {
      console.warn('Cannot attach object script to character', action)
      return null
    }

    let entity: Entity | null = null
    switch (objectScript) {
      case 'GasStationEntity':
        entity = new (await import('../lib/world/entities/gas-station')).GasStation(model, this)
        break
      case 'InfoCenterEntity':
        entity = new (await import('../lib/world/entities/info-center')).InfoCenter(model, this)
        break
      case 'PoliceEntity':
        entity = new (await import('../lib/world/entities/police')).Police(model, this)
        break
      case 'HospitalEntity':
        entity = new (await import('../lib/world/entities/hospital')).Hospital(model, this)
        break
      case 'BeachHouseEntity':
        entity = new (await import('../lib/world/entities/beach-house')).BeachHouseEntity(model, this)
        break
      case 'RaceStandsEntity':
        entity = new (await import('../lib/world/entities/race-stands')).RaceStandsEntity(model, this)
        break
      case 'JukeBoxEntity':
        entity = new (await import('../lib/world/entities/jukebox')).JukeBoxEntity(model, this)
        this._jukeboxEntity = entity as import('../lib/world/entities/jukebox').JukeBoxEntity
        break
    }
    if (entity != null) {
      const matrix = calculateTransformationMatrix([-action.location[0], action.location[1], action.location[2]], [-action.direction[0], action.direction[1], action.direction[2]], [-action.up[0], action.up[1], action.up[2]])
      const position = new THREE.Vector3()
      const quaternion = new THREE.Quaternion()
      matrix.decompose(position, quaternion, new THREE.Vector3())
      model.moveRoiTo(position, quaternion)
      this.addClickListener(entity.roi, async () => {
        if (!this.ignoreEntityClick) {
          return await entity.onClick()
        }
        return false
      })
    }

    let actor: Actor | null = null
    switch (objectScript) {
      case 'Doors':
        actor = new (await import('../lib/world/actors/door')).Door(model, this)
        break
      case 'Bike':
        actor = new (await import('../lib/world/actors/bike')).Bike(model, this)
        break
      case 'SkateBoard':
        actor = new (await import('../lib/world/actors/skateboard')).Skateboard(model, this)
        break
      case 'Motocycle':
        actor = new (await import('../lib/world/actors/motocycle')).Motocycle(model, this)
        break
      case 'Ambulance':
        actor = new (await import('../lib/world/actors/ambulance')).Ambulance(model, this)
        break
      case 'TowTrack':
        actor = new (await import('../lib/world/actors/towtrack')).TowTrack(model, this)
        break
      case 'LegoRaceCar':
        actor = new (await import('../lib/world/actors/race-car')).RaceCar(model, this)
        break
      case 'RaceSkel':
        actor = new (await import('../lib/world/actors/race-skel')).RaceSkel(model, this)
        break
      case 'Pizzeria':
        actor = new (await import('../lib/world/actors/pizzeria')).Pizzeria(model, this)
        break
      case 'Pizza':
        actor = new (await import('../lib/world/actors/pizza')).Pizza(model, this)
        break
      case 'Act2Actor':
        actor = new (await import('../lib/world/actors/act2actor')).Act2Actor(model, this)
        break
      case 'Act2GenActor':
        actor = new (await import('../lib/world/actors/act2gen')).Act2Gen(model, this)
        break
      case 'Act2Brick':
        actor = new (await import('../lib/world/actors/act2brick')).Act2Brick(model, this)
        break
    }

    if (actor == null && entity == null) {
      console.warn(`Actor or entity not found: ${objectScript}`)
      return null
    }

    if (actor instanceof PathActor && destination != null) {
      actor.setCurrentDestination(destination)
    }

    if (getExtraValue(action, 'COLLIDE_BOX') != null) {
      if (actor == null) {
        throw new Error('COLLIDE_BOX can only be used with actors')
      }
      actor.colliderType = ColliderType.Box
    }

    const speed = getExtraValue(action, 'Speed')
    if (speed != null) {
      if (actor == null) {
        throw new Error('Speed can only be used with actors')
      }
      actor.speed = Number.parseInt(speed, 10)
    }

    const animation = getExtraValue(action, 'Animation')
    if (animation != null) {
      if (actor == null) {
        throw new Error('Animation can only be used with actors')
      }
      const parts = animation.split(';')
      if (parts.length % 2 !== 0) {
        throw new Error('Animation must have an even number of parts')
      }
      for (let n = 0; n < parts.length; n += 2) {
        const animationName = parts[n]
        const speed = Number.parseInt(parts[n + 1], 10)
        const animationAction = this._cachedAnimations.get(animationName.toLowerCase())
        if (animationAction == null) {
          throw new Error(`Animation not found: ${animationName}`)
        }
        void actor.addAnimationAction(speed, animationAction)
      }
    }

    if (actor != null) {
      await this.registerActor(actor)
    }

    return actor
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    await super.pointerDown(event)
    this._dashboard.pointerDown(event)
  }

  public override pointerUp(event: NormalizedMouseEvent): void {
    super.pointerUp(event)
    this._dashboard.pointerUp()
  }

  protected override get debugTime(): number | null {
    if (this._sun.type === 'modern') {
      return this._modernDayTime
    }
    return null
  }

  public override update(delta: number): void {
    super.update(delta)

    this._updateSun()

    if (this._water != null) {
      this._water.material.uniforms.time.value += delta * 0.1
    }
  }
}
