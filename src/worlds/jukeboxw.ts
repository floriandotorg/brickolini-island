import type * as THREE from 'three'
import { _StartUp, Decal_Bitmap, Nelson_Bitmap, Right_Bitmap, Torpedos_Bitmap, Wallis_Bitmap } from '../actions/jukeboxw'
import { createImageSprite } from '../lib/assets/canvas-sprite'
import type { ControlEvent } from '../lib/assets/control'
import type { Composer } from '../lib/effect/composer'
import type { NormalizedMouseEvent } from '../lib/engine'
import { engine } from '../lib/engine'
import { JUKEBOX_MUSIC_COUNT, JukeBoxMusic, jukeBoxState } from '../lib/jukebox-state'
import { getSettings, setSettings } from '../lib/settings'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

const DISC_BITMAPS = [Right_Bitmap, Decal_Bitmap, Wallis_Bitmap, Nelson_Bitmap, Torpedos_Bitmap] as const

export class JukeBox extends World {
  private readonly _building = new Building()
  private readonly _discs: THREE.Sprite[] = []

  constructor() {
    super('jukeboxw', false)
    for (const bitmap of DISC_BITMAPS) {
      const sprite = createImageSprite(bitmap)
      sprite.visible = false
      this._building.scene.add(sprite)
      this._discs.push(sprite)
    }
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      noLights: true,
    })

    this._building.onButtonClicked = (buttonName, event) => this.handleControl(buttonName, event)
  }

  public override activate(composer: Composer): void {
    this._building.activate(composer)
    super.activate(composer)
    this.showCurrentDisc()
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    await super.pointerDown(event)
  }

  public override pointerUp(event: NormalizedMouseEvent): void {
    this._building.pointerUp()
    super.pointerUp(event)
  }

  public override keyDown(event: KeyboardEvent): void {
    super.keyDown(event)
    if (event.key === 'Escape') {
      void switchWorld({ ending: null })
    }
  }

  private handleControl(buttonName: string, event: ControlEvent): boolean {
    if (event.state !== 1) {
      return false
    }

    switch (buttonName) {
      case 'Dfwd_Ctl':
        this.stepDisc(1)
        return true
      case 'Dback_Ctl':
        this.stepDisc(-1)
        return true
      case 'Note_Ctl':
        jukeBoxState.pendingStart = true
        void switchWorld({ spawn: 'jukeboxExterior' })
        return true
      case 'Volup_Ctl':
        this.adjustVolume(0.1)
        return true
      case 'Voldown_Ctl':
        this.adjustVolume(-0.1)
        return true
      default:
        return false
    }
  }

  private stepDisc(direction: 1 | -1): void {
    const current = jukeBoxState.music
    const next = (current + direction + JUKEBOX_MUSIC_COUNT) % JUKEBOX_MUSIC_COUNT
    this.setDiscVisible(current, false)
    jukeBoxState.music = next as JukeBoxMusic
    this.setDiscVisible(next, true)
  }

  private setDiscVisible(music: JukeBoxMusic, visible: boolean): void {
    if (music === JukeBoxMusic.e_pasquell) {
      return
    }
    const disc = this._discs[music - 1]
    if (disc != null) {
      disc.visible = visible
    }
  }

  private showCurrentDisc(): void {
    for (let n = 0; n < this._discs.length; ++n) {
      this._discs[n].visible = false
    }
    this.setDiscVisible(jukeBoxState.music, true)
  }

  private adjustVolume(delta: number): void {
    const volume = getSettings().volume
    const music = Math.min(1, Math.max(0, volume.music + delta))
    setSettings({ volume: { ...volume, music } })
    engine.updateVolumes(false)
  }
}
