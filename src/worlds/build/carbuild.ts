import * as THREE from 'three'
import { type AnimationAction, type AudioAction, type ControlAction, type ImageAction, isRunAnimationAction, isTextureAction, type RunAnimationAction } from '../../lib/action-types'
import { type Animation3DNode, findRecursively } from '../../lib/assets/animation'
import type { Audio } from '../../lib/assets/audio'
import { createImageSprite } from '../../lib/assets/canvas-sprite'
import type { Control, ControlEvent } from '../../lib/assets/control'
import { colorAliases, colorMesh, isColorTableName, replaceNamedTexture, toThreeColor } from '../../lib/assets/mesh'
import { type Roi3D, RoiModel } from '../../lib/assets/model'
import { createTexture } from '../../lib/assets/texture'
import { buildHosts } from '../../lib/build-hosts'
import { hostBlink, interchangeablePart, shelfFrame } from '../../lib/build-rules'
import { engine } from '../../lib/engine'
import { VehicleTextureSlots } from '../../lib/save-game'
import { getSettings } from '../../lib/settings'
import { switchWorld } from '../../lib/switch-world'
import type { Building } from '../../lib/world/building'
import type { VehicleType } from '../../lib/world/dashboard'
import type { BuiltAnimation, NormalWorld, World, WorldSpawn } from '../../lib/world/world'

type Part = { readonly wired: Roi3D; readonly shelfPart: Roi3D; readonly shelfGroup: THREE.Group; readonly clone: RoiModel; readonly objectType: ObjectType; readonly basename: string }

enum ObjectType {
  Shelf = 0,
  Wired = 1,
  Normal = 2,
  Colored = 3,
  Other = 4,
}

const determineObjectType = (name: string): ObjectType => {
  const lowercaseName = name.toLowerCase()
  if (/^[a-z]+_shelf\d+$/.test(lowercaseName)) {
    return ObjectType.Shelf
  }
  switch (lowercaseName[lowercaseName.length - 2]) {
    case 'w':
      return ObjectType.Wired
    case 'n':
      return ObjectType.Normal
    case 'y':
      return ObjectType.Colored
    default:
      return ObjectType.Other
  }
}

const getPosition = (node: Animation3DNode): THREE.Vector3 => node.translationKeys[0].vertex.clone()

const saveAt = (text: string, index: number): string => {
  const result = text.at(index)
  if (result == null) {
    throw new Error(`Index ${index} is not valid for ${text}`)
  }
  return result
}

export class RayClick {
  private readonly _raycaster = new THREE.Raycaster()

  public constructor(public camera: THREE.Camera) {}

  public pointerDown1(normalizedX: number, normalizedY: number, objects: THREE.Object3D[]): THREE.Object3D | undefined {
    return this.pointerDown(normalizedX, normalizedY, objects, obj => obj)
  }

  public pointerDown<T>(normalizedX: number, normalizedY: number, objects: T[], map: (t: T) => THREE.Object3D): T | undefined {
    this._raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this.camera)
    for (const intersection of this._raycaster.intersectObjects(objects.map(map))) {
      let hit: THREE.Object3D | null = intersection.object
      while (hit != null) {
        const matchedObject = objects.find(object => map(object) === hit)
        if (hit.visible && matchedObject != null) {
          return matchedObject
        }
        hit = hit.parent
      }
    }
    return undefined
  }
}

export const buildDecalControls = async (background: ImageAction | null, sound: AudioAction, building: Building, partControlMap: ([string, string[]] | string)[]): Promise<CustomDecalControls> => {
  const decalMap = new Map<string, Control[]>()
  for (const item of partControlMap) {
    const [partName, controlNames] = (() => {
      if (typeof item === 'string') {
        return [item, ['Decals_Ctl']]
      }
      return item
    })()
    const controls = controlNames.map(controlName => {
      const control = building.getControl(controlName)
      if (control == null) {
        throw new Error(`Cannot find control ${controlName} for ${partName}`)
      }
      return control
    })
    decalMap.set(partName.toLowerCase(), controls)
  }
  return new CustomDecalControls(background, await engine.getAudio(sound, 'effects'), decalMap)
}

