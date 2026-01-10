import * as THREE from 'three'
import { CarLocator2, CarLocator3, irtx08ra_PlayWav, Map_Ctl, Rhoda_Locator, Studs_Locator, srt001rh_RunAnim, srt001sl_RunAnim, srt002rh_RunAnim, srt002sl_RunAnim, srt003rh_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim, User_Locator, UserCar_Actor } from '../actions/carrace'
import { RaceTrackRoad_Music } from '../actions/jukebox'
import { type ActionBase, getExtraValue, type ImageAction, isAnimationAction, isBoundaryAction, isControlAction, isMeterAction, type SerialAction, splitExtraValue } from '../lib/action-types'
import { parse3DAnimation } from '../lib/assets/animation'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import { ControlsCollection } from '../lib/assets/control'
import type { DtaWorldName } from '../lib/assets/dta'
import { getAction } from '../lib/assets/load'
import type { WdbWorldName } from '../lib/assets/model'
import { type Composer, Render2D } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent, type NormalizedRect, normalizePoint, normalizeRect } from '../lib/engine'
import { Meter } from '../lib/world/dashboard'
import { PlayerMovement } from '../lib/world/player-movement'
import type { WorldName } from '../lib/world/world'
import { CarRace } from './carrace'
import { IsleBase } from './isle-base'

const introAnimations = [srt001sl_RunAnim, srt002sl_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim, srt001rh_RunAnim, srt002rh_RunAnim, srt003rh_RunAnim]

class RaceMap {
  private readonly _group: THREE.Group
  private readonly _locatorMap: Map<string, ImageAction>
  private readonly _locators: MapLocator[] = []

  public constructor(locatorMap: Map<string, ImageAction>) {
    this._locatorMap = locatorMap
    this._group = new THREE.Group()
    this._group.visible = false
  }

  public addLocator(action: { extra: string }, object: THREE.Object3D) {
    const locator = new MapLocator(action, this._locatorMap, object)
    this._group.add(locator.sprite)
    this._locators.push(locator)
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
  private readonly _sprite: THREE.Sprite
  private readonly _object: THREE.Object3D

  public constructor(action: { extra: string }, locatorMap: Map<string, ImageAction>, object: THREE.Object3D) {
    const locatorName = getExtraValue(action, 'Map_Locator')
    if (locatorName == null) {
      throw new Error('No map locator defined')
    }
    const locatorImage = locatorMap.get(locatorName)
    if (locatorImage == null) {
      throw new Error('No map locator defined')
    }
    const geometry = getExtraValue(action, 'Map_Geometry')
    if (geometry == null) {
      throw new Error('No map geometry defined')
    }
    const [worldXOffset, worldXLength, worldZOffset, worldZLength, mapWidth, mapHeight, mapXOffset, mapYOffset] = splitExtraValue(geometry).map(s => parseInt(s, 10))
    this._worldXOffset = worldXOffset
    this._worldXLength = worldXLength
    this._worldZOffset = worldZOffset
    this._worldZLength = worldZLength
    this._mapRect = normalizeRect(mapXOffset, mapYOffset, mapWidth, mapHeight)

    this._sprite = createImageSprite(locatorImage, -0.25)
    this._object = object
  }

  public get sprite(): THREE.Sprite {
    return this._sprite
  }

  public update(): void {
    const worldPosition = this._object.getWorldPosition(new THREE.Vector3())
    const x = (-worldPosition.x - this._worldXOffset) / this._worldXLength
    const z = -(worldPosition.z - this._worldZOffset) / this._worldZLength
    if (x >= 0 && x <= 1 && z >= 0 && z <= 1) {
      this._sprite.position.x = this._mapRect.normalizedX + x * this._mapRect.normalizedWidth
      this._sprite.position.y = this._mapRect.normalizedY - z * this._mapRect.normalizedHeight
    }
  }
}

const numberOfLaps = 2
const numberOfWaypoints = 20

class RaceProgress {
  private _lastWaypointNo = 0
  private _lap = 0

  public get lastWaypointNo(): number {
    return this._lastWaypointNo
  }

  public set lastWaypointNo(waypointNo: number) {
    if (waypointNo <= 0 || waypointNo >= this._lastWaypointNo + 5) {
      console.warn(`Got waypoint out of valid range: ${waypointNo} (last: ${this._lastWaypointNo})`)
      return
    }
    if (waypointNo >= numberOfWaypoints) {
      this._lastWaypointNo = 0
      this._lap++
      return
    }
    this._lastWaypointNo = waypointNo
  }

  public get lap(): number {
    return this._lap
  }

  public get remainingLaps(): number {
    return numberOfLaps - this._lap
  }

  public get progress(): number {
    const waypoint = this._lastWaypointNo + this._lap * numberOfWaypoints
    const totalWaypoints = numberOfLaps * numberOfWaypoints
    return waypoint / totalWaypoints
  }
}

type StartUpAction = SerialAction<ActionBase>

export abstract class Race extends IsleBase {
  private _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )
  private readonly _controlsRender = new Render2D()
  private readonly _controls = new ControlsCollection(this._controlsRender)
  private _raceMap: RaceMap | null = null
  private readonly _playerProgress = new RaceProgress()
  private readonly _opponent1Progress = new RaceProgress()
  private readonly _opponent2Progress = new RaceProgress()
  private _speedMeter: Meter | null = null
  private _fuelMeter: Meter | null = null
  private _distanceMeter: Meter | null = null
  private _progressStart: THREE.Vector3
  private _progressEnd: THREE.Vector3
  private _opponent1ProgressLocator = createImageSprite(CarLocator2, -0.25)
  private _opponent2ProgressLocator = createImageSprite(CarLocator3, -0.25)
  private readonly _startUpAction: StartUpAction

