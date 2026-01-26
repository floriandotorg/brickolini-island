import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import type { Water } from 'three/addons/objects/Water.js'
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js'
import { Chptr_Model } from '../actions/copter'
import { DuneBugy_Model } from '../actions/dunecar'
import { Jsuser_Model } from '../actions/jetski'
import { Rcuser_Model } from '../actions/racecar'
import { type ActionBase, type ActorAction, type BoundaryAction, type EntityAction, getExtraValue, isActorAction, isBoundaryAction, isEntityAction, type ModelAction, type SerialAction } from '../lib/action-types'
import { getBoundaries } from '../lib/assets/boundary'
import { type DTA, type DtaWorldName, loadAnimationInfoFromDTA } from '../lib/assets/dta'
import { manager } from '../lib/assets/load'
import { calculateTransformationMatrix, getModel, getWorld, Roi3D, type WdbWorldName } from '../lib/assets/model'
import { getSpawnLocation, type SpawnLocation } from '../lib/assets/spawn-location'
import type { Composer } from '../lib/effect/composer'
import { engine, getURLParam, type NormalizedMouseEvent } from '../lib/engine'
import { applyLights, NUM_ORIGINAL_LIGHTS } from '../lib/original-lights'
import { getSettings } from '../lib/settings'
import { type Actor, ColliderType } from '../lib/world/actor'
import type { Vehicle } from '../lib/world/actors/vehicle'
import { BoundaryManager } from '../lib/world/boundary-manager'
import type { Character } from '../lib/world/character'
import { Dashboard, type VehicleType } from '../lib/world/dashboard'
import type { Entity } from '../lib/world/entity'
import { Plants } from '../lib/world/plants'
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
export const CAR_BUILD_VEHICLES: { readonly type: CarBuildVehicleType; readonly model: ModelAction; readonly spawn: SpawnLocation }[] = [
  { type: 'dunecar', model: DuneBugy_Model, spawn: 'dunebuggySpawn' },
  { type: 'helicopter', model: Chptr_Model, spawn: 'helicopterSpawn' },
  { type: 'jetski', model: Jsuser_Model, spawn: 'jetskiSpawn' },
  { type: 'racecar', model: Rcuser_Model, spawn: 'racecarSpawn' },
]

export abstract class IsleBase extends World {
  protected _groundGroup: THREE.Object3D[] = []
  protected _plantGroup: THREE.Group = new THREE.Group()
  private _boundaryManager: BoundaryManager | null = null
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
  private _buildMeshes = new Map<VehicleType, THREE.Object3D[]>()
  private _animationInfos: DTA.AnimationInfo[] = []
  private readonly _wdbWorldName: WdbWorldName | null
  private readonly _dtaWorldName: DtaWorldName | null
  private _currentVehicle: Vehicle | null = null

  public get currentVehicle(): Vehicle | null {
    return this._currentVehicle
  }

  public set currentVehicle(vehicle: Vehicle | null) {
    this._currentVehicle = vehicle
  }

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

  public get boundaryManager(): BoundaryManager {
    if (this._boundaryManager == null) {
      throw new Error('Boundary manager not initialized')
    }
    return this._boundaryManager
  }

  constructor(
    name: WorldName,
    {
      wdbWorldName,
      dtaWorldName,
    }: {
      wdbWorldName?: WdbWorldName
      dtaWorldName?: DtaWorldName
    } = {},
  ) {
    super(name)
    this._wdbWorldName = wdbWorldName ?? null
    this._dtaWorldName = dtaWorldName ?? null
  }

  protected async loadBoundaries(action: BoundaryAction): Promise<void> {
    if (this._boundaryManager != null) {
      throw new Error('Boundaries already loaded')
    }

    this._boundaryManager = new BoundaryManager(await getBoundaries(action), this)
  }

