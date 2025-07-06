import * as THREE from 'three'
import type { AnimationAction } from '../action-types'
import { ACTORS } from '../world/actor'
import { BinaryReader } from './binary-reader'
import { getAction } from './load'
import { WDB } from './wdb'

export type TimeAndFlags = { time: number; flags: number }
export type VertexKey = { timeAndFlags: TimeAndFlags; vertex: THREE.Vector3 }
export type RotationKey = { timeAndFlags: TimeAndFlags; quaternion: THREE.Quaternion }
export type MorphKey = { timeAndFlags: TimeAndFlags; visible: boolean }
export type Animation3DNode = { name: string; translationKeys: VertexKey[]; rotationKeys: RotationKey[]; scaleKeys: VertexKey[]; morphKeys: MorphKey[]; children: Animation3DNode[] }

export const findRecursively = (node: Animation3DNode, predicate: (node: Animation3DNode) => boolean): Animation3DNode | undefined => {
  if (predicate(node)) {
    return node
  }
  for (const child of node.children) {
    const foundNode = findRecursively(child, predicate)
    if (foundNode != null) {
      return foundNode
    }
  }
  return undefined
}

export const parse3DAnimation = (buffer: ArrayBuffer, substitutions: Record<string, string> = {}) => {
  const reader = new BinaryReader(buffer)
  const magic = reader.readInt32()
  if (magic !== 17) {
    throw new Error('Invalid magic number')
  }
  const _unknownFloat = reader.readFloat32()
  const _unknownVector = reader.readVector3()
  const parseScene = reader.readInt32()
  if (parseScene !== 0) {
    throw new Error('Parse scene not supported')
  }
  const _val3 = reader.readInt32()
  const animation = WDB.Animation.readAnimation(reader)
  const convertNode = (node: WDB.Animation.Node): Animation3DNode => ({
    name: substitutions[node.name.toLowerCase()] ?? node.name.toLowerCase(),
    translationKeys: node.translationKeys.map(t => ({ timeAndFlags: t.timeAndFlags, vertex: new THREE.Vector3(...t.vertex) })),
    rotationKeys: node.rotationKeys.map(t => ({ timeAndFlags: t.timeAndFlags, quaternion: new THREE.Quaternion(...t.quaternion) })),
    scaleKeys: node.scaleKeys.map(t => ({ timeAndFlags: t.timeAndFlags, vertex: new THREE.Vector3(...t.vertex) })),
    morphKeys: node.morphKeys.map(t => ({ timeAndFlags: t.timeAndFlags, visible: t.bool })),
    children: node.children.map(convertNode),
  })
  return {
    ...animation,
    tree: convertNode(animation.tree),
  }
}