export const buildColorControls = async (background: ImageAction, sound: AudioAction, building: Building, ...colors: { readonly action: ControlAction; readonly color: CustomColor }[]): Promise<CustomColorControls> => {
  const colorControls = colors.map(color => {
    const control = building.getControl(color.action.name)
    if (control == null) {
      throw new Error(`Cannot find color control ${color.action.name}`)
    }
    return { control, color: color.color }
  })
  return new CustomColorControls(background, await engine.getAudio(sound, 'effects'), colorControls)
}

export type CustomColorControl = { readonly control: Control; readonly color: CustomColor }
export type CustomColor = 'lego yellow' | 'lego red' | 'lego blue' | 'lego green' | 'lego white' | 'lego black'

export class CustomColorControls {
  public readonly background: THREE.Sprite
  public readonly sound: Audio
  private readonly _colors: CustomColorControl[]
  private _visible = false

  public constructor(background: ImageAction, sound: Audio, colors: CustomColorControl[]) {
    this.background = createImageSprite(background)
    this.sound = sound
    this._colors = colors
    this.visible = false
  }

  public get visible(): boolean {
    return this._visible
  }

  public set visible(value: boolean) {
    this._visible = value
    this.background.visible = value
    for (const { control } of this._colors) {
      control.visible = value
    }
  }

  public getColor(buttonName: string): CustomColor | undefined {
    for (const { control, color } of this._colors) {
      if (control.name.toLowerCase() === buttonName.toLowerCase()) {
        return color
      }
    }
    return undefined
  }
}

export class CustomDecalControls {
  public readonly background: THREE.Sprite | null
  public readonly sound: Audio
  private readonly _decals: Map<string, Control[]>
  private _partName = ''

  public constructor(background: ImageAction | null, sound: Audio, decals: Map<string, Control[]>) {
    this.background = background != null ? createImageSprite(background) : null
    this.sound = sound
    this._decals = decals
    this.hide()
  }

  public get partName(): string {
    return this._partName
  }

  public set partName(value: string) {
    this._partName = value
    let anyControlVisible = false
    for (const [partName, controls] of this._decals) {
      const validDecal = value.length > 0 && value.endsWith(partName.toLowerCase())
      for (const control of controls) {
        control.visible = validDecal
      }
      anyControlVisible ||= validDecal
    }
    if (this.background != null) {
      this.background.visible = anyControlVisible
    }
  }

  public hide(): void {
    this.partName = ''
  }

  public isButton(buttonName: string): boolean {
    const decalControls = this._decals.get(this.partName)
    if (decalControls != null) {
      for (const decalControl of decalControls) {
        if (decalControl.name === buttonName) {
          return true
        }
      }
    }
    return false
  }
}

export type SpeakerAnimations = {
  completed: RunAnimationAction
}

type PartDisplayed = {
  readonly state: 'displaying'
  readonly part: Part
}

type Idle = {
  readonly state: 'idle'
}

type ShelfMoving = {
  readonly state: 'shelfMoving'
}

type PartSelected = {
  readonly state: 'selected'
  readonly selectedPart: Part
  readonly displayedPart: Part | null
}

type PartDragging = {
  readonly state: 'dragging'
  readonly selectedPart: Part
  readonly startQuarternion: THREE.Quaternion
  readonly endQuarternion: THREE.Quaternion
}

type States = PartDisplayed | Idle | ShelfMoving | PartSelected | PartDragging

const IdleState: Idle = { state: 'idle' }
const ShelfMovingState: ShelfMoving = { state: 'shelfMoving' }

const highlightColor = toThreeColor(colorAliases['lego red'])

export class Carbuild {
  private readonly _world: World
  private readonly _building: Building
  public onFinish: () => void = () => {}
  public onAct2Exit: (() => Promise<void>) | null = null
  private _phase: 'building' | 'completing' | 'exiting' = 'building'
  private _host: { action: RunAnimationAction; start: number; tracked: boolean } | null = null
  private _hostCandidates: readonly unknown[] = []
  private _hostGeneration = 0
  private _hostDucks: symbol[] = []
  private _introPlaying = false
  private _missclicks = 0
  private _controlClick = false
  private _tickledControl: string | null = null
  private _shelfMixer: THREE.AnimationMixer | null = null
  private _shelfAction: THREE.AnimationAction | null = null
  private _shelfMotion: { start: number; elapsed: number } | null = null
  private _startMouse = new THREE.Vector2()

  public get locked(): boolean {
    return this._phase !== 'building'
  }

