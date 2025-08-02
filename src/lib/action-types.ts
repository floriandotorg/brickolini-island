import { Action } from '../actions/types'

type Override<T, U> = Omit<T, keyof U> & U

export type ActionBase = { id: number; siFile: string; type: Action.Type; presenter: string | null; extra: string | null; name: string; location: readonly [number, number, number] }

export type FileActionBase = Override<ActionBase, { fileType: Action.FileType }>

export type AudioActionBase = Override<FileActionBase, { fileType: Action.FileType.WAV; volume: number; startTime: number }>

export type AudioAction = Override<AudioActionBase, { presenter: null }>

export type PositionalAudioAction = Override<AudioActionBase, { presenter: 'Lego3DWavePresenter'; extra: string }>

export type ParallelAction<T, P extends string | null = string | null> = Override<ActionBase, { type: Action.Type.ParallelAction; fileType?: Action.FileType; children: readonly T[]; presenter: P }>

export type ParallelActionTuple<T, P extends string | null = string | null> = Override<ParallelAction<undefined, P>, { children: T }>

export type SerialAction<T, P extends string | null = string | null> = Override<ActionBase, { type: Action.Type.SerialAction; fileType?: Action.FileType; children: readonly T[]; presenter: P }>

export type AnimationAction = Override<FileActionBase, { type: Action.Type.ObjectAction; presenter: 'LegoAnimPresenter' }>

export type BoundaryAction = Override<ActionBase, { presenter: 'LegoPathPresenter'; fileType: Action.FileType; location: readonly [number, number, number] }>

export type ImageAction = Override<FileActionBase, { type: Action.Type.Still; fileType: Action.FileType.STL; presenter: string | null }>

export type PhonemeAction = Override<ActionBase, { type: Action.Type.Anim; fileType: Action.FileType.FLC; presenter: 'LegoPhonemePresenter' }>

export type CompositeMediaAction = ParallelActionTuple<readonly [Override<ActionBase, { fileType: Action.FileType.SMK; presenter: null }>, AudioAction], 'MxCompositeMediaPresenter'>

export type ActorAction = ParallelActionTuple<readonly [Override<ActionBase, { type: Action.Type.ObjectAction; presenter: 'LegoModelPresenter' }>], 'LegoActorPresenter'>

export type EntityAction = ParallelActionTuple<readonly [Override<ActionBase, { type: Action.Type.ObjectAction; presenter: 'LegoModelPresenter' }>], 'LegoEntityPresenter'>

export type ControlAction = ParallelAction<ImageAction | ParallelActionTuple<readonly [ImageAction]>, 'MxControlPresenter'>

export type MeterAction = Override<ImageAction, { extra: string; presenter: 'LegoMeterPresenter'; colorPalette: string[] }>

export const isAction = (action: unknown): action is ActionBase => action != null && typeof action === 'object' && 'id' in action && 'siFile' in action && 'type' in action && 'presenter' in action && 'extra' in action && 'name' in action

export const isFileAction = (action: unknown): action is FileActionBase => isAction(action) && 'fileType' in action

export const isImageAction = (action: unknown): action is ImageAction => isFileAction(action) && action.fileType === Action.FileType.STL

export const isAudioAction = (action: unknown): action is AudioAction => isFileAction(action) && action.fileType === Action.FileType.WAV && action.presenter === null

export const isAnimationAction = (action: unknown): action is AnimationAction => isAction(action) && action.presenter === 'LegoAnimPresenter'

export const isControlAction = (action: unknown): action is ControlAction => isAction(action) && action.presenter === 'MxControlPresenter'

export const isMeterAction = (action: unknown): action is MeterAction => isImageAction(action) && action.presenter === 'LegoMeterPresenter'

export const getExtraValue = (action: { extra: string | null }, key: string): string | undefined => {
  const re = new RegExp(String.raw`${key}:([^, \t\r\n:]+)`, 'i')
  return action?.extra?.match(re)?.[1]
}

export const splitExtraValue = (value: string): string[] => {
  return value.split(/[:;]/)
}
