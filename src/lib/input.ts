export type NavigationFlags = { up: boolean; down: boolean; left: boolean; right: boolean; ctrl: boolean }
export type InputPoint = { x: number; y: number }
export type Gesture = 'click' | 'dragStart' | 'drag' | 'dragEnd'

export class InputManager {
  public inputDisabled = false
  public allowSpaceWhileDisabled = false
  public buttonDownActsAsSpace = false
  public readonly keys = new Set<string>()
  private readonly _touchKeys = new Set<string>()
  public dragging = false
  public onGesture: (kind: Gesture, point: InputPoint) => void = () => {}
  private _sticky = false
  private _down: InputPoint | null = null
  private _point = { x: 320, y: 240 }
  private _downTime = 0

  public disable(): void {
    this.inputDisabled = true
    this.allowSpaceWhileDisabled = false
    this.clear()
  }

  public enable(): void {
    this.inputDisabled = false
    this.clear()
  }

  public clear(): void {
    this.keys.clear()
    this._touchKeys.clear()
    if (this.dragging) {
      this.onGesture('dragEnd', this._point)
    }
    this._down = null
    this.dragging = false
    this._sticky = false
  }

  public acceptsKey(code: string): boolean {
    return !this.inputDisabled || (this.allowSpaceWhileDisabled && code === 'Space')
  }

  public keyDown(code: string): void {
    if (!this.inputDisabled) {
      this.keys.add(code)
    }
  }

  public keyUp(code: string): void {
    this.keys.delete(code)
  }

  public setTouchKeys(codes: readonly string[]): void {
    this._touchKeys.clear()
    if (!this.inputDisabled) {
      for (const code of codes) {
        this._touchKeys.add(code)
      }
    }
  }

  public getNavigationFlags(): NavigationFlags {
    const held = (...codes: string[]) => !this.inputDisabled && codes.some(code => this.keys.has(code) || this._touchKeys.has(code))
    return { up: held('ArrowUp', 'Numpad8'), down: held('ArrowDown', 'Numpad2'), left: held('ArrowLeft', 'Numpad4'), right: held('ArrowRight', 'Numpad6'), ctrl: held('ControlLeft', 'ControlRight') }
  }

  public pointerDown(point: InputPoint, now: number): boolean {
    if (this._sticky) {
      this.clear()
      return false
    }
    this._point = point
    this._down = point
    this._downTime = now
    return true
  }

  public pointerMove(point: InputPoint): void {
    this._point = point
    if (this._down == null) {
      return
    }
    if (!this.dragging && (point.x - this._down.x) ** 2 + (point.y - this._down.y) ** 2 > 25) {
      this._startDrag()
    }
    if (this.dragging) {
      this.onGesture('drag', point)
    }
  }

  public pointerUp(): void {
    if (this._down != null) {
      this.onGesture(this.dragging ? 'dragEnd' : 'click', this.dragging ? this._point : this._down)
    }
    this._down = null
    this.dragging = false
  }

  public toggleSticky(): void {
    if (this._sticky) {
      this.clear()
    } else {
      this._sticky = true
      this._down = this._point
      this._startDrag()
    }
  }

  public update(now: number): void {
    if (this._down != null && !this.dragging && now - this._downTime >= 1000) {
      this._startDrag()
    }
  }

  public getGamepad(pads: readonly (Gamepad | null)[], index: number): { x: number; y: number; pov: number | null } | null {
    const flags = this.getNavigationFlags()
    if (this.inputDisabled || flags.up || flags.down || flags.left || flags.right) {
      return null
    }
    const pad = pads[index] ?? pads.find(pad => pad?.connected)
    if (pad == null) {
      return null
    }
    let x = ((pad.axes[0] ?? 0) + 1) * 50
    let y = ((pad.axes[1] ?? 0) + 1) * 50
    if (x > 45 && x < 55 && y > 45 && y < 55) {
      x = 50
      y = 50
    }
    const horizontal = Number(pad.buttons[15]?.pressed ?? false) - Number(pad.buttons[14]?.pressed ?? false)
    const vertical = Number(pad.buttons[13]?.pressed ?? false) - Number(pad.buttons[12]?.pressed ?? false)
    const pov = horizontal === 0 && vertical === 0 ? null : ((Math.atan2(horizontal, -vertical) * 180) / Math.PI + 360) % 360
    return { x, y, pov }
  }

  private _startDrag(): void {
    if (this._down != null) {
      this.dragging = true
      this.onGesture('dragStart', this._down)
    }
  }
}
