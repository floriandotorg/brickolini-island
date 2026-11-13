import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { createAmbientOcclusionSamples, getRenderSize, getSurfaceProperties } from '../src/lib/graphics.ts'
import { getSettings, setPreset } from '../src/lib/settings.ts'
import { ContactShadows } from '../src/lib/world/contact-shadows.ts'
import { configureShadow, updateFocusedShadow } from '../src/lib/world/lighting.ts'
import { computeShoreDistances } from '../src/lib/world/shoreline.ts'
import { createIslandWater } from '../src/lib/world/water.ts'

test('render resolution respects original mode, device density, and GPU limits', () => {
  assert.deepEqual(getRenderSize(800, 600, 2, false, 8192), { width: 800, height: 600 })
  assert.deepEqual(getRenderSize(800, 600, 3, true, 8192), { width: 1600, height: 1200 })
  assert.deepEqual(getRenderSize(4000, 3000, 2, true, 4096), { width: 4096, height: 3072 })
  assert.deepEqual(getRenderSize(0, 0, Number.NaN, true, 8192), { width: 1, height: 1 })
})

test('surface tuning separates matte terrain, plastic, rubber, and glass', () => {
  for (const name of ['Grass flat', 'rock', 'sand', 'ocean flat', 'beach', 'pebble']) {
    assert.equal(getSurfaceProperties(name).roughness, 0.95)
    assert.equal(getSurfaceProperties(name).clearcoat, 0)
  }
  const plastic = getSurfaceProperties('red')
  assert.equal(plastic.metalness, 0)
  assert.ok(plastic.roughness >= 0.25)
  assert.equal(plastic.iridescence, 0)
  assert.ok(getSurfaceProperties('windo blue').roughness < plastic.roughness)
  assert.ok(getSurfaceProperties('rubber').roughness > plastic.roughness)
})

test('road surfaces are matte so painted markings do not glare', () => {
  for (const name of ['road straight', 'road grey flat', 'se curve', 'gas road', 'track grey mid f', 'piz curve']) {
    assert.ok(getSurfaceProperties(name).roughness >= 0.8, name)
    assert.equal(getSurfaceProperties(name).clearcoat, 0, name)
  }
})

test('shadow focus follows the view while retaining light direction and stable texel alignment', () => {
  const light = new THREE.DirectionalLight()
  light.position.set(100, 200, 50)
  const direction = light.position.clone().normalize()
  configureShadow(light)
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(1000, 5, 2000)
  updateFocusedShadow(light, camera)
  assert.ok(light.target.position.distanceTo(camera.position) < 70)
  assert.ok(light.position.clone().sub(light.target.position).normalize().distanceTo(direction) < 0.00001)
  assert.equal(light.shadow.camera.right, 70)
  assert.equal(light.shadow.normalBias, 0.04)
  const focus = light.target.position.clone()
  updateFocusedShadow(light, camera)
  assert.ok(light.target.position.distanceTo(focus) < 0.00001)
})

test('contact shadows follow terrain and disappear with hidden sources', () => {
  const scene = new THREE.Scene()
  const parent = new THREE.Group()
  const model = Object.assign(new THREE.Group(), { boundingSphere: new THREE.Sphere(new THREE.Vector3(), 2) })
  parent.add(model)
  scene.add(parent)
  const source = { model }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial())
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(10, 5, 10)
  scene.updateMatrixWorld(true)
  const contacts = new ContactShadows(scene, 0.25)
  contacts.update([source], [ground], camera, 0)
  const shadow = scene.getObjectByName('contact-shadow')
  assert.ok(shadow instanceof THREE.Mesh)
  assert.equal(shadow.visible, true)
  assert.ok(Math.abs(shadow.position.y - 0.025) < 0.0001)
  model.position.x = 1
  scene.updateMatrixWorld(true)
  contacts.update([source], [ground], camera, 0.2)
  assert.equal(shadow.position.x, 1)
  parent.visible = false
  contacts.update([source], [ground], camera, 0.3)
  assert.equal(shadow.visible, false)
  parent.visible = true
  model.position.y = 10
  scene.updateMatrixWorld(true)
  contacts.update([source], [ground], camera, 0.4)
  assert.equal(shadow.visible, false)
  contacts.update([], [ground], camera, 0.5)
  assert.equal(scene.getObjectByName('contact-shadow'), undefined)
  contacts.dispose()
  assert.equal(scene.getObjectByName('contact-shadows'), undefined)
})

