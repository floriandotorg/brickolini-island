import * as THREE from 'three'
import type { Act3Ammo } from '../act3/ammo'
import { Actor } from '../actor'
export class Act3Shark extends Actor {
  private readonly _queue: Act3Ammo[] = []
  private _current: Act3Ammo | null = null
  private _time = 0
  private _position = new THREE.Vector3()
  private _placeholder: string | null = null
  public override async init(): Promise<void> {
    this.roi.visible = false
  }
  public eatPizza(pizza: Act3Ammo): void {
    if (!pizza.valid || pizza.sharkFood) {
      return
    }
    pizza.sharkFood = true
    this._queue.push(pizza)
  }
  public override get collisionEnabled(): boolean {
    return false
  }
  public override update(delta: number): null {
    if (this._current == null) {
      const pizza = this._queue.shift()
      if (pizza == null) {
        return null
      }
      this._current = pizza
      this._time = 0
      this._position.copy(pizza.roi.position)
      this._placeholder = this.animationActorNames(0).find(name => !name.includes('shark')) ?? null
      if (this._placeholder != null) {
        this.bindAnimationActor(0, this._placeholder, pizza.roi)
      }
      this.roi.visible = true
    }
    this._time += delta * 1000
    this.applyAnimationAt(0, Math.min(this._time, this.getAnimationDuration(0)), new THREE.Matrix4().setPosition(this._position))
    if (this._time >= this.getAnimationDuration(0)) {
      this._current.remove(true)
      this._current = null
      this.roi.visible = false
    }
    return null
  }
}
