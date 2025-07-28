import * as THREE from 'three'
import type { IsleParam } from '../../worlds/isle'
import { type ActorAction, type AnimationAction, type AudioAction, type ControlAction, type EntityAction, getExtraValue, type ImageAction, isAnimationAction, isControlAction, isImageAction, type ParallelAction, type SerialAction } from '../action-types'
import { parse3DAnimation } from '../assets/animation'
import { Control } from '../assets/control'
import { getAction } from '../assets/load'
import { getWorld } from '../assets/model'
import { createTexture } from '../assets/texture'
import { engine } from '../engine'
import { switchWorld } from '../switch-world'
import type { World } from './world'

export class Building {
  private _backgroundScene = new THREE.Scene()
  private _backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private _backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
  private _controls: Control[] = []
  private _exitSpawnPoint?: {
    boundaryName: string
    source: number
    sourceScale: number
    destination: number
    destinationScale: number
  }

  public onButtonClicked: (buttonName: string) => boolean = _buttonName => false

  public async init({
    world,
    startUpAction,
    backgroundMusic,
    exitSpawnPoint,
  }: {
    world: World
    startUpAction: ParallelAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, 'LegoWorldPresenter'> | SerialAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, 'LegoWorldPresenter'>
    backgroundMusic?: AudioAction
    exitSpawnPoint?: {
      boundaryName: string
      source: number
      sourceScale: number
      destination: number
      destinationScale: number
    }
  }): Promise<void> {
    this._exitSpawnPoint = exitSpawnPoint

    if (backgroundMusic != null) {
      engine.switchBackgroundMusic(backgroundMusic)
    }

    const worldName = getExtraValue(startUpAction, 'World')?.trim()
    if (worldName == null) {
      throw new Error('World not found in startUpAction')
    }

    world.scene.add(await getWorld(worldName as Parameters<typeof getWorld>[0]))
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    world.scene.add(ambientLight)

    for (const child of startUpAction.children) {
      if (isImageAction(child) && child.name === 'Background_Bitmap') {
        this._backgroundMesh.material = new THREE.MeshBasicMaterial({ map: createTexture(child) })
        this._backgroundScene.add(this._backgroundMesh)
      }

      if (isAnimationAction(child) && child.name === 'ConfigAnimation') {
        void getAction(child).then(action => {
          const animation = parse3DAnimation(action)
          world.setupCameraForAnimation(animation.tree)
        })
      }

      if (isControlAction(child)) {
        void Control.create(child).then(control => {
          this._controls.push(control)
          this._backgroundScene.add(control.sprite)
        })
      }
    }
  }

  public render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this._backgroundScene, this._backgroundCamera)
    renderer.clearDepth()
  }

  public pointerDown(normalizedX: number, normalizedY: number): void {
    for (const control of this._controls) {
      if (control.pointerDown(normalizedX, normalizedY)) {
        if (control.name === 'Info_Ctl') {
          void switchWorld('infomain')
          return
        }

        if (control.name === 'Door_Ctl') {
          if (this._exitSpawnPoint == null) {
            throw new Error('exitSpawnPoint not found in building config')
          }

          void switchWorld('isle', {
            position: this._exitSpawnPoint,
          } satisfies IsleParam)
          return
        }

        if (!this.onButtonClicked(control.name)) {
          console.log(`Button ${control.name} not handled`)
        }

        return
      }
    }
  }

  public pointerUp(): void {
    for (const control of this._controls) {
      control.pointerUp()
    }
  }
}
