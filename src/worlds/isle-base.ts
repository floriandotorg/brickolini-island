import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import type { Water } from 'three/addons/objects/Water.js'
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js'
import { IslePath } from '../actions/isle'
import { getBoundaries } from '../lib/assets/boundary'
import { manager } from '../lib/assets/load'
import { calculateTransformationMatrix, getWorld } from '../lib/assets/model'
import { engine, type NormalizedMouseEvent } from '../lib/engine'
import { getSettings } from '../lib/settings'
import { Actor } from '../lib/world/actor'
import { BoundaryManager } from '../lib/world/boundary-manager'
import { Dashboard } from '../lib/world/dashboard'
import { Plants } from '../lib/world/plants'
import { World } from '../lib/world/world'

export type IsleParam = {
  position: {
    boundaryName: string
    source: number
    sourceScale: number
    destination: number
    destinationScale: number
  }
}

export const SpawnLocations = ['infocenterExited', 'jetskibuildExited', 'racecarbuildExited', 'garageExited', 'hospitalExited', 'policeExited'] as const
export type SpawnLocation = (typeof SpawnLocations)[number]

export const getSpawnLocation = (location: SpawnLocation): IsleParam => {
  switch (location) {
    case 'infocenterExited':
      return { position: { boundaryName: 'INT46', source: 0, sourceScale: 0.5, destination: 2, destinationScale: 0.5 } }
    case 'jetskibuildExited':
      return { position: { boundaryName: 'EDG00_46', source: 3, sourceScale: 0.625, destination: 2, destinationScale: 0.03 } }
    case 'racecarbuildExited':
      return { position: { boundaryName: 'INT16', source: 4, sourceScale: 0.1, destination: 2, destinationScale: 0 } }
    case 'garageExited':
      return { position: { boundaryName: 'INT24', source: 2, sourceScale: 0.73, destination: 4, destinationScale: 0.71 } }
    case 'hospitalExited':
      return { position: { boundaryName: 'EDG02_28', source: 3, sourceScale: 0.37, destination: 1, destinationScale: 0.52 } }
    case 'policeExited':
      return { position: { boundaryName: 'EDG02_64', source: 2, sourceScale: 0.24, destination: 0, destinationScale: 0.84 } }
  }
}

export abstract class IsleBase extends World {
  protected _slewMode: boolean = false
  protected _linearVel = 0
  protected _rotVel = 0
  protected _verticalVel = 0
  protected _pitchVel = 0
  protected _groundGroup: THREE.Object3D[] = []
  protected _plantGroup: THREE.Group = new THREE.Group()
  protected _boundaryManager = new BoundaryManager([], this)
  protected _dashboard = new Dashboard()
  protected _sky: Sky | null = null
  protected _ambientLight: THREE.AmbientLight | null = null
  protected _sunLight: THREE.DirectionalLight | null = null
  protected _dayTime = 0
  protected _water: Water | null = null
  protected _isleMesh: THREE.Object3D | null = null
  protected _bikeMesh: THREE.Object3D | null = null
  protected _motobkMesh: THREE.Object3D | null = null
  protected _skateMesh: THREE.Object3D | null = null
  protected _ambulanceMesh: THREE.Object3D[] = []
  protected _towtruckMesh: THREE.Object3D[] = []

  public set water(water: Water) {
    this._water = water
  }

  override async init(): Promise<void> {
    await super.init()

    if (getSettings().graphics.pbrMaterials) {
      new THREE.CubeTextureLoader(manager).load(
        [...Array(6).keys()].map(f => `hd/isle-cubemap/face_${f}.png`),
        async cubeTexture => {
          const lightProbe = LightProbeGenerator.fromCubeTexture(cubeTexture)
          lightProbe.intensity = 0.1
          this.scene.add(lightProbe)
        },
      )

      manager.onLoad = () => {
        this.scene.environment = new THREE.PMREMGenerator(engine.renderer).fromScene(this.scene, 0, 0.1, 1000, {
          size: 1024,
          position: new THREE.Vector3(-15, 10, -1),
        }).texture
        this.scene.environmentIntensity = 0.3
      }
    }

    this.worldGroup = await getWorld('ACT1')

    const actor = await Actor.create(this, 'ml')
    actor.position.set(22, 1, 30)
    actor.rotateY(Math.PI / 2)
    this.scene.add(actor)

    this._plantGroup = await Plants.place(this, Plants.World.ACT1)
    this.scene.add(this._plantGroup)
    if (import.meta.hot) {
      import.meta.hot.accept('../lib/world/plants', async newModule => {
        if (newModule == null) {
          return
        }
        this.scene.remove(this._plantGroup)
        this._plantGroup = await newModule.Plants.place(this, Plants.World.ACT1)
        this.scene.add(this._plantGroup)
      })
    }

    if (new URLSearchParams(window.location.search).get('generate-cubemap') === 'true') {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1), 2)
      this.scene.add(ambientLight)
      this.scene.background = new THREE.Color(1, 1, 1)

