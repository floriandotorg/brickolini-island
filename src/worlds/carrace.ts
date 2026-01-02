import * as THREE from 'three'
import { irtx08ra_PlayWav, Map_Ctl, RacePath, Rhoda_Locator, Studs_Locator, srt001rh_RunAnim, srt001sl_RunAnim, srt002rh_RunAnim, srt002sl_RunAnim, srt003rh_RunAnim, srt003sl_RunAnim, srt004sl_RunAnim, srt005sl_RunAnim, User_Locator, UserCar_Actor } from '../actions/carrace'
import { RaceTrackRoad_Music } from '../actions/jukebox'
import { getExtraValue, type ImageAction, splitExtraValue } from '../lib/action-types'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import { ControlsCollection } from '../lib/assets/control'
import { type Composer, Render2D } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent, type NormalizedRect, normalizeRect } from '../lib/engine'
import { PlayerMovement } from '../lib/world/player-movement'
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

export class CarRace extends IsleBase {
  private _playerLastWaypointNo = 0
  private _playerLapsLeft = 2

  private _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )
  private readonly _controlsRender = new Render2D()
  private readonly _controls = new ControlsCollection(this._controlsRender)
  private _raceMap: RaceMap | null = null

  constructor() {
    super('carrace', { wdbWorldName: 'RACC', dtaWorldName: 'RACC', boundaryPathAction: RacePath })

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

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer)

    this.boundaryManager.onTrigger = (name, data, direction) => {
      console.log(`Boundary trigger: ${name}, ${data}, ${direction}`)

      if (name[2] === 'D') {
        if (data <= this._playerLastWaypointNo || data >= this._playerLastWaypointNo + 5) {
          console.warn(`Got waypoint out of valid range: ${data} (last: ${this._playerLastWaypointNo})`)
          return
        }

        this._playerLastWaypointNo = data
        if (this._playerLastWaypointNo >= 20) {
          this._playerLastWaypointNo = 0

          if (--this._playerLapsLeft <= 0) {
            console.log('Player finished race')
          }
        }
      }
    }

    await this._dashboard.show({ type: 'racecar' })

    void engine.switchBackgroundMusic(RaceTrackRoad_Music)
    void this.playAnimation(introAnimations[Math.floor(Math.random() * introAnimations.length)]).then(() => {
      void engine.playAudio(irtx08ra_PlayWav, 'speech')
    })

    this._controls.addControl(Map_Ctl)

    const locatorImages = new Map<string, ImageAction>([
      [Rhoda_Locator.name, Rhoda_Locator],
      [Studs_Locator.name, Studs_Locator],
      [User_Locator.name, User_Locator],
    ])
    this._raceMap = new RaceMap(locatorImages)
    this._controlsRender.scene.add(this._raceMap.group)
    composer.add(this._controlsRender)

    const actor = UserCar_Actor
    this._raceMap.addLocator(actor, this.camera)
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

    this._dashboard.update(normalizedSpeed)

    this._raceMap?.update()
    this.boundaryManager.update(fromPos, toPos)
  }
}
