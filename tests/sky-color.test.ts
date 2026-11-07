import assert from 'node:assert/strict'
import test from 'node:test'
import { changeSkyLightness, cycleSkyHue } from '../src/lib/sky-color.ts'

test('observation controls clamp night and snap bright daylight', () => {
  assert.equal(changeSkyLightness(0.89, true), 1)
  assert.equal(changeSkyLightness(0.15, false), 0.1)
  assert.equal(changeSkyLightness(1, true), 1)
  assert.equal(changeSkyLightness(0.1, false), 0.1)
  assert.equal(cycleSkyHue(1), 0.05)
})
