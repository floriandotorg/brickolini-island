import { getTouchDirections } from './mobile-layout.ts'

export class MobileControls {
  public readonly media = matchMedia('(any-pointer: coarse)')
  private readonly _root = document.createElement('div')
  private readonly _movement = document.createElement('div')
  private readonly _keyboard = document.createElement('div')
  private readonly _stick = document.createElement('div')
  private readonly _thumb = document.createElement('span')
  private _pointer: number | null = null
  private _directions: string[] = []
  private _modifier = false
  private _started = false

  public constructor(private readonly _setKeys: (keys: readonly string[]) => void) {
    this._root.id = 'mobile-controls'
    this._root.hidden = true
    const toolbar = document.createElement('div')
    toolbar.className = 'mobile-toolbar'
    toolbar.append(this._button('Back', 'Escape'), this._button('Skip / Action', 'Space'), this._button('Pause', 'Pause'))
    const settings = this._button('Settings')
    settings.addEventListener('click', () => document.getElementById('settings-button')?.click())
    toolbar.append(settings)
    this._movement.className = 'mobile-movement'
    this._movement.hidden = true
    this._stick.className = 'mobile-stick'
    this._stick.setAttribute('aria-label', 'Move and steer. Drag in the direction you want to move.')
    this._thumb.className = 'mobile-stick-thumb'
    this._stick.append(this._thumb)
    const turbo = this._button('Turbo')
    turbo.className = 'mobile-modifier'
    this._hold(
      turbo,
      () => {
        this._modifier = true
        this._updateKeys()
      },
      () => {
        this._modifier = false
        this._updateKeys()
      },
    )
    this._movement.append(this._stick, turbo)
    this._stick.addEventListener('pointerdown', event => {
      if (this._pointer != null) {
        return
      }
      event.preventDefault()
      this._pointer = event.pointerId
      this._stick.setPointerCapture(event.pointerId)
      this._move(event)
    })
    this._stick.addEventListener('pointermove', event => {
      if (event.pointerId === this._pointer) {
        this._move(event)
      }
    })
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this._stick.addEventListener(type, event => {
        if (event instanceof PointerEvent && event.pointerId === this._pointer) {
          this._pointer = null
          this._directions = []
          this._thumb.style.transform = ''
          this._updateKeys()
        }
      })
    }
    this._keyboard.className = 'mobile-keyboard'
    this._keyboard.hidden = true
    this._keyboard.setAttribute('aria-label', 'Enter your player name, then tap a registration box in the game')
    for (const row of ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']) {
      const group = document.createElement('div')
      for (const letter of row) {
        group.append(this._button(letter, `Key${letter}`, letter))
      }
      this._keyboard.append(group)
    }
    this._keyboard.append(this._button('Delete', 'Backspace', 'Backspace'))
    this._root.append(toolbar, this._movement, this._keyboard)
    document.body.append(this._root)
    this.media.addEventListener('change', () => this._refresh())
    window.addEventListener('blur', () => this.reset())
    window.addEventListener('resize', () => this.reset())
    document.addEventListener('visibilitychange', () => this.reset())
  }

  public get safeInsets(): { top: number; bottom: number; left: number; right: number } {
    const style = getComputedStyle(this._root)
    return { top: Number.parseFloat(style.paddingTop) || 0, bottom: Number.parseFloat(style.paddingBottom) || 0, left: Number.parseFloat(style.paddingLeft) || 0, right: Number.parseFloat(style.paddingRight) || 0 }
  }

  public start(): void {
    this._started = true
    this._refresh()
  }

  public setWorld(name: string): void {
    this.reset()
    this._movement.hidden = !['act1', 'act2', 'act3', 'carrace', 'jetrace'].includes(name)
    this._keyboard.hidden = name !== 'regbook'
  }

  public reset(): void {
    this._pointer = null
    this._directions = []
    this._modifier = false
    this._thumb.style.transform = ''
    this._updateKeys()
  }

  private _refresh(): void {
    this.reset()
    this._root.hidden = !this._started || !this.media.matches
    document.body.classList.toggle('touch-game', this._started && this.media.matches)
    window.dispatchEvent(new Event('resize'))
  }

  private _updateKeys(): void {
    this._setKeys([...this._directions, ...(this._modifier ? ['ControlLeft'] : [])])
  }

  private _move(event: PointerEvent): void {
    const rect = this._stick.getBoundingClientRect()
    const radius = rect.width / 2
    const x = (event.clientX - rect.left - radius) / radius
    const y = (event.clientY - rect.top - radius) / radius
    const distance = Math.max(1, Math.hypot(x, y))
    this._directions = getTouchDirections(x / distance, y / distance)
    this._thumb.style.transform = `translate(${(x / distance) * radius * 0.55}px, ${(y / distance) * radius * 0.55}px)`
    this._updateKeys()
  }

  private _hold(element: HTMLElement, down: () => void, up: () => void): void {
    element.addEventListener('pointerdown', event => {
      event.preventDefault()
      element.setPointerCapture(event.pointerId)
      down()
    })
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      element.addEventListener(type, up)
    }
  }

  private _button(label: string, code?: string, key = code === 'Space' ? ' ' : code): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    if (code != null) {
      button.addEventListener('click', () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }))
        document.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true }))
      })
    }
    return button
  }
}
