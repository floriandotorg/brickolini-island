import * as THREE from 'three'
import type { AnimationAction, ControlAction, ImageAction } from '../../lib/action-types'
import { type Animation3DNode, findRecursively } from '../../lib/assets/animation'
import { createImageSprite } from '../../lib/assets/canvas-sprite'
import type { Control } from '../../lib/assets/control'
import { colorAliases, colorMesh, toThreeColor } from '../../lib/assets/mesh'
import { Roi3D } from '../../lib/assets/model'
import { engine } from '../../lib/engine'
import { getSettings } from '../../lib/settings'
import type { Building } from '../../lib/world/building'
import type { BuiltAnimation, World } from '../../lib/world/world'

type Part = { readonly wired: Roi3D; readonly shelfPart: Roi3D; readonly shelfGroup: THREE.Group; readonly clone: Roi3D; readonly objectType: ObjectType; readonly basename: string }

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

export const buildColorControls = (background: ImageAction, building: Building, ...colors: { readonly action: ControlAction; readonly color: CustomColor }[]): CustomColorControls => {
  const colorControls = colors.map(color => {
    const control = building.getControl(color.action.name)
    if (control == null) {
      throw new Error(`Cannot find color control ${color.action.name}`)
    }
    return { control, color: color.color }
  })
  return new CustomColorControls(background, colorControls)
}

export type CustomColorControl = { readonly control: Control; readonly color: CustomColor }
export type CustomColor = 'lego yellow' | 'lego red' | 'lego blue' | 'lego green' | 'lego white' | 'lego black'

export class CustomColorControls {
  public readonly background: THREE.Sprite
  private readonly _colors: CustomColorControl[]
  private _visible: boolean = false

