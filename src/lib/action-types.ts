import type { Action } from '../actions/types'

export type AudioActionBase = { id: number; siFile: string; fileType: Action.FileType.WAV; volume: number }

export type AudioAction = AudioActionBase & { presenter: null }

export type PositionalAudioAction = AudioActionBase & { presenter: 'Lego3DWavePresenter'; extra: string }

export type ParallelAction<T> = { id: number; siFile: string; type: Action.Type.ParallelAction; presenter: null; children: readonly T[] }

export type AnimationAction = { type: Action.Type.ObjectAction; presenter: 'LegoAnimPresenter'; name: string; siFile: string; id: number; fileType: Action.FileType }

export type BoundaryAction = { id: number; siFile: string; presenter: 'LegoPathPresenter'; fileType: Action.FileType; location: readonly [number, number, number] }

export type ImageAction = { id: number; siFile: string; fileType: Action.FileType.STL; presenter: string | null }

export type PhonemeAction = { type: Action.Type.Anim; presenter: 'LegoPhonemePresenter'; name: string; siFile: string; id: number; fileType: Action.FileType }

export type CompositeMediaAction = { presenter: 'MxCompositeMediaPresenter'; children: readonly [{ id: number; siFile: string; fileType: Action.FileType.SMK; presenter: null }, AudioAction] }
