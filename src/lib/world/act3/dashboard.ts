import type * as THREE from 'three'
import * as actions from '../../../actions/act3'
import { type ActionBase, isImageAction } from '../../action-types'
import { createImageSprite } from '../../assets/canvas-sprite'
import { ControlsCollection } from '../../assets/control'
import { type Composer, Render2D } from '../../effect/composer'
import type { NormalizedMouseEvent } from '../../engine'
export class Act3Dashboard {
  private readonly _render = new Render2D()
  private readonly _controls = new ControlsCollection(this._render)
  private readonly _dots: THREE.Sprite[] = []
  public onPizza = () => {}
  public onDonut = () => {}
  public onInfo = () => {}
  public async init(): Promise<void> {
    this._render.letterbox = true
    this._render.letterboxAnchor = 'bottom'
    this._render.scene.add(createImageSprite(actions.HelicopterDashboard_Bitmap))
    await Promise.all([actions.Helicopter_Pizza_Ctl, actions.Helicopter_Donut_Ctl, actions.Helicopter_Info_Ctl].map(action => this._controls.addControl(action)))
    this._controls.onButtonClicked = name => {
      if (name === 'Helicopter_Pizza_Ctl') {
        this.onPizza()
        return true
      }
      if (name === 'Helicopter_Donut_Ctl') {
        this.onDonut()
        return true
      }
      if (name === 'Helicopter_Info_Ctl') {
        this.onInfo()
        return true
      }
      return false
    }
    const allActions: ActionBase[] = Object.values(actions)
    const dots = allActions
      .filter(isImageAction)
      .filter(action => /^HelicopterDotOn\d+_Bitmap$/.test(action.name))
      .toSorted((a, b) => a.id - b.id)
    for (const action of dots) {
      const sprite = createImageSprite(action)
      this._dots.push(sprite)
      this._render.scene.add(sprite)
    }
  }
  public set visible(value: boolean) {
    this._render.scene.visible = value
  }
  public setDotCount(count: number): void {
    for (let n = 0; n < this._dots.length; ++n) {
      this._dots[n].visible = n < count
    }
  }
  public activate(composer: Composer): void {
    composer.add(this._render)
    this._controls.pointerUp()
  }
  public pointerDown(event: NormalizedMouseEvent): boolean {
    const [x, y] = this._render.contentNDC(event.ndcX, event.ndcY)
    return this._controls.pointerDown(x, y)
  }
  public pointerUp(): void {
    this._controls.pointerUp()
  }
}
