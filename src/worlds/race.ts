import * as THREE from 'three'
import { type ActionBase, type ActorAction, type EntityAction, getExtraValue, type ImageAction, isAnimationAction, isAudioAction, isBoundaryAction, isControlAction, isImageAction, isMeterAction, type SerialAction, splitExtraValue } from '../lib/action-types'
import { type Animation3D, type Animation3DNode, parse3DAnimation } from '../lib/assets/animation'
import type { Boundary, Edge } from '../lib/assets/boundary'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import { ControlsCollection } from '../lib/assets/control'
import type { DtaWorldName } from '../lib/assets/dta'
import { getAction } from '../lib/assets/load'
import type { WdbWorldName } from '../lib/assets/model'
import { crossesEdge } from '../lib/edge-crossing.ts'
import { type Composer, Render2D } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent, type NormalizedRect, normalizePoint, normalizeRect } from '../lib/engine'
import { RaceProgress } from '../lib/race-progress.ts'
import type { VehicleType } from '../lib/vehicle-types.ts'
import type { Actor } from '../lib/world/actor'
import { RaceActor } from '../lib/world/actors/race-actor.ts'
import { Meter } from '../lib/world/dashboard'
import { PlayerMovement } from '../lib/world/player-movement'
import type { WorldName } from '../lib/world/world'
import { IsleBase } from './isle-base'

class RaceMap {
  private readonly _group: THREE.Group
  private readonly _locators: MapLocator[] = []

  public constructor() {
    this._group = new THREE.Group()
    this._group.visible = false
  }

  public addLocator(action: { extra: string | null }, object: THREE.Object3D) {
    const mapLocator = getExtraValue(action, 'Map_Locator')
    const mapGeometry = getExtraValue(action, 'Map_Geometry')
    if (mapLocator != null && mapGeometry != null) {
      const locator = new MapLocator(mapLocator, mapGeometry, object)
      this._locators.push(locator)
    }
  }

  public createSprites(imageActions: ImageAction[]) {
    console.log(`${imageActions.length} image sprites and ${this._locators.length} locators`)
    for (const locator of this._locators) {
      locator.createSprite(imageActions, this._group)
    }
  }

  public update() {
    for (const locator of this._locators) {
      locator.update()
    }
  }

  public get group(): THREE.Group {
    return this._group
  }
}

class MapLocator {
  private readonly _worldXOffset: number
  private readonly _worldXLength: number
  private readonly _worldZOffset: number
  private readonly _worldZLength: number
  private readonly _mapRect: NormalizedRect
  private readonly _locator: string
  private _sprite: THREE.Sprite | null = null
  private readonly _object: THREE.Object3D

  public constructor(locator: string, geometry: string, object: THREE.Object3D) {
    const [worldXOffset, worldXLength, worldZOffset, worldZLength, mapWidth, mapHeight, mapXOffset, mapYOffset] = splitExtraValue(geometry).map(s => Number.parseFloat(s))
    this._worldXOffset = worldXOffset
    this._worldXLength = worldXLength
    this._worldZOffset = worldZOffset
    this._worldZLength = worldZLength
    this._mapRect = normalizeRect(mapXOffset, mapYOffset, mapWidth, mapHeight)

    this._locator = locator
    this._object = object
  }

  public createSprite(imageActions: ImageAction[], parent: THREE.Group): void {
    if (this._sprite != null) {
      return
    }

    for (const imageAction of imageActions) {
      if (imageAction.name === this._locator) {
        this._sprite = createImageSprite(imageAction)
        parent.add(this._sprite)
        break
      }
    }
  }

  public update(): void {
    const worldPosition = this._object.getWorldPosition(new THREE.Vector3())
    const x = (-worldPosition.x - this._worldXOffset) / this._worldXLength
    const z = -(worldPosition.z - this._worldZOffset) / this._worldZLength
    if (this._sprite != null && x >= 0 && x <= 1 && z >= 0 && z <= 1) {
      this._sprite.position.x = this._mapRect.normalizedX + x * this._mapRect.normalizedWidth
      this._sprite.position.y = this._mapRect.normalizedY - z * this._mapRect.normalizedHeight
    }
  }
}

