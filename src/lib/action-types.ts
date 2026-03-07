import { Action } from '../actions/types'

type Override<T, U> = Omit<T, keyof U> & U

export const animationPresenters = ['LegoAnimPresenter', 'LegoLocomotionAnimPresenter', 'LegoCarBuildAnimPresenter', 'LegoAnimMMPresenter', 'LegoLoopingAnimPresenter', 'LegoHideAnimPresenter'] as const

export const modelPresenter = 'LegoModelPresenter'

export type ActionBase = { id: number; siFile: string; type: Action.Type; presenter: string | null; extra: string | null; name: string; location: readonly [number, number, number] }

export type FileActionBase = Override<ActionBase, { fileType: Action.FileType }>

export type AudioActionBase = Override<FileActionBase, { fileType: Action.FileType.WAV; volume: number; startTime: number }>

export type AudioAction = Override<AudioActionBase, { presenter: null; loops: number }>

export type PositionalAudioAction = Override<AudioActionBase, { presenter: 'Lego3DWavePresenter' | 'LegoLoadCacheSoundPresenter'; extra: string; filename: string }>

export type ParallelAction<T, P extends string | null = string | null> = Override<ActionBase, { type: Action.Type.ParallelAction; fileType?: Action.FileType; children: readonly T[]; presenter: P }>

export type ParallelActionTuple<T, P extends string | null = string | null> = Override<ParallelAction<undefined, P>, { children: T }>

export type SerialAction<T, P extends string | null = string | null> = Override<ActionBase, { type: Action.Type.SerialAction; fileType?: Action.FileType; children: readonly T[]; presenter: P }>

export type AnimationAction = Override<FileActionBase, { type: Action.Type.ObjectAction; presenter: (typeof animationPresenters)[number]; location: readonly [number, number, number]; direction: readonly [number, number, number]; up: readonly [number, number, number] }>

export type NestedAnimationAction = Override<ActionBase, { type: Action.Type.ObjectAction; presenter: null; children: readonly [AnimationAction] }>

export type RunAnimationAction = ParallelAction<AnimationAction | PositionalAudioAction | PhonemeAction | AudioAction | PositionalAudioAction, null | 'LegoAnimMMPresenter'>

export type PlayableAnimationAction = RunAnimationAction | NestedAnimationAction | AnimationAction

export type BoundaryAction = Override<ActionBase, { presenter: 'LegoPathPresenter'; fileType: Action.FileType; location: readonly [number, number, number] }>

export type ImageAction = Override<FileActionBase, { type: Action.Type.Still; fileType: Action.FileType.STL; presenter: string | null; dimensions: { width: number; height: number } }>

export type TextureAction = Override<FileActionBase, { type: Action.Type.ObjectAction; fileType: Action.FileType.OBJ; presenter: 'LegoTexturePresenter' }>

export type PhonemeAction = Override<ActionBase, { type: Action.Type.Anim; fileType: Action.FileType.FLC; presenter: 'LegoPhonemePresenter'; startTime: number; duration: number }>

export type VideoAction = Override<FileActionBase, { presenter: null; dimensions: { width: number; height: number } }>

export type FlcAction = Override<VideoAction, { fileType: Action.FileType.FLC }>

export type SmackerAction = Override<VideoAction, { fileType: Action.FileType.SMK }>

export type ModelAction = Override<FileActionBase, { type: Action.Type.ObjectAction; presenter: 'LegoModelPresenter' }>

export type CompositeMediaAction = ParallelActionTuple<readonly [SmackerAction, AudioAction], 'MxCompositeMediaPresenter'>

export type CharacterMovieAction = ParallelActionTuple<readonly [AudioAction, SmackerAction], null>

export type ActorAction = ParallelActionTuple<readonly [ModelAction], 'LegoActorPresenter'>

export type EntityAction = ParallelActionTuple<readonly [ModelAction], 'LegoEntityPresenter'>

export type ControlAction = ParallelAction<ImageAction | ParallelActionTuple<readonly [ImageAction, ActionBase?]>, 'MxControlPresenter'>

export type MeterAction = Override<ImageAction, { extra: string; presenter: 'LegoMeterPresenter'; colorPalette: string[] }>

export type EventAction = Override<ActionBase, { type: Action.Type.Event; presenter: null; fileType: Action.FileType.OBJ }>

export const isAction = (action: unknown): action is ActionBase => action != null && typeof action === 'object' && 'id' in action && 'siFile' in action && 'type' in action && 'presenter' in action && 'extra' in action && 'name' in action

