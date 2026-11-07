import assert from 'node:assert/strict'
import test from 'node:test'
import { hostBlink, interchangeablePart, shelfFrame } from '../src/lib/build-rules.ts'

test('interchangeable siblings share the original length-minus-three prefix', () => {
  assert.equal(interchangeablePart('CHSIDLY0', 'CHSIDRY0'), true)
  assert.equal(interchangeablePart('CHBASEY0', 'CHSEATY0'), false)
})

test('shelf completes ten steps in four hundred milliseconds and wraps', () => {
  assert.equal(shelfFrame(0, 1000, 5000, 0.2), 500)
  assert.equal(shelfFrame(0, 1000, 5000, 0.4), 1000)
  assert.equal(shelfFrame(5000, 1000, 5000, 0.4), 0)
})

test('host blinking honors strict windows and resolves overlapping hints in order', () => {
  assert.equal(hostBlink('igs001d3_RunAnim', 15500), null)
  assert.deepEqual(hostBlink('igs001d3_RunAnim', 30100), { control: 'Yellow_Ctl', pressed: 0 })
  assert.deepEqual(hostBlink('igs001d3_RunAnim', 30600), { control: 'Platform_Ctl', pressed: 0 })
})
