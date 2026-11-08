import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'
import { Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry } from 'three'
import type { InputManager } from '../src/lib/input.ts'
import type { PlayerMovement as PlayerMovementType } from '../src/lib/world/player-movement.ts'

const playerUrl = new URL('../src/lib/world/player-movement.ts', import.meta.url).href
const inputUrl = new URL('../src/lib/input.ts', import.meta.url).href
const engineUrl = `data:text/javascript,${encodeURIComponent(`import { InputManager } from '${inputUrl}'; export const engine = { input: new InputManager(), isPresenting: false, isKeyDown: () => false };`)}`
const settingsUrl = `data:text/javascript,${encodeURIComponent('export const getSettings = () => ({ gamepad: false, freeRoam: false });')}`
const hooks = registerHooks({
  resolve: (specifier, context, nextResolve) => {
    if (context.parentURL === playerUrl && specifier === '../engine') {
      return { url: engineUrl, shortCircuit: true }
    }
    if (context.parentURL === playerUrl && specifier === '../settings') {
      return { url: settingsUrl, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const { PlayerMovement }: { PlayerMovement: typeof PlayerMovementType } = await import(playerUrl)
const { engine }: { engine: { input: InputManager } } = await import(engineUrl)
hooks.deregister()

const createMovement = () => {
  engine.input.clear()
  engine.input.mouseWasd = false
  const camera = new PerspectiveCamera()
  camera.rotation.order = 'YXZ'
  camera.position.y = 1.25
  const ground = new Mesh(new PlaneGeometry(100, 100), new MeshBasicMaterial())
  ground.rotateX(-Math.PI / 2)
  const movement = new PlayerMovement(
    camera,
    [ground],
    () => new Group(),
    () => null,
  )
  return { camera, movement, input: engine.input }
}

test('inactive mouse targets cannot resume movement after arrow keys are released', () => {
  const { camera, movement, input } = createMovement()
  movement.navigation.setTargets(100, 100, true)
  input.keyDown('ArrowUp')
  movement.update(0.5, null)
  input.keyUp('ArrowUp')
  movement.update(0.2, null)
  assert.equal(movement.linearVelocity, 0)
  assert.equal(movement.navigation.rotationalVelocity, 0)
  const position = camera.position.clone()
  const rotation = camera.quaternion.clone()
  for (let n = 0; n < 120; ++n) {
    movement.update(1 / 60, null)
  }
  assert.ok(camera.position.distanceTo(position) < 1e-9)
  assert.ok(camera.quaternion.angleTo(rotation) < 1e-7)
})

test('active mouse dragging still moves and stops on release', () => {
  const { camera, movement, input } = createMovement()
  input.onGesture = (kind, point) => {
    if (kind !== 'click') {
      movement.navigation.setTargets(point.x, point.y, kind !== 'dragEnd')
    }
  }
  input.pointerDown({ x: 320, y: 240 }, 0)
  input.pointerMove({ x: 100, y: 100 })
  movement.update(0.5, null)
  assert.ok(movement.linearVelocity > 0)
  assert.ok(movement.navigation.rotationalVelocity > 0)
  input.pointerUp()
  movement.update(0.2, null)
  assert.equal(movement.linearVelocity, 0)
  assert.equal(movement.navigation.rotationalVelocity, 0)
  const position = camera.position.clone()
  const rotation = camera.quaternion.clone()
  for (let n = 0; n < 120; ++n) {
    movement.update(1 / 60, null)
  }
  assert.ok(camera.position.distanceTo(position) < 1e-9)
  assert.ok(camera.quaternion.angleTo(rotation) < 1e-7)
})

test('releasing WASD clears sub-threshold strafe speed', () => {
  const { movement, input } = createMovement()
  input.mouseWasd = true
  input.keyDown('KeyD')
  assert.ok(movement.update(0.00001, null).normalizedSpeed > 0)
  input.keyUp('KeyD')
  assert.equal(movement.update(1 / 60, null).normalizedSpeed, 0)
})
