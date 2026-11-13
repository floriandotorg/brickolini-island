import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureInteriorCamera, getVehicleInteriorAsset, type InteriorAction, VehicleInterior } from '../src/lib/interiors/vehicle-interior.ts'
import { getSettings, setPreset, setSettings } from '../src/lib/settings.ts'

const loadModel = async (url: string): Promise<THREE.Group> => {
  const bytes = await readFile(new URL(`../public${url}`, import.meta.url))
  const buffer = new Uint8Array(bytes).buffer
  return (await new GLTFLoader().parseAsync(buffer, '')).scene
}

const aspects = [
  [640, 480],
  [1920, 1080],
  [480, 800],
]

const isPickable = (interior: VehicleInterior, camera: THREE.PerspectiveCamera, object: THREE.Object3D, action: InteriorAction): boolean => {
  const point = new THREE.Vector3()
  const meshes: THREE.Mesh[] = []
  object.traverse(child => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child)
    }
  })
  return meshes.some(mesh => {
    const positions = mesh.geometry.getAttribute('position')
    for (let n = 0; n < positions.count; n += 5) {
      point.fromBufferAttribute(positions, n).applyMatrix4(mesh.matrixWorld).project(camera)
      if (Math.abs(point.x) < 0.98 && Math.abs(point.y) < 0.98 && interior.pick(camera, point.x * 0.999, point.y * 0.999) === action) {
        return true
      }
    }
    return false
  })
}

const withStorage = (callback: () => void): void => {
  const storage = new Map<string, string>()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
  })
  try {
    callback()
  } finally {
    if (previous != null) {
      Object.defineProperty(globalThis, 'localStorage', previous)
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }
}

test('3D interiors are opt-in, persisted independently of graphics presets, and cover the bike and motorcycle', () => {
  withStorage(() => {
    assert.equal(getSettings().interiors3d, false)
    setSettings({ interiors3d: true })
    assert.equal(getSettings().interiors3d, true)
    setPreset('original')
    assert.equal(getSettings().interiors3d, true)
    assert.equal(getVehicleInteriorAsset('bike', true), '/models/interiors/bike.glb')
    assert.equal(getVehicleInteriorAsset('moto', true), '/models/interiors/moto.glb')
    assert.equal(getVehicleInteriorAsset('bike', false), null)
    assert.equal(getVehicleInteriorAsset('moto', false), null)
    assert.equal(getVehicleInteriorAsset('skate', true), null)
    setSettings({ interiors3d: false })
    assert.equal(getSettings().interiors3d, false)
  })
})

for (const [type, url, controls] of [
  ['bike', '/models/interiors/bike.glb', ['horn', 'info', 'exit']],
  ['moto', '/models/interiors/moto.glb', ['info', 'exit']],
] as const) {
  test(`${type} interior has PBR geometry, shadow flags, and pickable controls at every aspect ratio`, async () => {
    const interior = new VehicleInterior(() => loadModel(url))
    assert.equal(await interior.show(type, true), true)
    const model = interior.model
    assert.ok(model != null)
    let meshes = 0
    model.traverse(object => {
      if (object instanceof THREE.Mesh) {
        ++meshes
        assert.equal(object.castShadow, true)
        assert.equal(object.receiveShadow, true)
        assert.ok(object.material instanceof THREE.MeshStandardMaterial)
      }
    })
    assert.ok(meshes > 15)
    const camera = new THREE.PerspectiveCamera(50, 4 / 3, 0.01, 10)
    for (const [width, height] of aspects) {
      configureInteriorCamera(camera, width, height)
      model.updateMatrixWorld(true)
      camera.updateMatrixWorld(true)
      const groups: [string, InteriorAction][] = [
        ['Information', 'info'],
        ['LeftHand', 'exit'],
        ['RightHand', 'exit'],
      ]
      if (type === 'bike') {
        groups.push(['Horn', 'horn'])
      }
      for (const [name, action] of groups) {
        const object = model.getObjectByName(name)
        assert.ok(object != null, name)
        assert.ok(isPickable(interior, camera, object, action), `${name} is pickable at ${width}x${height}`)
      }
      assert.equal(interior.pick(camera, 0, 0.5), null)
    }
    const actions = new Set<unknown>()
    model.traverse(object => actions.add(object.userData.interiorAction))
    assert.deepEqual(
      [...controls].filter(action => actions.has(action)),
      [...controls],
    )
    assert.equal(actions.has('horn'), type === 'bike')
    let disposed = 0
    model.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.addEventListener('dispose', () => ++disposed)
      }
    })
    interior.clear()
    assert.equal(interior.model, null)
    assert.ok(disposed > 15)
  })
}