type StartUpAction = SerialAction<ActionBase>

export type RaceConfig = {
  userActorName: string
  opponents: readonly [{ roiName: string; progressLocator: ImageAction; vehicle: string | null }, { roiName: string; progressLocator: ImageAction; vehicle: string | null }]
  progressRect: readonly [number, number, number, number]
  distance: { offset: number; scale: number }
  maxSpeed: number
  vehicleType: VehicleType
  ignoreDirection: boolean
}

export abstract class Race extends IsleBase {
  protected _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )
  private readonly _controlsRender = new Render2D()
  private readonly _controls = new ControlsCollection(this._controlsRender)
  private _raceMap: RaceMap | null = null
  protected readonly _playerProgress = new RaceProgress(2, 20)
  protected readonly _opponent1Progress = new RaceProgress(2, 20)
  protected readonly _opponent2Progress = new RaceProgress(2, 20)
  private _speedMeter: Meter | null = null
  private _fuelMeter: Meter | null = null
  private _distanceMeter: Meter | null = null
  private _progressStart: THREE.Vector3
  private _progressEnd: THREE.Vector3
  private _opponent1ProgressLocator: THREE.Sprite
  private _opponent2ProgressLocator: THREE.Sprite
  private readonly _startUpAction: StartUpAction
  protected raceState: 'waiting' | 'racing' | 'finished' | 'leaving' = 'waiting'
  public get raceStarted(): boolean {
    return this.raceState === 'racing'
  }
  private readonly _config: RaceConfig
  public playerWaypoint = 0
  private _lastHitSound = Number.NEGATIVE_INFINITY
  private _lastVoice = Number.NEGATIVE_INFINITY
  private readonly _voiceIndices = new Map<string, number>()
  private _playerJump: { curve: THREE.CubicBezierCurve3; progress: number; speed: number } | null = null
  private readonly _ramps: { boundary: Boundary; edge: Edge; landing: Boundary; landingEdge: Edge }[] = []
  private _hideAnimation: Animation3D | null = null

  constructor(name: WorldName, options: { wdbWorldName: WdbWorldName; dtaWorldName: DtaWorldName; startUpAction: StartUpAction; config: RaceConfig }) {
    const boundaryPathAction = options.startUpAction.children.find(child => isBoundaryAction(child))
    if (boundaryPathAction == null) {
      throw new Error('No boundary path action defined')
    }

    super(name, {
      wdbWorldName: options.wdbWorldName,
      dtaWorldName: options.dtaWorldName,
    })

    this._startUpAction = options.startUpAction
    this._config = options.config
    this._opponent1ProgressLocator = createImageSprite(options.config.opponents[0].progressLocator)
    this._opponent2ProgressLocator = createImageSprite(options.config.opponents[1].progressLocator)
    this.boundaryManager.ignoreTriggerDirection = options.config.ignoreDirection

    const progressRect = [...options.config.progressRect]
    progressRect[0] += 0.5
    progressRect[1] += 0.5
    progressRect[2] += 1.5
    progressRect[3] += 1.5

    this._progressStart = new THREE.Vector3(...normalizePoint(progressRect[0], progressRect[1]), 0)
    this._progressEnd = new THREE.Vector3(...normalizePoint(progressRect[2], progressRect[3]), 0)

    this._controls.onButtonClicked = (buttonName, event) => {
      switch (buttonName) {
        case 'Map_Ctl':
          if (this._raceMap != null) {
            this._raceMap.group.visible = event.state > 0
          }
          return true
        case 'Horn_Ctl':
          if (isAudioAction(event.otherAction)) {
            void engine.playAudio(event.otherAction, 'effects')
          }
          return true
        default:
          return false
      }
    }
  }

  protected _applyVisibility(time: number): void {
    if (this._hideAnimation == null) {
      throw new Error('Hide animation not initialized')
    }

    const applyVisibility = (children: Animation3DNode[], parentName: string | null = null) => {
      for (const child of children) {
        const childName = parentName != null ? `${parentName}_${child.name}` : child.name

        const node = this.worldGroup.getObjectByName(childName)
        if (node == null) {
          applyVisibility(child.children, parentName)
          continue
        }

        if (child.morphKeys.some(key => key.timeAndFlags.flags !== 0)) {
          throw new Error(`Morph key flags not supported: ${child.name}`)
        }

        const morphKey = child.morphKeys.toReversed().find(key => key.timeAndFlags.time <= time * 100)
        const visible = morphKey?.visible ?? true
        node.visible = visible

        if (childName === 'isle_hi') {
          this._plantGroup.visible = visible
        }

        applyVisibility(child.children, childName)
      }
    }

    applyVisibility(this._hideAnimation.tree.children)
  }

  abstract onEventStartWaypoint(data: number): void
  abstract onEventEndWaypoint(data: number): void

  protected onPlayerWaypoint(_data: number, _lap: number): void {}

  protected onOpponentFinished(index: number): void {
    const opponent = this._config.opponents[index]
    if (opponent.vehicle != null) {
      this.stopOpponent(opponent.roiName, opponent.vehicle, true)
    }
  }

  protected abstract onPlayerFinished(): Promise<void>

  protected stopOpponent = (name: string, vehicle: string, hide: boolean): void => {
    const roi = this.findRoi(name)
    if (roi?.actor != null) {
      this.removeActor(roi.actor)
    }
    if (hide) {
      if (roi != null) {
        roi.visible = false
      }
      const car = this.findRoi(vehicle)
      if (car != null) {
        car.visible = false
      }
    }
  }

  public override escape(): boolean {
    this.raceState = 'leaving'
    this.skipAllRunningAnimations(true)
    this.resetTemporarySkyColor()
    return true
  }

  public override async init(): Promise<void> {
    await super.init()
    this._playerMovement.boundaryManager = this.boundaryManager
    const ramps: [string, number, string, number][] =
      this._config.vehicleType === 'jetski'
        ? [
            ['edg10_61', 2, 'edg10_62', 0],
            ['edg10_55', 2, 'edg10_58', 0],
          ]
        : [
            ['edg03_21', 2, 'edg03_23', 2],
            ['edg03_30', 2, 'edg03_31', 1],
            ['edg03_39', 2, 'edg03_40', 2],
            ['edg03_91', 2, 'edg03_92', 2],
            ['edg03_99', 2, 'edg03_100', 2],
            ['edg03_112', 2, 'edg03_113', 2],
          ]
    for (const [start, startEdge, end, endEdge] of ramps) {
      const boundary = this.boundaryManager.getBoundary(start)
      const landing = this.boundaryManager.getBoundary(end)
      if (boundary != null && landing != null) {
        this._ramps.push({ boundary, edge: boundary.edges[startEdge], landing, landingEdge: landing.edges[endEdge] })
      }
    }

    this._groundGroup.push(...this.worldGroup.children.filter(child => child.name.startsWith('track')))

    this._raceMap = new RaceMap()
    this._controlsRender.scene.add(this._raceMap.group)

    const imageActions: ImageAction[] = []

    await this.handleStartUpAction(this._startUpAction, async child => {
      if (child.name === this._config.userActorName) {
        this._raceMap?.addLocator(child, this.camera)
        return true
      }

      if (isImageAction(child)) {
        imageActions.push(child)
        return true
      }

      if (isControlAction(child)) {
        await this._controls.addControl(child)
        return true
      }

      if (isMeterAction(child)) {
        const variable = getExtraValue(child, 'variable')?.toLowerCase()
        if (variable == null) {
          throw new Error('Meter without variable is not supported')
        }
        if (variable.endsWith('speed')) {
          this._speedMeter = await Meter.create(child)
          this._controlsRender.scene.add(this._speedMeter.sprite)
        } else if (variable.endsWith('fuel')) {
          this._fuelMeter = await Meter.create(child)
          // For now to at least show something
          this._fuelMeter.draw(0.8)
          this._controlsRender.scene.add(this._fuelMeter.sprite)
        } else if (variable.endsWith('distance')) {
          this._distanceMeter = await Meter.create(child)
          this._controlsRender.scene.add(this._distanceMeter.sprite)
        }

        return true
      }

      return false
    })

    this._raceMap.createSprites(imageActions)

    this.boundaryManager.onTrigger((name, data, direction, roi) => {
      console.log(`Boundary trigger: ${name}, ${data}, ${direction}, ${roi?.name}`)

      if (this.raceState !== 'racing') {
        return
      }
      if (name[2] === 'D') {
        if (roi == null) {
          this.playerWaypoint = data
          if (this._playerProgress.visit(data)) {
            this.onPlayerWaypoint(data, this._playerProgress.lap)
            if (this._playerProgress.finished) {
              this.raceState = 'finished'
              void this.onPlayerFinished()
            }
          }
        } else {
          const index = this._config.opponents.findIndex(opponent => opponent.roiName === roi.name)
          const progress = index === 0 ? this._opponent1Progress : index === 1 ? this._opponent2Progress : null
          if (roi.actor != null && 'lastWaypoint' in roi.actor) {
            roi.actor.lastWaypoint = data
          }
          if (progress?.visit(data) && progress.finished) {
            this.onOpponentFinished(index)
          }
        }
      }

      if (roi != null) {
        return
      }

      if (name[2] === 'H') {
        this._applyVisibility(data)
      } else if (name[2] === 'S') {
        this.onEventStartWaypoint(data)
      } else if (name[2] === 'E') {
        this.onEventEndWaypoint(data)
      }
    })

    Race.setTopLeft(this._opponent1ProgressLocator, this._progressStart)
    this._controlsRender.scene.add(this._opponent1ProgressLocator)
    Race.setTopLeft(this._opponent2ProgressLocator, this._progressStart)
    this._controlsRender.scene.add(this._opponent2ProgressLocator)

    const hideAnimationAction = this._startUpAction.children.find(child => child.presenter === 'LegoHideAnimPresenter')
    if (hideAnimationAction == null || !isAnimationAction(hideAnimationAction)) {
      throw new Error('No hide animation defined')
    }

    this._hideAnimation = parse3DAnimation(await getAction(hideAnimationAction))
  }

  public override async handleActorAction(action: ActorAction | EntityAction): Promise<Actor | null> {
    const actor = await super.handleActorAction(action)
    if (actor != null && this._raceMap != null) {
      this._raceMap.addLocator(action, actor.roi.model)
    }
    return actor
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer)

    this._applyVisibility(0)

    this._controlsRender.letterbox = true
    composer.add(this._controlsRender)
  }

  private static setTopLeft(sprite: THREE.Sprite, pos: THREE.Vector3): void {
    sprite.position.x = pos.x + sprite.scale.x / 2
    sprite.position.y = pos.y - sprite.scale.y / 2
  }

  protected override get playerMovement(): PlayerMovement {
    return this._playerMovement
  }

  protected override get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return this._playerMovement.getDebugInfo()
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'KeyF' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    await super.pointerDown(event)
    this._dashboard.pointerDown(event)
    this._controls.pointerDown(event.normalizedX, event.normalizedY)
  }

  public override pointerUp(event: NormalizedMouseEvent): void {
    super.pointerUp(event)
    this._dashboard.pointerUp()
    this._controls.pointerUp()
  }

  private collisionVoice = (name: string, hitter: boolean): void => {
    if (engine.elapsedTimeMilliseconds - this._lastVoice < 3000) {
      return
    }
    const lists: Record<string, string[]> =
      this._config.vehicleType === 'jetski'
        ? { snap: ['svo001sn', 'svo002sn', 'svo004sn', 'svo005sn'], valerie: ['svo001va', 'svo003va', 'svo004va'] }
        : { studs: hitter ? Array.from({ length: 12 }, (_, n) => `srt${String(n + 18).padStart(3, '0')}sl`) : ['srt006sl', 'srt007sl', 'srt008sl', 'srt009sl', 'srt010sl'], rhoda: hitter ? [] : ['srt004rh', 'srt005rh', 'srt006rh'] }
    const list = lists[name]
    if (list == null || list.length === 0) {
      return
    }
    const index = this._voiceIndices.get(name) ?? Math.floor(Math.random() * list.length)
    const key = list[index]
    this._voiceIndices.set(name, (index + 1) % list.length)
    if (this.soundCache.has(key)) {
      this._lastVoice = this._lastHitSound = engine.elapsedTimeMilliseconds
      void this.soundCache.play(key, null)
    }
  }

  protected override onActorMoved(actor: Actor, from: THREE.Vector3, to: THREE.Vector3): void {
    if (!(actor instanceof RaceActor) || from.distanceToSquared(to) < 1e-8) {
      return
    }
    const nearest = new THREE.Line3(from, to).closestPointToPoint(this.camera.position, true, new THREE.Vector3())
    if (nearest.distanceTo(this.camera.position) < 1.5) {
      this.collisionVoice(actor.roi.name, false)
    }
  }

  public override update(delta: number): void {
    super.update(delta)

    if (this.isRunningCameraAnimation || this.raceState !== 'racing') {
      return
    }

    const fromPos = this.camera.position.clone()
    let normalizedSpeed: number
    let toPos: THREE.Vector3
    if (this._playerJump != null) {
      const jump = this._playerJump
      jump.progress = Math.min(1, jump.progress + (delta * jump.speed) / Math.max(0.001, jump.curve.getLength()))
      this.camera.position.copy(jump.curve.getPointAt(jump.progress))
      this.camera.lookAt(this.camera.position.clone().add(jump.curve.getTangentAt(jump.progress)))
      toPos = this.camera.position.clone()
      normalizedSpeed = jump.speed / this._config.maxSpeed
      if (jump.progress === 1) {
        this._playerMovement.linearVelocity = jump.speed
        this._playerJump = null
      }
    } else {
      const movement = this._playerMovement.update(delta, this._config.vehicleType, this._config.maxSpeed)
      normalizedSpeed = movement.normalizedSpeed
      toPos = movement.toPos
      for (const ramp of this._ramps) {
        if (crossesEdge([fromPos.x, fromPos.z], [toPos.x, toPos.z], [ramp.edge.pointA.x, ramp.edge.pointA.z], [ramp.edge.pointB.x, ramp.edge.pointB.z])) {
          const target = ramp.landingEdge.getCCWVertex(ramp.landing).clone().lerp(ramp.landingEdge.getCWVertex(ramp.landing), 0.5)
          target.y += 1.25
          const tangentLength = this._config.vehicleType === 'jetski' ? 1 : 5
          const startDirection = this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(tangentLength / 3)
          const up = ramp.landing.normal
          const endDirection = ramp.landingEdge
            .getFaceNormal(ramp.landing)
            .cross(up)
            .normalize()
            .multiplyScalar(tangentLength / 3)
          this._playerJump = { curve: new THREE.CubicBezierCurve3(toPos.clone(), toPos.clone().add(startDirection), target.clone().sub(endDirection), target), progress: 0, speed: Math.max(8, Math.abs(this._playerMovement.linearVelocity)) }
          break
        }
      }
    }

    for (const actor of this.actors) {
      if (actor instanceof RaceActor && !actor.stunned && actor.checkCollision(fromPos, toPos)) {
        actor.onCollision(null)
        this.collisionVoice(actor.roi.name, true)
        this.camera.position.copy(fromPos)
        toPos = fromPos.clone()
        this._playerMovement.linearVelocity *= 0.8
        if (engine.elapsedTimeMilliseconds - this._lastHitSound > 1000 && this.soundCache.has('hitactor')) {
          this._lastHitSound = engine.elapsedTimeMilliseconds
          void this.soundCache.play('hitactor', null)
        }
        break
      }
    }
    void this.updateActors(delta, fromPos, toPos)

    this._speedMeter?.draw(normalizedSpeed)
    const meterProgress = this._playerProgress.progress === 0 ? 0.036 : this._playerProgress.progress * this._config.distance.scale + this._config.distance.offset
    this._distanceMeter?.draw(meterProgress)

    const lerped = new THREE.Vector3()
    lerped.lerpVectors(this._progressStart, this._progressEnd, this._opponent1Progress.progress)
    Race.setTopLeft(this._opponent1ProgressLocator, lerped)
    lerped.lerpVectors(this._progressStart, this._progressEnd, this._opponent2Progress.progress)
    Race.setTopLeft(this._opponent2ProgressLocator, lerped)

    this._raceMap?.update()
    this.boundaryManager.update(fromPos, toPos, null)
  }
}