  constructor(name: WorldName, options: { wdbWorldName: WdbWorldName; dtaWorldName: DtaWorldName; startUpAction: StartUpAction }) {
    const boundaryPathAction = options.startUpAction.children.find(child => isBoundaryAction(child))
    if (boundaryPathAction == null) {
      throw new Error('No boundary path action defined')
    }

    super(name, {
      wdbWorldName: options.wdbWorldName,
      dtaWorldName: options.dtaWorldName,
      boundaryPathAction: boundaryPathAction,
    })

    this._startUpAction = options.startUpAction

    // Rect as defined in carrace code
    const progressRect = [364, 340, 492, 350]
    // also the left-top-corner is offset +0.5 to the bottom right and each edge is +1 "longer"
    progressRect[0] += 0.5
    progressRect[1] += 0.5
    progressRect[2] += 1.5
    progressRect[3] += 1.5

    this._progressStart = new THREE.Vector3(...normalizePoint(progressRect[0], progressRect[1]), 0)
    this._progressEnd = new THREE.Vector3(...normalizePoint(progressRect[2], progressRect[3]), 0)

    this._controls.onButtonClicked = (buttonName, event) => {
      switch (buttonName) {
        case Map_Ctl.name:
          if (this._raceMap != null) {
            this._raceMap.group.visible = event.state > 0
          }
          return true
        default:
          return false
      }
    }
  }

  public override async init(): Promise<void> {
    await super.init()

    this.boundaryManager.onTrigger = (name, data, direction) => {
      console.log(`Boundary trigger: ${name}, ${data}, ${direction}`)

      if (name[2] === 'D') {
        this._playerProgress.lastWaypointNo = data
        if (this._playerProgress.remainingLaps <= 0) {
          console.log('Player finished race')
        }
      }
    }

    this._controls.addControl(Map_Ctl)

    for (const child of this._startUpAction.children) {
      if (isControlAction(child)) {
        this._controls.addControl(child)
      } else if (isMeterAction(child)) {
        const variable = getExtraValue(child, 'variable')?.toLowerCase()
        if (variable == null) {
          throw new Error('Meter without variable is not supported')
        } else if (variable.endsWith('speed')) {
          this._speedMeter = await Meter.create(child)
          this._controlsRender.scene.add(this._speedMeter.sprite)
        } else if (variable.endsWith('fuel')) {
          this._fuelMeter = await Meter.create(child)
          // For now to at least show something
          this._fuelMeter.draw(0.5)
          this._controlsRender.scene.add(this._fuelMeter.sprite)
        } else if (variable.endsWith('distance')) {
          this._distanceMeter = await Meter.create(child)
          this._controlsRender.scene.add(this._distanceMeter.sprite)
        }
      }
    }
    Race.setTopLeft(this._opponent1ProgressLocator, this._progressStart)
    this._controlsRender.scene.add(this._opponent1ProgressLocator)
    Race.setTopLeft(this._opponent2ProgressLocator, this._progressStart)
    this._controlsRender.scene.add(this._opponent2ProgressLocator)

    const locatorImages = new Map<string, ImageAction>([
      [Rhoda_Locator.name, Rhoda_Locator],
      [Studs_Locator.name, Studs_Locator],
      [User_Locator.name, User_Locator],
    ])
    this._raceMap = new RaceMap(locatorImages)
    this._controlsRender.scene.add(this._raceMap.group)

    const actor = UserCar_Actor
    this._raceMap.addLocator(actor, this.camera)

    const hideAnimation = this._startUpAction.children.find(child => isAnimationAction(child))
    if (hideAnimation == null) {
      throw new Error('No hide animation defined')
    }
    console.log(parse3DAnimation(await getAction(hideAnimation)))
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer)

    void engine.switchBackgroundMusic(RaceTrackRoad_Music)
    void this.playAnimation(introAnimations[Math.floor(Math.random() * introAnimations.length)]).then(() => {
      void engine.playAudio(irtx08ra_PlayWav, 'speech')
    })

    composer.add(this._controlsRender)
  }

  private static setTopLeft(sprite: THREE.Sprite, pos: THREE.Vector3): void {
    sprite.position.x = pos.x + sprite.scale.x / 2
    sprite.position.y = pos.y - sprite.scale.y / 2
  }

  protected override get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return this._playerMovement.getDebugInfo()
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    await super.pointerDown(event)
    this._dashboard.pointerDown(event.normalizedX, event.normalizedY)
    this._controls.pointerDown(event.normalizedX, event.normalizedY)
  }

  public override pointerUp(event: NormalizedMouseEvent): void {
    super.pointerUp(event)
    this._dashboard.pointerUp()
    this._controls.pointerUp()
  }

  public override update(delta: number): void {
    super.update(delta)

    if (this.isRunningCameraAnimation) {
      return
    }

    const { normalizedSpeed, fromPos, toPos } = this._playerMovement.update(delta, 'racecar')

    this._speedMeter?.draw(normalizedSpeed)
    const meterProgress = this._playerProgress.progress * 0.928 + 0.036
    this._distanceMeter?.draw(meterProgress)

    const lerped = new THREE.Vector3()
    lerped.lerpVectors(this._progressStart, this._progressEnd, this._opponent1Progress.progress)
    CarRace.setTopLeft(this._opponent1ProgressLocator, lerped)
    lerped.lerpVectors(this._progressStart, this._progressEnd, this._opponent2Progress.progress)
    CarRace.setTopLeft(this._opponent2ProgressLocator, lerped)

    this._raceMap?.update()
    this.boundaryManager.update(fromPos, toPos)
  }
}
