import * as THREE from 'three'
import { AnimB1, AnimB2, AnimB3, AnimF1, AnimF2, AnimF3, AnimP1, AnimP2, AnimP3, AnimT1, AnimT2, AnimT3, Sound7, Sound8, Sound9, Sound10, Sound11, Sound12, Sound13, Sound14, Sound17, Sound18 } from '../../actions/sndanim'
import type { AnimationAction, PositionalAudioAction } from '../action-types'
import { getAnimation } from '../assets/animation'
import { calculateTransformationMatrix, getGlobalPart, type Roi3D } from '../assets/model'
import { WDB } from '../assets/wdb'
import { advanceClickState } from '../customization-rules'
import { engine } from '../engine'
import type { PlantState, SaveGame } from '../save-game.ts'
import type { World as WorldType } from './world'

export namespace Plants {
  export enum World {
    ACT1 = 1 << 0,
    IMAIN = 1 << 1,
    IELEV = 1 << 4,
    IISLE = 1 << 5,
    ACT2 = 1 << 15,
    ACT3 = 1 << 16,
  }

  export enum Variant {
    Flower = 0,
    Tree = 1,
    Bush = 2,
    Palm = 3,
  }

  const nextVariant = (variant: Variant): Variant => {
    switch (variant) {
      case Variant.Flower:
        return Variant.Tree
      case Variant.Tree:
        return Variant.Bush
      case Variant.Bush:
        return Variant.Palm
      case Variant.Palm:
        return Variant.Flower
    }
  }

  enum Color {
    White = 0,
    Black = 1,
    Yellow = 2,
    Red = 3,
    Green = 4,
  }

  const nextColor = (color: Color): Color => {
    switch (color) {
      case Color.White:
        return Color.Black
      case Color.Black:
        return Color.Yellow
      case Color.Yellow:
        return Color.Red
      case Color.Red:
        return Color.Green
      case Color.Green:
        return Color.White
    }
  }

  const partName = (variant: Variant, color: Color): string => {
    switch (true) {
      // spell-checker: disable
      case variant === Variant.Flower && color === Color.White:
        return 'flwrwht'
      case variant === Variant.Flower && color === Color.Black:
        return 'flwrblk'
      case variant === Variant.Flower && color === Color.Yellow:
        return 'flwryel'
      case variant === Variant.Flower && color === Color.Red:
        return 'flwrred'
      case variant === Variant.Flower && color === Color.Green:
        return 'flwrgrn'
      case variant === Variant.Tree && color === Color.White:
        return 'treewht'
      case variant === Variant.Tree && color === Color.Black:
        return 'treeblk'
      case variant === Variant.Tree && color === Color.Yellow:
        return 'treeyel'
      case variant === Variant.Tree && color === Color.Red:
        return 'treered'
      case variant === Variant.Tree && color === Color.Green:
        return 'tree'
      case variant === Variant.Bush && color === Color.White:
        return 'bushwht'
      case variant === Variant.Bush && color === Color.Black:
        return 'bushblk'
      case variant === Variant.Bush && color === Color.Yellow:
        return 'bushyel'
      case variant === Variant.Bush && color === Color.Red:
        return 'bushred'
      case variant === Variant.Bush && color === Color.Green:
        return 'bush'
      case variant === Variant.Palm && color === Color.White:
        return 'palmwht'
      case variant === Variant.Palm && color === Color.Black:
        return 'palmblk'
      case variant === Variant.Palm && color === Color.Yellow:
        return 'palmyel'
      case variant === Variant.Palm && color === Color.Red:
        return 'palmred'
      case variant === Variant.Palm && color === Color.Green:
        return 'palm'
      // spell-checker: enable
      default:
        throw new Error(`combination of ${variant} and ${color} is not supported`)
    }
  }

  const animations: {
    [key in Variant]: AnimationAction[]
  } = {
    [Variant.Flower]: [AnimF1, AnimF2, AnimF3],
    [Variant.Tree]: [AnimT1, AnimT2, AnimT3],
    [Variant.Bush]: [AnimB1, AnimB2, AnimB3],
    [Variant.Palm]: [AnimP1, AnimP2, AnimP3],
  }

  const sounds: PositionalAudioAction[] = [Sound7, Sound8, Sound9, Sound10, Sound11, Sound12, Sound13, Sound14]

  type LocationAndDirection = { location: [number, number, number]; direction: [number, number, number]; up: [number, number, number] }

  type PlantInfo = { worlds: Plants.World; variant: Variant; color: Color; locationAndDirection: LocationAndDirection }

  const roiList: Roi3D[] = []
  const worldPlants = new WeakMap<WorldType, Map<number, { group: THREE.Group; roi: Roi3D }>>()

  export const getPlacement = (world: WorldType, index: number): { group: THREE.Group; roi: Roi3D } | null => worldPlants.get(world)?.get(index) ?? null
  export const getRoi = (index: number): Roi3D => roiList[index]