  public activate = async (): Promise<void> => {
    this._phase = 'building'
    this._part = engine.currentSaveGame.act === 2 && this._vehicleType === 'helicopter' ? 10 : engine.currentSaveGame.getVehicleProgress(this._vehicleType)
    this.updateParts()
    const module = this._vehicleType === 'helicopter' ? await import('../../actions/copter') : this._vehicleType === 'dunecar' ? await import('../../actions/dunecar') : this._vehicleType === 'jetski' ? await import('../../actions/jetski') : await import('../../actions/racecar')
    this._hostCandidates = Object.values(module)
    const state = engine.currentSaveGame.getBuildState(this._vehicleType)
    const index = state.introductionCounter % 3
    engine.currentSaveGame.setBuildState(this._vehicleType, { ...state, introductionCounter: (state.introductionCounter + 1) % 256 })
    const act2 = engine.currentSaveGame.act === 2 && this._vehicleType === 'helicopter'
    const name = act2 ? ['ips004d2_RunAnim', 'ips006d2_RunAnim', 'slp01xd2_RunAnim'][Math.floor(Math.random() * 3)] : buildHosts[this._vehicleType].introductions[index]
    this._introPlaying = true
    await this.startHost(name, act2 || index === 0 || (index === 1 && this._vehicleType !== 'dunecar') || (index === 2 && this._vehicleType === 'jetski'), true)
  }

  private restoreHostControls = (): void => {
    if (this._tickledControl != null) {
      this._building.getControl(this._tickledControl)?.setDisplayedState(0)
    }
    this._tickledControl = null
    this._colorControls.visible = this._currentPart?.objectType === ObjectType.Colored
  }

  private startHost = async (name: string, tracked = false, introduction = false): Promise<void> => {
    const generation = ++this._hostGeneration
    this._world.stopAnimationsInRange(this._world.name, 500, 510)
    this.restoreHostControls()
    const action = this._hostCandidates.find(action => isRunAnimationAction(action) && action.name === name)
    if (!isRunAnimationAction(action)) {
      return
    }
    const duck = engine.lowerBackgroundMusic()
    this._hostDucks.push(duck)
    this._host = { action, start: engine.elapsedTimeMilliseconds, tracked }
    await this._world.playAnimation(action)
    if (generation === this._hostGeneration) {
      this._host = null
      this.restoreHostControls()
      if (introduction && this._introPlaying) {
        engine.raiseBackgroundMusic(duck)
        this._hostDucks = this._hostDucks.filter(token => token !== duck)
      }
    }
  }

  public skipHost = (): void => {
    if (this._phase === 'completing') {
      return
    }
    this._world.stopAnimationsInRange(this._world.name, 500, 510)
    for (const token of this._hostDucks) {
      engine.raiseBackgroundMusic(token)
    }
    this._hostDucks = []
    this._missclicks = 0
  }

  public requestExit = async (): Promise<void> => {
    if (this.locked) {
      return
    }
    this._returnState()
    this.skipHost()
    this._phase = 'exiting'
    engine.input.disable()
    engine.input.allowSpaceWhileDisabled = true
    if (engine.currentSaveGame.act === 2 && this._vehicleType === 'helicopter' && this.onAct2Exit != null) {
      await this.onAct2Exit()
      return
    }
    if (engine.currentSaveGame.getBuildState(this._vehicleType).finishedBuild) {
      engine.respawnVehicle(this._vehicleType)
      engine.currentSaveGame.clearVehiclePlacement(this._vehicleType)
    } else {
      await this.startHost(buildHosts[this._vehicleType].leave)
    }
    if (engine.currentWorld === this._world) {
      void switchWorld(this._spawnLocation)
    }
  }

  private targetPart = (part: Part): Part => {
    const next = this._parts[this._part]
    return next != null && interchangeablePart(part.shelfPart.name, next.shelfPart.name) ? next : part
  }

  private readonly _parts: Part[] = []
  private _part = 0
  private readonly _colorControls: CustomColorControls
  private readonly _decalControls: CustomDecalControls
  private readonly _spawnLocation: WorldSpawn | NormalWorld
  private readonly _vehicleType: VehicleType
  private readonly _speakerAnimations: SpeakerAnimations
  private readonly _buildPlatform = new THREE.Group()
  private readonly _highlightPlatform = new THREE.Group()
  private readonly _displayPosition
  private readonly _displayGroup = new THREE.Group()
  private readonly _shelfUpSound: Audio
  private readonly _selectionSound: Audio
  private readonly _placementSound: Audio
  private readonly _rotationSound: Audio
  private readonly _rayclick: RayClick
  private _state: States = IdleState
  private _rotating = false
  private _animation: { duration: number; interval: number; clip: THREE.AnimationClip } | null = null
  private shelfAnimationTime = 0

