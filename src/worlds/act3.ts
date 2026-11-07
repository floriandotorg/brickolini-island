import * as THREE from 'three'
import * as actions from '../actions/act3'
import { Act3Music } from '../actions/jukebox'
import type { AudioAction } from '../lib/action-types'
import type { Audio } from '../lib/assets/audio'
import type { Roi3D } from '../lib/assets/model'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../lib/engine'
import { act3State, helicopterState } from '../lib/session-state'
import { switchWorld } from '../lib/switch-world'
import { Act3Ammo } from '../lib/world/act3/ammo'
import { Act3Dashboard } from '../lib/world/act3/dashboard'
import { SoundQueue } from '../lib/world/act3/sound-queue'
import { act3Voices } from '../lib/world/act3/voices'
import { Act3Brickster } from '../lib/world/actors/act3brickster'
import { Act3Cop } from '../lib/world/actors/act3cop'
import { Act3Shark } from '../lib/world/actors/act3shark'
import { Helicopter } from '../lib/world/actors/helicopter'
import { Destruction } from '../lib/world/destruction'
import { PlayerMovement } from '../lib/world/player-movement'
import { IsleBase } from './isle-base'

let copSelector = 0
export class Act3 extends IsleBase {
  private readonly _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )
  public readonly destruction = new Destruction(this)
  public buildingTargets: ReturnType<Destruction['resolveBuildings']> = []
  private readonly _act3Dashboard = new Act3Dashboard()
  private readonly _pizzas: (Act3Ammo | null)[] = Array.from({ length: 20 }, () => null)
  private readonly _donuts: (Act3Ammo | null)[] = Array.from({ length: 20 }, () => null)
  private readonly _reservations = new Set<string>()
  private readonly _voiceIndices = [0, 0, 0, 0, 0, 0]
  private readonly _voices = new Map<AudioAction, Audio>()
  private readonly _voiceLoads = new Map<AudioAction, symbol>()
  private readonly _soundQueue = new SoundQueue<AudioAction>(
    action => void this.startVoice(action),
    action => this.stopVoice(action),
  )
  private _enabled = false
  private _started = false
  private _generation = 0
  private _phase: 'briefing' | 'flying' | 'endingCamera' | 'done' = 'briefing'
  private _dotCount = 0
  private _time = 0
  private _ending: { good: boolean; start: number; from: THREE.Vector3; to: THREE.Vector3; fromRotation: THREE.Quaternion; toRotation: THREE.Quaternion } | null = null
  constructor() {
    super('act3', { wdbWorldName: 'ACT3', dtaWorldName: 'ACT3' })
  }
  protected override get playerMovement(): PlayerMovement {
    return this._playerMovement
  }
  public get brickster(): Act3Brickster {
    return this.getActor('brickstr', Act3Brickster)
  }
  public get cops(): readonly Act3Cop[] {
    return [this.getActor('laura', Act3Cop), this.getActor('nick', Act3Cop)]
  }
  public get shark(): Act3Shark {
    return this.getActor('shark', Act3Shark)
  }
  private get helicopter(): Helicopter {
    return this.getActor('chptr', Helicopter)
  }
  public get pizzas(): Act3Ammo[] {
    return this._pizzas.filter((ammo): ammo is Act3Ammo => ammo != null)
  }
  public get donuts(): Act3Ammo[] {
    return this._donuts.filter((ammo): ammo is Act3Ammo => ammo != null)
  }
  public override async init(): Promise<void> {
    engine.currentSaveGame.act = 3
    engine.currentSaveGame.player = 'pepper'
    await super.init()
    this._playerMovement.boundaryManager = this.boundaryManager
    this._playerMovement.accelerationMultiplier = 30
    await this.handleStartUpAction(actions._Act3)
    this.allowExtras = false
    this.cameraAnimationTriggerEnabled = false
    this.ambient.setAllActive(false)
    this.destruction.applyToWorld()
    this.buildingTargets = this.destruction.resolveBuildings()
    await this._act3Dashboard.init()
    this._act3Dashboard.onPizza = () => void this.shoot('pizza')
    this._act3Dashboard.onDonut = () => void this.shoot('donut')
    this._act3Dashboard.onInfo = () => void switchWorld({ ending: null })
    this.brickster.actorState = 'disabled'
    for (const cop of this.cops) {
      cop.actorState = 'disabled'
    }
    this.shark.roi.visible = false
  }
  private async startVoice(action: AudioAction): Promise<void> {
    const token = Symbol()
    this._voiceLoads.set(action, token)
    const audio = await engine.playAudio(action, 'speech')
    if (!this._enabled || this._voiceLoads.get(action) !== token) {
      audio.stop()
      return
    }
    this._voices.set(action, audio)
    audio.onEnded = () => {
      this._voices.delete(action)
      this._voiceLoads.delete(action)
      this._soundQueue.onEnded(action)
    }
  }
  private stopVoice(action: AudioAction): void {
    this._voiceLoads.delete(action)
    this._voices.get(action)?.stop()
    this._voices.delete(action)
    this._soundQueue.onEnded(action)
  }
  public triggerHitSound(slot: number): void {
    if (this._phase !== 'flying') {
      return
    }
    const pool = act3Voices[slot - 1]
    if (pool == null) {
      return
    }
    const index = this._voiceIndices[slot - 1] % pool.length
    this._voiceIndices[slot - 1] = index + 1
    this._soundQueue.insert(pool[index], slot === 6 ? 'replace' : 'onlyIfEmpty')
  }
  public sound(name: string): void {
    if (this._enabled) {
      void this.playPositionalAudio(name, this.camera)
    }
  }
  private takeOff(): void {
    if (!this._enabled || this._phase !== 'briefing') {
      return
    }
    this._act3Dashboard.visible = true
    this._phase = 'flying'
    act3State.state = 0
    helicopterState.status = 2
    const placement = this.boundaryManager.getObjectPlacement('inv_05', 2, 0.75, 0, 0.19)
    const quaternion = placement.quaternion.clone()
    this._playerMovement.flightInfo = { takeOff: { position: placement.position, quaternion }, land: { position: placement.position, quaternion } }
    this._playerMovement.flightMode = true
    this.camera.rotateX(-Math.PI / 6)
    this.currentVehicle = this.helicopter
    this.helicopter.roi.visible = false
    this.camera.fov = 45
    this.camera.updateProjectionMatrix()
    this._voiceIndices.fill(0)
    this.brickster.actorState = 'initial'
    this.brickster.speed = 5
    this.brickster.hit()
    if (this._phase !== 'flying') {
      return
    }
    for (const cop of this.cops) {
      cop.actorState = 'initial'
      cop.speed = 2
      cop.hit()
    }
    this._dotCount = Math.max(0, this.buildingTargets.filter(target => this.destruction.isIntact({ type: 'building', index: target.index })).length - 1)
    this._act3Dashboard.setDotCount(this._dotCount)
    void engine.switchBackgroundMusic(Act3Music)
  }
  public override async activate(composer: Composer, param?: unknown): Promise<void> {
    await super.activate(composer, param)
    this._enabled = true
    engine.currentSaveGame.act = 3
    engine.currentSaveGame.player = 'pepper'
    this.allowExtras = false
    this.ambient.setAllActive(false)
    this.camera.near = 0.1
    this.camera.far = 125
    this.camera.fov = this._phase === 'briefing' ? 90 : 45
    this.camera.updateProjectionMatrix()
    this._act3Dashboard.visible = this._phase !== 'briefing'
    this._act3Dashboard.activate(composer)
    this._act3Dashboard.setDotCount(this._dotCount)
    this.destruction.applyToWorld()
    if (!this._started) {
      this._started = true
      act3State.state = 1
      const generation = ++this._generation
      const briefings = [actions.tlp053in_RunAnim, actions.tlp064la_RunAnim, actions.tlp068in_RunAnim]
      void this.playHeldCameraAnimation(briefings[Math.floor(Math.random() * briefings.length)]).then(() => {
        if (generation === this._generation && this._enabled) {
          this.takeOff()
        }
      })
    } else if (this._phase === 'briefing') {
      this.takeOff()
    } else {
      this.currentVehicle = this.helicopter
      this.helicopter.roi.visible = false
      helicopterState.status = 2
      if (this._phase === 'flying') {
        void engine.switchBackgroundMusic(Act3Music)
        this._soundQueue.resume()
      }
    }
  }
  public override deactivate(): void {
    this._enabled = false
    ++this._generation
    this._soundQueue.suspend()
    this.currentVehicle = null
    this._playerMovement.resetVelocities()
    super.deactivate()
  }
  public override escape(): boolean {
    this.skipAllRunningAnimations(true)
    this.stopAnimationsInRange('act3', 500, 999)
    return true
  }
  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._phase !== 'flying') {
      return
    }
    if (this._act3Dashboard.pointerDown(event)) {
      return
    }
    await super.pointerDown(event)
  }
  public override pointerUp(event: NormalizedMouseEvent): void {
    this._act3Dashboard.pointerUp()
    super.pointerUp(event)
  }
  public override pointerMove(event: NormalizedMouseEvent): void {
    if (this._phase === 'flying') {
      super.pointerMove(event)
    }
  }
  public override gesture(kind: import('../lib/input').Gesture, event: NormalizedMouseEvent): void {
    if (this._phase === 'flying') {
      super.gesture(kind, event)
    }
  }
  private async shoot(kind: 'pizza' | 'donut'): Promise<void> {
    if (!this._enabled || this._phase !== 'flying') {
      return
    }
    const pool = kind === 'pizza' ? this._pizzas : this._donuts
    const index = pool.findIndex((ammo, n) => (ammo == null || !ammo.valid) && !this._reservations.has(`${kind}:${n}`))
    if (index < 0) {
      return
    }
    const key = `${kind}:${index}`
    this._reservations.add(key)
    try {
      const direction = this.camera.getWorldDirection(new THREE.Vector3())
      const location = this.camera.position.clone().addScaledVector(direction, 3)
      const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion)
      const right = new THREE.Vector3().crossVectors(cameraUp, direction).normalize()
      const up = new THREE.Vector3().crossVectors(right, new THREE.Vector3(0, 1, 0)).normalize()
      const ammo = await Act3Ammo.create(this, kind, index)
      if (!this._enabled || this._phase !== 'flying') {
        ammo.remove()
        return
      }
      pool[index] = ammo
      ammo.shoot(location, direction, up)
    } finally {
      this._reservations.delete(key)
    }
  }
  public ammoLanded(ammo: Act3Ammo): void {
    this.sound(ammo.kind === 'pizza' ? 'stickpz' : 'stickdn')
    for (const other of [...this.pizzas, ...this.donuts]) {
      if (other === ammo || !other.valid || other.sharkFood || other.boundary !== ammo.boundary) {
        continue
      }
      const sphere = other.roi.model.getWorldBoundingSphere()
      if (ammo.roi.position.distanceToSquared(other.roi.position) > sphere.radius * sphere.radius) {
        continue
      }
      other.remove()
      if (other.kind === 'pizza') {
        this.brickster.hit()
      }
      if (other.kind !== ammo.kind) {
        this.sound(ammo.kind === 'pizza' ? 'pzhitdn' : 'dnhitpz')
        ammo.remove()
        return
      }
    }
    if (ammo.kind === 'pizza') {
      this.brickster.hitByAmmo()
      this.triggerHitSound(1)
    } else {
      this.cops[copSelector++ % 2].hit()
      this.triggerHitSound(3)
    }
  }
  public disableHelicopterDot(): void {
    this._dotCount = Math.max(0, this._dotCount - 1)
    this._act3Dashboard.setDotCount(this._dotCount)
  }
  public goodEnding(target: Roi3D): void {
    this.end(true, target)
  }
  public badEnding(target: Roi3D): void {
    this.end(false, target)
  }
  private end(good: boolean, target: Roi3D): void {
    if (this._phase !== 'flying') {
      return
    }
    this._phase = 'endingCamera'
    this.brickster.actorState = 'disabled'
    for (const cop of this.cops) {
      cop.actorState = 'disabled'
    }
    this._soundQueue.clear()
    engine.stopBackgroundMusic()
    this._playerMovement.resetVelocities()
    const to = target.position.clone().add(new THREE.Vector3(0, 20, 0))
    const screenUp = to.clone().sub(this.camera.position)
    screenUp.y = 0
    if (screenUp.lengthSq() < 0.001) {
      screenUp.set(0, 0, -1)
    }
    screenUp.normalize()
    const matrix = new THREE.Matrix4().lookAt(to, target.position, screenUp)
    this._ending = { good, start: this._time, from: this.camera.position.clone(), to, fromRotation: this.camera.quaternion.clone(), toRotation: new THREE.Quaternion().setFromRotationMatrix(matrix) }
    helicopterState.status = good ? 4 : 5
  }
  public override update(delta: number): void {
    super.update(delta)
    if (!this._enabled) {
      return
    }
    this._time += delta * 1000
    if (this._phase === 'endingCamera' && this._ending != null) {
      const progress = Math.min(1, (this._time - this._ending.start) / 3000)
      this.camera.position.lerpVectors(this._ending.from, this._ending.to, progress)
      this.camera.quaternion.slerpQuaternions(this._ending.fromRotation, this._ending.toRotation, progress)
      if (progress === 1) {
        this._phase = 'done'
        act3State.state = this._ending.good ? 2 : 3
        void switchWorld({ ending: this._ending.good ? 'good' : 'bad' })
      }
      return
    }
    const from = this.camera.position.clone()
    const movement = this._phase === 'flying' ? this._playerMovement.update(delta, 'helicopter') : { fromPos: from, toPos: from.clone(), normalizedSpeed: 0 }
    void this.updateActors(delta, movement.fromPos, movement.toPos)
    this.destruction.update(delta)
  }
}
