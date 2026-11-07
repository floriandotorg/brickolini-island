import { Quaternion, Vector3 } from 'three'
import { handleDebugKey } from './debug-keys.ts'
import { engine } from './engine'
import { infocenterState } from './session-state.ts'
import { switchWorld } from './switch-world'
import { ACTORS, type CharacterName } from './world/character'
import { Plants } from './world/plants'

let spawned: { world: typeof engine.currentWorld; name: CharacterName } | null = null
let spawnIndex = -1
let spawning = false
const characterNames = Object.keys(ACTORS).filter((name): name is CharacterName => name in ACTORS)

const spawnCharacter = async (forward: boolean): Promise<void> => {
  if (spawning || !engine.hasWorld) {
    return
  }
  spawning = true
  try {
    const world = engine.currentWorld
    if (spawned != null) {
      if (spawned.world.findRoi(spawned.name) != null) {
        spawned.world.releaseActor(spawned.name)
      }
      spawned = null
    }
    spawnIndex = spawnIndex < 0 ? 0 : (spawnIndex + (forward ? 1 : -1) + characterNames.length) % characterNames.length
    const name = characterNames[spawnIndex]
    const character = await world.getCharacter(name)
    if (engine.currentWorld !== world) {
      world.releaseActor(name)
      return
    }
    const direction = world.camera.getWorldDirection(new Vector3())
    const position = world.camera.position.clone().add(new Vector3(2 * direction.x, direction.y - 1, 2 * direction.z))
    const quaternion = world.camera.quaternion.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI))
    character.moveRoiTo(position, quaternion)
    character.visible = true
    spawned = { world, name }
  } finally {
    spawning = false
  }
}

let password = ''
let debugEnabled = false

export const handleGlobalKey = (code: string): boolean => {
  if (code === 'Pause') {
    engine.setPaused(!engine.paused)
    return true
  }
  if (code === 'F12') {
    if (!engine.currentSaveGame.isUnloaded) {
      engine.storeSaveGames()
    }
    return true
  }
  if (code === 'Escape' && engine.hasWorld) {
    if (infocenterState.state !== 'exitQueried' && engine.currentWorld.escape()) {
      infocenterState.state = 'exitQueried'
      void switchWorld({ ending: null })
    }
    return true
  }
  if (code === 'KeyZ' && engine.hasWorld && engine.currentWorld.name === 'act1') {
    void Plants.dance(engine.currentWorld)
    return true
  }
  if (code === 'NumpadAdd' || code === 'NumpadSubtract') {
    void spawnCharacter(code === 'NumpadAdd')
    return true
  }
  if (!debugEnabled) {
    password += code.startsWith('Key') ? code.slice(3) : '?'
    if ('OGEL'.startsWith(password)) {
      if (password === 'OGEL') {
        debugEnabled = true
        password = ''
      }
    } else {
      password = code === 'KeyO' ? 'O' : ''
    }
    return false
  }
  if (code === 'KeyS') {
    engine.music.setEnabled(!engine.music.enabled)
    return true
  }
  if (code === 'KeyW' && engine.hasWorld) {
    const camera = engine.currentWorld.camera
    console.info({ position: camera.position, rotation: camera.rotation, up: camera.up })
    return true
  }
  return handleDebugKey(code)
}