  public get rotating(): boolean {
    return this._rotating
  }

  public set rotating(value: boolean) {
    this._rotating = value
    if (this._rotating) {
      this._rotationSound.play()
    } else {
      this._rotationSound.stop()
    }
  }

  public static async create(
    world: World,
    building: Building,
    displayPosition: THREE.Vector3,
    shelfUpSound: AudioAction,
    selectionSound: AudioAction,
    placementSound: AudioAction,
    rotationSound: AudioAction,
    colorControls: CustomColorControls,
    decalControls: CustomDecalControls,
    spawnLocation: WorldSpawn | NormalWorld,
    vehicleType: VehicleType,
    speakerAnimations: SpeakerAnimations,
    ...animations: AnimationAction[]
  ): Promise<Carbuild> {
    const animation = await world.buildAnimation(animations[Math.floor(Math.random() * animations.length)])
    const shelfUpAudio = await engine.getAudio(shelfUpSound, 'effects')
    const selectionAudio = await engine.getAudio(selectionSound, 'effects')
    const placementAudio = await engine.getAudio(placementSound, 'effects')
    const rotationAudio = await engine.getAudio(rotationSound, 'effects')
    return new Carbuild(world, building, displayPosition, shelfUpAudio, selectionAudio, placementAudio, rotationAudio, colorControls, decalControls, spawnLocation, vehicleType, speakerAnimations, animation)
  }