export const animationToTracks = (animation: Animation3DNode): THREE.KeyframeTrack[] => {
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()

  const getDurationMs = (animation: Animation3DNode): number => Math.max(animation.translationKeys.at(-1)?.timeAndFlags.time ?? 0, animation.rotationKeys.at(-1)?.timeAndFlags.time ?? 0, animation.scaleKeys.at(-1)?.timeAndFlags.time ?? 0, ...animation.children.map(getDurationMs))

  const getValues = (animation: Animation3DNode, time: number, valueMap: Map<string, number[]>, name = '', parent: THREE.Matrix4 = new THREE.Matrix4(), actorName: string | null = null): void => {
    if (animation.name === 'target' || animation.name.startsWith('cam')) {
      if (animation.translationKeys.length > 1 || animation.rotationKeys.length > 1 || animation.scaleKeys.length > 1 || animation.morphKeys.length > 1) {
        throw new Error('Camera movement is not implemented. If you see this, please implement it.')
      }

      return
    }

    const isActor = Object.keys(ACTORS).includes(animation.name)

    const push = (key: string, values: number[]) => {
      if (name.length < 1 || isActor) {
        return
      }
      const isBodyPart = ['body', 'arm-rt', 'arm-lft', 'leg-rt', 'leg-lft', 'head', 'infohat', 'infogron', 'claw-rt', 'claw-lft'].includes(name)
      const prefix = actorName != null && isBodyPart ? `${actorName}_` : ''
      const path = prefix + [name, key].join('.')
      const existing = valueMap.get(path)
      if (existing == null) {
        valueMap.set(path, values)
      } else {
        existing.push(...values)
      }
    }

    const t = (before: { timeAndFlags: { time: number } }, after: { timeAndFlags: { time: number } }) => (time - before.timeAndFlags.time) / (after.timeAndFlags.time - before.timeAndFlags.time)

    const getBeforeAndAfter = <T extends { timeAndFlags: { time: number } }>(keys: T[]): { before: T; after: T | null } => {
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

    const translateBy = (mat: THREE.Matrix4, vertex: THREE.Vector3) => {
      mat.elements[12] += vertex.x
      mat.elements[13] += vertex.y
      mat.elements[14] += vertex.z
    }

    const getRotation = (): THREE.Matrix4 => {
      const { before, after } = getBeforeAndAfter(animation.rotationKeys)
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
      const { before, after } = getBeforeAndAfter(animation.scaleKeys)
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
      const { before, after } = getBeforeAndAfter(animation.translationKeys)
      if (after == null) {
        if (before.timeAndFlags.flags & 1) {
          translateBy(mat, before.vertex)
        }
      } else if (before.timeAndFlags.flags & 1 || after.timeAndFlags.flags & 1) {
        translateBy(mat, new THREE.Vector3().lerpVectors(before.vertex, after.vertex, t(before, after)))
      }
    }

    if (animation.morphKeys.length > 0) {
      const { before } = getBeforeAndAfter(animation.morphKeys)
      push('visible', [before.visible ? 1 : 0])
    }

    mat = parent.clone().multiply(mat)

    mat.decompose(position, quaternion, scale)
    push('position', position.toArray())
    push('quaternion', quaternion.toArray())
    push('scale', scale.toArray())

    for (const child of animation.children) {
      getValues(child, time, valueMap, child.name, mat, isActor ? animation.name : actorName)
    }
  }

  const duration = getDurationMs(animation)
  const getNextTime = (animation: Animation3DNode, start: number): number => {
    let next = Number.POSITIVE_INFINITY
    for (const key of [animation.translationKeys, animation.rotationKeys, animation.scaleKeys, animation.morphKeys]) {
      const nextKey = key.find(k => k.timeAndFlags.time > start)
      if (nextKey != null) {
        next = Math.min(next, nextKey.timeAndFlags.time)
      }
    }
    return Math.min(next, ...animation.children.map(c => getNextTime(c, start)))
  }
  const times = []
  for (let start = 0; start < duration; start = getNextTime(animation, start)) {
    times.push(start)
  }
  console.log(times)
  const valueMap = new Map<string, number[]>()
  for (const time of times) {
    getValues(animation, time, valueMap)
  }

  const timesSec = times.map(t => t / 1000)
  return Array.from(valueMap.entries()).map(([name, values]) => {
    if (name.includes('position')) {
      return new THREE.VectorKeyframeTrack(name, timesSec, values)
    }
    if (name.includes('quaternion')) {
      return new THREE.QuaternionKeyframeTrack(name, timesSec, values)
    }
    if (name.includes('scale')) {
      return new THREE.VectorKeyframeTrack(name, timesSec, values)
    }
    if (name.includes('visible')) {
      return new THREE.BooleanKeyframeTrack(name, timesSec, values)
    }
    throw new Error(`Unknown track: ${name}`)
  })
}

export const getAnimation = async (action: AnimationAction, substitutions: Record<string, string> = {}): Promise<THREE.AnimationClip> => {
  const animation = parse3DAnimation(await getAction(action), substitutions)
  return new THREE.AnimationClip(action.name, -1, animationToTracks(animation.tree))
}
