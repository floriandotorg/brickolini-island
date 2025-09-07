import * as THREE from 'three'
import type { AnimationAction, ImageAction } from '../../lib/action-types'
import { type Animation3DNode, findRecursively } from '../../lib/assets/animation'
import { createImageSprite } from '../../lib/assets/canvas-sprite'
import type { Control } from '../../lib/assets/control'
import { colorAliases, colorMesh, toThreeColor } from '../../lib/assets/mesh'
import { engine } from '../../lib/engine'
import type { Building } from '../../lib/world/building'
import type { BuiltAnimation, World } from '../../lib/world/world'

type Part = { readonly wired: THREE.Object3D; readonly shelfPart: THREE.Object3D; readonly shelfGroup: THREE.Group; readonly placed: THREE.Object3D }

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

type PartSelected = {
  state: 'displaying'
  part: Part
  originalPosition: THREE.Vector3
}

type Idle = {
  state: 'idle'
}

type ShelfMoving = {
  state: 'moving'
}

const IdleState: Idle = { state: 'idle' }
const ShelfMovingState: ShelfMoving = { state: 'moving' }

const highlightColor = toThreeColor(colorAliases['lego red'])

export class Carbuild {
  private readonly _world: World
  private readonly _parts: Part[] = []
  private _part = 0
  private readonly _colorBackground: THREE.Sprite
  private readonly _decalBackground: THREE.Sprite | null
  private readonly _decals: Map<string, Control[]>
  private readonly _buildPlatform = new THREE.Group()
  private readonly _hightlightPlatform = new THREE.Group()
  private readonly _displayGroup = new THREE.Group()
  private _state: PartSelected | Idle | ShelfMoving = IdleState
  private _animation: { duration: number; interval: number; clip: THREE.AnimationClip } | null = null
  private shelfAnimationTime: number = 0

  public rotating = false

  public static async create(world: World, building: Building, displayPosition: THREE.Vector3, colorBackground: ImageAction, decalBackground: ImageAction | null, decals: Map<string, Control[]>, ...animations: AnimationAction[]): Promise<Carbuild> {
    const animation = await world.buildAnimation(animations[Math.floor(Math.random() * animations.length)])
    return new Carbuild(world, building, displayPosition, colorBackground, decalBackground, decals, animation)
  }

  private constructor(world: World, building: Building, displayPosition: THREE.Vector3, colorBackground: ImageAction, decalBackground: ImageAction | null, decals: Map<string, Control[]>, animation: BuiltAnimation) {
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
    this._buildPlatform.add(this._hightlightPlatform)
    console.log(animation.tracks)

    this._displayGroup.position.copy(displayPosition)
    this._displayGroup.updateMatrix()
    this._world.scene.add(this._displayGroup)

    this._colorBackground = createImageSprite(colorBackground, -0.75)
    this._colorBackground.visible = false
    building.scene.add(this._colorBackground)

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

    const shelfParts = new Map<string, { child: THREE.Object3D; childGroup: THREE.Group }>()
    const wiredParts: THREE.Object3D[] = []
    for (const child of [...world.worldGroup.children]) {
      console.log(`${child.name} => ${ObjectType[determineObjectType(child.name)]}`)
      switch (determineObjectType(child.name)) {
        case ObjectType.Shelf:
          numberOfShelves++
          console.log(`Shelf ${numberOfShelves}'s uuid: ${child.uuid}`)
          break
        case ObjectType.Wired: {
          const wiredNode = findRecursively(platformNode, node => child.name.endsWith(node.name))?.at(-1)
          if (wiredNode == null) {
            throw new Error(`Could not find animation node for ${child.name}`)
          }
          animation.tracks = animation.tracks.filter(track => !track.name.startsWith(child.uuid))
          child.removeFromParent()
          this._hightlightPlatform.add(child)
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
      this._world.addClickListener(shelfPart, async () => {
        this._displayPart(part)
        return true
      })
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

  private _removeDisplay(): void {
    if (this._state.state === 'displaying') {
      this._state.part.shelfPart.removeFromParent()
      this._state.part.shelfGroup.add(this._state.part.shelfPart)
      this._state.part.shelfPart.position.copy(this._state.originalPosition)
      this._state = IdleState
      this._colorBackground.visible = false
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

  private _displayPart(part: Part): void {
    if (this._state.state !== 'moving') {
      const samePart = this._state.state === 'displaying' && this._state.part === part
      this._removeDisplay()
      if (samePart) {
        return
      }
      this._state = { state: 'displaying', part, originalPosition: part.shelfPart.position.clone() }
      part.shelfPart.removeFromParent()
      part.shelfPart.position.set(0, 0, 0)
      this._displayGroup.add(part.shelfPart)
      this._colorBackground.visible = determineObjectType(part.shelfPart.name) === ObjectType.Colored
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
    }
  }

  public addPart(): void {
    if (this._part < this._parts.length) {
      this._part++
      this.updateParts()
    }
  }

  public removePart(): void {
    if (this._part > 0) {
      this._part--
      this.updateParts()
    }
  }

  public async shelveUp(): Promise<void> {
    if (this._state.state !== 'moving' && this._animation != null && this._animation.interval > 0) {
      this._removeDisplay()
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
    this._displayGroup.rotateY(delta * 1)
    // 200 ms off, 400 ms on
    const highlightTime = (engine.clock.elapsedTime * 10) % 6
    this._hightlightPlatform.visible = highlightTime < 4
  }
}
