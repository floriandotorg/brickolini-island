import assert from 'node:assert/strict'
import test from 'node:test'
import { RadioPlaylist } from '../src/lib/radio-playlist.ts'

test('radio rotates categories while continuing each list', () => {
  const playlist = new RadioPlaylist([['j0', 'j1'], ['n0', 'n1'], ['s0']], 2, [1, 0, 0])
  assert.deepEqual(
    Array.from({ length: 7 }, () => playlist.next()),
    ['j1', 'n0', 's0', 'j0', 'n1', 's0', 'j1'],
  )
})
