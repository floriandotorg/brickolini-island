export type NavigationKeys = { up: boolean; down: boolean; left: boolean; right: boolean; ctrl: boolean }
export const NAV_REFERENCE_TICK_HZ = 10
const targetVelocity = (position: number, center: number, maximum: number, deadZone: number): number => {
  const difference = position - center
  return difference > deadZone ? ((difference - deadZone) * maximum) / (center - deadZone) : difference < -deadZone ? ((difference + deadZone) * maximum) / (center - deadZone) : 0
}
const newVelocity = (target: number, current: number, acceleration: number, delta: number): number => {
  if (Math.abs(target - current) <= 0.001) {
    return target
  }
  return target > current ? Math.min(target, current + acceleration * delta) : Math.max(target, current - acceleration * delta)
}

export class NavController {
  public accelerationMultiplier = 1
  public maximumSpeed = 6
  public deadZone = 40
  public linearVelocity = 0
  public rotationalVelocity = 0
  private _mouse = { linear: 0, rotation: 0, acceleration: 50 }

  public setTargets = (x: number, y: number, accelerating: boolean): void => {
    this._mouse = accelerating ? { linear: targetVelocity(480 - y, 240, this.maximumSpeed, this.deadZone), rotation: -targetVelocity(x, 320, 20, this.deadZone), acceleration: Math.max(4, (Math.abs(240 - y) * 15) / 240) } : { linear: 0, rotation: 0, acceleration: 50 }
  }

  public update = (delta: number, keys: NavigationKeys, gamepad?: { x: number; y: number } | null): void => {
    let linear = this._mouse.linear
    let rotation = this._mouse.rotation
    let acceleration = this._mouse.acceleration
    if (keys.up || keys.down || keys.left || keys.right || keys.ctrl) {
      linear = keys.up === keys.down ? 0 : keys.up ? this.maximumSpeed : -this.maximumSpeed
      rotation = keys.left === keys.right ? 0 : keys.left ? 20 : -20
      acceleration = linear === 0 ? 50 : keys.ctrl ? 15 : 3.75
    } else if (gamepad != null) {
      linear = targetVelocity((100 - gamepad.y) * 4.8, 240, this.maximumSpeed, this.deadZone)
      rotation = -targetVelocity(gamepad.x * 6.4, 320, 20, this.deadZone)
      acceleration = linear === 0 ? 50 : Math.max(4, (Math.abs(50 - gamepad.y) * 15) / 50)
    }
    this.linearVelocity = Math.max(-0.4 * this.maximumSpeed, newVelocity(linear, this.linearVelocity, acceleration * this.accelerationMultiplier, delta))
    this.rotationalVelocity = rotation === 0 ? 0 : rotation
  }

  public reset = (): void => {
    this.linearVelocity = 0
    this.rotationalVelocity = 0
    this.setTargets(320, 240, false)
  }
}
