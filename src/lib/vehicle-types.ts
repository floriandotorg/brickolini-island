export const VehicleTypes = ['bike', 'moto', 'ambul', 'towtk', 'jetski', 'racecar', 'helicopter', 'dunecar', 'skate'] as const
export type VehicleType = (typeof VehicleTypes)[number]
export const isVehicleType = (name: string): name is VehicleType => VehicleTypes.some(type => type === name)
