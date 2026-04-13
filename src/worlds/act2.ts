import * as THREE from 'three'
import {
  _Act2Main,
  Avo906In_PlayWav,
  Avo907In_PlayWav,
  Avo908In_PlayWav,
  snsx03ma_RunAnim,
  snsx04ma_RunAnim,
  snsx10ni_RunAnim,
  snsx11ni_RunAnim,
  snsx15la_RunAnim,
  snsx16la_RunAnim,
  snsx29nu_RunAnim,
  snsx30nu_RunAnim,
  snsx31sh_RunAnim,
  snsx33na_RunAnim,
  snsx34na_RunAnim,
  snsx46cl_RunAnim,
  snsx48cl_RunAnim,
  snsx50bu_RunAnim,
  snsx51bu_RunAnim,
  snsx52sn_RunAnim,
  snsx53sn_RunAnim,
  snsx58va_RunAnim,
  snsx60va_RunAnim,
  tja009ni_RunAnim,
  tns002br_RunAnim,
  tns003br_RunAnim,
  tns004br_RunAnim,
  tns030bd_RunAnim,
  tns030pg_RunAnim,
  tns030rd_RunAnim,
  tns030sy_RunAnim,
  tra031ni_RunAnim,
  tra032ni_RunAnim,
} from '../actions/act2main'
import { BrickstrChase, Jail_Music } from '../actions/jukebox'
import type { RunAnimationAction } from '../lib/action-types'
import type { Composer } from '../lib/effect/composer'
import { engine, type Interval, type Timeout } from '../lib/engine'
import { Act2Actor } from '../lib/world/actors/act2actor'
import { Act2Brick } from '../lib/world/actors/act2brick'
import { PlayerMovement } from '../lib/world/player-movement'
import { IsleBase } from './isle-base'

const introAnimations = [tns002br_RunAnim, tns003br_RunAnim, tns004br_RunAnim]

const helicopterPartNames = ['xchbase1', 'xchblad1', 'xchseat1', 'xchtail1', 'xhback1', 'xhljet1', 'xhmidl1', 'xhmotr1', 'xhsidl1', 'xhsidr1'] as const

