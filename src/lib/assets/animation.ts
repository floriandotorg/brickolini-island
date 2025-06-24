import * as THREE from 'three'
import { BinaryReader } from './binary-reader'
import { WDB } from './wdb'

export type TimeAndFlags = { time: number; flags: number }
export type VertexKey = { timeAndFlags: TimeAndFlags; vertex: THREE.Vector3 }
export type RotationKey = { timeAndFlags: TimeAndFlags; quaternion: THREE.Quaternion }
export type MorphKey = { timeAndFlags: TimeAndFlags; bool: boolean }
export type Animation3DNode = { name: string; translationKeys: VertexKey[]; rotationKeys: RotationKey[]; scaleKeys: VertexKey[]; morphKeys: MorphKey[]; children: Animation3DNode[] }

export const parse3DAnimation = (buffer: ArrayBuffer): Animation3DNode => {
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
    name: node.name,
    translationKeys: node.translationKeys.map(t => ({ timeAndFlags: t.timeAndFlags, vertex: new THREE.Vector3(...t.vertex) })),
    rotationKeys: node.rotationKeys.map(t => ({ timeAndFlags: t.timeAndFlags, quaternion: new THREE.Quaternion(...t.quaternion) })),
    scaleKeys: node.scaleKeys.map(t => ({ timeAndFlags: t.timeAndFlags, vertex: new THREE.Vector3(...t.vertex) })),
    morphKeys: node.morphKeys.map(t => ({ timeAndFlags: t.timeAndFlags, bool: t.bool })),
    children: node.children.map(convertNode),
  })
  return convertNode(animation.tree)
}

export const animationToTracks = (animation: Animation3DNode): THREE.KeyframeTrack[] => {
  const getDurationMs = (animation: Animation3DNode): number => Math.max(animation.translationKeys.at(-1)?.timeAndFlags.time ?? 0, animation.rotationKeys.at(-1)?.timeAndFlags.time ?? 0, animation.scaleKeys.at(-1)?.timeAndFlags.time ?? 0, ...animation.children.map(getDurationMs))

  const getValues = (animation: Animation3DNode, time: number, valueMap: Map<string, number[]>, name = '', parent: THREE.Matrix4 = new THREE.Matrix4().identity()): void => {
    const push = (key: string, values: number[]) => {
      valueMap.set([name, key].join('.'), [...(valueMap.get([name, key].join('.')) ?? []), ...values])
    }

    const t = (before: { timeAndFlags: { time: number } }, after: { timeAndFlags: { time: number } }) => (time - before.timeAndFlags.time) / (after.timeAndFlags.time - before.timeAndFlags.time)

    const getBeforeAndAfter = <T extends { timeAndFlags: { time: number } }>(keys: T[]): { before: T | null; after: T | null } => {
      const idx = keys.findIndex(k => k.timeAndFlags.time > time)
      return { before: keys[Math.max(0, idx - 1)], after: keys[idx] }
    }

    const translateBy = (mat: THREE.Matrix4, vertex: THREE.Vector3) => {
      mat.elements[12] += vertex.x
      mat.elements[13] += vertex.y
      mat.elements[14] += vertex.z
    }

    const getRotation = (): THREE.Matrix4 => {
      const { before, after } = getBeforeAndAfter(animation.rotationKeys)
      if (before == null) {
        throw new Error('No keyframes found')
      }
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

      return new THREE.Matrix4().identity()
    }

    let mat = new THREE.Matrix4().identity()

    if (animation.scaleKeys.length > 0) {
      const { before, after } = getBeforeAndAfter(animation.scaleKeys)
      if (before == null) {
        throw new Error('No keyframes found')
      }
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
      if (before == null) {
        throw new Error('No keyframes found')
      }
      if (after == null) {
        if (before.timeAndFlags.flags & 1) {
          translateBy(mat, before.vertex)
        }
      } else if (before.timeAndFlags.flags & 1 || after.timeAndFlags.flags & 1) {
        translateBy(mat, new THREE.Vector3().lerpVectors(before.vertex, after.vertex, t(before, after)))
      }
    }

    if (animation.morphKeys.length > 0) {
      throw new Error('Morph keys not yet supported')
    }

    mat = parent.clone().multiply(mat)

    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    mat.decompose(position, quaternion, scale)
    push('position', position.toArray())
    push('quaternion', quaternion.toArray())
    push('scale', scale.toArray())

    for (const child of animation.children) {
      getValues(child, time, valueMap, child.name.toLowerCase(), mat)
    }
  }

  const valueMap = new Map<string, number[]>()
  const resolution = 100
  const times = Array.from({ length: Math.floor(getDurationMs(animation) / resolution) }, (_, i) => i * resolution)
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
    throw new Error(`Unknown track: ${name}`)
  })
}

// const clip = new THREE.AnimationClip('test', -1, animationToTracks(animation3d))
