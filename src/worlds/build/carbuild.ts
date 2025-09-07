import * as THREE from 'three'
import type { AnimationAction } from '../../lib/action-types'
import { type Animation3DNode, findRecursively } from '../../lib/assets/animation'
import type { BuiltAnimation, World } from '../../lib/world/world'

type Part = { readonly wired: THREE.Object3D; readonly shelfPart: THREE.Object3D; readonly shelfGroup: THREE.Group; readonly placed: THREE.Object3D }

enum ObjectType {
  Shelf,
  Wired,
  NorY,
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
    case 'y':
      return ObjectType.NorY
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

export class Carbuild {
  private readonly _world: World
  private readonly _parts: Part[] = []
  private _part = 0
  private readonly _buildPlatform = new THREE.Group()
  private readonly _displayGroup = new THREE.Group()
  private _state: PartSelected | Idle | ShelfMoving = IdleState
  private _animation: { duration: number; interval: number; clip: THREE.AnimationClip } | null = null
  private shelfAnimationTime: number = 0

  public rotating = false

  public static async create(world: World, displayPosition: THREE.Vector3, ...animations: AnimationAction[]): Promise<Carbuild> {
    const animation = await world.buildAnimation(animations[Math.floor(Math.random() * animations.length)])
    return new Carbuild(world, displayPosition, animation)
  }

  private constructor(world: World, displayPosition: THREE.Vector3, animation: BuiltAnimation) {
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
    console.log(animation.tracks)

    this._displayGroup.position.copy(displayPosition)
    this._displayGroup.updateMatrix()
    this._world.scene.add(this._displayGroup)

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
          this._buildPlatform.add(child)
          child.position.copy(getPosition(wiredNode))
          child.updateMatrix()
          // for (const track of animation.tracks) {
          //   if (track.name === `${child.uuid}.position` && track instanceof THREE.VectorKeyframeTrack) {
          //     const [x, y, z] = track.values.slice(0, 3)
          //     child.position.set(x, y, z)
          //     child.updateMatrix()
          //     break
          //   }
          // }
          wiredParts.push(child)
          break
        }
        case ObjectType.NorY: {
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
  }
}
