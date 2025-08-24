import * as THREE from 'three'
import type { AnimationAction } from '../action-types'
import { BinaryReader } from './binary-reader'
import { getAction } from './load'
import { WDB } from './wdb'

export type TimeAndFlags = { time: number; flags: number }
export type VertexKey = { timeAndFlags: TimeAndFlags; vertex: THREE.Vector3 }
export type RotationKey = { timeAndFlags: TimeAndFlags; quaternion: THREE.Quaternion }
export type MorphKey = { timeAndFlags: TimeAndFlags; visible: boolean }
export type Animation3DNode = { name: string; translationKeys: VertexKey[]; rotationKeys: RotationKey[]; scaleKeys: VertexKey[]; morphKeys: MorphKey[]; children: Animation3DNode[] }

export const findRecursively = (node: Animation3DNode, predicate: (node: Animation3DNode) => boolean): Animation3DNode[] | undefined => {
  if (predicate(node)) {
    return [node]
  }
  for (const child of node.children) {
    const foundNode = findRecursively(child, predicate)
    if (foundNode != null) {
      return [node, ...foundNode]
    }
  }
  return undefined
}

export const parse3DAnimation = (buffer: ArrayBuffer) => {
  const reader = new BinaryReader(buffer)
  const magic = reader.readInt32()
  if (magic !== 17) {
    throw new Error('Invalid magic number')
  }
  const radius = reader.readFloat32()
  const center = reader.readVector3()
  const parseScene = reader.readInt32()
  const _val3 = reader.readInt32()
  const animation = WDB.Animation.readAnimation(reader, parseScene !== 0)
  const convertNode = (node: WDB.Animation.Node): Animation3DNode => ({
    name: node.name.toLowerCase(),
    translationKeys: node.translationKeys.map(t => ({ timeAndFlags: t.timeAndFlags, vertex: new THREE.Vector3(...t.vertex) })),
    rotationKeys: node.rotationKeys.map(t => ({ timeAndFlags: t.timeAndFlags, quaternion: new THREE.Quaternion(...t.quaternion) })),
    scaleKeys: node.scaleKeys.map(t => ({ timeAndFlags: t.timeAndFlags, vertex: new THREE.Vector3(...t.vertex) })),
    morphKeys: node.morphKeys.map(t => ({ timeAndFlags: t.timeAndFlags, visible: t.bool })),
    children: node.children.map(convertNode),
  })
  return {
    ...animation,
    tree: convertNode(animation.tree),
    radius,
    center,
  }
}

export const getBeforeAndAfter = <T extends { timeAndFlags: { time: number } }>(keys: T[], time: number): { before: T; after: T | null } => {
  let idx = keys.findIndex(k => k.timeAndFlags.time > time)
  if (idx < 0) {
    idx = keys.length
  }
  const before = keys[Math.max(0, idx - 1)]
  if (before == null) {
    throw new Error('No keyframes found')
  }
  return { before, after: keys[idx] }
}

