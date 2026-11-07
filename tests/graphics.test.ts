import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { createWaterNormalPixels, getRenderSize, getSurfaceProperties } from '../src/lib/graphics.ts'
import { getSettings, setPreset } from '../src/lib/settings.ts'
import { ContactShadows } from '../src/lib/world/contact-shadows.ts'
import { configureShadow, updateFocusedShadow } from '../src/lib/world/lighting.ts'
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

test('procedural water normals are deterministic, normalized, and tileable', () => {
  const size = 32
  const pixels = createWaterNormalPixels(size)
  assert.equal(pixels.length, size * size * 4)
  assert.deepEqual(pixels, createWaterNormalPixels(size))
  for (let n = 0; n < size * size; ++n) {
    const offset = n * 4
    const x = pixels[offset] / 127.5 - 1
    const y = pixels[offset + 1] / 127.5 - 1
    const z = pixels[offset + 2] / 127.5 - 1
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 0.015)
    assert.equal(pixels[offset + 3], 255)
  }
  for (let n = 0; n < size; ++n) {
    assert.deepEqual(pixels.slice(n * 4, n * 4 + 4), pixels.slice(((size - 1) * size + n) * 4, ((size - 1) * size + n) * 4 + 4))
    assert.deepEqual(pixels.slice(n * size * 4, n * size * 4 + 4), pixels.slice((n * size + size - 1) * 4, (n * size + size - 1) * 4 + 4))
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
  const water = createIslandWater(geometry)
  water.updateMatrixWorld(true)
  const actual = new THREE.Vector3().fromBufferAttribute(water.geometry.getAttribute('position'), 0).applyMatrix4(water.matrixWorld)
  assert.ok(actual.distanceTo(expected) < 0.0001)
  assert.ok(new THREE.Vector3(0, 0, 1).applyQuaternion(water.quaternion).distanceTo(new THREE.Vector3(0, 1, 0)) < 0.0001)
  assert.equal(geometry.getAttribute('position'), positions)
  assert.equal(water.material.fog, true)
  assert.ok(water.material.uniforms.normalSampler.value instanceof THREE.DataTexture)
})

test('graphics presets preserve original and migrate existing enhanced settings', () => {
  const values = new Map<string, string>()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } })
  try {
    setPreset('original')
    for (const key of ['textureFiltering', 'highDpi', 'distanceFog', 'contactShadows', 'ambientOcclusion'] as const) {
      assert.equal(getSettings().graphics[key], false)
    }
    setPreset('hd')
    assert.equal(getSettings().graphics.highDpi, true)
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