  protected async handleStartUpAction(action: SerialAction<ActionBase>, cb: ((child: ActionBase) => Promise<boolean>) | null = null): Promise<void> {
    for (const child of action.children) {
      if (cb != null && (await cb(child))) {
        continue
      }

      if (isBoundaryAction(child)) {
        await this.loadBoundaries(child)
      } else if (isActorAction(child)) {
        await this.handleActorAction(child)
      } else if (isEntityAction(child)) {
        await this.handleEntityAction(child)
      } else if (child.presenter === 'LegoLocomotionAnimPresenter') {
        // Run animations, can be ignored
      } else if (child.presenter === 'LegoLoadCacheSoundPresenter') {
        // We don't need to cache
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

    this._bikeRoi = this.findRoi('bike')
    this._motobkRoi = this.findRoi('motobk')
    this._skateRoi = this.findRoi('skate')
    this._ambulanceRoi = this.findRoi('ambul')
    this._towtruckRoi = this.findRoi('towtk')

    if (this._bikeRoi != null) {
      this.placeVehicle('bike', 'INT44', 2, 0.5, 0, 0.5)
    }
    if (this._motobkRoi != null) {
      this.placeVehicle('moto', 'INT43', 4, 0.5, 1, 0.5)
    }
    if (this._skateRoi != null) {
      this.placeVehicle('skate', 'EDG02_84', 4, 0.5, 0, 0.5)
    }

    for (const { type, model, spawn } of CAR_BUILD_VEHICLES) {
      const previousMeshes = this._buildMeshes.get(type)
      if (previousMeshes != null) {
        this.removeFromParents(previousMeshes)
      }
      const placement = (() => {
        if (engine.resetVehicleRespawn(type)) {
          const spawnPosition = getSpawnLocation(spawn).position
          return this.boundaryManager.getObjectPlacement(spawnPosition.boundaryName, spawnPosition.source, spawnPosition.sourceScale, spawnPosition.destination, spawnPosition.destinationScale)
        }
        return engine.currentSaveGame.getVehiclePlacement(type)
      })()
      if (placement != null) {
        const rootRoi = await getModel(model)
        const allRois = rootRoi.getAllModels()
        for (const roi of allRois) {
          this.scene.add(roi)
        }
        this._buildMeshes.set(type, allRois)
        rootRoi.moveRoiTo(placement.position, placement.quaternion)
        engine.currentSaveGame.setVehiclePlacement(type, placement)
      }
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

  public async handleEntityAction(action: EntityAction): Promise<void> {
    const modelName = getExtraValue(action.children[0], 'DB_CREATE')
    if (modelName == null) {
      console.warn('Entity action without db_create is not supported', action)
      return
    }
    const roi = this.findRoi(modelName)
    if (roi == null) {
      console.warn(`Model not found: ${modelName}`)
      return
    }
    const visibility = getExtraValue(action, 'Visibility')
    if (visibility != null) {
      throw new Error('Visibility is not supported for entities (yet)')
    }
    const objectScript = getExtraValue(action, 'Object')
    if (objectScript != null) {
      let entity: Entity | null = null
      switch (objectScript) {
        case 'GasStationEntity':
          entity = new (await import('../lib/world/entities/gas-station')).GasStation(roi)
          break
        case 'InfoCenterEntity':
          entity = new (await import('../lib/world/entities/info-center')).InfoCenter(roi)
          break
        case 'PoliceEntity':
          entity = new (await import('../lib/world/entities/police')).Police(roi)
          break
        case 'HospitalEntity':
          entity = new (await import('../lib/world/entities/hospital')).Hospital(roi)
          break
        default:
          console.warn(`Object script for entity not supported: ${objectScript}`)
          return
      }
      if (entity != null) {
        this.addClickListener(entity.roi, async () => await entity.onClick())
      }
    }
  }

  public async handleActorAction(action: ActorAction): Promise<void> {
    let model: Roi3D | Character | null = null
    const modelName = getExtraValue(action.children[0], 'DB_CREATE')
    if (modelName != null) {
      const roi = this.findRoi(modelName)
      if (roi == null) {
        console.warn(`Model not found: ${modelName}`)
        return
      }
      model = roi
    }
    const characterName = getExtraValue(action.children[0], 'AUTO_CREATE')
    if (characterName != null) {
      model = await this.getActor(characterName.toLowerCase())
    }
    if (model == null) {
      console.warn('Actor action without model or character is not supported', action)
      return
    }
    const visibility = getExtraValue(action, 'Visibility')
    if (visibility != null) {
      if (visibility !== 'FALSE') {
        throw new Error('Visibility should only be FALSE')
      }
      model.visible = false
    }
    const path = getExtraValue(action, 'Path')
    if (path != null) {
      const pathMatch = path.match(/^([^;]+);([^;]+);([^;]+);([^;]+);([^;]+)$/)
      if (!pathMatch) {
        console.warn(`Path string does not match expected format: ${path}`)
        return
      }
      const pathId = pathMatch[1]
      const src = Number.parseFloat(pathMatch[2])
      const srcScale = Number.parseFloat(pathMatch[3])
      const dst = Number.parseFloat(pathMatch[4])
      const dstScale = Number.parseFloat(pathMatch[5])
      const { position, quaternion } = this.boundaryManager.getObjectPlacement(pathId, src, srcScale, dst, dstScale)
      if (model instanceof Roi3D) {
        model.moveRoiTo(position, quaternion)
      } else {
        model.position.copy(position)
        model.quaternion.copy(quaternion)
      }
    }
    const objectScript = getExtraValue(action, 'Object')
    if (objectScript != null) {
      if (!(model instanceof Roi3D)) {
        console.warn('Cannot attach object script to character', action)
        return
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
        default:
          console.warn(`Object script for actor not supported: ${objectScript}`)
          return
      }
      if (actor != null) {
        if (getExtraValue(action, 'COLLIDE_BOX') != null) {
          actor.colliderType = ColliderType.Box
        }

        this.registerActor(actor)
        this.addClickListener(actor.roi, async () => await actor.onClick())
      }
    }
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    await super.pointerDown(event)
    this._dashboard.pointerDown(event.normalizedX, event.normalizedY)
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
