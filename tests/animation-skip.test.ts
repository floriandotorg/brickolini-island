import assert from 'node:assert/strict'
import test from 'node:test'
import { skipDecision } from '../src/lib/animation-skip.ts'

test('managed capture without camera releases once then stops', () => {
  const animation = { managed: true, capturesPlayer: true, location: 12, hasCameraTrack: false, released: false }
  assert.equal(skipDecision(animation, true), 'release')
  assert.equal(skipDecision({ ...animation, released: true }, true), 'stop')
  assert.equal(skipDecision(animation, false), 'stop')
})

test('camera tracks and no-location animations stop, plain actions remain', () => {
  const animation = { managed: true, capturesPlayer: true, location: 12, hasCameraTrack: true, released: false }
  assert.equal(skipDecision(animation, true), 'stop')
  assert.equal(skipDecision({ ...animation, location: -1, hasCameraTrack: false }, true), 'stop')
  assert.equal(skipDecision({ ...animation, managed: false }, true), 'ignore')
})
