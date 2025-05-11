export namespace Plant {
  export enum Variant {
    Flower = 0,
    Tree = 1,
    Bush = 2,
    Palm = 3,
  }

  export enum Color {
    White = 0,
    Black = 1,
    Yellow = 2,
    Red = 3,
    Green = 4,
  }

  export const modelName = (variant: Variant, color: Color): string | undefined => {
    switch (true) {
      case variant === Variant.Flower && color === Color.Yellow:
        return 'flwryel'
      case variant === Variant.Flower && color === Color.Red:
        return 'flwrred'
      case variant === Variant.Tree && color === Color.Yellow:
        return 'treeyel'
      case variant === Variant.Tree && color === Color.Green:
        return 'tree'
      case variant === Variant.Bush && color === Color.Green:
        return 'bush'
      case variant === Variant.Palm && color === Color.White:
        return 'palmwht'
      case variant === Variant.Palm && color === Color.Red:
        return 'palmred'
      case variant === Variant.Palm && color === Color.Green:
        return 'palm'
      // For these combinations, there is no model
      case variant === Variant.Flower && color === Color.White:
      case variant === Variant.Flower && color === Color.Black:
      case variant === Variant.Flower && color === Color.Green:
      case variant === Variant.Tree && color === Color.White:
      case variant === Variant.Tree && color === Color.Black:
      case variant === Variant.Tree && color === Color.Red:
      case variant === Variant.Bush && color === Color.White:
      case variant === Variant.Bush && color === Color.Black:
      case variant === Variant.Bush && color === Color.Yellow:
      case variant === Variant.Bush && color === Color.Red:
      case variant === Variant.Palm && color === Color.Black:
      case variant === Variant.Palm && color === Color.Yellow:
        console.log(`combination of ${variant} and ${color} is not supported`)
        break
      default:
        break
    }
  }

  type PlantInfo = { variant: Variant; color: Color; location: [number, number, number] }

  // information based on legoplants.cpp
  const plants: PlantInfo[] = [
    { variant: Variant.Flower, color: Color.Red, location: [73.75, 8.0, -8.4375] },
    { variant: Variant.Flower, color: Color.Red, location: [16.8125, 0.0, -41.2] },
    { variant: Variant.Flower, color: Color.Red, location: [71.0, 7.0, -25.0] },
    { variant: Variant.Flower, color: Color.Red, location: [-82.6125, 4.0, 27.625] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-29.8125, 2.0, 27.6875] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-86.125, 8.80447, 0.3125] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-22.8125, 2.0, 27.6875] },
    { variant: Variant.Flower, color: Color.Yellow, location: [61.6875, 14.0, 28.0] },
    { variant: Variant.Flower, color: Color.Red, location: [21.9375, 1.0, 27.6875] },
    { variant: Variant.Flower, color: Color.Red, location: [-9.15, 0.0, -19.9375] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-9.15, 0.0, -12.9375] },
    { variant: Variant.Flower, color: Color.Yellow, location: [74.9375, 4.0, 44.3875] },
    { variant: Variant.Palm, color: Color.Green, location: [21.625, 0.0, -83.0] },
    { variant: Variant.Palm, color: Color.Green, location: [-47.75, -0.299, -58.125] },
    { variant: Variant.Palm, color: Color.Green, location: [41.0, 0.0, 39.5] },
    { variant: Variant.Palm, color: Color.Green, location: [35.0, 0.0, 0.0] },
    { variant: Variant.Bush, color: Color.Green, location: [58.375, 14.0, 21.98749] },
    { variant: Variant.Bush, color: Color.Green, location: [-87.3, 8.609336, 1.125] },
    { variant: Variant.Bush, color: Color.Green, location: [73.8, 8.0, -5.3] },
    { variant: Variant.Bush, color: Color.Green, location: [25.45, 0.0, -46.5] },
    { variant: Variant.Tree, color: Color.Green, location: [60.0, 14.0, 24.0] },
    { variant: Variant.Tree, color: Color.Green, location: [65.0, 14.0, 26.0] },
    { variant: Variant.Tree, color: Color.Green, location: [-72.6875, 1.0, -80.3125] },
    { variant: Variant.Tree, color: Color.Green, location: [64.1875, 7.0, -43.4375] },
    { variant: Variant.Palm, color: Color.Green, location: [47.8124, 1.875, -60.2624] },
    { variant: Variant.Flower, color: Color.Red, location: [-22.8125, 0.0, 9.0] },
    { variant: Variant.Flower, color: Color.Red, location: [-29.8125, 0.0, -14.3125] },
    { variant: Variant.Flower, color: Color.Red, location: [19.625, 0.0, -20.0] },
    { variant: Variant.Flower, color: Color.Red, location: [-32.9375, 0.0, 2.95] },
    { variant: Variant.Flower, color: Color.Red, location: [-22.8125, 0.0, -12.9375] },
    { variant: Variant.Flower, color: Color.Red, location: [-22.8125, 0.0, -43.0625] },
    { variant: Variant.Flower, color: Color.Red, location: [-29.8125, 0.0, -45.875] },
    { variant: Variant.Flower, color: Color.Red, location: [70.5625, 7.0, -29.875] },
    { variant: Variant.Flower, color: Color.Red, location: [-73.5, 1.0, -78.25] },
    { variant: Variant.Flower, color: Color.Red, location: [94.875, 4.0, -13.3125] },
    { variant: Variant.Flower, color: Color.Red, location: [-9.15, 0.0, -11.5625] },
    { variant: Variant.Flower, color: Color.Red, location: [-65.33261, 0.11868, -19.8125] },
    { variant: Variant.Flower, color: Color.Red, location: [1.3125, 0.0, -43.075] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-22.8125, 0.0, 10.4875] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-29.8, 0.0, 8.0125] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-82.5625, 4.0, 26.25] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-74.75, 1.0, -81.25] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-22.8125, 0.0, -11.575] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-9.0875, 0.0, -21.3125] },
    { variant: Variant.Flower, color: Color.Yellow, location: [19.75, 0.0, -12.875] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-70.6875, 0.0, -26.5625] },
    { variant: Variant.Flower, color: Color.Yellow, location: [28.9375, 1.0, 27.7] },
    { variant: Variant.Flower, color: Color.Yellow, location: [3.25, 0.0, -19.75] },
    { variant: Variant.Flower, color: Color.Yellow, location: [25.1875, 0.0, -52.625] },
    { variant: Variant.Flower, color: Color.Yellow, location: [95.9375, 4.0, -14.25] },
    { variant: Variant.Palm, color: Color.Green, location: [-18.75, 0.0, -10.95] },
    { variant: Variant.Palm, color: Color.Green, location: [-21.8875, 1.84509, 25.5] },
    { variant: Variant.Palm, color: Color.Green, location: [-30.95, 2.0, 25.5] },
    { variant: Variant.Palm, color: Color.Green, location: [-66.67, 0.256506, 10.95579] },
    { variant: Variant.Palm, color: Color.Green, location: [-9.625, 0.0, -40.0] },
    { variant: Variant.Palm, color: Color.Green, location: [-62.0, 0.0, 2.825] },
    { variant: Variant.Palm, color: Color.Green, location: [-33.375, 0.0, -8.125] },
    { variant: Variant.Palm, color: Color.Green, location: [-18.825, 1.0, 25.5] },
    { variant: Variant.Palm, color: Color.Green, location: [63.6875, 14.0, 21.4375] },
    { variant: Variant.Palm, color: Color.Green, location: [95.625, 4.0, 2.5] },
    { variant: Variant.Palm, color: Color.Green, location: [80.0, 4.0, -55.875] },
    { variant: Variant.Palm, color: Color.Green, location: [8.75, 0.0, -40.75] },
    { variant: Variant.Palm, color: Color.Green, location: [-35.625, 0.0, -32.0] },
    { variant: Variant.Palm, color: Color.Green, location: [61.0, 14.0, 26.8125] },
    { variant: Variant.Palm, color: Color.Green, location: [16.0, 0.0, -22.45] },
    { variant: Variant.Palm, color: Color.Green, location: [78.0, 8.0, 2.375] },
    { variant: Variant.Palm, color: Color.Green, location: [72.0, 7.0, -36.5] },
    { variant: Variant.Palm, color: Color.Green, location: [-98.1875, 0.0, -41.3125] },
    { variant: Variant.Palm, color: Color.Green, location: [-97.5, 4.0, 18.25] },
    { variant: Variant.Tree, color: Color.Green, location: [67.5, 14.0, 23.25] },
    { variant: Variant.Tree, color: Color.Green, location: [-88.75, 8.75, 0.875] },
    { variant: Variant.Tree, color: Color.Green, location: [50.4375, 7.0, -25.0] },
    { variant: Variant.Tree, color: Color.Green, location: [49.125, 7.0, -25.8] },
    { variant: Variant.Tree, color: Color.Green, location: [51.25, 7.0, -23.75] },
    { variant: Variant.Tree, color: Color.Green, location: [58.0, 14.0, 26.75] },
    { variant: Variant.Flower, color: Color.Red, location: [4.33403, -2.18029, -1.53595] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-1.280536, -2.18024, -1.57823] },
    { variant: Variant.Flower, color: Color.Red, location: [1.52465, -0.52473, -11.1617] },
    { variant: Variant.Flower, color: Color.Yellow, location: [-1.439563, -0.52554, -11.1846] },
    { variant: Variant.Flower, color: Color.Yellow, location: [1.82829, -0.52554, -11.7741] },
    { variant: Variant.Flower, color: Color.Red, location: [-1.801479, -0.52473, -11.75] },
  ]

  export type PlantLocations = { variant: Variant; color: Color; locations: [number, number, number][] }

  export const locationsPerPair = (): PlantLocations[] => {
    const result: PlantLocations[] = []
    for (const { variant, color, location } of plants) {
      const locations =
        result.find(({ variant: variant2, color: color2 }) => variant2 === variant && color2 === color) ??
        ((): PlantLocations => {
          const newEntry: PlantLocations = { variant, color, locations: [] }
          result.push(newEntry)
          return newEntry
        })()
      locations.locations.push(location)
    }
    return result
  }
}
