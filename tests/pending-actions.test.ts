import assert from 'node:assert/strict'
import test from 'node:test'
import { PendingActions } from '../src/lib/pending-actions.ts'

test('targeted stops cancel matching loads while other scripts and actions survive', () => {
  const actions = new PendingActions()
  const chest = actions.begin('isle', 800, false)
  const voice = actions.begin('isle', 948, true)
  const other = actions.begin('other', 800, false)
  actions.stopRange('isle', 800, 802)
  assert.equal(chest.cancelled, true)
  assert.equal(voice.cancelled, false)
  assert.equal(other.cancelled, false)
  const next = actions.begin('isle', 801, false)
  assert.equal(next.cancelled, false)
  actions.stopManaged()
  assert.equal(voice.cancelled, true)
  assert.equal(next.cancelled, false)
})
