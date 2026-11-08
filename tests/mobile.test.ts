import assert from 'node:assert/strict'
import { test } from 'node:test'
import { InputManager } from '../src/lib/input.ts'
import { getMobileViewport, getTouchDirections } from '../src/lib/mobile-layout.ts'

test('touch stick supports dead zone, diagonals and release', () => {
  assert.deepEqual(getTouchDirections(0.1, -0.1), [])
  assert.deepEqual(getTouchDirections(0.7, -0.8), ['ArrowUp', 'ArrowRight'])
  assert.deepEqual(getTouchDirections(-1, 1), ['ArrowDown', 'ArrowLeft'])
})

test('portrait reserves room for controls and landscape keeps the scene wide', () => {
  assert.deepEqual(getMobileViewport(390, 844, true), { left: 0, top: 52, width: 390, height: 612 })
  assert.deepEqual(getMobileViewport(844, 390, true), { left: 0, top: 52, width: 844, height: 338 })
  assert.deepEqual(getMobileViewport(1280, 720, false), { left: 0, top: 0, width: 1280, height: 720 })
})

test('touch keys release independently from physical keys and clear on interruption', () => {
  const input = new InputManager()
  input.keyDown('ArrowUp')
  input.setTouchKeys(['ArrowUp', 'ArrowRight'])
  input.setTouchKeys([])
  assert.equal(input.getNavigationFlags().up, true)
  assert.equal(input.getNavigationFlags().right, false)
  input.keyUp('ArrowUp')
  input.setTouchKeys(['ArrowLeft', 'ControlLeft'])
  assert.equal(input.getNavigationFlags().ctrl, true)
  input.disable()
  input.enable()
  assert.equal(input.getNavigationFlags().left, false)
  assert.equal(input.getNavigationFlags().ctrl, false)
})

test('notches and home indicators stay outside the playing surface', () => {
  assert.deepEqual(getMobileViewport(844, 390, true, 0, 21, 44, 44), { left: 44, top: 52, width: 756, height: 317 })
  assert.deepEqual(getMobileViewport(390, 844, true, 47, 34), { left: 0, top: 99, width: 390, height: 531 })
})
