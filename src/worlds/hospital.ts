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

const maxVisits = 5

export class Hospital extends World {
  private readonly _building = new Building()
  private _copLed: { sprite: THREE.Sprite; interval: Interval } | null = null
  private _pizzaLed: { sprite: THREE.Sprite; interval: Interval } | null = null
  private _accepted = false

  constructor() {
    super('hospital')
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: Hospital_Music,
      exitSpawnPoint: { spawn: 'hospitalExited' },
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

    const player = engine.currentSaveGame.player
    const visit = Math.min(engine.currentSaveGame.getHospitalVisitCount(player), maxVisits - 1)
    engine.currentSaveGame.setHospitalVisitCount(player, Math.min(engine.currentSaveGame.getHospitalVisitCount(player) + 1, maxVisits))

    const doctor = await this.getCharacter('cl')
    this.addClickListener(doctor, async () => {
      if (this._accepted) {
        return true
      }
      this._accepted = true
      this.skipAllRunningAnimations(true)
      const acceptance = acceptanceLines[player][visit < 2 ? 0 : 1]
      await this.playAnimation(acceptance)
      act1State.value = 'transitionToAmbulance'
      void switchWorld({ spawn: 'hospitalExited' })
      return true
    })

    this._building.exitAnimation = hho016cl_RunAnim

    void (async () => {
      if (visit < 3) {
        await this.playAnimation(introAnimations[visit] ?? hho002cl_RunAnim)
        if (this._accepted) {
          return
        }
        await this.playAnimation(hho006cl_RunAnim)
      } else {
        await this.playAnimation(hho003cl_RunAnim)
      }
    })()
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
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
    if (this._copLed?.interval.resetExpired()) {
      this._copLed.sprite.visible = !this._copLed.sprite.visible
    }
    if (this._pizzaLed?.interval.resetExpired()) {
      this._pizzaLed.sprite.visible = !this._pizzaLed.sprite.visible
    }
  }
}