  // information based on legoplants.cpp
  export const plants: PlantInfo[] = [
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [73.75, 8.0, -8.4375], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [16.8125, 0.0, -41.2], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [71.0, 7.0, -25.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-82.6125, 4.0, 27.625], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-29.8125, 2.0, 27.6875], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-86.125, 8.80447, 0.3125], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-22.8125, 2.0, 27.6875], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [61.6875, 14.0, 28.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [21.9375, 1.0, 27.6875], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-9.15, 0.0, -19.9375], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-9.15, 0.0, -12.9375], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [74.9375, 4.0, 44.3875], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [21.625, 0.0, -83.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-47.75, -0.299, -58.125], direction: [-0.6751, -0.1071, 0.7299], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [41.0, 0.0, 39.5], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [35.0, 0.0, 0.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Bush, color: Color.Green, locationAndDirection: { location: [58.375, 14.0, 21.98749], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Bush, color: Color.Green, locationAndDirection: { location: [-87.3, 8.609336, 1.125], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Bush, color: Color.Green, locationAndDirection: { location: [73.8, 8.0, -5.3], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Bush, color: Color.Green, locationAndDirection: { location: [25.45, 0.0, -46.5], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [60.0, 14.0, 24.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [65.0, 14.0, 26.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [-72.6875, 1.0, -80.3125], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [64.1875, 7.0, -43.4375], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [47.8124, 1.875, -60.2624], direction: [-0.174, 0.0, 0.985], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-22.8125, 0.0, 9.0], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-29.8125, 0.0, -14.3125], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [19.625, 0.0, -20.0], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-32.9375, 0.0, 2.95], direction: [1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-22.8125, 0.0, -12.9375], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-22.8125, 0.0, -43.0625], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-29.8125, 0.0, -45.875], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [70.5625, 7.0, -29.875], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-73.5, 1.0, -78.25], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [94.875, 4.0, -13.3125], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-9.15, 0.0, -11.5625], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-65.33261, 0.11868, -19.8125], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [1.3125, 0.0, -43.075], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-22.8125, 0.0, 10.4875], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-29.8, 0.0, 8.0125], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-82.5625, 4.0, 26.25], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-74.75, 1.0, -81.25], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-22.8125, 0.0, -11.575], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-9.0875, 0.0, -21.3125], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [19.75, 0.0, -12.875], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-70.6875, 0.0, -26.5625], direction: [0.9848, 0.0, 1.1736], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [28.9375, 1.0, 27.7], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [3.25, 0.0, -19.75], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [25.1875, 0.0, -52.625], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [95.9375, 4.0, -14.25], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-18.75, 0.0, -10.95], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-21.8875, 1.84509, 25.5], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-30.95, 2.0, 25.5], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-66.67, 0.256506, 10.95579], direction: [0.0, 0.0, -1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-9.625, 0.0, -40.0], direction: [-0.5, 0.0, 0.866], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-62.0, 0.0, 2.825], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-33.375, 0.0, -8.125], direction: [-0.342, 0.0, 0.94], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-18.825, 1.0, 25.5], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [63.6875, 14.0, 21.4375], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [95.625, 4.0, 2.5], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [80.0, 4.0, -55.875], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [8.75, 0.0, -40.75], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-35.625, 0.0, -32.0], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [61.0, 14.0, 26.8125], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [16.0, 0.0, -22.45], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [78.0, 8.0, 2.375], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [72.0, 7.0, -36.5], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-98.1875, 0.0, -41.3125], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-97.5, 4.0, 18.25], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [67.5, 14.0, 23.25], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [-88.75, 8.75, 0.875], direction: [-0.259, 0.0, 0.966], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [50.4375, 7.0, -25.0], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [49.125, 7.0, -25.8], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [51.25, 7.0, -23.75], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.ACT1 | Plants.World.ACT2 | Plants.World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [58.0, 14.0, 26.75], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.IMAIN, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [4.33403, -2.18029, -1.53595], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.IMAIN, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-1.280536, -2.18024, -1.57823], direction: [0.0, 0.0, -1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.IELEV, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [1.52465, -0.52473, -11.1617], direction: [0.0175, 0.0, -0.9998], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.IELEV, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-1.439563, -0.52554, -11.1846], direction: [-0.866, 0.0, -0.5], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.IISLE, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [1.82829, -0.52554, -11.7741], direction: [-0.866, 0.0, -0.5], up: [0.0, 1.0, 0.0] } },
    { worlds: Plants.World.IISLE, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-1.801479, -0.52473, -11.75], direction: [0.0175, 0.0, -0.9998], up: [0.0, 1.0, 0.0] } },
  ]

  const statesBySave = new WeakMap<SaveGame, PlantState[]>()

  const placements = new WeakMap<WorldType, THREE.Group>()
  const dances = new WeakMap<WorldType, Map<THREE.Object3D, () => Promise<void>>>()

  export const recreate = async (world: WorldType, reset = false): Promise<void> => {
    const group = placements.get(world)
    if (group == null) {
      return
    }
    if (!reset) {
      group.traverse(object => {
        object.visible = true
      })
      return
    }
    const objects: THREE.Object3D[] = []
    group.traverse(object => objects.push(object))
    world.removeFromParents(objects)
    const save = engine.currentSaveGame
    statesBySave.delete(save)
    save.plants = null
    world.scene.add(await place(world, World.ACT1))
  }

  export const dance = async (world: WorldType): Promise<void> => {
    world.camera.updateMatrixWorld()
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(world.camera.projectionMatrix, world.camera.matrixWorldInverse))
    const position = new THREE.Vector3()
    const promises: Promise<void>[] = []
    for (const [mesh, animate] of dances.get(world) ?? []) {
      mesh.getWorldPosition(position)
      if (mesh.visible && frustum.containsPoint(position) && position.distanceToSquared(world.camera.position) < 2000) {
        promises.push(animate())
      }
    }
    await Promise.all(promises)
  }

  export const getStates = (save: SaveGame = engine.currentSaveGame): PlantState[] => {
    const states = statesBySave.get(save) ?? save.plants ?? plants.map(plant => ({ color: plant.color, variant: plant.variant, move: 0, sound: 3, mood: 1, counter: -1 }))
    statesBySave.set(save, states)
    return states
  }

  export const place = async (world: WorldType, plantWorld: World): Promise<THREE.Group> => {
    const save = engine.currentSaveGame
    const plantStates = getStates(save)
    statesBySave.set(save, plantStates)
    const placed = new Map<number, { group: THREE.Group; roi: Roi3D }>()
    worldPlants.set(world, placed)
    const group = new THREE.Group()
    group.name = 'plants'
    placements.set(world, group)
    const plantDances = new Map<THREE.Object3D, () => Promise<void>>()
    dances.set(world, plantDances)
    if (plantStates.length !== plants.length) {
      throw new Error('Plant states length mismatch')
    }
    for (let n = 0; n < plantStates.length; ++n) {
      const plantInfo = plants[n]
      const plantState = plantStates[n]

      if ((plantInfo.worlds & plantWorld) === 0 || plantState.counter === 0) {
        continue
      }

      const plantName = partName(plantState.variant, plantState.color)
      const matrix = new THREE.Matrix4()
      calculateTransformationMatrix(plantInfo.locationAndDirection.location, plantInfo.locationAndDirection.direction, plantInfo.locationAndDirection.up, matrix)
      const mesh = new THREE.Group()
      mesh.name = `plant${n}`
      matrix.decompose(mesh.position, mesh.quaternion, mesh.scale)
      if (plantState.counter >= 0) {
        mesh.position.y -= ([1, 2, 2, 3][plantState.variant] - plantState.counter) * [0.1, 0.7, 0.5, 0.9][plantState.variant]
      }
      const animationRoot = new THREE.Group()
      animationRoot.name = 'animation'
      mesh.add(animationRoot)
      const roi = await getGlobalPart(plantName, null, null)
      roiList[n] = roi
      placed.set(n, { group: mesh, roi })
      let currentRoi = roi
      animationRoot.add(roi.model)
      group.add(mesh)
      let animating = false
      world.addClickListener(mesh, async () => {
        if (world.ignoreEntityClick || engine.currentSaveGame.playerUnsafe == null) {
          return false
        }
        const player = engine.currentSaveGame.player
        if (player === 'pepper' && engine.currentSaveGame.act !== 1) {
          return true
        }
        Object.assign(plantState, advanceClickState(plantState, player, 'plant'))
        if (player === 'pepper' && plantState.counter === -1) {
          plantState.variant = nextVariant(plantState.variant)
        } else if (player === 'nick') {
          plantState.color = nextColor(plantState.color)
        }
        save.plants = plantStates
        const feedback = !animating
        if (feedback) {
          animating = true
        }
        const roi = await getGlobalPart(partName(plantState.variant, plantState.color), null, null)
        roiList[n] = roi
        currentRoi = roi
        placed.set(n, { group: mesh, roi })
        animationRoot.clear().add(roi.model)
        if (feedback) {
          try {
            if (player === 'laura') {
              void world.playPositionalAudio((plantState.mood & 1) === 0 ? Sound17 : Sound18, mesh)
            }
            await animate()
          } finally {
            animating = false
          }
        }
        return true
      })
      const animate = async (): Promise<void> => {
        const animationRoot = mesh.getObjectByName('animation')
        if (animationRoot == null) {
          return
        }
        const roi = currentRoi
        const animation = await getAnimation(
          animations[plantState.variant][plantState.move],
          new Map([
            ['flwrred', { type: WDB.ActorType.Unknown, object: animationRoot.children[0], children: new Map(), roi }],
            ['flwgrn', { type: WDB.ActorType.Unknown, object: animationRoot.children[0], children: new Map(), roi }],
            ['tree', { type: WDB.ActorType.Unknown, object: animationRoot.children[0], children: new Map(), roi }],
            ['bush', { type: WDB.ActorType.Unknown, object: animationRoot.children[0], children: new Map(), roi }],
            ['palm', { type: WDB.ActorType.Unknown, object: animationRoot.children[0], children: new Map(), roi }],
          ]),
        )
        void world.playPositionalAudio(sounds[plantState.sound], mesh)
        await world.playAnimationClip(animationRoot, animation)
      }
      plantDances.set(mesh, animate)
    }
    return group
  }
}
