import * as THREE from 'three'
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js'
import { type ActionBase, type ActorAction, type AnimationAction, type AudioAction, type ControlAction, type EntityAction, getExtraValue, type ImageAction, isActorAction, isAnimationAction, isControlAction, isImageAction, type ParallelAction, type RunAnimationAction, type SerialAction } from '../action-types'
import { parse3DAnimation } from '../assets/animation'
import { createImageSprite } from '../assets/canvas-sprite'
import { type Control, type ControlEvent, ControlsCollection } from '../assets/control'
import { getAction } from '../assets/load'
import { getWorld } from '../assets/model'
import { getSpawnLocation, type SpawnLocation } from '../assets/spawn-location'
import { createTextureAsync } from '../assets/texture'
import { type Composer, Render2D } from '../effect/composer'
import { TransparentEdgeBlurEffect } from '../effect/transparent-edge-blur'
import { engine } from '../engine'
import { getSettings } from '../settings'
import { switchWorld } from '../switch-world'
import type { NormalWorld, World, WorldSpawn } from './world'

export class Building {
  private _world: World | null = null
  private _backgroundMusic?: AudioAction
  private _render = new Render2D()
  private _controls = new ControlsCollection(this._render)
  private _exitSpawnPoint?: {
    world: WorldSpawn
    control: string
    animation?: RunAnimationAction
  }

  constructor() {
    this._render.addEffect(new TransparentEdgeBlurEffect())
    this._controls.onButtonClicked = (buttonName, event) => {
      if (this._exitSpawnPoint != null && buttonName.endsWith(this._exitSpawnPoint.control)) {
        const spawn = this._exitSpawnPoint.world
        const animationPromise = this._exitSpawnPoint.animation != null && this._world != null ? this._world.playAnimation(this._exitSpawnPoint.animation) : Promise.resolve()
        animationPromise.then(() => {
          void switchWorld(spawn)
        })
        return true
      }

      if (buttonName.endsWith('Radio_Ctl')) {
        if (event.state === 1) {
          engine.resumeBackgroundMusic()
        } else {
          engine.pauseBackgroundMusic()
        }
        return true
      }

      return this.onButtonClicked(buttonName, event)
    }
  }

  public onButtonClicked: (buttonName: string, event: ControlEvent) => boolean = _buttonName => false

  public getControl(name: string): Control | null {
    return this._controls.getControl(name)
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
          animation?: RunAnimationAction
        }
      | {
          world: NormalWorld
          control?: string
          animation?: RunAnimationAction
        }
    noLights?: boolean
  }): Promise<void> {
    this._exitSpawnPoint =
      exitSpawnPoint == null
        ? undefined
        : (() => {
            const control = exitSpawnPoint?.control ?? 'Door_Ctl'
            const world: WorldSpawn = 'world' in exitSpawnPoint ? { name: exitSpawnPoint.world } : { name: 'isle', spawn: getSpawnLocation(exitSpawnPoint.spawn) }
            return { world, control, animation: exitSpawnPoint.animation }
          })()

    this._world = world

    this._backgroundMusic = backgroundMusic

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
          directionalLight.shadow.radius = 1.5
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
        const background = createImageSprite(child)
        background.position.z = -1
        background.material.transparent = true
        this._render.scene.add(background)

        if (getSettings().graphics.pbrMaterials) {
          void createTextureAsync(child).then(async texture => {
            world.scene.environment = new THREE.PMREMGenerator(engine.renderer).fromEquirectangular(texture).texture
            world.scene.environmentIntensity = 0.1
            const cubeRenderTarget = new THREE.WebGLCubeRenderTarget()
            cubeRenderTarget.fromEquirectangularTexture(engine.renderer, texture)
            void LightProbeGenerator.fromCubeRenderTarget(engine.renderer, cubeRenderTarget).then(lightProbe => {
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
        initPromises.push(this._controls.addControl(child))
      }

      if (isActorAction(child)) {
        const actorName = getExtraValue(child.children[0], 'AUTO_CREATE')
        if (actorName != null) {
          const actor = await this._world.getActor(actorName.toLowerCase())
          actor.visible = getExtraValue(child.children[0], 'Visibility')?.toLowerCase() !== 'false'
        }
      }
    }

    await Promise.all(initPromises)
  }

  public get scene(): THREE.Scene {
    return this._render.scene
  }

  public activate(composer: Composer): void {
    this.pointerUp() // Reset control state
    composer.add(this._render)
    if (this._backgroundMusic != null) {
      void engine.switchBackgroundMusic(this._backgroundMusic)
    }
  }

  public pointerDown(normalizedX: number, normalizedY: number): boolean {
    return this._controls.pointerDown(normalizedX, normalizedY)
  }

  public pointerUp(): void {
    this._controls.pointerUp()
  }
}
