import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BackgroundMusic } from '../src/lib/audio/music.ts'
import { volumeToGain } from '../src/lib/audio/volume.ts'
import { InputManager } from '../src/lib/input.ts'
import { Transition } from '../src/lib/transition.ts'

const track = (id: number) => ({ id, volume: 79 })
const createMusic = () => {
  const sounds: { onEnded?: () => void; gain: { value: number }; loop: boolean; playing: boolean; play: () => void; stop: () => void; pause: () => void }[] = []
  const music = new BackgroundMusic(async () => {
    const sound = {
      gain: { value: 1 },
      loop: false,
      playing: false,
      play: () => {
        sound.playing = true
      },
      stop: () => {
        sound.playing = false
      },
      pause: () => {
        sound.playing = false
      },
    }
    sounds.push(sound)
    return sound
  })
  return { music, sounds }
}

test('music fades sequentially, rejects pending requests and can restart a stopped track', async () => {
  const { music, sounds } = createMusic()
  await music.play(track(1))
  music.update(1.7)
  assert.equal(music.currentActionId, 1)
  assert.equal(sounds[0].gain.value, volumeToGain(79))
  await music.play(track(2))
  await music.play(track(3))
  music.update(1.6)
  assert.equal(sounds.length, 2)
  assert.equal(sounds[1].gain.value, 0)
  music.update(1.8)
  assert.equal(sounds[0].playing, false)
  assert.equal(music.currentActionId, 2)
  music.stop()
  await music.play(track(2))
  assert.equal(sounds.length, 3)
})

test('music suppression nests and disabled music cancels in-flight loading', async () => {
  const { music, sounds } = createMusic()
  await music.play(track(1))
  music.update(2)
  music.lower()
  music.lower()
  music.update(0.3)
  assert.equal(sounds[0].gain.value, volumeToGain(30))
  music.raise()
  music.update(1)
  assert.equal(sounds[0].gain.value, volumeToGain(30))
  music.raise()
  music.update(0.5)
  assert.equal(sounds[0].gain.value, volumeToGain(79))
  const loading = music.play(track(2))
  music.setEnabled(false)
  await loading
  assert.equal(music.currentActionId, null)
  assert.equal(sounds[1].playing, false)
})

test('navigation uses physical keys and input disabling clears held state', () => {
  const input = new InputManager()
  input.keyDown('Numpad8')
  input.keyDown('ControlRight')
  assert.equal(input.getNavigationFlags().up, true)
  assert.equal(input.getNavigationFlags().ctrl, true)
  input.disable()
  assert.equal(input.getNavigationFlags().up, false)
  assert.equal(input.acceptsKey('Space'), false)
  input.allowSpaceWhileDisabled = true
  assert.equal(input.acceptsKey('Space'), true)
  assert.equal(input.acceptsKey('KeyA'), false)
})

test('click and drag thresholds use content pixels and held input starts a drag', () => {
  const input = new InputManager()
  const events: string[] = []
  input.onGesture = kind => events.push(kind)
  input.pointerDown({ x: 10, y: 10 }, 0)
  input.pointerMove({ x: 13, y: 14 })
  input.pointerUp()
  assert.deepEqual(events, ['click'])
  input.pointerDown({ x: 10, y: 10 }, 0)
  input.update(1000)
  input.pointerUp()
  assert.deepEqual(events.slice(1), ['dragStart', 'dragEnd'])
  input.toggleSticky()
  input.pointerMove({ x: 20, y: 20 })
  input.pointerDown({ x: 20, y: 20 }, 2000)
  assert.equal(input.dragging, false)
})

test('transition schedules cover every column once and keep their final frame', () => {
  const transition = new Transition({ type: 'mosaic' })
  assert.equal(new Set(transition.order).size, 64)
  assert.equal(transition.shifts.length, 48)
  assert.equal(transition.update(799), false)
  assert.equal(transition.update(800), true)
  assert.equal(transition.ticks, 16)
  transition.update(9000)
  assert.equal(transition.ticks, 16)
  assert.equal(new Transition({ type: 'dissolve' }).order.length, 640)
})

test('gamepad centers the dead zone, prefers keyboard input, and maps diagonal POV', () => {
  const input = new InputManager()
  const buttons = Array.from({ length: 16 }, (_, n) => ({ pressed: n === 12 || n === 15, touched: false, value: 0 }))
  const pad = { axes: [0.05, -0.05], buttons, connected: true, index: 0, id: 'test', mapping: 'standard', timestamp: 0, hapticActuators: [], vibrationActuator: null }
  assert.deepEqual(input.getGamepad([pad], -1), { x: 50, y: 50, pov: 45 })
  input.keyDown('ArrowUp')
  assert.equal(input.getGamepad([pad], 0), null)
  input.keyUp('ArrowUp')
  assert.equal(input.getGamepad([], -1), null)
})

test('transition durations match the scan line and no-animation modes', () => {
  for (const type of ['wipeDown', 'windows'] as const) {
    const transition = new Transition({ type })
    assert.equal(transition.update(11999), false)
    assert.equal(transition.update(12000), true)
    assert.equal(transition.ticks, 240)
  }
  assert.equal(new Transition({ type: 'none' }).update(50), true)
  assert.throws(() => new Transition({ speedMs: 0 }))
})

test('non-looping music advances on natural end and ignores stale callbacks', async () => {
  const { music, sounds } = createMusic()
  let ended = 0
  await music.play(track(1), 3, {
    loop: false,
    onEnded: () => {
      ++ended
    },
  })
  assert.equal(sounds[0].loop, false)
  music.update(3)
  sounds[0].onEnded?.()
  assert.equal(ended, 1)
  assert.equal(music.currentActionId, null)
  await music.play(track(2), 3, {
    loop: false,
    onEnded: () => {
      ++ended
    },
  })
  music.stop()
  sounds[1].onEnded?.()
  assert.equal(ended, 1)
})
