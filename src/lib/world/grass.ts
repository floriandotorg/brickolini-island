import * as THREE from 'three'

const DENSITY = 3
const MIN_UPRIGHT = 0.8
const CHUNK_SIZE = 16
const FADE_START = 26
const FADE_END = 44
const BLADES = 6

type GroundMaterial = THREE.MeshLambertMaterial | THREE.MeshPhysicalMaterial
export type GrassTufts = { positions: number[]; uvs: number[] }

export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const patchiness = (x: number, z: number): number => {
  const value = Math.sin(x * 0.19 + Math.sin(z * 0.07) * 2.3) * Math.sin(z * 0.23 + Math.sin(x * 0.11) * 1.7)
  return 0.25 + 0.75 * THREE.MathUtils.smoothstep(value, -0.4, 0.6)
}

export const scatterGrass = (geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, density: number, random: () => number): GrassTufts => {
  const position = geometry.getAttribute('position')
  const uv = geometry.getAttribute('uv')
  const index = geometry.getIndex()
  const count = index?.count ?? position.count
  const vertexAt = (n: number) => index?.getX(n) ?? n
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  const textureCorners = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()]
  const edgeA = new THREE.Vector3()
  const edgeB = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const point = new THREE.Vector3()
  const tufts: GrassTufts = { positions: [], uvs: [] }
  for (let n = 0; n + 2 < count; n += 3) {
    for (let m = 0; m < 3; ++m) {
      corners[m].fromBufferAttribute(position, vertexAt(n + m)).applyMatrix4(matrix)
      if (uv != null) {
        textureCorners[m].set(uv.getX(vertexAt(n + m)), uv.getY(vertexAt(n + m)))
      }
    }
    edgeA.subVectors(corners[1], corners[0])
    edgeB.subVectors(corners[2], corners[0])
    normal.crossVectors(edgeA, edgeB)
    const doubleArea = normal.length()
    if (doubleArea === 0 || Math.abs(normal.y) / doubleArea < MIN_UPRIGHT) {
      continue
    }
    const candidates = Math.floor((doubleArea / 2) * density + random())
    for (let m = 0; m < candidates; ++m) {
      let u = random()
      let v = random()
      if (u + v > 1) {
        u = 1 - u
        v = 1 - v
      }
      point.copy(corners[0]).addScaledVector(edgeA, u).addScaledVector(edgeB, v)
      if (random() > patchiness(point.x, point.z)) {
        continue
      }
      tufts.positions.push(point.x, point.y, point.z)
      const w = 1 - u - v
      tufts.uvs.push(textureCorners[0].x * w + textureCorners[1].x * u + textureCorners[2].x * v, textureCorners[0].y * w + textureCorners[1].y * u + textureCorners[2].y * v)
    }
  }
  return tufts
}

const createTuftGeometry = (random: () => number): THREE.BufferGeometry => {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const shades = [0.75, 0.75, 1.1, 1.1, 1.5]
  for (let n = 0; n < BLADES; ++n) {
    const angle = (n / BLADES) * Math.PI * 2 + random() * 0.8
    const facing = angle + Math.PI / 2 + (random() - 0.5) * 0.9
    const radius = random() * 0.05
    const lean = 0.03 + random() * 0.07
    const height = 0.65 + random() * 0.35
    const width = 0.018 + random() * 0.01
    const rootX = Math.cos(angle) * radius
    const rootZ = Math.sin(angle) * radius
    const sideX = Math.cos(facing) * width
    const sideZ = Math.sin(facing) * width
    const leanX = Math.cos(angle) * lean
    const leanZ = Math.sin(angle) * lean
    const base = positions.length / 3
    positions.push(rootX - sideX, 0, rootZ - sideZ, rootX + sideX, 0, rootZ + sideZ)
    positions.push(rootX - sideX * 0.6 + leanX * 0.3, height * 0.5, rootZ - sideZ * 0.6 + leanZ * 0.3, rootX + sideX * 0.6 + leanX * 0.3, height * 0.5, rootZ + sideZ * 0.6 + leanZ * 0.3)
    positions.push(rootX + leanX, height, rootZ + leanZ)
    for (const shade of shades) {
      colors.push(shade, shade, shade * 0.9)
    }
    indices.push(base, base + 1, base + 3, base, base + 3, base + 2, base + 2, base + 3, base + 4)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: positions.length / 3 }, () => [0, 1, 0]).flat(), 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  return geometry
}

