import { Actor } from '../actor'
import { Pizzeria } from './pizzeria'

export class Pizza extends Actor {
  public override async onClick(): Promise<boolean> {
    this._isle.getActor('pizza', Pizzeria).onPizzaClicked()
    return true
  }
}