  private constructor(
    world: World,
    building: Building,
    displayPosition: THREE.Vector3,
    shelfUpSound: Audio,
    selectionSound: Audio,
    placementSound: Audio,
    rotationSound: Audio,
    colorControls: CustomColorControls,
    decalControls: CustomDecalControls,
    spawnLocation: WorldSpawn | NormalWorld,
    vehicleType: VehicleType,
    speakerAnimations: SpeakerAnimations,
    animation: BuiltAnimation,
  ) {
    this._part = engine.currentSaveGame.getVehicleProgress(vehicleType)
    this._world = world
    this._building = building
    world.onDeactivate(() => {
      this.skipHost()
      this.rotating = false
    })
    world.setupCameraForAnimation(animation.animation.tree)
    // In theory the "number of shelves" is determined by using the translation keys of the "first" shelf it encounters and subtracting one
    let numberOfShelves = 0
    const platformNode = findRecursively(animation.animation.tree, node => node.name.toLowerCase() === 'platform')?.at(-1)
    if (platformNode == null) {
      throw new Error('Could not find platform node')
    }
    const platformPosition = getPosition(platformNode)
    this._buildPlatform.position.copy(platformPosition)
    this._buildPlatform.updateMatrix()
    this._buildPlatform.add(this._highlightPlatform)

    this._displayPosition = world.findRoi('view')?.model.getWorldPosition(new THREE.Vector3()) ?? displayPosition
    this._displayGroup.position.copy(displayPosition)
    this._displayGroup.updateMatrix()
    this._world.scene.add(this._displayGroup)

    this._colorControls = colorControls
    building.scene.add(this._colorControls.background)

    this._decalControls = decalControls
    if (this._decalControls.background != null) {
      building.scene.add(this._decalControls.background)
    }

    this._spawnLocation = spawnLocation
    this._vehicleType = vehicleType
    this._speakerAnimations = speakerAnimations

    this._shelfUpSound = shelfUpSound
    this._selectionSound = selectionSound
    this._placementSound = placementSound
    this._rotationSound = rotationSound

    this._rayclick = new RayClick(this._world.camera)

    const shelfParts = new Map<string, { readonly shelfPart: Roi3D; readonly shelfGroup: THREE.Group; readonly objectType: ObjectType }>()
    const wiredParts: Roi3D[] = []
    for (const child of [...world.worldGroup.children]) {
      const objectType = determineObjectType(child.name)
      switch (objectType) {
        case ObjectType.Shelf:
          numberOfShelves++
          break
        case ObjectType.Wired: {
          if (!(child instanceof RoiModel)) {
            throw new Error(`Object3D named '${child.name}' is not an instance of RoiModel`)
          }
          const roi3d = child.roi3d
          if (roi3d == null) {
            throw new Error(`Object3D named '${child.name}' does not contain a Roi3d`)
          }
          const wiredNode = findRecursively(platformNode, node => roi3d.name.endsWith(node.name))?.at(-1)
          if (wiredNode == null) {
            throw new Error(`Could not find animation node for ${roi3d.name}`)
          }
          animation.tracks = animation.tracks.filter(track => !track.name.startsWith(child.uuid))
          this._highlightPlatform.add(child)
          child.position.copy(getPosition(wiredNode))
          if (wiredNode.rotationKeys.length > 0) {
            child.quaternion.copy(wiredNode.rotationKeys[0].quaternion)
          }
          child.updateMatrix()
          child.offsetIndex = 0
          RoiModel.traverseWithOffset(child, object => {
            if (object instanceof THREE.Mesh) {
              if (getSettings().graphics.pbrMaterials) {
                object.material = new THREE.MeshLambertMaterial({ flatShading: object.material.flatShading })
                object.material.transparent = true
                object.material.opacity = 0.95
              }
              object.castShadow = false
            }
          })
          colorMesh(child, highlightColor)
          wiredParts.push(roi3d)
          break
        }
        case ObjectType.Colored:
        case ObjectType.Normal: {
          if (!(child instanceof RoiModel)) {
            throw new Error(`Object3D named '${child.name}' is not an instance of RoiModel`)
          }
          const roi3d = child.roi3d
          if (roi3d == null) {
            throw new Error(`Object3D named '${child.name}' does not contain a Roi3d`)
          }
          // Wrap this object in another group to make it invisible without the animation interfering
          const shelfGroup = new THREE.Group()
          shelfGroup.add(child)
          shelfGroup.visible = true
          world.worldGroup.add(shelfGroup)

          const basename = roi3d.name.slice(0, -2).toLowerCase()
          if (shelfParts.has(basename)) {
            throw new Error(`Shelf part for ${child.name} is already defined`)
          }
          shelfParts.set(basename, { shelfPart: roi3d, shelfGroup, objectType })
          break
        }
      }
    }
    world.worldGroup.add(this._buildPlatform)

    wiredParts.sort((a, b) => saveAt(a.name, -1).localeCompare(saveAt(b.name, -1)))

    for (const wired of wiredParts) {
      const basename = wired.name.slice(0, -2).toLowerCase()
      const shelfItem = shelfParts.get(basename)
      if (shelfItem == null) {
        throw new Error(`No shelf part for ${wired.name} found`)
      }
      const { shelfPart, shelfGroup, objectType } = shelfItem
      const clone = shelfPart.model.clone()
      clone.visible = false
      shelfGroup.add(clone)
      const partObjects = { wired, shelfPart, shelfGroup, clone, objectType, basename }
      this._parts.push(partObjects)
    }

    const clip = new THREE.AnimationClip(animation.animation.tree.name, -1, animation.tracks)
    const mixer = new THREE.AnimationMixer(world.scene)
    const clipAction = mixer.clipAction(clip)
    clipAction.paused = true
    clipAction.play()
    mixer.update(0)

    const shelfNode = findRecursively(animation.animation.tree, node => node.name.toLowerCase().startsWith('shelf'))?.at(-1)
    const shelfSteps = Math.max(1, (shelfNode?.translationKeys.length ?? numberOfShelves + 1) - 1)
    this._shelfMixer = mixer
    this._shelfAction = clipAction
    this._animation = { duration: animation.animation.duration, interval: animation.animation.duration / shelfSteps, clip }
    this.updateParts()
  }

  private _returnState(): void {
    if (this._returnPart()) {
      this._state = IdleState
      this._colorControls.visible = false
      this._decalControls.hide()
    }
  }

  private _returnPart(): boolean {
    const returnPart = (part: Part): void => {
      const index = this._parts.indexOf(part)
      this.updatePart(index)
    }

    switch (this._state.state) {
      case 'dragging':
        returnPart(this._state.selectedPart)
        return true
      case 'selected':
        if (this._state.displayedPart != null) {
          returnPart(this._state.displayedPart)
        }
        return true
      case 'displaying':
        returnPart(this._state.part)
        return true
      default:
        return false
    }
  }

