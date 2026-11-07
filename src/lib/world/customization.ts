import * as THREE from 'three'
import * as actions from '../../actions/sndanim'
import { isAnimationAction, isPositionalAudioAction } from '../action-types'
import { animationToTracks, parse3DAnimation } from '../assets/animation'
import { getAction } from '../assets/load'
import type { Roi3D } from '../assets/model'
import { WDB } from '../assets/wdb'
import { type ClickKind, type ClickState, clickSoundIds } from '../customization-rules'
import type { World } from './world'

const candidates: readonly unknown[] = Object.values(actions)
const disabled = new WeakSet<Roi3D>()

export const playCustomizationFeedback = async (world: World, roi: Roi3D, kind: ClickKind, state: ClickState, animationId: number, mood: boolean, sounds = true): Promise<void> => {
  if (disabled.has(roi) || world.isCharacterAnimating(roi.name)) {
    return
  }
  disabled.add(roi)
  const actor = roi.actor
  actor?.suspend()
  try {
    if (sounds) {
      for (const id of clickSoundIds(kind, state, mood)) {
        const sound = candidates.find(action => isPositionalAudioAction(action) && action.id === id)
        if (sound != null && isPositionalAudioAction(sound)) {
          void world.playPositionalAudio(sound, roi.model)
        }
      }
    }
    const action = candidates.find(action => isAnimationAction(action) && action.id === animationId)
    if (action == null || !isAnimationAction(action)) {
      return
    }
    const animation = parse3DAnimation(await getAction(action))
    const aliases = kind === 'actor' ? ['actor_01', roi.name] : kind === 'building' ? ['haus1', roi.name] : ['flwrred', 'flwrgrn', 'tree', 'bush', 'palm', roi.name]
    const bindings = new Map(aliases.map(name => [name, { type: kind === 'actor' ? WDB.ActorType.ManagedActor : WDB.ActorType.Unknown, object: roi.model, roi, children: new Map(roi.children.map(child => [child.name, child.model])) }]))
    const clip = new THREE.AnimationClip(action.name, -1, animationToTracks(animation.tree, bindings, roi.getWorldBoundsMatrix()))
    await world.playAnimationClip(world.scene, clip)
  } finally {
    actor?.resume()
    disabled.delete(roi)
  }
}