      const size = 1024
      const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(size)
      const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget)
      cubeCamera.position.set(0, 10, 0)
      this.scene.add(cubeCamera)

      cubeCamera.update(engine.renderer, this.scene)

      const save = (canvas: HTMLCanvasElement, name: string): void => {
        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            const a: HTMLAnchorElement = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = name
            a.click()
          }
        }, 'image/png')
      }

      ;[...Array(6).keys()].forEach((face: number) => {
        const buffer: Uint8Array = new Uint8Array(4 * size * size)
        engine.renderer.readRenderTargetPixels(cubeRenderTarget, 0, 0, size, size, buffer, face)

        const canvas: HTMLCanvasElement = document.createElement('canvas')
        canvas.width = size
        canvas.height = size

        const context: CanvasRenderingContext2D | null = canvas.getContext('2d')
        if (context) {
          const img = context.createImageData(size, size)
          img.data.set(buffer)
          context.putImageData(img, 0, 0)
        }

        save(canvas, `face_${face}.png`)
      })

      return
    }

    const settings = getSettings()
    if (settings.graphics.sun) {
      this._sky = new Sky()
      this._sky.scale.setScalar(10000)
      this.scene.add(this._sky)
      this._sky.material.uniforms.turbidity.value = 10
      this._sky.material.uniforms.rayleigh.value = 2
      this._sky.material.uniforms.mieCoefficient.value = 0.005
      this._sky.material.uniforms.mieDirectionalG.value = 0.8

      if (!settings.graphics.pbrMaterials) {
        this._ambientLight = new THREE.AmbientLight()
        this.scene.add(this._ambientLight)
      }

      this._sunLight = new THREE.DirectionalLight()
      if (settings.graphics.shadows) {
        this._sunLight.castShadow = true
        this._sunLight.shadow.mapSize.set(4096, 4096)
        this._sunLight.shadow.camera.near = 0.5
        this._sunLight.shadow.camera.far = 500
        this._sunLight.shadow.camera.left = -200
        this._sunLight.shadow.camera.right = 200
        this._sunLight.shadow.camera.top = 200
        this._sunLight.shadow.camera.bottom = -200
      }
      this.scene.add(this._sunLight)

      this._dayTime = 0.5
      this._updateSun()
    } else {
      const ambientLight = new THREE.AmbientLight(new THREE.Color(0.3, 0.3, 0.3))
      this.scene.add(ambientLight)
      const sunLight = new THREE.PointLight(0xffffff, 1, 1000, 0)
      this.scene.add(sunLight)
      const directionalLight = new THREE.DirectionalLight(0xffffff)
      if (settings.graphics.shadows) {
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.set(4096, 4096)
        directionalLight.shadow.camera.near = 0.5
        directionalLight.shadow.camera.far = 500
        directionalLight.shadow.camera.left = -200
        directionalLight.shadow.camera.right = 200
        directionalLight.shadow.camera.top = 200
        directionalLight.shadow.camera.bottom = -200
      }
      this.scene.add(directionalLight)

      const setSkyColor = (hsl: { h: number; s: number; l: number }) => {
        const color = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l).convertSRGBToLinear()
        this.scene.background = color
        const lightColor = new THREE.Color(Math.min(color.r * (1 / 0.23), 1), Math.min(color.g * (1 / 0.63), 1), Math.min(color.b * (1 / 0.85), 1))
        directionalLight.color = lightColor
        sunLight.color = lightColor
      }
      setSkyColor({ h: 0.56, s: 0.54, l: 0.68 })

      const setLightPosition = (index: number) => {
        const lights: [number, number, number, number, number, number][] = [
          [1.0, 0.0, 0.0, -150.0, 50.0, -50.0],
          [0.809, -0.588, 0.0, -75.0, 50.0, -50.0],
          [0.0, -1.0, 0.0, 0.0, 150.0, -150.0],
          [-0.309, -0.951, 0.0, 25.0, 50.0, -50.0],
          [-0.809, -0.588, 0.0, 75.0, 50.0, -50.0],
          [-1.0, 0.0, 0.0, 150.0, 50.0, -50.0],
        ]
        sunLight.position.set(lights[index][3], lights[index][4], lights[index][5])
        sunLight.lookAt(lights[index][0], lights[index][1], lights[index][2])
        directionalLight.position.set(lights[index][0], lights[index][1], lights[index][2])
      }
      setLightPosition(0)
    }

    this._boundaryManager = new BoundaryManager(await getBoundaries(IslePath), this)

    // spell-checker: ignore brdg jailbrdg racebrdg
    for (const name of ['isle_hi', 'inf-brdg', 'jailbrdg', 'racebrdg']) {
      const object = this.scene.getObjectByName(name)
      if (object == null || !(object instanceof THREE.Object3D)) {
        throw new Error(`Mesh ${name} not found`)
      }
      this._groundGroup.push(object)
    }
  }

  protected _updateCameraProjection(position: [number, number, number], direction: [number, number, number], up: [number, number, number], fov: number) {
    const mat = calculateTransformationMatrix(position, direction, up)
    mat.decompose(this.camera.position, this.camera.quaternion, this.camera.scale)
    this.camera.rotateY(Math.PI)
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
  }

  protected _updateSun(): void {
    if (this._sky == null || this._sunLight == null) {
      return
    }

    const elevationDeg = Math.sin(Math.PI * this._dayTime) * 90 // 0-90-0°
    const phi = THREE.MathUtils.degToRad(90 - elevationDeg)
    const theta = THREE.MathUtils.degToRad(135) // fixed azimuth

    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta)

    this._sky.material.uniforms.sunPosition.value.copy(sunDir)

    const intensity = 0.25 + 0.75 * Math.sin(Math.PI * this._dayTime) // 0.25-1-0.25
    const warm = new THREE.Color(0xff9f46) // ≈ 2500 K
    const cold = new THREE.Color(0xfffefa) // ≈ 6500 K
    const color = warm.clone().lerp(cold, Math.sin(Math.PI * this._dayTime)) // warm → cold → warm

    this.scene.environmentIntensity = 0.15 * intensity

    if (this._ambientLight != null) {
      this._ambientLight.intensity = 0.4
      this._ambientLight.color.copy(color)
    }

    const lightElevationDeg = Math.max(elevationDeg, 20)
    const lightPhi = THREE.MathUtils.degToRad(90 - lightElevationDeg)
    const lightDir = new THREE.Vector3().setFromSphericalCoords(1, lightPhi, theta)

    this._sunLight.position.copy(lightDir).multiplyScalar(100)
    this._sunLight.intensity = intensity
    this._sunLight.color.copy(color)

    if (getSettings().graphics.shadows && this._sunLight.shadow) {
      const frustumScale = 1 + (1 - elevationDeg / 90) * 3
      const baseFrustum = 200
      const scaledFrustum = baseFrustum * frustumScale

      this._sunLight.shadow.camera.left = -scaledFrustum
      this._sunLight.shadow.camera.right = scaledFrustum
      this._sunLight.shadow.camera.top = scaledFrustum
      this._sunLight.shadow.camera.bottom = -scaledFrustum

      this._sunLight.shadow.camera.far = 500 + (1 - elevationDeg / 90) * 500
    }

    if (this._water != null) {
      this._water.material.uniforms.sunColor.value.copy(color)
      this._water.material.uniforms.sunDirection.value.copy(sunDir.normalize())
    }
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height)
  }

  public override pointerDown(event: NormalizedMouseEvent): void {
    super.pointerDown(event)
    this._dashboard.pointerDown(event.normalizedX, event.normalizedY)
  }

  public override pointerUp(event: NormalizedMouseEvent): void {
    super.pointerUp(event)
    this._dashboard.pointerUp()
  }

  public override update(delta: number): void {
    super.update(delta)

    this._dayTime = (this._dayTime + delta * (1 / (24 * 60))) % 1
    this._updateSun()

    if (this._water != null) {
      this._water.material.uniforms.time.value += delta * 0.1
    }
  }
}
