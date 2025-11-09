import * as THREE from 'three'
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js'
import { getSpawnLocation, type IsleParam, type SpawnLocation } from '../../worlds/isle-base'
import { type ActionBase, type ActorAction, type AnimationAction, type AudioAction, type ControlAction, type EntityAction, getExtraValue, type ImageAction, isAnimationAction, isControlAction, isImageAction, type ParallelAction, type SerialAction } from '../action-types'
import { parse3DAnimation } from '../assets/animation'
import { Control, type ControlEvent } from '../assets/control'
import { getAction } from '../assets/load'
import { getWorld } from '../assets/model'
import { createTexture, createTextureAsync } from '../assets/texture'
import { type Composer, Render2D } from '../effect/composer'
import { TransparentEdgeBlurEffect } from '../effect/transparent-edge-blur'
import { engine } from '../engine'
import { getSettings } from '../settings'
import { switchWorld } from '../switch-world'
import type { World, WorldName } from './world'

export class Building {
  private _render = new Render2D()
  private _controls: Control[] = []
  private _exitSpawnPoint?:
    | {
        spawn: SpawnLocation
        control: string
      }
    | {
        world: WorldName
        control: string
      }

  constructor() {
    this._render.addEffect(new TransparentEdgeBlurEffect())
  }

  public onButtonClicked: (buttonName: string, event: ControlEvent) => boolean = _buttonName => false

  public getControl(name: string): Control | null {
    for (const control of this._controls) {
      if (control.name === name) {
        return control
      }
    }
    return null
  }

  public async init({
    world,
    startUpAction,
    backgroundMusic,
    exitSpawnPoint,
    noLights,
  }: {
    world: World
    startUpAction:
      | ParallelAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction | AudioAction | ActionBase, 'LegoWorldPresenter'>
      | SerialAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction | AudioAction, 'LegoWorldPresenter'>
      | ParallelAction<ActorAction | EntityAction | ImageAction | AnimationAction | ControlAction | AudioAction, null>
    backgroundMusic?: AudioAction
    exitSpawnPoint?:
      | {
          spawn: SpawnLocation
          control?: string
        }
      | {
          world: WorldName
          control?: string
        }
    noLights?: boolean
  }): Promise<void> {
    this._exitSpawnPoint =
      exitSpawnPoint == null
        ? undefined
        : (() => {
            const control = exitSpawnPoint?.control ?? 'Door_Ctl'
            if ('world' in exitSpawnPoint) {
              return { world: exitSpawnPoint.world, control }
            } else {
              return { spawn: exitSpawnPoint.spawn, control }
            }
          })()

    if (backgroundMusic != null) {
      engine.switchBackgroundMusic(backgroundMusic)
    }

    const worldName = getExtraValue(startUpAction, 'World')?.trim()
    if (worldName != null) {
      world.worldGroup = await getWorld(worldName as Parameters<typeof getWorld>[0])
      if (!getSettings().graphics.pbrMaterials) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
        world.scene.add(ambientLight)
      }

      if (noLights !== true) {
        const sunLight = new THREE.PointLight(0xffffff, 1, 1000, 0)
        world.scene.add(sunLight)
        const directionalLight = new THREE.DirectionalLight(0xffffff)
        if (getSettings().graphics.shadows) {
          directionalLight.castShadow = true
          directionalLight.shadow.mapSize.set(4096, 4096)
          directionalLight.shadow.camera.near = 0.5
          directionalLight.shadow.camera.far = 500
          directionalLight.shadow.camera.left = -200
          directionalLight.shadow.camera.right = 200
          directionalLight.shadow.camera.top = 200
          directionalLight.shadow.camera.bottom = -200
        }
        world.scene.add(directionalLight)
      }
    }

    const initPromises: Promise<void>[] = []
    for (const child of startUpAction.children) {
      if (isImageAction(child) && (child.name.endsWith('Background_Bitmap') || child.name.endsWith('Background'))) {
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
        initPromises.push(
          getAction(child).then(action => {
            const animation = parse3DAnimation(action)
            world.setupCameraForAnimation(animation.tree)
          }),
        )
      }

      if (isControlAction(child)) {
        initPromises.push(
          Control.create(child).then(control => {
            this._controls.push(control)
            this._render.scene.add(control.sprite)
          }),
        )
      }
    }

    await Promise.all(initPromises)
  }

  public get scene(): THREE.Scene {
    return this._render.scene
  }

  public activate(composer: Composer): void {
    composer.add(this._render)
  }

  public pointerDown(normalizedX: number, normalizedY: number): void {
    for (const control of this._controls) {
      const result = control.pointerDown(normalizedX, normalizedY)
      if (result != null) {
        if (engine.currentWorld.name !== 'infomain' && control.name === 'Info_Ctl') {
          void switchWorld('infomain')
          return
        }

        if (this._exitSpawnPoint != null && control.name.endsWith(this._exitSpawnPoint.control)) {
          if ('world' in this._exitSpawnPoint) {
            void switchWorld(this._exitSpawnPoint.world)
          } else {
            void switchWorld('isle', getSpawnLocation(this._exitSpawnPoint.spawn) satisfies IsleParam)
          }
          return
        }

        if (control.name.endsWith('Radio_Ctl')) {
          if (result.state === 1) {
            engine.resumeBackgroundMusic()
          } else {
            engine.pauseBackgroundMusic()
          }
          return
        }

        if (!this.onButtonClicked(control.name, result)) {
          console.warn(`Button ${control.name} not handled`)
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
