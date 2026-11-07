import assert from 'node:assert/strict'
import test from 'node:test'
import { gasStationVisit, towFinishIndex, towScore } from '../src/lib/tow-rules.ts'

test('gas station intro counts and short explanations match every actor', () => {
  assert.deepEqual(gasStationVisit('pepper', 2), { introduction: true, name: 'wgs004nu' })
  assert.deepEqual(gasStationVisit('pepper', 3), { introduction: false, name: 'wgs008nu' })
  assert.deepEqual(gasStationVisit('papa', 2), { introduction: false, name: 'wgs017nu' })
  assert.deepEqual(gasStationVisit('laura', 5), { introduction: false, name: 'wgs022nu' })
})

test('tow score thresholds and Papa versus Nick finish ordering', () => {
  assert.equal(towScore(199999), 'red')
  assert.equal(towScore(200000), 'blue')
  assert.equal(towScore(300000), 'yellow')
  assert.equal(towFinishIndex('papa'), 3)
  assert.equal(towFinishIndex('nick'), 2)
})
