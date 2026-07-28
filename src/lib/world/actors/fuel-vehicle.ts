import { Vehicle } from './vehicle'

const FUEL_RATE_PER_MS = -3.333333333e-6

export abstract class FuelVehicle extends Vehicle {
  protected abstract readonly drainsOnlyWhenActive: boolean

  protected m_fuel = 1.0

  public override get fuel(): number {
    return this.m_fuel
  }

  public refuel(): void {
    this.m_fuel = 1.0
  }

  public override async enter(): Promise<void> {
    this.m_fuel = 1.0
    await super.enter()
  }

  public override update(delta: number): null {
    if (this.drainsOnlyWhenActive && this._isle.currentVehicle !== this) {
      return null
    }

    this.m_fuel += delta * 1000 * FUEL_RATE_PER_MS
    if (this.m_fuel < 0) {
      this.m_fuel = 0
    }

    return null
  }
}
