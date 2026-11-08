import * as THREE from 'three'

const FAR = 1e20
const BAKE_LAYER = 31
const RESOLUTION = 1024
const MARGIN = 16
export const SHORE_MAX_DISTANCE = 12

const transformLine = (input: Float64Array, output: Float64Array, length: number, vertices: Int32Array, boundaries: Float64Array): void => {
  const intersection = (q: number, vertex: number) => (input[q] + q * q - (input[vertex] + vertex * vertex)) / (2 * q - 2 * vertex)
  let k = 0
  vertices[0] = 0
  boundaries[0] = -FAR
  boundaries[1] = FAR
  for (let n = 1; n < length; ++n) {
    let boundary = intersection(n, vertices[k])
    while (boundary <= boundaries[k]) {
      --k
      boundary = intersection(n, vertices[k])
    }
    ++k
    vertices[k] = n
    boundaries[k] = boundary
    boundaries[k + 1] = FAR
  }
  k = 0
  for (let n = 0; n < length; ++n) {
    while (boundaries[k + 1] < n) {
      ++k
    }
    output[n] = (n - vertices[k]) ** 2 + input[vertices[k]]
  }
}

export const computeShoreDistances = (land: Uint8Array, width: number, height: number, texelSize: number, maxDistance: number): Float32Array => {
  const squared = new Float64Array(width * height)
  for (let n = 0; n < width * height; ++n) {
    squared[n] = land[n] ? 0 : FAR
  }
  const size = Math.max(width, height)
  const input = new Float64Array(size)
  const output = new Float64Array(size)
  const vertices = new Int32Array(size)
  const boundaries = new Float64Array(size + 1)
  for (let n = 0; n < width; ++n) {
    for (let m = 0; m < height; ++m) {
      input[m] = squared[m * width + n]
    }
    transformLine(input, output, height, vertices, boundaries)
    for (let m = 0; m < height; ++m) {
      squared[m * width + n] = output[m]
    }
  }
  for (let n = 0; n < height; ++n) {
    input.set(squared.subarray(n * width, (n + 1) * width))
    transformLine(input, output, width, vertices, boundaries)
    squared.set(output.subarray(0, width), n * width)
  }
  const distances = new Float32Array(width * height)
  for (let n = 0; n < width * height; ++n) {
    distances[n] = Math.min(Math.sqrt(squared[n]) * texelSize, maxDistance)
  }
  return distances
}

export const createOpenSeaTexture = (): THREE.DataTexture => {
  const texture = new THREE.DataTexture(new Uint16Array([THREE.DataUtils.toHalfFloat(SHORE_MAX_DISTANCE)]), 1, 1, THREE.RedFormat, THREE.HalfFloatType)
  texture.needsUpdate = true
  return texture
}

export type Shoreline = { texture: THREE.DataTexture; bounds: THREE.Vector4 }

export const bakeShoreline = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, level: number, ground: readonly THREE.Object3D[]): Shoreline | null => {
  const area = new THREE.Box3()
  const meshes: THREE.Mesh[] = []
  for (const object of ground) {
    object.traverse(child => {
      if (child instanceof THREE.Mesh && !(child.material instanceof THREE.ShaderMaterial)) {
        child.geometry.computeBoundingBox()
        area.union(new THREE.Box3().copy(child.geometry.boundingBox ?? new THREE.Box3()).applyMatrix4(child.matrixWorld))
        child.layers.enable(BAKE_LAYER)
        meshes.push(child)
      }
    })
  }
  if (area.isEmpty()) {
    for (const mesh of meshes) {
      mesh.layers.disable(BAKE_LAYER)
    }
    return null
  }
  area.expandByVector(new THREE.Vector3(MARGIN, 0, MARGIN))
  const width = area.max.x - area.min.x
  const depth = area.max.z - area.min.z
  const texelSize = Math.max(width, depth) / RESOLUTION
  const columns = Math.ceil(width / texelSize)
  const rows = Math.ceil(depth / texelSize)
  const top = Math.max(area.max.y, level) + 10
  const camera = new THREE.OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0.1, top - level + 10)
  camera.position.set((area.min.x + area.max.x) / 2, top, (area.min.z + area.max.z) / 2)
  camera.up.set(0, 0, -1)
  camera.lookAt(camera.position.x, level, camera.position.z)
  camera.updateMatrixWorld()
  camera.layers.set(BAKE_LAYER)
  const material = new THREE.ShaderMaterial({
    uniforms: { level: { value: level } },
    vertexShader: 'varying float height; void main() { vec4 world = modelMatrix * vec4(position, 1.0); height = world.y; gl_Position = projectionMatrix * viewMatrix * world; }',
    fragmentShader: 'uniform float level; varying float height; void main() { if (height < level + 0.01) { discard; } gl_FragColor = vec4(1.0); }',
    side: THREE.DoubleSide,
  })
  const target = new THREE.WebGLRenderTarget(columns, rows)
  const pixels = new Uint8Array(columns * rows * 4)
  const previousTarget = renderer.getRenderTarget()
  const previousClear = renderer.getClearColor(new THREE.Color())
  const previousAlpha = renderer.getClearAlpha()
  const previousOverride = scene.overrideMaterial
  const previousBackground = scene.background
  try {
    scene.overrideMaterial = material
    scene.background = null
    renderer.setClearColor(0x000000, 0)
    renderer.setRenderTarget(target)
    renderer.clear()
    renderer.render(scene, camera)
    renderer.readRenderTargetPixels(target, 0, 0, columns, rows, pixels)
  } finally {
    for (const mesh of meshes) {
      mesh.layers.disable(BAKE_LAYER)
    }
    scene.overrideMaterial = previousOverride
    scene.background = previousBackground
    renderer.setClearColor(previousClear, previousAlpha)
    renderer.setRenderTarget(previousTarget)
    target.dispose()
    material.dispose()
  }
  const land = new Uint8Array(columns * rows)
  for (let n = 0; n < land.length; ++n) {
    land[n] = pixels[n * 4] > 127 ? 1 : 0
  }
  const distances = computeShoreDistances(land, columns, rows, texelSize, SHORE_MAX_DISTANCE)
  const halves = new Uint16Array(distances.length)
  for (let n = 0; n < distances.length; ++n) {
    halves[n] = THREE.DataUtils.toHalfFloat(distances[n])
  }
  const texture = new THREE.DataTexture(halves, columns, rows, THREE.RedFormat, THREE.HalfFloatType)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return { texture, bounds: new THREE.Vector4(area.min.x, area.max.z, width, depth) }
}
