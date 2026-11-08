import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compileFragmentShader } from '../src/lib/effect/shader-pipeline.ts'

const template = '/// EFFECTS\nvoid main() {\n/// PIPELINE\nfragColor = outputColor;\n}'
const effects = [{ fragmentShader: 'void mainImage() { world(); }' }, { fragmentShader: 'void mainImage() { grain(); }' }, { fragmentShader: 'void mainImage() { transition(); }' }]

test('combined shaders preserve effect order and intermediate alpha composition', () => {
  const shader = compileFragmentShader(template, effects, 1)
  const world = shader.indexOf('main1(inputColor, outputColor);')
  const blend = shader.indexOf('inputColor.rgb *= inputColor.a;')
  const grain = shader.indexOf('main2(inputColor, outputColor);')
  const transition = shader.indexOf('main3(inputColor, outputColor);')
  assert.ok(world < blend && blend < grain && grain < transition)
  assert.equal(shader.match(/inputColor.rgb \*= inputColor.a;/g)?.length, 1)
  assert.ok(shader.includes('void main1() { world(); }'))
  assert.ok(shader.includes('void main2() { grain(); }'))
  assert.ok(shader.includes('void main3() { transition(); }'))
  assert.equal(shader.includes('///'), false)
})

test('ordinary shaders preserve the existing pipeline and empty source effects compose first', () => {
  assert.equal(compileFragmentShader(template, effects).includes('inputColor.rgb *= inputColor.a;'), false)
  const shader = compileFragmentShader(template, effects.slice(1), 0)
  assert.ok(shader.indexOf('inputColor.rgb *= inputColor.a;') < shader.indexOf('main1(inputColor, outputColor);'))
  assert.ok(compileFragmentShader(template, []).includes('fragColor = outputColor;'))
})
