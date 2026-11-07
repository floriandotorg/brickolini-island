import assert from 'node:assert/strict'
import test from 'node:test'
import { infoEntry, infoReturnRule } from '../src/lib/infocenter-rules.ts'

test('Info Center distinguishes first welcome registration return and quit query', () => {
  assert.equal(infoEntry(1, 'newState', true), 'firstWelcome')
  assert.equal(infoEntry(1, 'newState', false), 'return')
  assert.equal(infoEntry(1, 'selectedSave', false), 'saveSelected')
  assert.equal(infoEntry(1, 'backToInfoAct1', false), 'bookBack')
  assert.equal(infoEntry(3, 'exitQueried', false), 'exitQuery')
  assert.equal(infoEntry(2, 'selectedSave', false), 'resumeAct')
})

test('BigInfo ignores elevator areas and requires registration only for island destinations', () => {
  assert.equal(infoReturnRule(1, 'elevbott', true, true), 'none')
  assert.equal(infoReturnRule(1, 'act1', false, true), 'register')
  assert.equal(infoReturnRule(1, 'infoscor', false, false), 'return')
  assert.equal(infoReturnRule(1, 'act1', true, false), 'none')
  assert.equal(infoReturnRule(2, null, false, false), 'return')
})