test('pressed controls move into the dashboard and return on release', async () => {
  const interior = new VehicleInterior(() => loadModel('/models/interiors/bike.glb'))
  await interior.show('bike', true)
  const model = interior.model
  assert.ok(model != null)
  const horn = model.getObjectByName('Horn')
  assert.ok(horn != null)
  interior.press('horn')
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
})

test('rider hands are yellow with white arms and grip the handlebar ends', async () => {
  for (const [url, bar] of [
    ['/models/interiors/bike.glb', 'Continuous_red_handlebar'],
    ['/models/interiors/moto.glb', 'Black_handlebar'],
  ]) {
    const model = await loadModel(url)
    model.updateMatrixWorld(true)
    const handlebar = model.getObjectByName(bar)
    assert.ok(handlebar instanceof THREE.Mesh)
    const barBox = new THREE.Box3().setFromObject(handlebar)
    for (const [name, end] of [
      ['LeftHand', new THREE.Vector3(barBox.min.x, 0, 0)],
      ['RightHand', new THREE.Vector3(barBox.max.x, 0, 0)],
    ] as const) {
      for (const [suffix, color] of [
        ['curved_hand', 'Rider yellow hands'],
        ['wrist', 'Rider yellow hands'],
        ['sleeve', 'Rider white arms'],
      ]) {
        const mesh = model.getObjectByName(`${name}_${suffix}`)
        assert.ok(mesh instanceof THREE.Mesh, `${name}_${suffix}`)
        assert.ok(mesh.material instanceof THREE.MeshStandardMaterial)
        assert.equal(mesh.material.name, color)
      }
      const hand = model.getObjectByName(`${name}_curved_hand`)
      assert.ok(hand != null)
      const handBox = new THREE.Box3().setFromObject(hand)
      assert.ok(end.x >= handBox.min.x && end.x <= handBox.max.x, `${name} covers the ${bar} end`)
    }
  }
})

test('motorcycle gauges reveal their fill from the start of the gauge', async () => {
  const interior = new VehicleInterior(() => loadModel('/models/interiors/moto.glb'))
  await interior.show('moto', true)
  const model = interior.model
  assert.ok(model != null)
  for (const [name, kind] of [
    ['Speed_gauge_fill', 'speed'],
    ['Fuel_gauge_fill', 'fuel'],
  ] as const) {
    const mesh = model.getObjectByName(name)
    assert.ok(mesh instanceof THREE.Mesh, name)
    assert.ok(mesh.material instanceof THREE.Material)
    const [plane] = mesh.material.clippingPlanes ?? []
    assert.ok(plane instanceof THREE.Plane)
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox
    assert.ok(box != null)
    const start = new THREE.Vector3(box.min.x + 0.0001, 0, 0)
    const middle = new THREE.Vector3((box.min.x + box.max.x) / 2, 0, 0)
    const end = new THREE.Vector3(box.max.x - 0.0001, 0, 0)
    const kept = (point: THREE.Vector3): boolean => plane.distanceToPoint(point.clone().applyMatrix4(mesh.matrixWorld)) >= 0
    interior.setMeters(0, 0)
    assert.equal(mesh.visible, false)
    interior.setMeters(kind === 'speed' ? 0.6 : 0, kind === 'fuel' ? 0.6 : 0)
    assert.equal(mesh.visible, true)
    assert.deepEqual([kept(start), kept(middle), kept(end)], [true, true, false])
    interior.setMeters(1, 1)
    assert.deepEqual([kept(start), kept(end)], [true, true])
  }
  const wedge = model.getObjectByName('Speed_car')
  assert.ok(wedge instanceof THREE.Mesh)
  assert.ok(wedge.material instanceof THREE.Material)
  assert.equal(wedge.material.clippingPlanes, null)
})

test('the cockpit leans smoothly and subtly into turns and settles when riding straight', async () => {
  const interior = new VehicleInterior(() => loadModel('/models/interiors/bike.glb'))
  await interior.show('bike', true)
  const model = interior.model
  assert.ok(model != null)
  const roll = (): number => new THREE.Euler().setFromQuaternion(model.quaternion, 'ZYX').z
  interior.lean(1, 1 / 60)
  const first = roll()
  assert.ok(first > 0)
  for (let n = 0; n < 120; ++n) {
    interior.lean(1, 1 / 60)
  }
  const full = roll()
  assert.ok(full > first)
  assert.ok(full < THREE.MathUtils.degToRad(4))
  assert.ok(full > THREE.MathUtils.degToRad(1))
  for (let n = 0; n < 240; ++n) {
    interior.lean(-1, 1 / 60)
  }
  assert.ok(Math.abs(roll() + full) < 1e-3)
  for (let n = 0; n < 240; ++n) {
    interior.lean(0, 1 / 60)
  }
  assert.ok(Math.abs(roll()) < 1e-3)
  assert.ok(model.position.length() < 1e-3)
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
  assert.equal(await interior.show('skate', true), false)
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