  private _displayPartModel(part: Part): void {
    part.shelfGroup.visible = false
    part.clone.visible = true
    part.clone.quaternion.copy(part.shelfPart.model.quaternion)
    part.clone.scale.copy(part.shelfPart.model.scale)
    part.clone.position.set(0, 0, 0)
    this._displayGroup.add(part.clone)
    this._displayGroup.position.copy(this._displayPosition)
    this._displayGroup.quaternion.identity()
  }

  private _displayPart(): void {
    if (this._state.state === 'selected' || this._state.state === 'dragging') {
      if (this._state.state === 'selected' && this._state.displayedPart != null) {
        if (this._state.displayedPart === this._state.selectedPart) {
          this._returnState()
          return
        }
        this._returnPart()
      }
      const part = this._state.selectedPart
      this._state = { state: 'displaying', part }
      this._displayPartModel(part)
    }
  }

  private async addPart(): Promise<void> {
    if (this._part >= this._parts.length || this.locked) {
      return
    }
    ++this._part
    this.updateParts()
    if (this._part < this._parts.length) {
      engine.currentSaveGame.setVehicleProgress(this._vehicleType, this._part)
      return
    }
    this.skipHost()
    this._phase = 'completing'
    this.onFinish()
    engine.stopBackgroundMusic()
    this._colorControls.visible = false
    this._decalControls.hide()
    engine.input.disable()
    engine.input.allowSpaceWhileDisabled = true
    if (engine.currentSaveGame.act === 2 && this._vehicleType === 'helicopter' && this.onAct2Exit != null) {
      await this.onAct2Exit()
      return
    }
    const state = engine.currentSaveGame.getBuildState(this._vehicleType)
    engine.currentSaveGame.setBuildState(this._vehicleType, { ...state, finishedBuild: true })
    engine.currentSaveGame.setVehicleProgress(this._vehicleType, 0)
    engine.currentSaveGame.clearVehiclePlacement(this._vehicleType)
    engine.respawnVehicle(this._vehicleType)
    this._phase = 'exiting'
    await this.startHost(this._speakerAnimations.completed.name)
    if (engine.currentWorld === this._world) {
      void switchWorld(this._spawnLocation)
    }
  }

  private get _currentPart(): Part | undefined {
    switch (this._state.state) {
      case 'displaying':
        return this._state.part
      case 'dragging':
      case 'selected':
        return this._state.selectedPart
      default:
        return undefined
    }
  }

  public async shelveUp(): Promise<void> {
    if (this._state.state !== 'shelfMoving' && this._animation != null && !this.locked) {
      this._returnState()
      this._state = ShelfMovingState
      this._shelfMotion = { start: this.shelfAnimationTime, elapsed: 0 }
      this._shelfUpSound.playAgain()
    }
  }

  private updateParts(): void {
    for (const index of this._parts.keys()) {
      this.updatePart(index)
    }
  }

  private updatePart(index: number): void {
    if (index < 0 || index >= this._parts.length) {
      throw new Error('Index out of range')
    }
    const part = this._parts[index]
    part.clone.visible = index < this._part
    part.shelfGroup.visible = !part.clone.visible
    part.wired.visible = index === this._part
    if (part.clone.visible) {
      part.wired.model.matrix.decompose(part.clone.position, part.clone.quaternion, part.clone.scale)
      this._buildPlatform.add(part.clone)
    } else {
      this._displayGroup.add(part.clone)
    }
  }

