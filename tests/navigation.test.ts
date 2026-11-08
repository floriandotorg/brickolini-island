import assert from 'node:assert/strict'
import test from 'node:test'
import { NavController } from '../src/lib/world/nav-controller.ts'

const forward = { up: true, down: false, left: false, right: false, ctrl: false }
const idle = { ...forward, up: false }

test('releasing keys clears sub-threshold residual speed in either direction', () => {
  for (const speed of [0.0005, -0.0005, 0.001, -0.001]) {
    const nav = new NavController()
    nav.linearVelocity = speed
    nav.update(1 / 60, idle)
    assert.equal(nav.linearVelocity, 0)
  }
})

test('releasing a mouse drag clears residual movement and turning', () => {
  const nav = new NavController()
  nav.setTargets(100, 100, true)
  nav.update(0.00005, idle)
  assert.ok(nav.linearVelocity > 0)
  assert.ok(nav.rotationalVelocity > 0)
  nav.setTargets(100, 100, false)
  for (let n = 0; n < 120; ++n) {
    nav.update(1 / 60, idle)
    assert.equal(nav.linearVelocity, 0)
    assert.equal(nav.rotationalVelocity, 0)
  }
})

test('walking reaches six in 1.6 seconds and reverse clamps to forty percent', () => {
  const nav = new NavController()
  nav.maximumSpeed = 6
  nav.update(1.6, forward)
  assert.equal(nav.linearVelocity, 6)
  nav.update(0.12, { ...forward, up: false })
  assert.equal(nav.linearVelocity, 0)
  nav.update(10, { ...forward, up: false, down: true })
  assert.ok(Math.abs(nav.linearVelocity + 2.4) < 1e-9)
})

test('control accelerates four times faster and opposing keys cancel', () => {
  const nav = new NavController()
  nav.maximumSpeed = 6
  nav.update(0.4, { ...forward, ctrl: true })
  assert.equal(nav.linearVelocity, 6)
  nav.update(1, { ...forward, down: true, left: true, right: true })
  assert.equal(nav.linearVelocity, 0)
  assert.equal(nav.rotationalVelocity, 0)
})

test('mouse dead zone and proportional targets match the original formulas', () => {
  const nav = new NavController()
  nav.maximumSpeed = 20
  nav.setTargets(320, 100, true)
  nav.update(2, { ...forward, up: false })
  assert.equal(nav.linearVelocity, 10)
  assert.equal(nav.rotationalVelocity, 0)
  nav.setTargets(360, 240, true)
  nav.update(1, { ...forward, up: false })
  assert.equal(nav.rotationalVelocity, 0)
  nav.setTargets(0, 0, true)
  nav.update(2, { ...forward, up: false })
  assert.equal(nav.rotationalVelocity, 20)
})