const createGrassMaterial = (ground: GroundMaterial, time: { value: number }): GroundMaterial => {
  const material = ground.clone()
  material.name = `${ground.name} blades`
  material.flatShading = false
  material.vertexColors = true
  material.side = THREE.DoubleSide
  material.onBeforeCompile = shader => {
    shader.uniforms.grassTime = time
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 grassUv;\nuniform float grassTime;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (mapTransform * vec3(grassUv, 1.0)).xy;\n#endif')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 grassRoot = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float grassFade = 1.0 - smoothstep(${FADE_START.toFixed(1)}, ${FADE_END.toFixed(1)}, distance(grassRoot, cameraPosition));
        float grassSway = sin(grassTime * 1.6 + dot(grassRoot.xz, vec2(0.23, 0.17))) + 0.4 * sin(grassTime * 3.1 + dot(grassRoot.xz, vec2(-0.41, 0.29)));
        vec3 grassWind = vec3(0.8, 0.0, 0.5) * grassSway * 0.025 * position.y * position.y;
        transformed = (transformed + inverse(mat3(instanceMatrix)) * grassWind) * grassFade;`,
      )
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\ndiffuseColor *= textureLod(map, vMapUv, 4.0);\n#endif').replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'))
  }
  material.customProgramCacheKey = () => 'grass-blades-v2'
  return material
}

const isGroundMaterial = (material: THREE.Material | THREE.Material[]): material is GroundMaterial => material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshPhysicalMaterial

export class Grass {
  public readonly group = new THREE.Group()
  private readonly _time = { value: 0 }
  private readonly _geometry: THREE.BufferGeometry
  private readonly _materials = new Map<GroundMaterial, GroundMaterial>()
  private readonly _chunks: { mesh: THREE.InstancedMesh; center: THREE.Vector3 }[] = []

  public constructor(terrain: readonly THREE.Object3D[]) {
    const random = createRandom(1997)
    this.group.name = 'grass'
    this._geometry = createTuftGeometry(random)
    const buckets = new Map<string, { material: GroundMaterial; positions: number[]; uvs: number[] }>()
    for (const object of terrain) {
      object.updateWorldMatrix(true, true)
      object.traverse(child => {
        if (!(child instanceof THREE.Mesh) || !child.visible || !isGroundMaterial(child.material) || !child.material.name.startsWith('grass')) {
          return
        }
        const ground = child.material
        const material = this._materials.get(ground) ?? createGrassMaterial(ground, this._time)
        this._materials.set(ground, material)
        const tufts = scatterGrass(child.geometry, child.matrixWorld, DENSITY, random)
        for (let n = 0; n < tufts.positions.length / 3; ++n) {
          const key = `${material.uuid}:${Math.floor(tufts.positions[n * 3] / CHUNK_SIZE)}:${Math.floor(tufts.positions[n * 3 + 2] / CHUNK_SIZE)}`
          const bucket = buckets.get(key) ?? { material, positions: [], uvs: [] }
          bucket.positions.push(...tufts.positions.slice(n * 3, n * 3 + 3))
          bucket.uvs.push(...tufts.uvs.slice(n * 2, n * 2 + 2))
          buckets.set(key, bucket)
        }
      })
    }
    for (const { material, positions, uvs } of buckets.values()) {
      this._addChunk(material, positions, uvs, random)
    }
  }

  private _addChunk(material: GroundMaterial, positions: number[], uvs: number[], random: () => number): void {
    const count = positions.length / 3
    const geometry = new THREE.BufferGeometry()
    for (const name of ['position', 'normal', 'color']) {
      geometry.setAttribute(name, this._geometry.getAttribute(name))
    }
    geometry.setIndex(this._geometry.getIndex())
    geometry.setAttribute('grassUv', new THREE.InstancedBufferAttribute(new Float32Array(uvs), 2))
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.name = 'grass-chunk'
    mesh.receiveShadow = true
    mesh.raycast = () => {}
    const matrix = new THREE.Matrix4()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    const color = new THREE.Color()
    const center = new THREE.Vector3()
    for (let n = 0; n < count; ++n) {
      const root = new THREE.Vector3().fromArray(positions, n * 3)
      const width = 0.8 + random() * 0.5
      rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, random() * Math.PI * 2)
      matrix.compose(root, rotation, scale.set(width, 0.12 + random() * 0.14, width))
      mesh.setMatrixAt(n, matrix)
      const shade = 0.85 + random() * 0.25
      color.setRGB(shade, shade, shade * (0.85 + random() * 0.2))
      mesh.setColorAt(n, color)
      center.add(root)
    }
    mesh.computeBoundingSphere()
    this.group.add(mesh)
    this._chunks.push({ mesh, center: center.divideScalar(count) })
  }

  private readonly _eye = new THREE.Vector3()

  public update(camera: THREE.Camera, delta: number): void {
    this._time.value += delta
    camera.getWorldPosition(this._eye)
    const reach = FADE_END + CHUNK_SIZE
    for (const chunk of this._chunks) {
      chunk.mesh.visible = chunk.center.distanceToSquared(this._eye) < reach * reach
    }
  }

  public dispose(): void {
    for (const { mesh } of this._chunks) {
      mesh.geometry.dispose()
      mesh.dispose()
    }
    this._geometry.dispose()
    for (const material of this._materials.values()) {
      material.dispose()
    }
    this.group.removeFromParent()
  }
}
