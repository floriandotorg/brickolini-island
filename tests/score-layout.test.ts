import assert from 'node:assert/strict'
import test from 'node:test'
import { getCubeCells, getHistoryPosition } from '../src/lib/score-layout.ts'

test('cube maps actor rows and mission columns to the extracted PNG', () => {
  const cells = getCubeCells((mission, actor) => (mission === 'ambulance' && actor === 'pepper' ? 3 : 0))
  assert.equal(cells.length, 25)
  assert.deepEqual(cells[4], { x: 212, y: 171, width: 40, height: 42, color: '#cb1220' })
  assert.deepEqual(cells[20], { x: 47, y: 0, width: 37, height: 42, color: '#b9b9b9' })
})

test('history places ten entries on each page', () => {
  assert.deepEqual(getHistoryPosition(0), { x: 144, y: 121 })
  assert.deepEqual(getHistoryPosition(9), { x: 144, y: 364 })
  assert.deepEqual(getHistoryPosition(10), { x: 344, y: 121 })
  assert.deepEqual(getHistoryPosition(19), { x: 344, y: 364 })
})
