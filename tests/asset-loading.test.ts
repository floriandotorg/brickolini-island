import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AssetLoadingManager } from '../src/lib/assets/loading-manager.ts'

test('asset readiness waits for overlapping loads and keeps existing callbacks', async () => {
  const manager = new AssetLoadingManager()
  const starts: string[] = []
  let completions = 0
  manager.onStart = url => starts.push(url)
  manager.onLoad = () => {
    ++completions
  }
  await manager.whenIdle()
  manager.itemStart('a')
  manager.itemStart('b')
  let ready = false
  const first = manager.whenIdle().then(() => {
    ready = true
  })
  const second = manager.whenIdle()
  manager.itemEnd('a')
  await Promise.resolve()
  assert.equal(ready, false)
  manager.itemEnd('b')
  await Promise.all([first, second])
  assert.equal(ready, true)
  assert.deepEqual(starts, ['a'])
  assert.equal(completions, 1)
})

test('loads started by completion callbacks join the same readiness wait', async () => {
  const manager = new AssetLoadingManager()
  let late = false
  let ready = false
  manager.onLoad = () => {
    if (!late) {
      late = true
      manager.itemStart('late')
    }
  }
  manager.itemStart('initial')
  const waiting = manager.whenIdle().then(() => {
    ready = true
  })
  manager.itemEnd('initial')
  await Promise.resolve()
  assert.equal(ready, false)
  manager.itemEnd('late')
  await waiting
  assert.equal(ready, true)
})

test('failed assets complete readiness after loader cleanup', async () => {
  const manager = new AssetLoadingManager()
  const errors: string[] = []
  manager.onError = url => errors.push(url)
  manager.itemStart('missing')
  const waiting = manager.whenIdle()
  manager.itemError('missing')
  manager.itemEnd('missing')
  await waiting
  assert.deepEqual(errors, ['missing'])
})
