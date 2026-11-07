import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceClickState, clickAnimationId, clickSoundIds, colorPart } from '../src/lib/customization-rules.ts'

test('sound move and mood wrap with per-kind limits', () => {
  assert.equal(advanceClickState({ sound: 8, move: 3, mood: 3 }, 'mama', 'actor').sound, 0)
  assert.equal(advanceClickState({ sound: 7, move: 2, mood: 3 }, 'mama', 'plant').sound, 0)
  assert.equal(advanceClickState({ sound: 5, move: 2, mood: 3 }, 'papa', 'building').move, 0)
  assert.equal(advanceClickState({ sound: 0, move: 0, mood: 3 }, 'laura', 'actor').mood, 0)
})

test('click sounds use incremented values and plant mood parity', () => {
  assert.deepEqual(clickSoundIds('actor', { sound: 1, mood: 0 }, false), [51])
  assert.deepEqual(clickSoundIds('plant', { sound: 3, mood: 2 }, true), [66, 59])
  assert.deepEqual(clickSoundIds('building', { sound: 5, mood: 3 }, true), [69, 65])
})

test('color remaps claws torso and head without changing their own parts', () => {
  assert.equal(colorPart('claw-lft'), 'arm-lft')
  assert.equal(colorPart('body'), 'infogron')
  assert.equal(colorPart('head'), 'infohat')
  assert.equal(colorPart('leg-rt'), 'leg-rt')
})

test('animation ids use character plant species and building bases', () => {
  assert.equal(clickAnimationId('actor', 3), 13)
  assert.equal(clickAnimationId('plant', 2, 3), 41)
  assert.equal(clickAnimationId('building', 2, 12), 81)
  assert.equal(clickAnimationId('building', 0, 3), 0)
})
