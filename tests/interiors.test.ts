import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureInteriorCamera, getVehicleInteriorAsset, VehicleInterior } from '../src/lib/interiors/vehicle-interior.ts'
import { getSettings, setPreset, setSettings } from '../src/lib/settings.ts'

const loadBike = async (): Promise<THREE.Group> => {
  const bytes = await readFile(new URL('../public/models/interiors/bike.glb', import.meta.url))
  const buffer = new Uint8Array(bytes).buffer
  return (await new GLTFLoader().parseAsync(buffer, '')).scene
}

test('3D interiors are opt-in, persisted independently of graphics presets, and bike-only for now', () => {
  const storage = new Map<string, string>()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
  })
  try {
    assert.equal(getSettings().interiors3d, false)
    setSettings({ interiors3d: true })
    assert.equal(getSettings().interiors3d, true)
    setPreset('original')
    assert.equal(getSettings().interiors3d, true)
    assert.equal(getVehicleInteriorAsset('bike', true), '/models/interiors/bike.glb')
    assert.equal(getVehicleInteriorAsset('bike', false), null)
    assert.equal(getVehicleInteriorAsset('moto', true), null)
    setSettings({ interiors3d: false })
    assert.equal(getSettings().interiors3d, false)
  } finally {
    if (previous != null) {
      Object.defineProperty(globalThis, 'localStorage', previous)
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }
})

test('Blender bike has real PBR geometry, working projected controls, and shadow flags', async () => {
  const interior = new VehicleInterior(loadBike)
  assert.equal(await interior.show('bike', true), true)
  const model = interior.model
  assert.ok(model != null)
  assert.equal(model.getObjectByName('Cube'), undefined)
  let meshes = 0
  model.traverse(object => {
    if (object instanceof THREE.Mesh) {
      ++meshes
      assert.equal(object.castShadow, true)
      assert.equal(object.receiveShadow, true)
      assert.ok(object.material instanceof THREE.MeshStandardMaterial)
    }
  })
  assert.ok(meshes > 20)
  const camera = new THREE.PerspectiveCamera(50, 4 / 3, 0.01, 10)
  for (const [width, height] of [
    [640, 480],
    [1920, 1080],
    [480, 800],
  ]) {
    configureInteriorCamera(camera, width, height)
    model.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    for (const [name, action] of [
      ['Bell_top_button', 'horn'],
      ['Information_white_face', 'info'],
      ['LeftHand_curved_hand', 'exit'],
      ['RightHand_curved_hand', 'exit'],
    ]) {
      const object = model.getObjectByName(name)
      assert.ok(object != null, name)
      const point = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
      if (action === 'exit') {
        point.set(Math.sign(point.x) * 0.76, -0.46, -1.423)
      }
      point.project(camera)
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1, `${name} stays visible at ${width}x${height}`)
      assert.equal(interior.pick(camera, point.x, point.y), action, `${name} at ${width}x${height}`)
    }
    assert.equal(interior.pick(camera, 0, 0.5), null)
  }
  interior.press('horn')
  const horn = model.getObjectByName('Horn')
  assert.ok(horn != null)
  assert.ok(horn.position.y < 0)
  interior.release()
  assert.equal(horn.position.y, 0)
  const info = model.getObjectByName('Information')
  assert.ok(info != null)
  const rest = info.position.clone()
  interior.press('info')
  assert.ok(info.position.z < rest.z)
  interior.release()
  assert.deepEqual(info.position, rest)
  let disposed = 0
  model.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.geometry.addEventListener('dispose', () => ++disposed)
    }
  })
  interior.clear()
  assert.equal(interior.model, null)
  assert.ok(disposed > 20)
})

test('original yellow hands hold the red handlebar with light sleeves and no invented grip ribs', async () => {
  const model = await loadBike()
  for (const name of ['LeftHand', 'RightHand']) {
    for (const [suffix, color] of [
      ['curved_hand', 'Rider yellow hands'],
      ['sleeve', 'Rider light sleeves'],
      ['handlebar_end', 'Bike red plastic'],
    ]) {
      const mesh = model.getObjectByName(`${name}_${suffix}`)
      assert.ok(mesh instanceof THREE.Mesh)
      assert.ok(mesh.material instanceof THREE.MeshStandardMaterial)
      assert.equal(mesh.material.name, color)
    }
    assert.equal(model.getObjectByName(`${name}_grip_rib_0`), undefined)
  }
})

test('hands are coaxial with the handlebar without cutting into it', async () => {
  const model = await loadBike()
  model.updateMatrixWorld(true)
  for (const [name, side] of [
    ['LeftHand', -1],
    ['RightHand', 1],
  ] as const) {
    const hand = model.getObjectByName(name)
    assert.ok(hand != null)
    const start = new THREE.Vector3(side * 0.76, -0.37, -1.423)
    const axis = new THREE.Vector3(side * 0.3, -0.02, 0).normalize()
    const point = new THREE.Vector3()
    let vertices = 0
    hand.traverse(object => {
      if (!(object instanceof THREE.Mesh)) {
        return
      }
      const positions = object.geometry.getAttribute('position')
      for (let n = 0; n < positions.count; ++n) {
        point.fromBufferAttribute(positions, n).applyMatrix4(object.matrixWorld).sub(start)
        const along = point.dot(axis)
        const clearance = point.clone().addScaledVector(axis, -along).length()
        assert.ok(clearance >= 0.068, `${name} intersects the handlebar: radius ${clearance}`)
        assert.ok(along > -0.03 && along < 0.2, `${name} extends beyond its handlebar end: offset ${along}`)
        ++vertices
      }
    })
    assert.ok(vertices > 100)
  }
})

test('late loads cannot restore an exited or superseded interior', async () => {
  let finish: (model: THREE.Group) => void = () => {}
  const interior = new VehicleInterior(
    () =>
      new Promise(resolve => {
        finish = resolve
      }),
  )
  const pending = interior.show('bike', true)
  assert.equal(await interior.show('moto', true), false)
  const stale = new THREE.Group()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
  let disposed = false
  mesh.geometry.addEventListener('dispose', () => {
    disposed = true
  })
  stale.add(mesh)
  finish(stale)
  assert.equal(await pending, false)
  assert.equal(interior.model, null)
  assert.equal(disposed, true)
})

test('failed models leave no active interior so the bitmap can be used', async () => {
  const interior = new VehicleInterior(async () => {
    throw new Error('missing model')
  })
  await assert.rejects(interior.show('bike', true), /missing model/)
  assert.equal(interior.model, null)
})
