import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSettings, setSettings, withSettingsSnapshot } from '../src/lib/settings.ts'

test('frame settings share one read and refresh after writes or the next frame', () => {
  const storage = new Map<string, string>([['settings.graphics.preset', 'next-gen']])
  let reads = 0
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => {
        ++reads
        return storage.get(key) ?? null
      },
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  })
  try {
    withSettingsSnapshot(() => {
      const first = getSettings()
      const count = reads
      assert.equal(getSettings(), first)
      assert.equal(reads, count)
      withSettingsSnapshot(() => {
        assert.equal(getSettings(), first)
        setSettings({ music: false })
      })
      assert.equal(getSettings().music, false)
    })
    assert.equal(getSettings().mouseWasd, false)
    setSettings({ mouseWasd: true })
    assert.equal(storage.get('settings.mouseWasd'), 'true')
    assert.equal(getSettings().mouseWasd, true)
    setSettings({ mouseWasd: false })
    assert.equal(getSettings().mouseWasd, false)
    storage.set('settings.music', 'true')
    withSettingsSnapshot(() => assert.equal(getSettings().music, true))
    assert.throws(
      () =>
        withSettingsSnapshot(() => {
          throw new Error('frame failed')
        }),
      /frame failed/,
    )
    storage.set('settings.music', 'false')
    assert.equal(getSettings().music, false)
  } finally {
    if (previous != null) {
      Object.defineProperty(globalThis, 'localStorage', previous)
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }
})
