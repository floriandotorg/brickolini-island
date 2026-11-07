import * as THREE from 'three'
import * as actions from '../actions/act2main'
import { BrickHunt, BrickstrChase, Jail_Music } from '../actions/jukebox'
import { huntBrickPositions } from '../lib/act2-policy'
import type { AudioAction, RunAnimationAction } from '../lib/action-types'
import type { Audio } from '../lib/assets/audio'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { act2State } from '../lib/session-state'
import { switchWorld } from '../lib/switch-world'
import { Act2Actor } from '../lib/world/actors/act2actor'
import { Act2Brick } from '../lib/world/actors/act2brick'
import { Destruction } from '../lib/world/destruction'
import { PlayerMovement } from '../lib/world/player-movement'
import { IsleBase } from './isle-base'

const introAnimations = [actions.tns002br_RunAnim, actions.tns003br_RunAnim, actions.tns004br_RunAnim]

const helicopterPartNames = ['xchbase1', 'xchblad1', 'xchseat1', 'xchtail1', 'xhback1', 'xhljet1', 'xhmidl1', 'xhmotr1', 'xhsidl1', 'xhsidr1'] as const

const bricksterIsLooseAnimations: {
  [key: number]: {
    location: THREE.Vector3
    animation: RunAnimationAction
  }
} = {
  0x02: {
    location: new THREE.Vector3(9.1, 0, -16.5),
    animation: actions.tns030bd_RunAnim,
  },
  0x2a: {
    location: new THREE.Vector3(9.67, 0.0, -44.3),
    animation: actions.tns030rd_RunAnim,
  },
  0x133: {
    location: new THREE.Vector3(-25.75, 0, -13),
    animation: actions.tns030pg_RunAnim,
  },
  0x134: {
    location: new THREE.Vector3(-43.63, 0, -46.33),
    animation: actions.tns030sy_RunAnim,
  },
  0x135: {
    location: new THREE.Vector3(-50.0, 0.0, -34.6),
    animation: actions.tns030rd_RunAnim,
  },
  0x138: {
    location: new THREE.Vector3(41.15, 4.0, 31.0),
    animation: actions.tns030sy_RunAnim,
  },
}
type Phase = 'initial' | 'holdingSpeech' | 'startDescription' | 'explaining' | 'goingToResidentialArea' | 'atResidentialArea' | 'chase' | 'droppingBrick' | 'goingToHide' | 'hidden' | 'distributeRemainingBricks' | 'brickHunt' | 'allPiecesCollected' | 'badEnding'
const looseAnimations = ['tns030bd', 'tns030pg', 'tns030rd', 'tns030sy', 'snsx35ro', 'snsx36ro', 'snsx37ro', 'snsx48cl']
const huntAnimations = ['snsx07pa', 'snsx12ni', 'snsx15la', 'snsx47cl', 'snsx65pg', 'snsx68pg', 'snsx69rd', 'snsx72sy']
const destructionReactions = new Map<number, readonly RunAnimationAction[]>([
  [2, [actions.snsx50bu_RunAnim, actions.snsx51bu_RunAnim]],
  [8, [actions.snsx29nu_RunAnim, actions.snsx30nu_RunAnim]],
  [9, [actions.snsx33na_RunAnim, actions.snsx34na_RunAnim]],
  [14, [actions.snsx46cl_RunAnim, actions.snsx48cl_RunAnim]],
  [23, [actions.snsx58va_RunAnim, actions.snsx60va_RunAnim]],
  [24, [actions.snsx31sh_RunAnim]],
  [25, [actions.snsx31sh_RunAnim]],
  [26, [actions.snsx52sn_RunAnim, actions.snsx53sn_RunAnim]],
  [34, [actions.snsx15la_RunAnim, actions.snsx16la_RunAnim]],
  [36, [actions.snsx10ni_RunAnim, actions.snsx11ni_RunAnim]],
  [38, [actions.snsx03ma_RunAnim, actions.snsx04ma_RunAnim]],
  [42, [actions.snsx03ma_RunAnim, actions.snsx04ma_RunAnim]],
])
export class Act2 extends IsleBase {
  private readonly _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )
  public readonly destruction = new Destruction(this)
  private _phase: Phase = 'initial'
  private _tickCounter = 0
  private _accumulator = 0
  private _started = false
  private _enabled = false
  private _generation = 0
  private _tracked = false
  private _direction: Audio | null = null
  private _directionPending = false
  private _voice: Audio | null = null
  private _voiceGeneration = 0
  private _nextBrick = 0
  private _collected = 0
  private _lastCollected = new THREE.Vector3()
  private readonly _bricks: Act2Brick[] = []
  private _music: AudioAction = Jail_Music
  constructor() {
    super('act2', { wdbWorldName: 'ACT2', dtaWorldName: 'ACT2' })
  }
  protected override get playerMovement(): PlayerMovement {
    return this._playerMovement
  }
  protected override get debugPositionDirection() {
    return this._playerMovement.getDebugInfo()
  }
  private get ambulance(): Act2Actor {
    return this.getActor('ambul', Act2Actor)
  }
  public override async init(): Promise<void> {
    engine.currentSaveGame.act = 2
    engine.currentSaveGame.player = 'pepper'
    await super.init()
    this._playerMovement.boundaryManager = this.boundaryManager
    await this.handleStartUpAction(actions._Act2Main)
    for (let n = 0; n < helicopterPartNames.length; ++n) {
      const brick = new Act2Brick(this.getRoi(helicopterPartNames[n]), this, n, this.collect)
      this.registerActor(brick)
      this._bricks.push(brick)
    }
    const one = this.boundaryManager.getObjectPlacement('EDG01_04', 1, 0.5, 3, 0.5)
    this.getRoi('block01').moveRoiTo(one.position.add(new THREE.Vector3(1.5, 0, 0)), one.quaternion)
    const two = this.boundaryManager.getObjectPlacement('EDG00_149', 0, 0.5, 2, 0.5)
    this.getRoi('block02').moveRoiTo(two.position, two.quaternion)
    for (const name of ['block01', 'block02']) {
      this.getRoi(name).model.boundingSphere.radius *= 1.5
    }
    await Promise.all([
      this.ambulance.addAnimationAction(0, this.getCachedAnimation('Ambul_Anim0')),
      this.ambulance.addAnimationAction(6, this.getCachedAnimation('Ambul_Anim2')),
      this.ambulance.addAnimationAction(3, this.getCachedAnimation('Ambul_Anim3')),
      this.ambulance.addAnimationAction(-1, this.getCachedAnimation('BrShoot')),
    ])
    this.boundaryManager.onTrigger((name, data, direction, roi) => {
      if (!this._enabled || roi != null || direction !== 'inbound' || !['D', 'S', 'W'].includes(name[2]?.toUpperCase())) {
        return
      }
      this.trigger(data)
    })
    this.resetAmbient()
    this.destruction.applyToWorld()
  }
  private setPhase(phase: Phase): void {
    this._phase = phase
    this._tickCounter = 0
  }
  private resetAmbient(): void {
    this.cameraAnimationTriggerEnabled = false
    this.allowExtras = false
    this.ambient.setAllActive(false)
    this.extras.enableCharacters([])
  }
  private configureAmbient(): void {
    this.resetAmbient()
    if (['explaining', 'goingToResidentialArea', 'distributeRemainingBricks', 'brickHunt'].includes(this._phase)) {
      const hunt = this._phase === 'distributeRemainingBricks' || this._phase === 'brickHunt'
      this.cameraAnimationTriggerEnabled = true
      this.allowExtras = true
      this.ambient.setActive(hunt ? huntAnimations : looseAnimations)
      this.extras.enableCharacters(hunt ? ['papa', 'nick', 'laura', 'cl', 'pg', 'rd', 'sy'] : ['bd', 'pg', 'rd', 'sy', 'ro', 'cl'])
    }
  }
  private hide(names: readonly string[]): void {
    for (const name of names) {
      const roi = this.findRoi(name)
      if (roi != null) {
        roi.visible = false
      }
    }
  }
  private music(action: AudioAction): void {
    this._music = action
    void engine.switchBackgroundMusic(action)
  }
  private async cameraAction(action: RunAnimationAction, finished: () => void, location?: THREE.Vector3, rotation?: THREE.Quaternion): Promise<void> {
    const generation = ++this._generation
    this._tracked = true
    try {
      if (location == null) {
        await this.playCameraAnimation(action)
      } else {
        const info = this.animationInfos.find(info => info.objectId === action.id)
        const finish = info == null ? () => {} : this.ambient.begin(info)
        try {
          if (await this.wait(750)) {
            await this.playAnimation(action, { managed: true, capturesPlayer: info?.hasCameraAnimation ?? true, lockCamera: info?.hasCameraAnimation ?? true, location, rotation })
          }
        } finally {
          finish()
        }
      }
    } finally {
      if (generation === this._generation && this._enabled) {
        this._tracked = false
        finished()
      }
    }
  }
  private async direct(action: AudioAction): Promise<void> {
    if (this._directionPending || this._direction != null) {
      return
    }
    this._directionPending = true
    const generation = this._generation
    const audio = await engine.playAudio(action, 'speech')
    this._directionPending = false
    if (!this._enabled || generation !== this._generation) {
      audio.stop()
      return
    }
    this._direction = audio
    audio.onEnded = () => {
      if (this._direction === audio) {
        this._direction = null
      }
    }
  }
  public async playBricksterVoice(action: AudioAction, ignoreCurrent = false): Promise<void> {
    if (!this._enabled || (this._tracked && !ignoreCurrent)) {
      return
    }
    const generation = ++this._voiceGeneration
    this._voice?.stop()
    const audio = await engine.playAudio(action, 'speech')
    if (!this._enabled || generation !== this._voiceGeneration) {
      audio.stop()
      return
    }
    this._voice = audio
  }
  private description(): void {
    this.setPhase('explaining')
    this.configureAmbient()
    void this.cameraAction(actions.tja009ni_RunAnim, () => {
      this.hide(['mama', 'papa', 'infoman'])
      this.setPhase('goingToResidentialArea')
      this.configureAmbient()
    })
  }
  private startChase(): void {
    this.hide(['nick', 'laura', 'motoni', 'motola', 'block01', 'block02'])
    for (const name of ['block01', 'block02']) {
      const actor = this.findRoi(name)?.actor
      if (actor != null) {
        this.removeActor(actor)
      }
    }
    const placement = this.boundaryManager.getObjectPlacement('EDG01_27', 2, 0.5, 0, 0.5)
    this.ambulance.roi.moveRoiTo(placement.position, placement.quaternion)
    this.ambulance.start()
    this.setPhase('chase')
    this.resetAmbient()
    this.music(BrickstrChase)
  }
  private trigger(data: number): void {
    if (this._phase === 'goingToResidentialArea') {
      if (data === 0x2a) {
        void this.direct(actions.Avo907In_PlayWav)
        return
      }
      if (data === 0x32) {
        const action = this._tickCounter < 90000 ? actions.tra031ni_RunAnim : actions.tra032ni_RunAnim
        this.setPhase('atResidentialArea')
        this.resetAmbient()
        this._playerMovement.resetVelocities()
        void this.cameraAction(action, () => this.startChase())
        return
      }
      const loose = bricksterIsLooseAnimations[data]
      if (loose != null) {
        const direction = loose.location.clone().sub(this.camera.position).normalize()
        const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
        void this.cameraAction(loose.animation, () => {}, loose.location, rotation)
      }
    } else if (this._phase === 'chase' && !this._tracked) {
      const choices = destructionReactions.get(data)
      if (choices != null) {
        void this.cameraAction(choices[Math.random() < 1 / 3 ? 0 : choices.length - 1], () => {})
      }
    } else if (this._phase === 'goingToHide' && data === 0x165) {
      this.setPhase('hidden')
      this._playerMovement.resetVelocities()
      this.ambulance.hide()
      this.createBrick2()
      const position = this.ambulance.roi.position
      this._bricks[5].place(position.clone().add(new THREE.Vector3(0, 1.5, 0)), position.clone().add(new THREE.Vector3(0, -0.1, 0)))
      const generation = ++this._generation
      this._tracked = true
      void engine.playAudio(actions.VOhide_PlayWav, 'speech').then(audio => {
        if (!this._enabled || generation !== this._generation) {
          audio.stop()
          return
        }
        this._voice = audio
        audio.onEnded = () => {
          if (this._enabled && generation === this._generation) {
            this._tracked = false
            this.distribute()
          }
        }
      })
    }
  }
  public createBrick(): boolean {
    if (this._nextBrick >= 5 || this._phase !== 'chase') {
      return false
    }
    const position = this.ambulance.roi.position
    this._bricks[this._nextBrick++].place(position.clone().add(new THREE.Vector3(0, 1.3, 0)), position.clone().add(new THREE.Vector3(0, -0.1, 0)))
    this.setPhase('droppingBrick')
    return true
  }
  public createBrick2(): void {
    if (this._nextBrick >= 6) {
      return
    }
    const brick = this._bricks[this._nextBrick++]
    brick.place(this.ambulance.roi.position.clone().add(new THREE.Vector3(0, 1.5, 0)))
    void brick.playWhistle()
  }
  private distribute(): void {
    this._bricks[5].mute(true)
    this.setPhase('distributeRemainingBricks')
    this.configureAmbient()
    void this.cameraAction(actions.tra045la_RunAnim, () => this.hunt())
  }
  private hunt(): void {
    this.hide(['nick', 'laura', 'motoni', 'motola'])
    this._bricks[5].mute(false)
    const positions = huntBrickPositions()
    for (let n = 0; n < 4; ++n) {
      this._bricks[n + 6].place(new THREE.Vector3(...positions[n]))
      void this._bricks[n + 6].playWhistle()
    }
    this._nextBrick = 10
    this.setPhase('brickHunt')
    this.configureAmbient()
    this.music(BrickHunt)
    this.finishCollection()
  }
  private collect = (brick: Act2Brick): void => {
    ++this._collected
    this._lastCollected.copy(brick.roi.position)
    void this.playPositionalAudio('28bng', this.camera)
    this.finishCollection()
  }
  private finishCollection(): void {
    if (this._phase !== 'brickHunt' || this._collected !== 10) {
      return
    }
    this.setPhase('allPiecesCollected')
    this._playerMovement.resetVelocities()
    const direction = this._lastCollected.clone().sub(this.camera.position).normalize()
    const location = this.camera.position
      .clone()
      .addScaledVector(direction, 1.25)
      .add(new THREE.Vector3(0, 0.25, 0))
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
    void this.cameraAction(actions.tns051in_RunAnim, () => this.build(), location, rotation)
  }
  private build(): void {
    for (const brick of this._bricks) {
      brick.remove()
    }
    this.resetAmbient()
    void switchWorld('copter')
  }
  public badEnding(): void {
    if (!this._enabled || this._phase === 'badEnding') {
      return
    }
    this.setPhase('badEnding')
    this.ambulance.stop()
    act2State.state = 104
    for (const brick of this._bricks) {
      brick.remove()
    }
    void switchWorld({ ending: 'bad' })
  }
  public override async activate(composer: Composer, param?: unknown): Promise<void> {
    await super.activate(composer, param)
    this._enabled = true
    act2State.enabled = true
    engine.currentSaveGame.act = 2
    engine.currentSaveGame.player = 'pepper'
    this.camera.fov = 90
    this.camera.near = 0.1
    this.camera.far = 250
    this.camera.updateProjectionMatrix()
    if (!this._started) {
      this._started = true
      const placement = this.boundaryManager.getObjectPlacement('EDG02_51', 0, 0.64, 1, 0.37)
      this.camera.position.copy(placement.position).add(new THREE.Vector3(0, 1.25, 0))
      this.camera.quaternion.copy(placement.quaternion)
    } else {
      switch (this._phase) {
        case 'holdingSpeech':
          this.setPhase('startDescription')
          break
        case 'explaining':
          this.hide(['mama', 'papa', 'infoman'])
          this.setPhase('goingToResidentialArea')
          break
        case 'atResidentialArea':
          this.startChase()
          break
        case 'hidden':
          this.distribute()
          break
        case 'distributeRemainingBricks':
          this.hunt()
          break
        case 'allPiecesCollected':
          this.build()
          break
      }
    }
    this.configureAmbient()
    this.destruction.applyToWorld()
    this.music(this._music)
    if (this._phase === 'brickHunt' || this._phase === 'goingToHide') {
      for (const brick of this._bricks) {
        void brick.playWhistle()
      }
    }
  }
  public override deactivate(): void {
    this._enabled = false
    act2State.enabled = false
    ++this._generation
    ++this._voiceGeneration
    this._tracked = false
    this._voice?.stop()
    this._direction?.stop()
    this._voice = null
    this._direction = null
    this._directionPending = false
    for (const brick of this._bricks) {
      brick.stopWhistle()
    }
    this.resetAmbient()
    super.deactivate()
  }
  public override escape(): boolean {
    this.skipAllRunningAnimations(true)
    return true
  }
  public override keyPressed(key: string): void {
    super.keyPressed(key)
    if (key === 'KeyF' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }
  }
  private tick(): void {
    this._tickCounter += 50
    if (this._phase === 'initial') {
      this.setPhase('holdingSpeech')
      void this.cameraAction(introAnimations[Math.floor(Math.random() * introAnimations.length)], () => this.setPhase('startDescription'))
    } else if (this._phase === 'startDescription') {
      this.description()
    } else if (this._phase === 'goingToResidentialArea') {
      if (this._tickCounter === 20000 && this.camera.position.distanceToSquared(new THREE.Vector3(52, 5.25, -16.5)) > 50 && this.camera.position.x < 57) {
        void this.direct(actions.Avo906In_PlayWav)
      } else if (this._tickCounter % 90000 === 0) {
        void this.direct(actions.Avo908In_PlayWav)
      }
    } else if (this._phase === 'droppingBrick' && this._tickCounter >= 200) {
      if (this._nextBrick < 5) {
        this.setPhase('chase')
      } else {
        this.setPhase('goingToHide')
        this.ambulance.goingToHide()
      }
    }
  }
  public override update(delta: number): void {
    super.update(delta)
    if (!this._enabled) {
      return
    }
    this._accumulator += delta * 1000
    while (this._accumulator >= 50) {
      this._accumulator -= 50
      this.tick()
    }
    const walking = ['goingToResidentialArea', 'chase', 'droppingBrick', 'goingToHide', 'brickHunt'].includes(this._phase) && !this.isRunningCameraAnimation
    const from = this.camera.position.clone()
    const movement = walking ? this._playerMovement.update(delta, null) : { fromPos: from, toPos: from.clone(), normalizedSpeed: 0 }
    void this.updateActors(delta, movement.fromPos, movement.toPos)
    this._dashboard.update(movement.normalizedSpeed, 0)
    if (walking) {
      this.boundaryManager.update(movement.fromPos, movement.toPos, null)
    }
    this.destruction.update(delta)
  }
}
