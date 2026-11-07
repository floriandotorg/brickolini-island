import type * as THREE from 'three'
import * as GarageActions from '../actions/garage'
import { JBMusic2 } from '../actions/jukebox'
import { act1State } from '../lib/act1-state'
import { isRunAnimationAction, type RunAnimationAction } from '../lib/action-types'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import type { Composer } from '../lib/effect/composer'
import { engine, type Interval, type NormalizedMouseEvent } from '../lib/engine'
import { switchWorld } from '../lib/switch-world'
import { gasStationVisit } from '../lib/tow-rules.ts'
import { Building } from '../lib/world/building'
import { World, type WorldSpawn } from '../lib/world/world'

export class Garage extends World {
  private readonly _building = new Building()
  private _led: { sprite: THREE.Sprite; interval: Interval } | null = null
  private _phase: 'intro' | 'explanation' | 'waiting' | 'accepting' | 'declined' | 'leaving' = 'leaving'
  private _generation = 0
  private _flashing = false
  private _queuedAccept = false
  private _readyTime = 0
  private _waitTime = 0
  private _current: RunAnimationAction | null = null

  constructor() {
    super('garage')
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({ world: this, startUpAction: GarageActions._StartUp, backgroundMusic: JBMusic2 })
    this._led = { sprite: createImageSprite(GarageActions.TrackLed_Bitmap), interval: engine.createInterval(300) }
    this._led.sprite.visible = false
    this._building.scene.add(this._led.sprite)
    this._building.onButtonClicked = (name, event) => {
      if (event.state !== 1) {
        return false
      }
      switch (name) {
        case 'LeftArrow_Ctl':
        case 'RightArrow_Ctl':
          this.leave({ world: 'garadoor' })
          return true
        case 'Buggy_Ctl':
          this.leave({ world: 'dunecar' })
          return true
        case 'Info_Ctl':
          this.leave({ ending: null })
          return true
      }
      return false
    }
    for (const roi of this.worldGroup.children) {
      if (roi.name.toLowerCase().replace(/^\*/, '').startsWith('capdb')) {
        this.addClickListener(this.getRoi(roi.name), async () => {
          this.accept()
          return true
        })
      }
    }
  }

  private leave = (destination: WorldSpawn): void => {
    if (this._phase === 'leaving') {
      return
    }
    this.escape()
    void switchWorld(destination)
  }

  public override escape(): boolean {
    ++this._generation
    this._phase = 'leaving'
    this.stopAnimationsInRange('garage', 500, 516)
    return true
  }

  private play = async (action: RunAnimationAction): Promise<void> => {
    this._current = action
    await this.playAnimation(action)
    if (this._current === action) {
      this._current = null
    }
  }

  public override activate(composer: Composer): void {
    super.activate(composer)
    this._building.activate(composer)
    const generation = ++this._generation
    this._flashing = false
    this._queuedAccept = false
    this._readyTime = engine.elapsedTimeMilliseconds
    if (this._led != null) {
      this._led.sprite.visible = false
      this._led.interval = engine.createInterval(300)
    }
    const save = engine.currentSaveGame
    const player = save.playerUnsafe
    if (player == null) {
      this._phase = 'declined'
      return
    }
    const count = save.getGasStationVisitCount(player)
    const visit = gasStationVisit(player, count)
    save.setGasStationVisitCount(player, Math.min(count + 1, 5))
    const action = Object.values(GarageActions).find(action => action.name === `${visit.name}_RunAnim`)
    if (!isRunAnimationAction(action)) {
      throw new Error('Gas station visit animation missing')
    }
    this._phase = visit.introduction ? 'intro' : 'explanation'
    void (async () => {
      await this.play(action)
      if (generation !== this._generation) {
        return
      }
      this._flashing = true
      if (visit.introduction) {
        this._phase = 'explanation'
        await this.play(GarageActions.wgs023nu_RunAnim)
        if (generation !== this._generation) {
          return
        }
      }
      if (this._queuedAccept) {
        await this.finishAcceptance(generation)
      } else {
        this._phase = 'waiting'
        this._waitTime = engine.elapsedTimeMilliseconds
      }
    })()
  }

  private accept = (): void => {
    if (this._queuedAccept || (this._phase !== 'explanation' && this._phase !== 'waiting')) {
      return
    }
    this._queuedAccept = true
    if (this._phase === 'waiting') {
      void this.finishAcceptance(this._generation)
    } else if (this._current?.id === GarageActions.wgs023nu_RunAnim.id) {
      this.stopAnimationsInRange('garage', this._current.id)
    }
  }

  private finishAcceptance = async (generation: number): Promise<void> => {
    this._phase = 'accepting'
    await this.play(GarageActions.wgs029nu_RunAnim)
    if (generation === this._generation) {
      act1State.value = 'transitionToTowtrack'
      this.leave({ spawn: 'garageExited' })
    }
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._phase === 'leaving' || this._phase === 'accepting') {
      return
    }
    if (!this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      await super.pointerDown(event)
    }
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }

  public override keyPressed(key: string): void {
    if (key === 'Space') {
      if (engine.elapsedTimeMilliseconds - this._readyTime >= 300 && this._current != null) {
        this.stopAnimationsInRange('garage', this._current.id)
      }
      return
    }
    super.keyPressed(key)
  }

  protected override update(delta: number): void {
    super.update(delta)
    if (this._flashing && this._led?.interval.resetExpired()) {
      this._led.sprite.visible = !this._led.sprite.visible
    }
    if (this._phase === 'waiting' && engine.elapsedTimeMilliseconds - this._waitTime > 15_000) {
      this._phase = 'declined'
      void this.play(GarageActions.wgs031nu_RunAnim)
    }
  }

  public override deactivate(): void {
    this.escape()
    super.deactivate()
  }
}
