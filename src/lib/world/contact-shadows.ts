import * as THREE from 'three'
import { updateRaycastMatrices } from '../matrix-cache.ts'

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const fragmentShader = `
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 offset = (vUv - 0.5) * 2.0;
  float radius = length(offset);
  float fade = exp(-3.0 * radius * radius) * (1.0 - smoothstep(0.7, 1.0, radius));
  gl_FragColor = vec4(0.0, 0.0, 0.0, uOpacity * fade);
}`

type ContactSource = { model: THREE.Object3D & { boundingSphere: THREE.Sphere } }

type Shadow = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  nextCast: number
  point: THREE.Vector3
  normal: THREE.Vector3
  grounded: boolean
}

export class ContactShadows {
  private readonly _group = new THREE.Group()
  private readonly _geometry = new THREE.PlaneGeometry(1, 1)
  private readonly _shadows = new Map<ContactSource, Shadow>()
  private readonly _opacity: number
  private readonly _raycaster = new THREE.Raycaster()
  private readonly _position = new THREE.Vector3()
  private readonly _cameraPosition = new THREE.Vector3()
  private readonly _up = new THREE.Vector3(0, 0, 1)
  private readonly _down = new THREE.Vector3(0, -1, 0)

  public constructor(scene: THREE.Scene, opacity: number) {
    this._opacity = opacity
    this._group.name = 'contact-shadows'
    scene.add(this._group)
  }

  public update(sources: Iterable<ContactSource>, ground: THREE.Object3D[], camera: THREE.Camera, time: number): void {
    const active = new Set(sources)
    camera.getWorldPosition(this._cameraPosition)
    for (const [roi, shadow] of this._shadows) {
      if (!active.has(roi)) {
        shadow.mesh.material.dispose()
        shadow.mesh.removeFromParent()
        this._shadows.delete(roi)
      }
    }
    let groundPrepared = false
    for (const roi of active) {
      roi.model.getWorldPosition(this._position)
      let shadow = this._shadows.get(roi)
      if (shadow == null) {
        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: { uOpacity: { value: this._opacity } },
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
          toneMapped: false,
        })
        const mesh = new THREE.Mesh(this._geometry, material)
        mesh.name = 'contact-shadow'
        mesh.renderOrder = 2
        shadow = { mesh, nextCast: 0, point: new THREE.Vector3(), normal: new THREE.Vector3(0, 1, 0), grounded: false }
        this._shadows.set(roi, shadow)
        this._group.add(mesh)
      }
      shadow.mesh.visible = false
      if (!this._isVisible(roi.model) || this._position.distanceToSquared(this._cameraPosition) < 1 || this._position.distanceToSquared(this._cameraPosition) > 150 * 150) {
        continue
      }
      if (time >= shadow.nextCast) {
        if (!groundPrepared) {
          updateRaycastMatrices(ground)
          groundPrepared = true
        }
        this._raycaster.set(this._position.clone().add(new THREE.Vector3(0, 1, 0)), this._down)
        this._raycaster.far = 20
        const hit = this._raycaster.intersectObjects(ground, true)[0]
        shadow.grounded = hit != null
        shadow.nextCast = time + 0.1
        if (hit != null) {
          shadow.point.copy(hit.point)
          if (hit.face != null) {
            shadow.normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
          }
        }
      }
      if (!shadow.grounded || shadow.normal.y < 0.4) {
        continue
      }
      const height = shadow.point.y - ((this._position.x - shadow.point.x) * shadow.normal.x + (this._position.z - shadow.point.z) * shadow.normal.z) / shadow.normal.y
      const altitude = Math.max(0, this._position.y - height)
      const radius = THREE.MathUtils.clamp(roi.model.boundingSphere.radius * 0.55, 0.8, 3)
      shadow.mesh.position.set(this._position.x, height + 0.025, this._position.z)
      shadow.mesh.quaternion.setFromUnitVectors(this._up, shadow.normal)
      shadow.mesh.scale.setScalar(radius * 2 + altitude * 0.2)
      shadow.mesh.material.uniforms.uOpacity.value = this._opacity * Math.max(0, 1 - altitude / 5)
      shadow.mesh.visible = altitude < 5
    }
  }

  private _isVisible(object: THREE.Object3D): boolean {
    if (object.parent == null) {
      return false
    }
    for (let parent: THREE.Object3D | null = object; parent != null; parent = parent.parent) {
      if (!parent.visible) {
        return false
      }
    }
    return true
  }

  public dispose(): void {
    for (const shadow of this._shadows.values()) {
      shadow.mesh.material.dispose()
    }
    this._shadows.clear()
    this._geometry.dispose()
    this._group.removeFromParent()
  }
}