  public update(delta: number): void {
    const motion = this._shelfMotion
    if (motion != null && this._animation != null && this._shelfMixer != null && this._shelfAction != null) {
      motion.elapsed += delta
      this.shelfAnimationTime = shelfFrame(motion.start, this._animation.interval, this._animation.duration, motion.elapsed)
      this._shelfAction.reset().play()
      this._shelfAction.loop = THREE.LoopOnce
      this._shelfAction.clampWhenFinished = true
      this._shelfMixer.setTime(this.shelfAnimationTime / 1000)
      this._shelfAction.paused = true
      if (motion.elapsed >= 0.4) {
        this._shelfMotion = null
        this._state = IdleState
      }
    }
    if (this._host?.tracked) {
      const blink = hostBlink(this._host.action.name, engine.elapsedTimeMilliseconds - this._host.start)
      if (blink != null) {
        if (this._tickledControl != null && this._tickledControl !== blink.control) {
          this._building.getControl(this._tickledControl)?.setDisplayedState(0)
        }
        this._tickledControl = blink.control
        if (blink.control === 'Yellow_Ctl') {
          this._colorControls.visible = blink.pressed === 1
        } else {
          this._building.getControl(blink.control)?.setDisplayedState(blink.pressed)
          this._colorControls.visible = this._currentPart?.objectType === ObjectType.Colored
        }
      }
    }
    if (this.rotating) {
      if (this._currentPart != null && this._parts.indexOf(this._currentPart) < this._part) {
        this._returnState()
      }
      this._buildPlatform.rotateY(delta * -0.7)
    }
    if (this._state.state === 'displaying') {
      this._displayGroup.rotateY(delta * 1)
    }
    // 200 ms off, 400 ms on
    const highlightTime = (engine.elapsedTimeSeconds * 10) % 6
    this._highlightPlatform.visible = highlightTime < 4
  }

  public pointerDown(normalizedX: number, normalizedY: number): void {
    if (this.locked) {
      return
    }
    this._introPlaying = false
    this._startMouse.set(normalizedX, normalizedY)
    let part = this._rayclick.pointerDown(normalizedX, normalizedY, this._parts, part => part.clone)
    if (part == null) {
      part = this._rayclick.pointerDown(normalizedX, normalizedY, this._parts, part => part.shelfPart.model)
      // The shelf part may be visible, but not the group
      if (part != null && !part.shelfGroup.visible) {
        return
      }
    }
    if (part != null) {
      // when a part is displayed, also store it information
      const displayedPart = this._state.state === 'displaying' ? this._state.part : null
      // when a part is displayed and clicked, it needs to use that information
      this._state = { state: 'selected', selectedPart: part, displayedPart }
      this._colorControls.visible = part.objectType === ObjectType.Colored
      this._decalControls.partName = part.basename
      this._selectionSound.playAgain()
      this._missclicks = 0
    } else {
      this._returnState()
    }
  }

  public pointerUp(): void {
    if (this.locked) {
      return
    }
    if (this._controlClick) {
      this._controlClick = false
      this._missclicks = 0
      return
    }
    if (this._state.state === 'idle' && !this._host?.tracked && ++this._missclicks > 2) {
      this._missclicks = 0
      void this.startHost(buildHosts[this._vehicleType].hint, true)
    }
    switch (this._state.state) {
      case 'selected':
        this._displayPart()
        break
      case 'dragging': {
        const part = this._state.selectedPart
        const index = this._parts.indexOf(part)
        if ((index < this._part || interchangeablePart(part.shelfPart.name, this._parts[this._part]?.shelfPart.name ?? '')) && this.targetPart(part).wired.model.getWorldBoundingSphere().intersectsSphere(part.clone.getWorldBoundingSphere())) {
          this._returnState()
          if (index >= this._part) {
            if (index !== this._part) {
              const next = this._parts[this._part]
              this._parts[this._part] = { ...part, wired: next.wired }
              this._parts[index] = { ...next, wired: part.wired }
            }
            void this.addPart()
          }
          this._placementSound.playAgain()
          break
        }
        this._displayPart()
        break
      }
    }
  }

