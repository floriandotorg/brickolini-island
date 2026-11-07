import assert from 'node:assert/strict'
import test from 'node:test'
import { triggerMatches } from '../src/lib/path-triggers.ts'

test('island structs filter actor kind and direction independently', () => {
  for (const flags of [0x11ffffff, 0x21ffffff, 0x31ffffff, 0x3fffffff]) {
    assert.equal(triggerMatches(flags, true, true), flags !== 0x21ffffff)
    assert.equal(triggerMatches(flags, false, true), flags !== 0x11ffffff)
    assert.equal(triggerMatches(flags, true, false), flags === 0x3fffffff)
    assert.equal(triggerMatches(flags, false, false), flags === 0x3fffffff)
  }
  assert.equal(triggerMatches(0x11ffffff, false, true, true), true)
  assert.equal(triggerMatches(0x11ffffff, false, false, true), false)
  assert.equal(triggerMatches(0x01000000, true, true), false)
})
