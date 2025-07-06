import * as THREE from 'three'
import type { AnimationAction, ParallelAction, PhonemeAction, PositionalAudioAction } from './action-types'
import { animationToTracks, parse3DAnimation } from './assets/animation'
import { getAction } from './assets/load'
import { WDB } from './assets/wdb'
import { Actor } from './world/actor'
import type { World } from './world/world'

export const playAnimation = async (world: World, action: ParallelAction<AnimationAction | PositionalAudioAction | PhonemeAction>): Promise<void> => {
  const animationActions = action.children.filter(c => c.presenter === 'LegoAnimPresenter')
  if (animationActions.length !== 1) {
    throw new Error('Expected one animation')
  }

  const animation = parse3DAnimation(await getAction(animationActions[0]))
  world.setupCameraForAnimation(animation.tree)

  const actors = new THREE.Group()

  for (const actor of animation.actors) {
    switch (actor.type) {
      case WDB.ActorType.ManagedActor: {
        const minifig = await Actor.create(world, actor.name)
        actors.add(minifig.mesh)
        break
      }
      case WDB.ActorType.Unknown: {
        const node = world.scene.getObjectByName(actor.name)
        if (node == null) {
          throw new Error(`Actor not found: ${actor.name}`)
        }
        actors.add(node)
        break
      }
      case WDB.ActorType.SceneRoi1:
      case WDB.ActorType.SceneRoi2: {
        const node = world.scene.getObjectByName(actor.name)
        if (node == null) {
          throw new Error(`Actor not found: ${actor.name}`)
        }
        actors.add(node)
        break
      }
      default:
        throw new Error(`Unsupported actor type ${actor.type} for ${actor.name}`)
    }
  }

  for (const audio of action.children.filter(c => c.presenter === 'Lego3DWavePresenter')) {
    const actor = actors.getObjectByName(audio.extra)
    if (actor == null) {
      throw new Error(`Actor not found: ${audio.extra}`)
    }
    world.playPositionalAudio(audio, actor, audio.startTime / 1_000)
  }

  world.scene.add(actors)

  const clip = new THREE.AnimationClip(animation.tree.name, -1, animationToTracks(animation.tree))
  world.playAnimation(actors, clip)
}
