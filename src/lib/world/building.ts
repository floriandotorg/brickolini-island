import * as THREE from 'three'
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js'
import type { IsleParam } from '../../worlds/isle'
import { type ActorAction, type AnimationAction, type AudioAction, type ControlAction, type EntityAction, getExtraValue, type ImageAction, isAnimationAction, isControlAction, isImageAction, type ParallelAction, type SerialAction } from '../action-types'
import { parse3DAnimation } from '../assets/animation'
import { Control } from '../assets/control'
import { getAction } from '../assets/load'
import { getWorld } from '../assets/model'
import { createTexture, createTextureAsync } from '../assets/texture'
import { type Composer, Render2D } from '../effect/composer'
import { TransparentEdgeBlurEffect } from '../effect/transparent-edge-blur'
import { engine } from '../engine'
import { getSettings } from '../settings'
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

  public onButtonClicked: (buttonName: string, state: number) => boolean = _buttonName => false

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
      if (!getSettings().graphics.pbrMaterials) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
        world.scene.add(ambientLight)
      }
    }

    const configAnimationPromises: Promise<void>[] = []
    for (const child of startUpAction.children) {
      if (isImageAction(child) && child.name.endsWith('Background_Bitmap')) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: createTexture(child), transparent: true }))
        mesh.position.z = -1
        this._render.scene.add(mesh)

        if (getSettings().graphics.pbrMaterials) {
          createTextureAsync(child).then(async texture => {
            world.scene.environment = new THREE.PMREMGenerator(engine.renderer).fromEquirectangular(texture).texture
            world.scene.environmentIntensity = 0.1
            const cubeRenderTarget = new THREE.WebGLCubeRenderTarget()
            cubeRenderTarget.fromEquirectangularTexture(engine.renderer, texture)
            LightProbeGenerator.fromCubeRenderTarget(engine.renderer, cubeRenderTarget).then(lightProbe => {
              world.scene.add(lightProbe)
            })
          })
        }
      }

      if (isAnimationAction(child) && child.name === 'ConfigAnimation') {
        configAnimationPromises.push(
          getAction(child).then(action => {
            const animation = parse3DAnimation(action)
            world.setupCameraForAnimation(animation.tree)
          }),
        )
      }

      if (isControlAction(child)) {
        void Control.create(child).then(control => {
          this._controls.push(control)
          this._render.scene.add(control.sprite)
        })
      }
    }

    await Promise.all(configAnimationPromises)
  }

  public activate(composer: Composer): void {
    composer.add(this._render)
  }

  public pointerDown(normalizedX: number, normalizedY: number): void {
    for (const control of this._controls) {
      const result = control.pointerDown(normalizedX, normalizedY)
      if (result != null) {
        console.log(control)
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

        if (control.name.endsWith('Radio_Ctl')) {
          if (result === 1) {
            engine.resumeBackgroundMusic()
          } else {
            engine.pauseBackgroundMusic()
          }
          return
        }

        if (!this.onButtonClicked(control.name, result)) {
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