export const isFileAction = (action: unknown): action is FileActionBase => isAction(action) && 'fileType' in action

export const isImageAction = (action: unknown): action is ImageAction => isFileAction(action) && action.fileType === Action.FileType.STL

export const isAudioAction = (action: unknown): action is AudioAction => isFileAction(action) && action.fileType === Action.FileType.WAV && action.presenter === null

export const isPositionalAudioAction = (action: unknown): action is PositionalAudioAction => isFileAction(action) && action.fileType === Action.FileType.WAV && (action.presenter === 'Lego3DWavePresenter' || action.presenter === 'LegoLoadCacheSoundPresenter')

export const isAnimationAction = (action: unknown): action is AnimationAction => isAction(action) && isAnimationPresenter(action.presenter)

export const isNestedAnimationAction = (action: unknown): action is AnimationAction => isAction(action) && action.presenter === null && 'children' in action && Array.isArray(action.children) && action.children.length === 1 && isAnimationAction(action.children[0])

export const isPhonemeAction = (action: unknown): action is PhonemeAction => isAction(action) && action.type === Action.Type.Anim && action.presenter === 'LegoPhonemePresenter'

export const isParallelAction = (action: unknown): action is ParallelAction<unknown> => isAction(action) && action.type === Action.Type.ParallelAction

export const isRunAnimationAction = (action: unknown): action is RunAnimationAction =>
  isParallelAction(action) && (action.presenter === null || action.presenter === 'LegoAnimMMPresenter') && action.children.length > 0 && action.children.every(child => isAnimationAction(child) || isAudioAction(child) || isPositionalAudioAction(child) || isPhonemeAction(child) || isAudioAction(child))

export const isPlayableAnimationAction = (action: unknown): action is PlayableAnimationAction => isRunAnimationAction(action) || isNestedAnimationAction(action) || isAnimationAction(action)

export const isControlAction = (action: unknown): action is ControlAction => isAction(action) && action.presenter === 'MxControlPresenter'

export const isMeterAction = (action: unknown): action is MeterAction => isImageAction(action) && action.presenter === 'LegoMeterPresenter'

export const isTextureAction = (action: unknown): action is TextureAction => isFileAction(action) && action.type === Action.Type.ObjectAction && action.presenter === 'LegoTexturePresenter'

export const isModelAction = (action: unknown): action is ModelAction => isFileAction(action) && action.type === Action.Type.ObjectAction && action.presenter === modelPresenter

export const isActorAction = (action: unknown): action is ActorAction => isParallelAction(action) && action.presenter === 'LegoActorPresenter' && action.children.length === 1 && isModelAction(action.children[0])

export const isEntityAction = (action: unknown): action is EntityAction => isParallelAction(action) && action.presenter === 'LegoEntityPresenter' && action.children.length === 1 && isModelAction(action.children[0])

export const isBoundaryAction = (action: unknown): action is BoundaryAction => isFileAction(action) && action.type === Action.Type.ObjectAction && action.presenter === 'LegoPathPresenter'

function* generateExtraValues(action: { extra: string | null }): Generator<[string, string]> {
  if (action.extra == null) {
    return
  }

  for (const part of action.extra.split(/[, \t\r\n]+/)) {
    const delim = part.indexOf(':')
    const partKey = delim > 0 ? part.slice(0, delim) : part
    const partValue = delim < 0 ? '' : part.slice(delim + 1)

    yield [partKey.toLowerCase(), partValue]
  }
}

export type ExtraValues = {
  get(key: string): string | undefined
  delete(key: string): void
  get size(): number
}

export const getExtraValues = (action: { extra: string | null }): ExtraValues => {
  const mapping = new Map(generateExtraValues(action))
  return {
    get(key: string): string | undefined {
      return mapping.get(key.toLowerCase())
    },
    delete(key: string): void {
      mapping.delete(key.toLowerCase())
    },
    get size(): number {
      return mapping.size
    },
  }
}

export const getExtraValue = (action: { extra: string | null }, key: string): string | undefined => {
  for (const [partKey, partValue] of generateExtraValues(action)) {
    if (partKey === key.toLowerCase()) {
      return partValue
    }
  }
  return undefined
}

export const splitExtraValue = (value: string): string[] => value.split(/[:;]/)

export const isAnimationPresenter = (presenter: string | null): boolean => presenter != null && (animationPresenters as readonly string[]).includes(presenter)