  public constructor(background: ImageAction, colors: CustomColorControl[]) {
    this.background = createImageSprite(background, -0.75)
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
  private readonly _parts: Part[] = []
  private _part = 0
  private readonly _colorControls: CustomColorControls
  private readonly _decalBackground: THREE.Sprite | null
  private readonly _decals: Map<string, Control[]>
  private readonly _buildPlatform = new THREE.Group()
  private readonly _highlightPlatform = new THREE.Group()
  private readonly _displayPosition
  private readonly _displayGroup = new THREE.Group()
  private readonly _rayclick: RayClick
  private _state: States = IdleState
  private _animation: { duration: number; interval: number; clip: THREE.AnimationClip } | null = null
  private shelfAnimationTime: number = 0

  public rotating = false

  public static async create(world: World, building: Building, displayPosition: THREE.Vector3, colorControls: CustomColorControls, decalBackground: ImageAction | null, decals: Map<string, Control[]>, ...animations: AnimationAction[]): Promise<Carbuild> {
    const animation = await world.buildAnimation(animations[Math.floor(Math.random() * animations.length)])
    return new Carbuild(world, building, displayPosition, colorControls, decalBackground, decals, animation)
  }

  private constructor(world: World, building: Building, displayPosition: THREE.Vector3, colorControls: CustomColorControls, decalBackground: ImageAction | null, decals: Map<string, Control[]>, animation: BuiltAnimation) {
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

    this._colorControls = colorControls
    building.scene.add(this._colorControls.background)

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

    this._rayclick = new RayClick(this._world.camera)

    const shelfParts = new Map<string, { readonly shelfPart: Roi3D; readonly shelfGroup: THREE.Group; readonly objectType: ObjectType }>()
    const wiredParts: Roi3D[] = []
    for (const child of [...world.worldGroup.children]) {
      const objectType = determineObjectType(child.name)
      switch (objectType) {
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
          this._highlightPlatform.add(child)
          child.position.copy(getPosition(wiredNode))
          if (wiredNode.rotationKeys.length > 0) {
            child.quaternion.copy(wiredNode.rotationKeys[0].quaternion)
          }
          child.updateMatrix()
          child.offsetIndex = 0
          Roi3D.traverseWithOffset(child, object => {
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
          wiredParts.push(child)
          break
        }
        case ObjectType.Colored:
        case ObjectType.Normal: {
          if (!(child instanceof Roi3D)) {
            throw new Error(`Object3D named '${child.name}' is not an instance of Roi3D`)
          }
          // Wrap this object in another group to make it invisible without the animation interfering
          const shelfGroup = new THREE.Group()
          shelfGroup.add(child)
          shelfGroup.visible = true
          world.worldGroup.add(shelfGroup)

          const basename = child.ownName.slice(0, -2).toLowerCase()
          if (shelfParts.has(basename)) {
            throw new Error(`Shelf part for ${child.name} is already defined`)
          }
          shelfParts.set(basename, { shelfPart: child, shelfGroup, objectType })
          break
        }
      }
    }
    world.worldGroup.add(this._buildPlatform)
    console.log(numberOfShelves)
    console.log(animation.tracks)

    wiredParts.sort((a, b) => saveAt(a.name, -1).localeCompare(saveAt(b.name, -1)))

    for (const wired of wiredParts) {
      const basename = wired.ownName.slice(0, -2).toLowerCase()
      const shelfItem = shelfParts.get(basename)
      if (shelfItem == null) {
        throw new Error(`No shelf part for ${wired.name} found`)
      }
      const { shelfPart, shelfGroup, objectType } = shelfItem
      const clone = shelfPart.clone()
      clone.visible = false
      shelfGroup.add(clone)
      const partObjects = { wired, shelfPart, shelfGroup, clone, objectType, basename }
      this._parts.push(partObjects)
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
      this._colorControls.visible = false
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
    const returnPartToShelf = (part: Part): void => {
      const index = this._parts.indexOf(part)
      part.shelfGroup.visible = index >= this._part
      part.clone.visible = false
    }

    switch (this._state.state) {
      case 'dragging':
        returnPartToShelf(this._state.selectedPart)
        return true
      case 'selected':
        if (this._state.displayedPart != null) {
          returnPartToShelf(this._state.displayedPart)
        }
        return true
      case 'displaying':
        returnPartToShelf(this._state.part)
        return true
      default:
        return false
    }
  }

  private _takePartFromShelf(part: Part): void {
    part.shelfGroup.visible = false
    part.clone.visible = true
    part.clone.quaternion.copy(part.shelfPart.quaternion)
    this._displayGroup.position.copy(this._displayPosition)
    this._displayGroup.quaternion.identity()
  }

  private _displayPart(): void {
    if (this._state.state === 'selected' || this._state.state === 'dragging') {
      if (this._state.state === 'selected' && this._state.displayedPart != null) {
        if (this._state.displayedPart === this._state.selectedPart) {
          this._returnToShelf()
          return
        }
        this._returnPartToShelf()
      }
      const part = this._state.selectedPart
      this._state = { state: 'displaying', part }
      this._takePartFromShelf(part)
    }
  }

  private addPart(): void {
    if (this._part < this._parts.length) {
      this._part++
      this.updateParts()
    }
  }

  private _colorCurrentPart(color: CustomColor): void {
    const part: Part | undefined = (() => {
      switch (this._state.state) {
        case 'displaying':
          return this._state.part
        case 'dragging':
        case 'selected':
          return this._state.selectedPart
        default:
          return undefined
      }
    })()
    if (part != null) {
      const threeColor = toThreeColor(colorAliases[color])
      colorMesh(part.shelfPart, threeColor)
      colorMesh(part.clone, threeColor)
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
      part.clone.visible = index < this._part
      part.shelfGroup.visible = !part.clone.visible
      part.wired.visible = index === this._part
      if (part.clone.visible) {
        part.wired.matrix.decompose(part.clone.position, part.clone.quaternion, part.clone.scale)
        this._buildPlatform.add(part.clone)
      } else {
        this._displayGroup.add(part.clone)
      }
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
    let part = this._rayclick.pointerDown(normalizedX, normalizedY, this._parts, part => part.clone)
    if (part == null) {
      part = this._rayclick.pointerDown(normalizedX, normalizedY, this._parts, part => part.shelfPart)
      // The shelf part may be visible, but not the group
      if (part != null && !part.shelfGroup.visible) {
        return
      }
    } else if (this._parts.indexOf(part) < this._part) {
      // TODO: Handle clicking on placed parts (clones)
      return
    }
    if (part != null) {
      // when a part is displayed, also store it information
      const displayedPart = this._state.state === 'displaying' ? this._state.part : null
      // when a part is displayed and clicked, it needs to use that information
      this._state = { state: 'selected', selectedPart: part, displayedPart }
      this._colorControls.visible = part.objectType === ObjectType.Colored
      if (this._decalBackground != null) {
        this._decalBackground.visible = false
      }
      for (const [partName, controls] of this._decals) {
        const validDecal = part.basename.endsWith(partName.toLowerCase())
        for (const control of controls) {
          control.visible = validDecal
        }
        if (validDecal && this._decalBackground != null) {
          this._decalBackground.visible = true
        }
      }
    }
  }

  public pointerUp(): void {
    switch (this._state.state) {
      case 'selected':
        this._displayPart()
        break
      case 'dragging': {
        const part = this._state.selectedPart
        if (this._parts[this._part] === part && part.wired.getWorldBoundingSphere().intersect(part.clone.getWorldBoundingSphere())) {
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
      if (this._state.displayedPart == null || this._state.displayedPart !== this._state.selectedPart) {
        // return the displayed part
        this._returnPartToShelf()
        this._takePartFromShelf(this._state.selectedPart)
      }
      const partQuarternion = this._state.selectedPart.clone.quaternion.clone().invert()
      const startQuarternion = this._state.selectedPart.clone.getWorldQuaternion(new THREE.Quaternion()).multiply(partQuarternion)
      const endQuarternion = this._state.selectedPart.wired.getWorldQuaternion(new THREE.Quaternion()).multiply(partQuarternion)
      this._state = { state: 'dragging', selectedPart: this._state.selectedPart, startQuarternion, endQuarternion }
    }
    if (this._state.state === 'dragging') {
      const targetScreenCoords = this._state.selectedPart.wired.getWorldPosition(new THREE.Vector3()).clone().project(this._world.camera)
      const sourceScreenCoords = this._displayPosition.clone().project(this._world.camera)
      targetScreenCoords.z = 0
      sourceScreenCoords.z = 0

      const distanceY = sourceScreenCoords.y - targetScreenCoords.y
      const ratioY = (normalizedY - targetScreenCoords.y) / distanceY

      const plane = (() => {
        if (ratioY >= 0) {
          const alpha = Math.min(ratioY, 1)
          const normal = this._world.camera.getWorldDirection(new THREE.Vector3())
          const targetPoint = this._state.selectedPart.wired.getWorldPosition(new THREE.Vector3())
          const planePoint = targetPoint.clone().lerp(this._displayPosition, alpha)
          return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, planePoint)
        } else {
          const normal = this._world.camera.up
          const planePoint = this._state.selectedPart.wired.getWorldPosition(new THREE.Vector3())
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

  public handleControl(buttonName: string): boolean {
    switch (buttonName) {
      case 'Platform_Ctl':
        this.rotating = true
        return true
      case 'ShelfUp_Ctl':
        this.shelveUp()
        return true
      default: {
        const customColor = this._colorControls.getColor(buttonName)
        if (customColor != null) {
          this._colorCurrentPart(customColor)
          return true
        }
        return false
      }
    }
  }
}
