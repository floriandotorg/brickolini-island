import * as THREE from 'three'
import * as HistBookActions from '../actions/histbook'
import { InformationCenter_Music } from '../actions/jukebox'
import { isImageAction } from '../lib/action-types'
import { CanvasSprite, createNormalizedSprite } from '../lib/assets/canvas-sprite'
import { getImage } from '../lib/assets/image'
import { createTexture } from '../lib/assets/texture'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../lib/engine'
import { getScoreHistory } from '../lib/score-history.ts'
import { getHistoryPosition, ScorePalette } from '../lib/score-layout.ts'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class HistBook extends World {
  private readonly _building = new Building()
  private readonly _entries = new THREE.Group()
  private _leaving = false
  private _boxImage: HTMLImageElement | null = null

  constructor() {
    super('histbook')
  }

  public override async init(): Promise<void> {
    await super.init()
    await this._building.init({ world: this, startUpAction: HistBookActions._StartUp, backgroundMusic: InformationCenter_Music, skipWdbWorld: true })
    this._boxImage = await getImage(HistBookActions.ScoreBox)
    this._building.scene.add(this._entries)
  }

  private clearEntries = (): void => {
    this._entries.traverse(object => {
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose()
        object.material.dispose()
      }
    })
    this._entries.clear()
  }

  public override activate(composer: Composer): void {
    super.activate(composer)
    this._building.activate(composer)
    this._leaving = false
    this.clearEntries()
    const history = getScoreHistory()
    history.update(engine.currentSaveGame)
    for (const [index, entry] of history.entries.entries()) {
      const { x, y } = getHistoryPosition(index)
      const box = new CanvasSprite([x + 161, y, 0], 26, 26)
      if (this._boxImage != null) {
        box.context.drawImage(this._boxImage, 0, 0)
      }
      for (let n = 0; n < 25; ++n) {
        const mission = Math.floor(n / 5)
        const actor = n % 5
        const score = entry.scores[mission][actor]
        if (score > 0) {
          box.context.fillStyle = ScorePalette[score] ?? ScorePalette[0]
          box.context.fillRect(1 + mission * 5, 1 + actor * 5, 4, 4)
        }
      }
      box.needsUpdate = true
      this._entries.add(box.sprite)
      for (let n = 0; n < Math.min(7, entry.name.length); ++n) {
        const letter = Object.values(HistBookActions).find(action => action.name === `${entry.name[n]}_Bitmap`)
        if (letter != null && isImageAction(letter)) {
          const sprite = createNormalizedSprite(x + n * 23, y, 0, 24, 27)
          sprite.material = new THREE.SpriteMaterial({ map: createTexture(letter), transparent: true })
          this._entries.add(sprite)
        }
      }
    }
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    if (!this._leaving) {
      this._leaving = true
      void switchWorld('infoscor')
    }
  }

  public override escape(): boolean {
    this._leaving = true
    return true
  }

  public override keyPressed(_key: string): void {}

  public override deactivate(): void {
    this.clearEntries()
    super.deactivate()
  }
}
