import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateArc, findLanding, positionOnArc } from '../src/lib/world/act3/ammo-arc.ts'

test('projectile starts at the muzzle and follows the original coefficients', () => {
  const arc = calculateArc([3, 20, 4], [0.6, -0.5, 0.6244998], [0.6928203, 0, 0.7211102])
  assert.ok(arc)
  assert.deepEqual(positionOnArc(arc, 0), [3, 20, 4])
  const end = positionOnArc(arc, 40)
  assert.ok(Math.abs(end[1]) < 0.0001)
  assert.ok(Math.abs(end[0] - 22.712812) < 0.001)
})

test('axis-aligned shots stay finite and horizontal shots fail', () => {
  const arc = calculateArc([0, 20, 0], [0, -0.5, 0.8660254], [0, 0, 1])
  assert.ok(arc)
  assert.ok(positionOnArc(arc, arc.apex).every(Number.isFinite))
  assert.equal(calculateArc([0, 20, 0], [1, 0, 0], [1, 0, 0]), null)
})

test('landing selects the earliest valid ground boundary and excludes airborne faces', () => {
  const arc = calculateArc([0, 20, 0], [0.6, -0.5, 0.6244998], [0.6928203, 0, 0.7211102])
  assert.ok(arc)
  const ground = { flags: 0, plane: [0, 1, 0, 0], edges: [] } as const
  const roof = { flags: 0, plane: [0, 1, 0, -5], edges: [] } as const
  const air = { flags: 4, plane: [0, 1, 0, -15], edges: [] } as const
  assert.equal(findLanding(arc, [ground, roof, air])?.boundary, roof)
})
