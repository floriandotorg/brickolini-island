import assert from 'node:assert/strict'
import test from 'node:test'
import { isPresenterVisible } from '../src/lib/presentation-timing.ts'

test('credits switch adjacent stills at the exact boundary and preserve intended overlap', () => {
  assert.equal(isPresenterVisible(137, 12000, 136), false)
  assert.equal(isPresenterVisible(137, 12000, 12000), true)
  assert.equal(isPresenterVisible(12000, 8000, 12000), true)
  assert.equal(isPresenterVisible(137, 12000, 12137), false)
  assert.equal(isPresenterVisible(43000, 3000, 46000), false)
  assert.equal(isPresenterVisible(46000, 14000, 46000), true)
})