export const animationToTracks = (animation: Animation3DNode, actors: Map<string, { type: WDB.ActorType; object: THREE.Object3D; children: Map<string, THREE.Object3D> }>, offset: THREE.Vector3 = new THREE.Vector3()): THREE.KeyframeTrack[] => {
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()

  const getDurationMs = (animation: Animation3DNode): number => Math.max(animation.translationKeys.at(-1)?.timeAndFlags.time ?? 0, animation.rotationKeys.at(-1)?.timeAndFlags.time ?? 0, animation.scaleKeys.at(-1)?.timeAndFlags.time ?? 0, ...animation.children.map(getDurationMs))

  const getUuid = (name: string, path: string[]): string | undefined => {
    let uuid: string | undefined

    for (const key of path.toReversed()) {
      const parent = actors.get(key)
      if (parent != null) {
        const actor = parent.children.get(name)
        if (actor != null) {
          uuid = actor.uuid
          break
        }
      }
    }

    if (uuid == null) {
      const actor = actors.get(name)
      if (actor != null && actor.type !== WDB.ActorType.ManagedActor) {
        uuid = actor.object.uuid
      }
    }

    return uuid
  }

  const getTransform = (animation: Animation3DNode, time: number, valueMap: Map<string, number[]>, name = '', parent: THREE.Matrix4 = new THREE.Matrix4(), path: string[] = []): void => {
    const push = (key: string, values: number[]) => {
      const existing = valueMap.get(key)
      if (existing == null) {
        valueMap.set(key, values)
      } else {
        existing.push(...values)
      }
    }

    const t = (before: { timeAndFlags: { time: number } }, after: { timeAndFlags: { time: number } }) => (time - before.timeAndFlags.time) / (after.timeAndFlags.time - before.timeAndFlags.time)

    const translateBy = (mat: THREE.Matrix4, vertex: THREE.Vector3) => {
      mat.elements[12] += vertex.x
      mat.elements[13] += vertex.y
      mat.elements[14] += vertex.z
    }

    const getRotation = (): THREE.Matrix4 => {
      const { before, after } = getBeforeAndAfter(animation.rotationKeys, time)
      if (after == null) {
        if (before.timeAndFlags.flags & 1) {
          return new THREE.Matrix4().makeRotationFromQuaternion(before.quaternion)
        }
      } else if (before.timeAndFlags.flags & 1 || after.timeAndFlags.flags & 1) {
        if (after.timeAndFlags.flags & 4) {
          return new THREE.Matrix4().makeRotationFromQuaternion(before.quaternion)
        }

        const afterQuat = after.timeAndFlags.flags & 2 ? new THREE.Quaternion(-after.quaternion.x, -after.quaternion.y, -after.quaternion.z, -after.quaternion.w) : after.quaternion
        return new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().slerpQuaternions(before.quaternion, afterQuat, t(before, after)))
      }

      return new THREE.Matrix4()
    }

    let mat = new THREE.Matrix4()

    if (animation.scaleKeys.length > 0) {
      const { before, after } = getBeforeAndAfter(animation.scaleKeys, time)
      if (after == null) {
        mat.scale(before.vertex)
      } else {
        const scale = new THREE.Vector3().lerpVectors(before.vertex, after.vertex, t(before, after))
        mat.scale(scale)
      }

      if (animation.rotationKeys.length > 0) {
        mat = getRotation().multiply(mat)
      }
    } else if (animation.rotationKeys.length > 0) {
      mat = getRotation()
    }

    if (animation.translationKeys.length > 0) {
      const { before, after } = getBeforeAndAfter(animation.translationKeys, time)
      if (after == null) {
        if (before.timeAndFlags.flags & 1) {
          translateBy(mat, before.vertex)
        }
      } else if (before.timeAndFlags.flags & 1 || after.timeAndFlags.flags & 1) {
        translateBy(mat, new THREE.Vector3().lerpVectors(before.vertex, after.vertex, t(before, after)))
      }
    }

    mat = parent.clone().multiply(mat)

    const uuid = getUuid(name, path)

    if (uuid != null) {
      mat.decompose(position, quaternion, scale)
      push(`${uuid}.position`, position.add(offset).toArray())
      push(`${uuid}.quaternion`, quaternion.toArray())
      push(`${uuid}.scale`, scale.toArray())
    }

    for (const child of animation.children) {
      getTransform(child, time, valueMap, child.name, mat, [...path, name])
    }
  }

  const duration = getDurationMs(animation)
  const getNextTime = (animation: Animation3DNode, start: number, keys: ('translationKeys' | 'rotationKeys' | 'scaleKeys' | 'morphKeys')[]): number => {
    let next = Number.POSITIVE_INFINITY
    for (const key of keys.map(k => animation[k])) {
      const nextKey = key.find(k => k.timeAndFlags.time > start)
      if (nextKey != null) {
        next = Math.min(next, nextKey.timeAndFlags.time)
      }
    }
    return Math.min(next, ...animation.children.map(c => getNextTime(c, start, keys)))
  }
  const times = []
  for (let start = 0; start <= duration; start = getNextTime(animation, start, ['translationKeys', 'rotationKeys', 'scaleKeys'])) {
    times.push(start)
  }
  const valueMap = new Map<string, number[]>()
  for (const time of times) {
    getTransform(animation, time, valueMap)
  }

  const timesSec = times.map(t => t / 1_000)
  const result = Array.from(valueMap.entries()).map(([name, values]) => {
    if (name.includes('position')) {
      return new THREE.VectorKeyframeTrack(name, timesSec, values)
    }
    if (name.includes('quaternion')) {
      return new THREE.QuaternionKeyframeTrack(name, timesSec, values)
    }
    if (name.includes('scale')) {
      return new THREE.VectorKeyframeTrack(name, timesSec, values)
    }
    throw new Error(`Unknown track: ${name}`)
  })

  const addZeroMorphKey = (animation: Animation3DNode): void => {
    if (animation.morphKeys.length > 0 && animation.morphKeys[0].timeAndFlags.time > 0) {
      animation.morphKeys.unshift({
        timeAndFlags: { time: 0, flags: 0 },
        visible: true,
      })
    }

    for (const child of animation.children) {
      addZeroMorphKey(child)
    }
  }
  addZeroMorphKey(animation)

  const getMorph = (animation: Animation3DNode, time: number, valueMap: Map<string, boolean[]>, name = '', parent: boolean, path: string[] = []): void => {
    const push = (key: string, value: boolean) => {
      const existing = valueMap.get(key)
      if (existing == null) {
        valueMap.set(key, [value])
      } else {
        existing.push(value)
      }
    }

    const visible = animation.morphKeys.length < 1 ? parent : getBeforeAndAfter(animation.morphKeys, time).before.visible

    const uuid = getUuid(name, path)
    if (uuid != null) {
      push(`${uuid}.visible`, visible)
    }

    for (const child of animation.children) {
      getMorph(child, time, valueMap, child.name, visible, [...path, name])
    }
  }

  const morphTimes: number[] = []
  for (let start = 0; start <= duration; start = getNextTime(animation, start, ['morphKeys'])) {
    morphTimes.push(start)
  }
  const morphValueMap = new Map<string, boolean[]>()
  for (const time of morphTimes) {
    getMorph(animation, time, morphValueMap, '', true)
  }

  const morphResult = Array.from(morphValueMap.entries()).map(([name, values]) => {
    return new THREE.BooleanKeyframeTrack(
      name,
      morphTimes.map(t => t / 1_000),
      values,
    )
  })

  result.push(...morphResult)

  return result
}

export const getAnimation = async (action: AnimationAction, actors: Map<string, { type: WDB.ActorType; object: THREE.Object3D; children: Map<string, THREE.Object3D> }>): Promise<THREE.AnimationClip> => {
  const animation = parse3DAnimation(await getAction(action))
  return new THREE.AnimationClip(action.name, -1, animationToTracks(animation.tree, actors))
}
