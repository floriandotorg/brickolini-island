import * as THREE from 'three'
import {
  _StartUp,
  CopLed_Bitmap,
  hho002cl_RunAnim,
  hho003cl_RunAnim,
  hho004jk_RunAnim,
  hho006cl_RunAnim,
  hho007p1_RunAnim,
  hho016cl_RunAnim,
  hho017cl_RunAnim,
  hho018cl_RunAnim,
  hho019cl_RunAnim,
  hho020cl_RunAnim,
  hho021cl_RunAnim,
  hho023cl_RunAnim,
  hho024cl_RunAnim,
  hho025cl_RunAnim,
  hho026cl_RunAnim,
  hhoa22cl_RunAnim,
  PizzaLed_Bitmap,
} from '../actions/hospital'
import { Hospital_Music } from '../actions/jukebox'
import { act1State } from '../lib/act1-state'
import type { RunAnimationAction } from '../lib/action-types'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import type { Composer } from '../lib/effect/composer'
import { engine, type Interval, type NormalizedMouseEvent } from '../lib/engine'
import { hospitalVisit } from '../lib/mission-rules.ts'
import type { PlayerCharacter } from '../lib/save-game'
import { getSettings } from '../lib/settings'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

const introAnimations: RunAnimationAction[] = [hho002cl_RunAnim, hho004jk_RunAnim, hho007p1_RunAnim]

const acceptanceLines: Record<PlayerCharacter, [RunAnimationAction, RunAnimationAction]> = {
  pepper: [hho017cl_RunAnim, hho018cl_RunAnim],
  mama: [hho019cl_RunAnim, hho020cl_RunAnim],
  papa: [hho023cl_RunAnim, hho024cl_RunAnim],
  nick: [hho021cl_RunAnim, hhoa22cl_RunAnim],
  laura: [hho025cl_RunAnim, hho026cl_RunAnim],
}

export class Hospital extends World {
  private readonly _building = new Building()
  private _copLed: { sprite: THREE.Sprite; interval: Interval } | null = null
  private _pizzaLed: { sprite: THREE.Sprite; interval: Interval } | null = null
  public interactionMode = 0
  private _generation = 0
  private _readyTime = 0
  private _flashing = false
  private _visit = 0
  private _short = false
  private _leaving = false

  constructor() {
    super('hospital')
  }

  public override escape(): boolean {
    ++this._generation
    this._leaving = true
    this.stopAnimationsInRange('hospital', 500, 515)
    return true
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: Hospital_Music,
      noLights: true,
    })

    this._copLed = { sprite: createImageSprite(CopLed_Bitmap), interval: engine.createInterval(300) }
    this._copLed.sprite.visible = false
    this._pizzaLed = { sprite: createImageSprite(PizzaLed_Bitmap), interval: engine.createInterval(200) }
    this._pizzaLed.sprite.visible = false
    this._building.scene.add(this._copLed.sprite)
    this._building.scene.add(this._pizzaLed.sprite)

    const leftPointLight = new THREE.PointLight(0xfefefe, 20)
    leftPointLight.position.set(-0.25, 1, 1)
    this.scene.add(leftPointLight)

    if (getSettings().graphics.shadows) {
      leftPointLight.castShadow = true
      leftPointLight.shadow.radius = 1.5
    }

    const target = this.findRoi('actor_ha') ?? this.findRoi('*actor_ha')
    if (target == null) {
      throw new Error('Hospital quest target actor_ha missing')
    }
    this.addClickListener(target, async () => {
      if (this.interactionMode !== 1 || this._leaving) {
        return false
      }
      this.interactionMode = 3
      const generation = this._generation
      this.stopAnimationsInRange('hospital', 500, 515)
      if (!this._short) {
        const variant = hospitalVisit(this._visit).acceptance
        await this.playAnimation(acceptanceLines[engine.currentSaveGame.player][variant])
      }
      if (generation === this._generation && !this._leaving) {
        this._leaving = true
        act1State.value = 'transitionToAmbulance'
        void switchWorld({ spawn: 'hospitalExited' })
      }
      return true
    })
    this._building.onButtonClicked = (name, event) => {
      if (event.state !== 1 || (name !== 'Door_Ctl' && name !== 'Info_Ctl')) {
        return false
      }
      void this.leave(name === 'Info_Ctl')
      return true
    }
  }

  private leave = async (info: boolean): Promise<void> => {
    if (this._leaving) {
      return
    }
    this._leaving = true
    const goodbye = this.interactionMode === 1
    const generation = ++this._generation
    this.stopAnimationsInRange('hospital', 500, 515)
    if (goodbye) {
      await this.playAnimation(hho016cl_RunAnim)
    }
    if (generation === this._generation) {
      void switchWorld(info ? { ending: null } : { spawn: 'hospitalExited' })
    }
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
    const generation = ++this._generation
    this._leaving = false
    this._flashing = false
    this._readyTime = engine.elapsedTimeMilliseconds
    if (this._copLed != null) {
      this._copLed.sprite.visible = false
    }
    if (this._pizzaLed != null) {
      this._pizzaLed.sprite.visible = false
    }
    const save = engine.currentSaveGame
    const player = save.playerUnsafe ?? 'laura'
    this._visit = save.getHospitalVisitCount(player)
    const visit = hospitalVisit(this._visit)
    save.setHospitalVisitCount(player, visit.next)
    this._short = visit.short
    this.interactionMode = visit.short ? 1 : 0
    void (async () => {
      await this.playAnimation(visit.short ? hho003cl_RunAnim : introAnimations[this._visit])
      if (generation !== this._generation || visit.short || this._leaving) {
        return
      }
      this._flashing = true
      if (this._copLed != null) {
        this._copLed.interval = engine.createInterval(300)
      }
      if (this._pizzaLed != null) {
        this._pizzaLed.interval = engine.createInterval(200)
      }
      await this.playAnimation(hho006cl_RunAnim)
      if (generation === this._generation && !this._leaving) {
        this.interactionMode = 1
      }
    })()
  }

  public override keyPressed(key: string): void {
    if (key === 'Space') {
      if (engine.elapsedTimeMilliseconds - this._readyTime >= 300) {
        this.stopAnimationsInRange('hospital', 500, 515)
      }
      return
    }
    super.keyPressed(key)
  }

  public override deactivate(): void {
    ++this._generation
    this._leaving = true
    this.stopAnimationsInRange('hospital', 500, 515)
    super.deactivate()
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this.interactionMode === 3 || this._leaving) {
      return
    }
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    await super.pointerDown(event)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }

  protected override update(delta: number): void {
    super.update(delta)
    if (this._flashing && this._copLed?.interval.resetExpired()) {
      this._copLed.sprite.visible = !this._copLed.sprite.visible
    }
    if (this._flashing && this._pizzaLed?.interval.resetExpired()) {
      this._pizzaLed.sprite.visible = !this._pizzaLed.sprite.visible
    }
  }
}
