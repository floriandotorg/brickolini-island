export namespace Plant {
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

  export enum Color {
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

  export enum World {
    ACT1 = 1 << 0,
    IMAIN = 1 << 1,
    IELEV = 1 << 4,
    IISLE = 1 << 5,
    ACT2 = 1 << 15,
    ACT3 = 1 << 16,
  }

  export const partName = (variant: Variant, color: Color): string => {
    switch (true) {
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
      default:
        throw new Error(`combination of ${variant} and ${color} is not supported`)
    }
  }

  type LocationAndDirection = { location: [number, number, number]; direction: [number, number, number]; up: [number, number, number] }

  export type PlantInfo = { worlds: World; variant: Variant; color: Color; locationAndDirection: LocationAndDirection }

  // information based on legoplants.cpp
  const plants: PlantInfo[] = [
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [73.75, 8.0, -8.4375], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [16.8125, 0.0, -41.2], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [71.0, 7.0, -25.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-82.6125, 4.0, 27.625], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-29.8125, 2.0, 27.6875], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-86.125, 8.80447, 0.3125], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-22.8125, 2.0, 27.6875], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [61.6875, 14.0, 28.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [21.9375, 1.0, 27.6875], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-9.15, 0.0, -19.9375], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-9.15, 0.0, -12.9375], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [74.9375, 4.0, 44.3875], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [21.625, 0.0, -83.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-47.75, -0.299, -58.125], direction: [-0.6751, -0.1071, 0.7299], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [41.0, 0.0, 39.5], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [35.0, 0.0, 0.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Bush, color: Color.Green, locationAndDirection: { location: [58.375, 14.0, 21.98749], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Bush, color: Color.Green, locationAndDirection: { location: [-87.3, 8.609336, 1.125], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Bush, color: Color.Green, locationAndDirection: { location: [73.8, 8.0, -5.3], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Bush, color: Color.Green, locationAndDirection: { location: [25.45, 0.0, -46.5], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [60.0, 14.0, 24.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [65.0, 14.0, 26.0], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [-72.6875, 1.0, -80.3125], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [64.1875, 7.0, -43.4375], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [47.8124, 1.875, -60.2624], direction: [-0.174, 0.0, 0.985], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-22.8125, 0.0, 9.0], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-29.8125, 0.0, -14.3125], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [19.625, 0.0, -20.0], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-32.9375, 0.0, 2.95], direction: [1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-22.8125, 0.0, -12.9375], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-22.8125, 0.0, -43.0625], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-29.8125, 0.0, -45.875], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [70.5625, 7.0, -29.875], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-73.5, 1.0, -78.25], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [94.875, 4.0, -13.3125], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-9.15, 0.0, -11.5625], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-65.33261, 0.11868, -19.8125], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [1.3125, 0.0, -43.075], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-22.8125, 0.0, 10.4875], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-29.8, 0.0, 8.0125], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-82.5625, 4.0, 26.25], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-74.75, 1.0, -81.25], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-22.8125, 0.0, -11.575], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-9.0875, 0.0, -21.3125], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [19.75, 0.0, -12.875], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-70.6875, 0.0, -26.5625], direction: [0.9848, 0.0, 1.1736], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [28.9375, 1.0, 27.7], direction: [-1.0, 0.0, 0.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [3.25, 0.0, -19.75], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [25.1875, 0.0, -52.625], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [95.9375, 4.0, -14.25], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-18.75, 0.0, -10.95], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-21.8875, 1.84509, 25.5], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-30.95, 2.0, 25.5], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-66.67, 0.256506, 10.95579], direction: [0.0, 0.0, -1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-9.625, 0.0, -40.0], direction: [-0.5, 0.0, 0.866], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-62.0, 0.0, 2.825], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-33.375, 0.0, -8.125], direction: [-0.342, 0.0, 0.94], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-18.825, 1.0, 25.5], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [63.6875, 14.0, 21.4375], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [95.625, 4.0, 2.5], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [80.0, 4.0, -55.875], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [8.75, 0.0, -40.75], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-35.625, 0.0, -32.0], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [61.0, 14.0, 26.8125], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [16.0, 0.0, -22.45], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [78.0, 8.0, 2.375], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [72.0, 7.0, -36.5], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-98.1875, 0.0, -41.3125], direction: [-Math.SQRT1_2, 0.0, Math.SQRT1_2], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Palm, color: Color.Green, locationAndDirection: { location: [-97.5, 4.0, 18.25], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [67.5, 14.0, 23.25], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [-88.75, 8.75, 0.875], direction: [-0.259, 0.0, 0.966], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [50.4375, 7.0, -25.0], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [49.125, 7.0, -25.8], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [51.25, 7.0, -23.75], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.ACT1 | World.ACT2 | World.ACT3, variant: Variant.Tree, color: Color.Green, locationAndDirection: { location: [58.0, 14.0, 26.75], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.IMAIN, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [4.33403, -2.18029, -1.53595], direction: [0.0, 0.0, 1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.IMAIN, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-1.280536, -2.18024, -1.57823], direction: [0.0, 0.0, -1.0], up: [0.0, 1.0, 0.0] } },
    { worlds: World.IELEV, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [1.52465, -0.52473, -11.1617], direction: [0.0175, 0.0, -0.9998], up: [0.0, 1.0, 0.0] } },
    { worlds: World.IELEV, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [-1.439563, -0.52554, -11.1846], direction: [-0.866, 0.0, -0.5], up: [0.0, 1.0, 0.0] } },
    { worlds: World.IISLE, variant: Variant.Flower, color: Color.Yellow, locationAndDirection: { location: [1.82829, -0.52554, -11.7741], direction: [-0.866, 0.0, -0.5], up: [0.0, 1.0, 0.0] } },
    { worlds: World.IISLE, variant: Variant.Flower, color: Color.Red, locationAndDirection: { location: [-1.801479, -0.52473, -11.75], direction: [0.0175, 0.0, -0.9998], up: [0.0, 1.0, 0.0] } },
  ]

  export type PlantLocations = { variant: Variant; color: Color; plants: PlantInfo[] }

  export const locationsPerPair = (world: World): PlantLocations[] => {
    const result: PlantLocations[] = []
    for (const plant of plants) {
      if ((plant.worlds & world) !== 0) {
        const variant = plant.variant
        const color = plant.color
        const locations =
          result.find(({ variant: variant2, color: color2 }) => variant2 === variant && color2 === color) ??
          ((): PlantLocations => {
            const newEntry: PlantLocations = { variant, color, plants: [] }
            result.push(newEntry)
            return newEntry
          })()
        locations.plants.push(plant)
      }
    }
    return result
  }

  export const switchVariant = (plant: PlantInfo) => {
    plant.variant = nextVariant(plant.variant)
  }

  export const switchColor = (plant: PlantInfo) => {
    plant.color = nextColor(plant.color)
  }
}