test('water aligns its reflection plane without moving the source geometry', () => {
  const geometry = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2).translate(4, 2, -3)
  const positions = geometry.getAttribute('position')
  const expected = new THREE.Vector3().fromBufferAttribute(positions, 0)
  const map = new THREE.DataTexture(new Uint8Array([0, 0, 255, 255]), 1, 1)
  const water = createIslandWater(geometry, map)
  water.updateMatrixWorld(true)
  const actual = new THREE.Vector3().fromBufferAttribute(water.geometry.getAttribute('position'), 0).applyMatrix4(water.matrixWorld)
  assert.ok(actual.distanceTo(expected) < 0.0001)
  assert.ok(new THREE.Vector3(0, 0, 1).applyQuaternion(water.quaternion).distanceTo(new THREE.Vector3(0, 1, 0)) < 0.0001)
  assert.equal(geometry.getAttribute('position'), positions)
  assert.equal(water.material.fog, true)
  assert.equal(water.material.uniforms.islandWaterMap.value, map)
})

test('water shades from the camera position without rendering a mirror pass', () => {
  const water = createIslandWater(new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2), new THREE.DataTexture(new Uint8Array([0, 0, 255, 255]), 1, 1))
  const camera = new THREE.PerspectiveCamera()
  camera.position.set(3, 4, 5)
  camera.updateMatrixWorld()
  const renderer = { render: () => assert.fail('mirror pass rendered'), setRenderTarget: () => assert.fail('mirror pass rendered') }
  Reflect.apply(water.onBeforeRender, water, [renderer, new THREE.Scene(), camera, water.geometry, water.material, null])
  assert.ok(water.material.uniforms.eye.value.distanceTo(camera.position) < 0.0001)
  assert.equal(water.material.fragmentShader.includes('mirrorSampler'), false)
})

test('graphics presets preserve original and migrate existing enhanced settings', () => {
  const values = new Map<string, string>()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } })
  try {
    setPreset('original')
    for (const key of ['textureFiltering', 'highDpi', 'distanceFog', 'contactShadows', 'ambientOcclusion', 'grass'] as const) {
      assert.equal(getSettings().graphics[key], false)
    }
    setPreset('hd')
    assert.equal(getSettings().graphics.highDpi, true)
    assert.equal(getSettings().graphics.grass, true)
    assert.equal(getSettings().graphics.ambientOcclusion, false)
    setPreset('next-gen')
    assert.equal(getSettings().graphics.ambientOcclusion, true)
    values.delete('settings.graphics.highDpi')
    values.delete('settings.graphics.contactShadows')
    assert.equal(getSettings().graphics.highDpi, true)
    assert.equal(getSettings().graphics.contactShadows, true)
    setPreset('original')
    values.delete('settings.graphics.highDpi')
    assert.equal(getSettings().graphics.highDpi, false)
  } finally {
    if (previous != null) {
      Object.defineProperty(globalThis, 'localStorage', previous)
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }
})

test('ambient occlusion keeps twelve deterministic samples on increasing disk radii', () => {
  const samples = createAmbientOcclusionSamples()
  assert.equal(samples.length, 36)
  assert.deepEqual(samples, createAmbientOcclusionSamples())
  assert.equal(samples[0], 1)
  assert.equal(samples[1], 0)
  let previousRadius = 0
  for (let n = 0; n < 12; ++n) {
    const [x, y, radius] = samples.slice(n * 3, n * 3 + 3)
    assert.ok(Math.abs(Math.hypot(x, y) - 1) < 0.0000001)
    assert.ok(radius > previousRadius && radius < 1)
    assert.ok(Math.abs(radius * radius - (n + 0.5) / 12) < 0.0000001)
    previousRadius = radius
  }
})

test('shore distances measure euclidean world distance to the nearest land texel', () => {
  const width = 9
  const height = 9
  const land = new Uint8Array(width * height)
  land[4 * width + 4] = 1
  const distances = computeShoreDistances(land, width, height, 0.5, 4)
  const at = (x: number, y: number) => distances[y * width + x]
  assert.equal(at(4, 4), 0)
  assert.ok(Math.abs(at(5, 4) - 0.5) < 0.02)
  assert.ok(Math.abs(at(4, 1) - 1.5) < 0.02)
  assert.ok(Math.abs(at(7, 8) - 2.5) < 0.02)
  assert.ok(Math.abs(at(0, 0) - Math.sqrt(32) * 0.5) < 0.02)
})

test('shore distances saturate when there is no land', () => {
  const distances = computeShoreDistances(new Uint8Array(16), 4, 4, 1, 3)
  assert.ok(distances.every(value => value === 3))
})

test('shore distances treat every land texel as the shoreline source', () => {
  const width = 6
  const land = new Uint8Array(width * 2)
  land[0] = 1
  land[width + 5] = 1
  const distances = computeShoreDistances(land, width, 2, 1, 10)
  assert.equal(distances[0], 0)
  assert.equal(distances[width + 5], 0)
  assert.equal(distances[2], 2)
  assert.equal(distances[width + 3], 2)
})