const bricksterIsLooseAnimations: {
  [key: number]: {
    location: THREE.Vector3
    animation: RunAnimationAction
  }
} = {
  0x02: {
    location: new THREE.Vector3(9.1, 0, -16.5),
    animation: tns030bd_RunAnim,
  },
  0x2a: {
    location: new THREE.Vector3(9.67, 0.0, -44.3),
    animation: tns030pg_RunAnim,
  },
  0x133: {
    location: new THREE.Vector3(-25.75, 0, -13),
    animation: tns030pg_RunAnim,
  },
  0x134: {
    location: new THREE.Vector3(-43.63, 0, -46.33),
    animation: tns030sy_RunAnim,
  },
  0x135: {
    location: new THREE.Vector3(-50.0, 0.0, -34.6),
    animation: tns030rd_RunAnim,
  },
  0x138: {
    location: new THREE.Vector3(41.15, 4.0, 31.0),
    animation: tns030sy_RunAnim,
  },
}
export class Act2 extends IsleBase {
  private readonly _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )

  private _state:
    | {
        type: 'intro'
      }
    | {
        type: 'going-to-residential-area'
        helpInterval: Interval
        initialHelpTimeout: Timeout
        playerIsLateTimeout: Timeout
      }
    | {
        type: 'arrived-at-residential-area'
      }
    | {
        type: 'chasing'
      } = {
    type: 'intro',
  }

  private _initialHelpAudioPlayed = false
  private _infomanIsTalking = false
  private _destructionAnimations = new Map<{ type: 'plant' | 'building'; index: number }, number>()
  private _bricks: Act2Brick[] = []

  constructor() {
    super('act2', { wdbWorldName: 'ACT2', dtaWorldName: 'ACT2' })
  }

  public override async init(): Promise<void> {
    await super.init()

    await this.handleStartUpAction(_Act2Main)

    for (const helicopterPartName of helicopterPartNames) {
      const roi = this.getRoi(helicopterPartName)
      const brick = new Act2Brick(roi, this)
      this.registerActor(brick)
      this._bricks.push(brick)
    }

    const block01 = this.getRoi('block01')
    const block01Placement = this.boundaryManager.getObjectPlacement('EDG01_04', 1, 0.5, 3, 0.5)
    block01.moveRoiTo(block01Placement.position.clone().add(new THREE.Vector3(1.5, 0, 0)), block01Placement.quaternion)
    block01.model.boundingSphere.radius *= 1.5

    const block02 = this.getRoi('block02')
    const block02Placement = this.boundaryManager.getObjectPlacement('EDG00_149', 0, 0.5, 2, 0.5)
    block02.moveRoiTo(block02Placement.position, block02Placement.quaternion)
    block02.model.boundingSphere.radius *= 1.5

    const ambul = this.getActor('ambul', Act2Actor)
    await Promise.all([ambul.addAnimationAction(0, this.getCachedAnimation('Ambul_Anim0')), ambul.addAnimationAction(6, this.getCachedAnimation('Ambul_Anim2')), ambul.addAnimationAction(3, this.getCachedAnimation('Ambul_Anim3')), ambul.addAnimationAction(-1, this.getCachedAnimation('BrShoot'))])

    this.boundaryManager.onTrigger((name, data, direction, roi) => {
      console.log(`Boundary trigger: ${name}, 0x${data.toString(16)}, ${direction}, ${roi?.name}`)

      if (roi != null || direction !== 'inbound') {
        return
      }

      if (data === 0x2a && this._state.type === 'going-to-residential-area' && !this._infomanIsTalking) {
        this._infomanIsTalking = true
        engine.playAudio(Avo907In_PlayWav, 'speech').then(audio => {
          audio.onEnded = () => {
            this._infomanIsTalking = false
          }
        })
      } else if (data === 0x32 && this._state.type === 'going-to-residential-area' && !this._infomanIsTalking) {
        const animation = this._state.playerIsLateTimeout.isExpired ? tra032ni_RunAnim : tra031ni_RunAnim
        this._state = { type: 'arrived-at-residential-area' }
        void this.playCameraAnimation(animation).then(() => {
          const block01 = this.getRoi('block01')
          block01.visible = false
          if (block01.actor == null) {
            throw new Error('Block01 actor not found')
          }
          this.removeActor(block01.actor)

          const block02 = this.getRoi('block02')
          block02.visible = false
          if (block02.actor == null) {
            throw new Error('Block02 actor not found')
          }
          this.removeActor(block02.actor)

          void engine.switchBackgroundMusic(BrickstrChase)

          const { position, quaternion } = this.boundaryManager.getObjectPlacement('EDG01_27', 2, 0.5, 0, 0.5)
          this.getRoi('ambul').moveRoiTo(position, quaternion)
          this.getActor('ambul', Act2Actor).start()
          this._state = { type: 'chasing' }
        })
      } else if (this._state.type === 'going-to-residential-area') {
        const animation = bricksterIsLooseAnimations[data]
        if (animation != null) {
          void this.playAnimation(animation.animation, { rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), this.camera.position.clone().sub(animation.location).normalize()), location: animation.location })
        }
      } else if (this._state.type === 'chasing') {
        const randN = Math.floor(Math.random() * 3) + 1
        switch (data) {
          case 2:
            if (randN === 1) {
              void this.playAnimation(snsx50bu_RunAnim)
            } else {
              void this.playAnimation(snsx51bu_RunAnim)
            }
            break
          case 8:
            if (randN === 1) {
              void this.playAnimation(snsx29nu_RunAnim)
            } else {
              void this.playAnimation(snsx30nu_RunAnim)
            }
            break
          case 9:
            if (randN === 1) {
              void this.playAnimation(snsx33na_RunAnim)
            } else {
              void this.playAnimation(snsx34na_RunAnim)
            }
            break
          case 14:
            if (randN === 1) {
              void this.playAnimation(snsx46cl_RunAnim)
            } else {
              void this.playAnimation(snsx48cl_RunAnim)
            }
            break
          case 23:
            if (randN === 1) {
              void this.playAnimation(snsx58va_RunAnim)
            } else {
              void this.playAnimation(snsx60va_RunAnim)
            }
            break
          case 24:
          case 25:
            void this.playAnimation(snsx31sh_RunAnim)
            break
          case 26:
            if (randN === 1) {
              void this.playAnimation(snsx52sn_RunAnim)
            } else {
              void this.playAnimation(snsx53sn_RunAnim)
            }
            break
          case 34:
            if (randN === 1) {
              void this.playAnimation(snsx15la_RunAnim)
            } else {
              void this.playAnimation(snsx16la_RunAnim)
            }
            break
          case 36:
            if (randN === 1) {
              void this.playAnimation(snsx10ni_RunAnim)
            } else {
              void this.playAnimation(snsx11ni_RunAnim)
            }
            break
          case 38:
          case 42:
            if (randN === 1) {
              void this.playAnimation(snsx03ma_RunAnim)
            } else {
              void this.playAnimation(snsx04ma_RunAnim)
            }
            break
        }
      }
    })
  }

  protected override get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return this._playerMovement.getDebugInfo()
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer, _param)

    void engine.switchBackgroundMusic(Jail_Music)

    this._state = { type: 'chasing' }

    void this.playCameraAnimation(introAnimations[Math.floor(Math.random() * introAnimations.length)]).then(() => {
      this.playCameraAnimation(tja009ni_RunAnim).then(() => {
        this._state = {
          type: 'going-to-residential-area',
          helpInterval: engine.createInterval(90_000),
          initialHelpTimeout: engine.createTimeout(20_000),
          playerIsLateTimeout: engine.createTimeout(90_000),
        }
      })
    })
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }
  }

  public get remainingBrickCount(): number {
    return 6 - this._bricks.filter(brick => brick.state !== 'waiting').length
  }

  public placeBrick(): void {
    const ambul = this.getActor('ambul', Act2Actor)
    const position = ambul.roi.position
    for (const brick of this._bricks.slice(0, 6)) {
      if (brick.state !== 'waiting') {
        continue
      }
      brick.place(position)
      break
    }
  }

  public scheduleAnimation(entity: { type: 'plant' | 'building'; index: number }): void {
    if (!this._destructionAnimations.has(entity)) {
      this._destructionAnimations.set(entity, engine.elapsedTimeMilliseconds)
    }
  }

  public override update(delta: number): void {
    super.update(delta)

    const { fromPos, toPos, normalizedSpeed } = this._playerMovement.update(delta, this.currentVehicle?.type ?? null)

    this.updateActors(delta, fromPos, toPos)

    this._dashboard.update(normalizedSpeed)

    this.boundaryManager.update(fromPos, toPos, null)

    if (this._state.type === 'going-to-residential-area' && this._state.helpInterval.resetExpired() && !this._infomanIsTalking) {
      this._infomanIsTalking = true
      void engine.playAudio(Avo908In_PlayWav, 'speech').then(audio => {
        audio.onEnded = () => {
          this._infomanIsTalking = false
        }
      })
    }

    if (this._state.type === 'going-to-residential-area' && this._state.initialHelpTimeout.isExpired && new THREE.Vector3(52, 5.25, -16.5).distanceTo(toPos) > 50 && !this._initialHelpAudioPlayed && !this._infomanIsTalking) {
      this._initialHelpAudioPlayed = true
      this._infomanIsTalking = true
      void engine.playAudio(Avo906In_PlayWav, 'speech').then(audio => {
        audio.onEnded = () => {
          this._infomanIsTalking = false
        }
      })
    }

    const destructionAnimations = [...this._destructionAnimations]
    if (destructionAnimations.length > 0) {
      const factor = delta * 10
      const scale = new THREE.Vector3(1.03 ** factor, 0.95 ** factor, 1.03 ** factor)
      for (const [key, start] of destructionAnimations) {
        if (key.type !== 'plant') {
          // TODO: Separate handling for building
          continue
        }
        const root = this._plantGroup.children[key.index]
        const elapsed = engine.elapsedTimeMilliseconds - start
        if (elapsed >= 1800) {
          this._destructionAnimations.delete(key)
          // TODO: Load original values and move Y lower
          continue
        }
        if (elapsed < 800) {
          continue
        }
        const m = root.matrix.clone()
        const sin1 = Math.sin(elapsed * 2 * 0.0062832) * 0.2
        const sin2 = Math.sin(elapsed * 4 * 0.0062832) * 0.2

        m.elements[4] = sin1
        m.elements[6] = sin2

        m.scale(scale)

        root.matrix.copy(m)
        root.matrixAutoUpdate = false
      }
    }
  }
}
