import * as THREE from 'three'
import type { AnimationAction, ControlAction, ImageAction } from '../../lib/action-types'
import { type Animation3DNode, findRecursively } from '../../lib/assets/animation'
import { createImageSprite } from '../../lib/assets/canvas-sprite'
import type { Control } from '../../lib/assets/control'
import { colorAliases, colorMesh, toThreeColor } from '../../lib/assets/mesh'
import { Roi3D } from '../../lib/assets/model'
import { engine } from '../../lib/engine'
import type { Building } from '../../lib/world/building'
import type { BuiltAnimation, World } from '../../lib/world/world'

type Part = { readonly wired: Roi3D; readonly shelfPart: Roi3D; readonly shelfGroup: THREE.Group; readonly placed: THREE.Object3D }

enum ObjectType {
  Shelf,
  Wired,
  Normal,
  Colored,
  Other,
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

const getPosition = (node: Animation3DNode): THREE.Vector3 => {
  return node.translationKeys[0].vertex.clone()
}

const saveAt = (text: string, index: number): string => {
  const result = text.at(index)
  if (result == null) {
    throw new Error(`Index ${index} is not valid for ${text}`)
  }
  return result
}

export const buildDecalMap = (building: Building, partControlMap: ([string, string[]] | string)[]): Map<string, Control[]> => {
  const decalMap = new Map<string, Control[]>()
  for (const item of partControlMap) {
    const [partName, controlNames] = (() => {
      if (typeof item === 'string') {
        return [item, ['Decals_Ctl']]
      } else {
        return item
      }
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
  return decalMap
}

// TODO: Maybe these two can be combined with another type which actually handles these controls and colors the parts
export const buildColorControls = (building: Building, ...actions: ControlAction[]): Control[] => {
  return actions.map(action => {
    const control = building.getControl(action.name)
    if (control == null) {
      throw new Error(`Cannot find color control ${action.name}`)
    }
    return control
  })
}

export type ColorControls = { background: ImageAction; colors: Control[] }

type PartState = {
  part: Part
  originalPosition: THREE.Vector3
}

type PartDisplayed = {
  state: 'displaying'
  partState: PartState
}

type Idle = {
  state: 'idle'
}

type ShelfMoving = {
  state: 'shelfMoving'
}

type PartSelected = {
  state: 'selected'
  selectedPartState: PartState
  displayedPartState: PartState | null
}

type PartDragging = {
  state: 'dragging'
  selectedPartState: PartState
  startQuarternion: THREE.Quaternion
  endQuarternion: THREE.Quaternion
}

type States = PartDisplayed | Idle | ShelfMoving | PartSelected | PartDragging

const IdleState: Idle = { state: 'idle' }
const ShelfMovingState: ShelfMoving = { state: 'shelfMoving' }

const highlightColor = toThreeColor(colorAliases['lego red'])

export class Carbuild {
  private readonly _world: World
  private readonly _parts: Part[] = []
  private _part = 0
  private readonly _colorBackground: THREE.Sprite
  private readonly _colorControls: Control[]
  private readonly _decalBackground: THREE.Sprite | null
  private readonly _decals: Map<string, Control[]>
  private readonly _buildPlatform = new THREE.Group()
  private readonly _highlightPlatform = new THREE.Group()
  private readonly _displayPosition
  private readonly _displayGroup = new THREE.Group()
  private readonly _raycaster = new THREE.Raycaster()
  private _state: States = IdleState
  private _animation: { duration: number; interval: number; clip: THREE.AnimationClip } | null = null
  private shelfAnimationTime: number = 0

  public rotating = false

  public static async create(world: World, building: Building, displayPosition: THREE.Vector3, colorControls: ColorControls, decalBackground: ImageAction | null, decals: Map<string, Control[]>, ...animations: AnimationAction[]): Promise<Carbuild> {
    const animation = await world.buildAnimation(animations[Math.floor(Math.random() * animations.length)])
    return new Carbuild(world, building, displayPosition, colorControls, decalBackground, decals, animation)
  }

  private constructor(world: World, building: Building, displayPosition: THREE.Vector3, colorControls: ColorControls, decalBackground: ImageAction | null, decals: Map<string, Control[]>, animation: BuiltAnimation) {
    this._world = world
    world.setupCameraForAnimation(animation.animation.tree)
    // In theory the "number of shelves" is determined by using the translation keys of the "first" shelf it encounters and subtracting one
    let numberOfShelves = 0
    const platformNode = findRecursively(animation.animation.tree, node => node.name.toLowerCase() === 'platform')?.at(-1)
    if (platformNode == null) {
      throw new Error('Could not find platform node')
    }
    const platformPosition = getPosition(platformNode)
    world.debugDrawSphere(platformPosition, 'red')
    this._buildPlatform.position.copy(platformPosition)
    this._buildPlatform.updateMatrix()
    this._buildPlatform.add(this._highlightPlatform)
    console.log(animation.tracks)

    this._displayPosition = displayPosition
    this._displayGroup.position.copy(displayPosition)
    this._displayGroup.updateMatrix()
    this._world.scene.add(this._displayGroup)

    this._colorBackground = createImageSprite(colorControls.background, -0.75)
    this._colorBackground.visible = false
    building.scene.add(this._colorBackground)
    this._colorControls = colorControls.colors

    if (decalBackground != null) {
      this._decalBackground = createImageSprite(decalBackground, -0.75)
      this._decalBackground.visible = false
      building.scene.add(this._decalBackground)
    } else {
      this._decalBackground = null
    }

    this._decals = decals
    for (const controls of this._decals.values()) {
      for (const control of controls) {
        control.visible = false
      }
    }

    const shelfParts = new Map<string, { child: Roi3D; childGroup: THREE.Group }>()
    const wiredParts: Roi3D[] = []
    for (const child of [...world.worldGroup.children]) {
      console.log(`${child.name} => ${ObjectType[determineObjectType(child.name)]}`)
      switch (determineObjectType(child.name)) {
        case ObjectType.Shelf:
          numberOfShelves++
          console.log(`Shelf ${numberOfShelves}'s uuid: ${child.uuid}`)
          break
        case ObjectType.Wired: {
          if (!(child instanceof Roi3D)) {
            throw new Error(`Object3D named '${child.name}' is not an instance of Roi3D`)
          }
          const wiredNode = findRecursively(platformNode, node => child.name.endsWith(node.name))?.at(-1)
          if (wiredNode == null) {
            throw new Error(`Could not find animation node for ${child.name}`)
          }
          animation.tracks = animation.tracks.filter(track => !track.name.startsWith(child.uuid))
          child.removeFromParent()
          this._highlightPlatform.add(child)
          child.position.copy(getPosition(wiredNode))
          if (wiredNode.rotationKeys.length > 0) {
            child.quaternion.copy(wiredNode.rotationKeys[0].quaternion)
          }
          child.updateMatrix()
          colorMesh(child, highlightColor)
          wiredParts.push(child)
          break
        }
        case ObjectType.Colored:
        case ObjectType.Normal: {
          if (!(child instanceof Roi3D)) {
            throw new Error(`Object3D named '${child.name}' is not an instance of Roi3D`)
          }
          // Wrap this object in another group to make it invisible without the animation interfering
          child.removeFromParent()
          const childGroup = new THREE.Group()
          childGroup.add(child)
          childGroup.visible = true
          world.worldGroup.add(childGroup)

          const matchName = child.name.slice(0, -2).toLowerCase()
          if (shelfParts.has(matchName)) {
            throw new Error(`Shelf part for ${child.name} is already defined`)
          }
          shelfParts.set(matchName, { child, childGroup })
          break
        }
      }
    }
    world.worldGroup.add(this._buildPlatform)
    console.log(numberOfShelves)
    console.log(animation.tracks)

    wiredParts.sort((a, b) => saveAt(a.name, -1).localeCompare(saveAt(b.name, -1)))

    for (const wiredPart of wiredParts) {
      const matchName = wiredPart.name.slice(0, -2).toLowerCase()
      const shelfItem = shelfParts.get(matchName)
      if (shelfItem == null) {
        throw new Error(`No shelf part for ${wiredPart.name} found`)
      }
      const { child: shelfPart, childGroup: shelfGroup } = shelfItem
      const placed = shelfPart.clone()
      placed.visible = false
      wiredPart.matrix.decompose(placed.position, placed.quaternion, placed.scale)
      this._buildPlatform.add(placed)
      const part = { wired: wiredPart, shelfPart, shelfGroup, placed }
      this._parts.push(part)
    }

    console.log(animation.animation.tree)

    const clip = new THREE.AnimationClip(animation.animation.tree.name, -1, animation.tracks)
    const mixer = new THREE.AnimationMixer(world.scene)
    const clipAction = mixer.clipAction(clip)
    clipAction.paused = true
    clipAction.play()
    mixer.update(0)

    this._animation = { duration: animation.animation.duration, interval: animation.animation.duration / numberOfShelves, clip }
    this.updateParts()
  }

  private _returnToShelf(): void {
    if (this._returnPartToShelf()) {
      this._state = IdleState
      this._setColorVisibility(false)
      if (this._decalBackground != null) {
        this._decalBackground.visible = false
      }
      for (const controls of this._decals.values()) {
        for (const control of controls) {
          control.visible = false
        }
      }
    }
  }

  private _returnPartToShelf(): boolean {
    const returnPartToShelf = (partState: PartState): void => {
      partState.part.shelfPart.removeFromParent()
      partState.part.shelfGroup.add(partState.part.shelfPart)
      partState.part.shelfPart.position.copy(partState.originalPosition)
    }

    switch (this._state.state) {
      case 'dragging':
        returnPartToShelf(this._state.selectedPartState)
        return true
      case 'selected':
        if (this._state.displayedPartState != null) {
          returnPartToShelf(this._state.displayedPartState)
        }
        return true
      default:
        return false
    }
  }

  private _takePartFromShelf(part: Part): void {
    part.shelfPart.removeFromParent()
    part.shelfPart.position.set(0, 0, 0)
    this._displayGroup.add(part.shelfPart)
    this._displayGroup.position.copy(this._displayPosition)
    this._displayGroup.quaternion.identity()
  }

  private _displayPart(): void {
    if (this._state.state === 'selected' || this._state.state === 'dragging') {
      if (this._state.state === 'selected' && this._state.displayedPartState != null) {
        if (this._state.displayedPartState.part === this._state.selectedPartState.part) {
          this._returnToShelf()
          return
        }
        this._returnPartToShelf()
      }
      const partState = this._state.selectedPartState
      this._state = { state: 'displaying', partState }
      this._takePartFromShelf(partState.part)
    }
  }

  private addPart(): void {
    if (this._part < this._parts.length) {
      this._part++
      this.updateParts()
    }
  }

  public async shelveUp(): Promise<void> {
    if (this._state.state !== 'shelfMoving' && this._animation != null && this._animation.interval > 0) {
      this._returnToShelf()
      this._state = ShelfMovingState
      const shelfAnimationTimeStop = this.shelfAnimationTime + this._animation.interval
      console.log(`${this.shelfAnimationTime} -> ${shelfAnimationTimeStop}`)
      this._world.playAnimationClip(this._world.scene, this._animation.clip, { startAtTime: this.shelfAnimationTime / 1000, stopAtTime: shelfAnimationTimeStop / 1000, loop: THREE.LoopRepeat }).then(() => {
        this._state = IdleState
      })
      this.shelfAnimationTime = shelfAnimationTimeStop
      if (this.shelfAnimationTime > this._animation.duration) {
        this.shelfAnimationTime -= this._animation.duration
      }
      console.log(`New Start @${this.shelfAnimationTime}`)
    }
  }

  private updateParts(): void {
    for (const [index, part] of this._parts.entries()) {
      part.placed.visible = index < this._part
      part.shelfGroup.visible = !part.placed.visible
      part.wired.visible = index === this._part
    }
  }

  public update(delta: number): void {
    if (this.rotating) {
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
    this._raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this._world.camera)
    let hit: THREE.Object3D | null = this._raycaster.intersectObjects(this._parts.map(part => part.shelfPart))[0]?.object
    while (hit != null) {
      const part = this._parts.find(part => part.shelfPart === hit)
      if (hit.visible && part != null) {
        // when a part is displayed, also store it information
        const displayedPart = this._state.state === 'displaying' ? this._state.partState : null
        // when a part is displayed and clicked, it needs to use that information
        const partState = displayedPart?.part === part ? displayedPart : { part, originalPosition: part.shelfPart.position.clone() }
        this._state = { state: 'selected', selectedPartState: partState, displayedPartState: displayedPart }
        this._setColorVisibility(determineObjectType(part.shelfPart.name) === ObjectType.Colored)
        if (this._decalBackground != null) {
          this._decalBackground.visible = false
        }
        for (const [partName, controls] of this._decals) {
          const validDecal = part.shelfPart.name.slice(0, -2).toLowerCase().endsWith(partName.toLowerCase())
          for (const control of controls) {
            control.visible = validDecal
          }
          if (validDecal && this._decalBackground != null) {
            this._decalBackground.visible = true
          }
        }
        return
      }
      hit = hit.parent
    }
  }

  private _setColorVisibility(visible: boolean): void {
    this._colorBackground.visible = visible
    for (const control of this._colorControls) {
      control.visible = visible
    }
  }

  public pointerUp(): void {
    switch (this._state.state) {
      case 'selected':
        this._displayPart()
        break
      case 'dragging': {
        const part = this._state.selectedPartState.part
        if (this._parts[this._part] === part && part.wired.getWorldBoundingSphere().intersect(part.shelfPart.getWorldBoundingSphere())) {
          this._returnToShelf()
          this.addPart()
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
      if (this._state.displayedPartState == null || this._state.displayedPartState.part !== this._state.selectedPartState.part) {
        // return the displayed part
        this._returnPartToShelf()
        this._takePartFromShelf(this._state.selectedPartState.part)
      }
      const partQuarternion = this._state.selectedPartState.part.shelfPart.quaternion.clone().invert()
      const startQuarternion = this._state.selectedPartState.part.shelfPart.getWorldQuaternion(new THREE.Quaternion()).multiply(partQuarternion)
      const endQuarternion = this._state.selectedPartState.part.wired.getWorldQuaternion(new THREE.Quaternion()).multiply(partQuarternion)
      this._state = { state: 'dragging', selectedPartState: this._state.selectedPartState, startQuarternion, endQuarternion }
    }
    if (this._state.state === 'dragging') {
      const targetScreenCoords = this._state.selectedPartState.part.wired.getWorldPosition(new THREE.Vector3()).clone().project(this._world.camera)
      const sourceScreenCoords = this._displayPosition.clone().project(this._world.camera)
      targetScreenCoords.z = 0
      sourceScreenCoords.z = 0

      const distanceY = sourceScreenCoords.y - targetScreenCoords.y
      const ratioY = (normalizedY - targetScreenCoords.y) / distanceY

      const plane = (() => {
        if (ratioY >= 0) {
          const alpha = Math.min(ratioY, 1)
          const normal = this._world.camera.getWorldDirection(new THREE.Vector3())
          const targetPoint = this._state.selectedPartState.part.wired.getWorldPosition(new THREE.Vector3())
          const planePoint = targetPoint.clone().lerp(this._displayPosition, alpha)
          return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, planePoint)
        } else {
          const normal = this._world.camera.up
          const planePoint = this._state.selectedPartState.part.wired.getWorldPosition(new THREE.Vector3())
          return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, planePoint)
        }
      })()

      const ndc = new THREE.Vector3(normalizedX, normalizedY, 0.5).unproject(this._world.camera)
      const origin = this._world.camera.position.clone()
      const direction = ndc.sub(origin).normalize()
      const ray = new THREE.Ray(origin, direction)

      const targetPoint = new THREE.Vector3()
      ray.intersectPlane(plane, targetPoint)

      const screenDistance = targetScreenCoords.distanceTo(sourceScreenCoords)
      const pointerDistance = new THREE.Vector3(normalizedX, normalizedY, 0).distanceTo(sourceScreenCoords)

      const quaternion = new THREE.Quaternion().slerpQuaternions(this._state.startQuarternion, this._state.endQuarternion, pointerDistance / screenDistance)
      this._displayGroup.position.copy(targetPoint)
      this._displayGroup.quaternion.copy(quaternion)
    }
  }
}
