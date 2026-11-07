import assert from 'node:assert/strict'
import test from 'node:test'
import { ReferenceCache } from '../src/lib/reference-cache.ts'

test('concurrent character acquisitions share one creation and retain each reference', async () => {
  let creations = 0
  const attached: string[] = []
  const removed: string[] = []
  const cache = new ReferenceCache(
    async (name: string) => {
      ++creations
      return name
    },
    name => attached.push(name),
    name => removed.push(name),
  )
  const [first, second] = await Promise.all([cache.acquire('nick'), cache.acquire('nick')])
  assert.equal(first, second)
  assert.equal(creations, 1)
  assert.equal(cache.refCount('nick'), 2)
  assert.deepEqual(attached, ['nick'])
  cache.release('nick')
  assert.deepEqual(removed, [])
  cache.release('nick')
  assert.deepEqual(removed, ['nick'])
  assert.equal(cache.has('nick'), false)
})

test('clearing during a load disposes its result without attaching it', async () => {
  let finish: (value: string) => void = () => {}
  const attached: string[] = []
  const removed: string[] = []
  const cache = new ReferenceCache(
    (_: string) =>
      new Promise<string>(resolve => {
        finish = resolve
      }),
    name => attached.push(name),
    name => removed.push(name),
  )
  const pending = cache.acquire('laura')
  await Promise.resolve()
  cache.clear()
  finish('laura')
  await pending
  assert.deepEqual(attached, [])
  assert.deepEqual(removed, ['laura'])
  assert.equal(cache.has('laura'), false)
})

test('failed creation can be retried', async () => {
  let attempts = 0
  const cache = new ReferenceCache(
    async (_: string) => {
      if (++attempts === 1) {
        throw Error('load failed')
      }
      return 2
    },
    () => {},
    () => {},
  )
  await assert.rejects(cache.acquire('brickstr'))
  assert.equal(await cache.acquire('brickstr'), 2)
})
