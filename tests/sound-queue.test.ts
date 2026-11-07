import assert from 'node:assert/strict'
import test from 'node:test'
import { SoundQueue } from '../src/lib/world/act3/sound-queue.ts'

test('voice queue drops optional lines, serializes queued lines and replaces in order', () => {
  const started: number[] = []
  const stopped: number[] = []
  const queue = new SoundQueue<number>(
    id => {
      started.push(id)
    },
    id => {
      stopped.push(id)
    },
  )
  queue.insert(1, 'onlyIfEmpty')
  queue.insert(2, 'onlyIfEmpty')
  queue.insert(3, 'queue')
  assert.deepEqual(started, [1])
  queue.onEnded(1)
  assert.deepEqual(started, [1, 3])
  queue.insert(4, 'replace')
  assert.deepEqual(stopped, [3])
  queue.onEnded(3)
  assert.deepEqual(started, [1, 3, 4])
  queue.clear()
  queue.insert(5, 'queue')
  assert.deepEqual(stopped, [3, 4])
  assert.deepEqual(started, [1, 3, 4])
})
