import * as THREE from 'three'
import type { IsleParam } from '../../worlds/isle'
import { type ActorAction, type AnimationAction, type AudioAction, type ControlAction, type EntityAction, getExtraValue, type ImageAction, isAnimationAction, isControlAction, isImageAction, type ParallelAction, type SerialAction } from '../action-types'
import { parse3DAnimation } from '../assets/animation'
import { Control } from '../assets/control'
import { getAction } from '../assets/load'
import { getWorld } from '../assets/model'
import { createTexture } from '../assets/texture'
import { type Composer, Render2D } from '../effect/composer'
import { TransparentEdgeBlurEffect } from '../effect/transparent-edge-blur'
import { engine } from '../engine'
import { switchWorld } from '../switch-world'
import type { World } from './world'

export class Building {
  private _render = new Render2D()
  private _controls: Control[] = []
  private _exitSpawnPoint?: {
    boundaryName: string
    source: number
    sourceScale: number
    destination: number
    destinationScale: number
  }

  constructor() {
    this._render.addEffect(new TransparentEdgeBlurEffect())
  }

  public onButtonClicked: (buttonName: string) => boolean = _buttonName => false

  public async init({
    world,
    startUpAction,
    backgroundMusic,
    exitSpawnPoint,
  }: {
    world: World
    startUpAction:
      | ParallelAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, 'LegoWorldPresenter'>
      | SerialAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, 'LegoWorldPresenter'>
      | ParallelAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction, null>
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
    if (worldName != null) {
      world.scene.add(await getWorld(worldName as Parameters<typeof getWorld>[0]))
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
      world.scene.add(ambientLight)
    }

    for (const child of startUpAction.children) {
      if (isImageAction(child) && child.name.endsWith('Background_Bitmap')) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: createTexture(child), transparent: true }))
        mesh.position.z = -1
        this._render.scene.add(mesh)
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
          this._render.scene.add(control.sprite)
        })
      }
    }
  }

  public activate(composer: Composer): void {
    composer.add(this._render)
  }

  public pointerDown(normalizedX: number, normalizedY: number): void {
    for (const control of this._controls) {
      if (control.pointerDown(normalizedX, normalizedY)) {
        if (control.name === 'Info_Ctl') {
          void switchWorld('infomain')
          return
        }

        if (control.name.endsWith('Door_Ctl')) {
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
