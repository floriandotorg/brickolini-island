import * as THREE from 'three'
import { isAnimationAction, isNestedAnimationAction, isRunAnimationAction } from './action-types'
import { calculateTransformationMatrix } from './assets/model'
import { engine } from './engine'
import { locations } from './locations'
import { PlayerCharacters } from './save-game'
import { act2State, act3State } from './session-state.ts'
import { switchWorld } from './switch-world'
import { Plants } from './world/plants'

const scripts = import.meta.glob<Record<string, unknown>>('../actions/*.ts')
let command: 'location' | 'animation' | 'act' | 'light' | null = null
let digits = ''
let followCamera = false
let fps: HTMLDivElement | null = null
let resetPlants = false

const playAction = async (script: string, id: number): Promise<void> => {
  const world = engine.currentWorld
  const load = scripts[`../actions/${script}.ts`]
  if (load == null) {
    return
  }
  const actions = await load()
  const action = Object.values(actions).find(action => (isRunAnimationAction(action) || isAnimationAction(action) || isNestedAnimationAction(action)) && action.id === id)
  if (world !== engine.currentWorld) {
    return
  }
  if (isRunAnimationAction(action) && followCamera && 'playCameraAnimation' in world && typeof world.playCameraAnimation === 'function') {
    await world.playCameraAnimation(action)
  } else if (isRunAnimationAction(action) || isAnimationAction(action) || isNestedAnimationAction(action)) {
    await world.playAnimation(action)
  }
}

export const updateDebugFps = (delta: number): void => {
  if (fps != null && !fps.hidden && delta > 0) {
    fps.textContent = (1 / delta).toFixed(2).padStart(7, '0')
  }
}

export const handleDebugKey = (code: string): boolean => {
  if (!engine.hasWorld) {
    return false
  }
  const world = engine.currentWorld
  const camera = world.camera
  if (code === 'Tab') {
    if (fps == null) {
      fps = document.createElement('div')
      fps.style.cssText = 'position:fixed;left:0;top:0;font:12px Arial;color:white;z-index:100;pointer-events:none'
      fps.hidden = true
      document.body.append(fps)
    }
    fps.hidden = !fps.hidden
    return true
  }
  if (code === 'Minus' && command === 'animation') {
    followCamera = true
    return true
  }
  if (/^Digit\d$/.test(code)) {
    digits += code.slice(-1)
    if (command === 'location' && digits.length === 2) {
      const location = locations.find(location => location.index === Number(digits))
      if (location != null) {
        const matrix = calculateTransformationMatrix(location.position, location.direction, location.up)
        matrix.decompose(camera.position, camera.quaternion, new THREE.Vector3())
        camera.rotateY(Math.PI)
      }
    } else if (command === 'animation' && digits.length === 3) {
      void playAction(world.name === 'act1' ? 'isle' : world.name === 'act2' ? 'act2main' : world.name, Number(digits))
    } else if (command === 'act') {
      const act = Number(digits)
      if (act === 1) {
        engine.currentSaveGame.act = 1
        void switchWorld({ spawn: 'infocenterExited' })
      } else if (act === 2) {
        engine.currentSaveGame.act = 2
        act2State.enabled = true
        void switchWorld('act2')
      } else if (act === 3) {
        engine.currentSaveGame.act = 3
        void switchWorld('act3')
      } else if (act === 4 || act === 5) {
        act3State.state = act === 4 ? 2 : 3
        void switchWorld({ ending: act === 4 ? 'good' : 'bad' })
      }
    } else if (command === 'light') {
      const lights: THREE.Light[] = []
      world.scene.traverse(object => {
        if (object instanceof THREE.DirectionalLight || object instanceof THREE.PointLight) {
          lights.push(object)
        }
      })
      const light = lights[Number(digits)]
      if (light != null) {
        light.position.copy(camera.position)
        light.quaternion.copy(camera.quaternion)
      }
    } else if (command == null) {
      void playAction('common', Number(digits))
    } else {
      return true
    }
    command = null
    digits = ''
    return true
  }
  digits = ''
  if (code === 'KeyC' || code === 'KeyV' || code === 'KeyG' || code === 'KeyL') {
    command = code === 'KeyC' ? 'location' : code === 'KeyV' ? 'animation' : code === 'KeyG' ? 'act' : 'light'
    followCamera = false
    if (code === 'KeyV') {
      world.skipAllRunningAnimations(true)
    }
    return true
  }
  if (code === 'KeyA') {
    void playAction(world.name === 'act1' ? 'isle' : world.name === 'act2' ? 'act2main' : world.name, 1)
    command = null
    return true
  }
  command = null
  if (code === 'KeyD' || code === 'KeyU') {
    camera.position.y += code === 'KeyD' ? -1 : 1
    return true
  }
  if (code === 'KeyI' || code === 'KeyM') {
    camera.rotateX(code === 'KeyI' ? Math.PI / 12 : -Math.PI / 12)
    return true
  }
  if (code === 'KeyJ' || code === 'KeyK') {
    camera.rotateZ(code === 'KeyJ' ? Math.PI / 12 : -Math.PI / 12)
    return true
  }
  if (code === 'KeyN') {
    world.render3d = !world.render3d
    return true
  }
  if (code === 'KeyP' && world.name === 'act1') {
    void Plants.recreate(world, resetPlants)
    resetPlants = !resetPlants
    return true
  }
  if (code === 'F11') {
    engine.currentSaveGame.dirty = !engine.currentSaveGame.dirty
    return true
  }
  if (code === 'NumpadMultiply') {
    const current = engine.currentSaveGame.playerUnsafe
    const index = current == null ? -1 : PlayerCharacters.indexOf(current)
    engine.currentSaveGame.player = PlayerCharacters[(index + 1) % PlayerCharacters.length]
    return true
  }
  return false
}
