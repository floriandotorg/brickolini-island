import assert from 'node:assert/strict'
import test from 'node:test'
import { PerspectiveCamera, Vector3 } from 'three'
import { InputManager } from '../src/lib/input.ts'
import { MouseLook, planarMovement } from '../src/lib/world/mouse-navigation.ts'

const close = (actual: number, expected: number): void => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)
}

test('WASD is opt-in and strafing does not become keyboard turning', () => {
  const input = new InputManager()
  input.keyDown('KeyW')
  input.keyDown('KeyD')
  assert.equal(input.getNavigationFlags().up, false)
  assert.equal(input.strafe, 0)
  input.mouseWasd = true
  assert.equal(input.getNavigationFlags().up, true)
  assert.equal(input.getNavigationFlags().right, false)
  assert.equal(input.strafe, 1)
  input.keyDown('KeyA')
  assert.equal(input.strafe, 0)
  input.keyDown('KeyS')
  assert.equal(input.getNavigationFlags().down, true)
  input.keyDown('ArrowLeft')
  assert.equal(input.getNavigationFlags().left, true)
  input.disable()
  assert.equal(input.getNavigationFlags().up, false)
  assert.equal(input.strafe, 0)
})

test('mouse deltas accumulate once and clear on disabled input or cancellation', () => {
  const input = new InputManager()
  input.mouseWasd = true
  input.mouseMove(10, -5)
  input.mouseMove(4, 2)
  input.mouseMove(Number.NaN, 1)
  input.mouseMove(1, Number.POSITIVE_INFINITY)
  assert.deepEqual(input.consumeMouseLook(), { x: 14, y: -3 })
  assert.deepEqual(input.consumeMouseLook(), { x: 0, y: 0 })
  input.mouseMove(20, 10)
  input.clear()
  assert.deepEqual(input.consumeMouseLook(), { x: 0, y: 0 })
  input.disable()
  input.mouseMove(20, 10)
  assert.deepEqual(input.consumeMouseLook(), { x: 0, y: 0 })
  input.enable()
  input.mouseWasd = false
  input.mouseMove(20, 10)
  assert.deepEqual(input.consumeMouseLook(), { x: 0, y: 0 })
})

test('planar movement strafes relative to heading and caps diagonal speed', () => {
  const up = new Vector3(0, 1, 0)
  const forward = new Vector3(0, 0, -1)
  assert.deepEqual(planarMovement(forward, up, 0, 6, 6).toArray(), [6, 0, 0])
  close(planarMovement(forward, up, 6, 6, 6).length(), 6)
  close(planarMovement(forward, up, -2.4, 0, 6).z, 2.4)
  const slopeUp = new Vector3(0, 1, 1).normalize()
  close(planarMovement(forward, slopeUp, 6, 6, 6).dot(slopeUp), 0)
  assert.deepEqual(planarMovement(new Vector3(1, 0, 0), up, 0, 6, 6).toArray(), [0, 0, 6])
})

test('mouse look clamps pitch, removes the visual pitch before movement and preserves yaw', () => {
  const camera = new PerspectiveCamera()
  camera.rotation.order = 'YXZ'
  const look = new MouseLook()
  look.begin(camera, { x: 100, y: -100000 }, true)
  const heading = camera.getWorldDirection(new Vector3())
  close(heading.y, 0)
  assert.ok(heading.x > 0)
  look.apply(camera)
  const first = camera.quaternion.clone()
  assert.ok(camera.getWorldDirection(new Vector3()).y > 0.9)
  for (let n = 0; n < 10; ++n) {
    look.begin(camera, { x: 0, y: 0 }, true)
    close(camera.getWorldDirection(new Vector3()).y, 0)
    look.apply(camera)
    assert.ok(camera.quaternion.angleTo(first) < 1e-7)
  }
  look.begin(camera, { x: 0, y: 0 }, false)
  look.apply(camera)
  close(camera.getWorldDirection(new Vector3()).y, 0)
})

test('scripted camera rotations replace mouse pitch without restoring stale offsets', () => {
  const camera = new PerspectiveCamera()
  camera.rotation.order = 'YXZ'
  const look = new MouseLook()
  look.begin(camera, { x: 10, y: 100 }, true)
  look.apply(camera)
  camera.rotation.set(0, 1, 0)
  const scripted = camera.quaternion.clone()
  look.begin(camera, { x: 0, y: 0 }, true)
  look.apply(camera)
  assert.ok(camera.quaternion.angleTo(scripted) < 1e-7)
})