  public pointerMove(normalizedX: number, normalizedY: number): void {
    if (this._state.state === 'selected') {
      // selection from shelf
      if (this._state.displayedPart == null || this._state.displayedPart !== this._state.selectedPart) {
        // return the displayed part
        this._returnPart()
        this._displayPartModel(this._state.selectedPart)
      }
      const partQuarternion = this._state.selectedPart.clone.quaternion.clone().invert()
      const startQuarternion = this._state.selectedPart.clone.getWorldQuaternion(new THREE.Quaternion()).multiply(partQuarternion)
      const endQuarternion = this.targetPart(this._state.selectedPart).wired.model.getWorldQuaternion(new THREE.Quaternion()).multiply(partQuarternion)
      this._state = { state: 'dragging', selectedPart: this._state.selectedPart, startQuarternion, endQuarternion }
    }
    if (this._state.state === 'dragging') {
      const targetScreenCoords = this.targetPart(this._state.selectedPart).wired.model.getWorldPosition(new THREE.Vector3()).clone().project(this._world.camera)
      const sourceScreenCoords = this._displayPosition.clone().project(this._world.camera)
      targetScreenCoords.z = 0
      sourceScreenCoords.z = 0

      normalizedX += sourceScreenCoords.x - this._startMouse.x
      normalizedY += sourceScreenCoords.y - this._startMouse.y
      const targetPosition = this.targetPart(this._state.selectedPart).wired.model.getWorldPosition(new THREE.Vector3())
      const plane =
        normalizedY > sourceScreenCoords.y
          ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -this._displayPosition.z)
          : normalizedY < targetScreenCoords.y
            ? new THREE.Plane(new THREE.Vector3(0, 1, 0), -targetPosition.y)
            : new THREE.Plane(new THREE.Vector3(0, 0, 1), -(this._displayPosition.z + ((targetPosition.z - this._displayPosition.z) * (sourceScreenCoords.y - normalizedY)) / Math.max(0.000001, sourceScreenCoords.y - targetScreenCoords.y)))

      const ndc = new THREE.Vector3(normalizedX, normalizedY, 0.5).unproject(this._world.camera)
      const origin = this._world.camera.position.clone()
      const direction = ndc.sub(origin).normalize()
      const ray = new THREE.Ray(origin, direction)

      const targetPoint = new THREE.Vector3()
      if (ray.intersectPlane(plane, targetPoint) == null) {
        return
      }

      const screenDistance = Math.max(0.000001, Math.hypot((targetScreenCoords.x - sourceScreenCoords.x) * 320, (targetScreenCoords.y - sourceScreenCoords.y) * 240))
      const pointerDistance = Math.hypot((normalizedX - sourceScreenCoords.x) * 320, (normalizedY - sourceScreenCoords.y) * 240)

      const quaternion = new THREE.Quaternion().slerpQuaternions(this._state.startQuarternion, this._state.endQuarternion, pointerDistance / screenDistance)
      this._displayGroup.position.copy(targetPoint)
      this._displayGroup.quaternion.copy(quaternion)
    }
  }

  private _replaceTexture(event: ControlEvent, object: RoiModel): void {
    if (!isTextureAction(event.otherAction)) {
      return
    }
    const textureAction = event.otherAction
    const textureName =
      'filename' in textureAction && typeof textureAction.filename === 'string'
        ? textureAction.filename
            .split(/[\\/]/)
            .at(-1)
            ?.replace(/\.[^.]+$/, '')
            .toLowerCase()
        : undefined
    const slot = VehicleTextureSlots.find(slot => slot === textureName)
    if (slot != null) {
      engine.currentSaveGame.setVehicleTexture(slot, `${textureAction.siFile}/${textureAction.id}`)
      replaceNamedTexture(slot, createTexture(textureAction))
    }
    object.traverse(object => {
      if (object instanceof THREE.Mesh) {
        const material = object.material
        if (material.map != null) {
          material.map = createTexture(textureAction)
        }
      }
    })
  }

  public handleControl(buttonName: string, event: ControlEvent): boolean {
    this._missclicks = 0
    this._controlClick = true
    this._introPlaying = false
    if (this.locked) {
      return true
    }
    if (buttonName === 'Exit_Ctl') {
      void this.requestExit()
      return true
    }
    if (buttonName === 'Info_Ctl') {
      if (engine.currentSaveGame.act !== 2) {
        this.skipHost()
        this._returnState()
        void switchWorld({ ending: null })
      }
      return true
    }
    switch (buttonName) {
      case 'Platform_Ctl':
        this.rotating = true
        return true
      case 'ShelfUp_Ctl':
        void this.shelveUp()
        return true
      default: {
        const part: Part | undefined = this._currentPart
        if (part != null) {
          if (this._decalControls.isButton(buttonName)) {
            this._replaceTexture(event, part.shelfPart.model)
            this._replaceTexture(event, part.clone)
            this._decalControls.sound.playAgain()
            return true
          }
          const customColor = this._colorControls.getColor(buttonName)
          if (customColor != null) {
            const colorTableName = `c_${part.shelfPart.name}`
            if (isColorTableName(colorTableName)) {
              engine.currentSaveGame.setColor(colorTableName, customColor)
            }
            const threeColor = toThreeColor(colorAliases[customColor])
            colorMesh(part.shelfPart.model, threeColor)
            colorMesh(part.clone, threeColor)
            this._colorControls.sound.playAgain()
            return true
          }
        }
        return false
      }
    }
  }
}
