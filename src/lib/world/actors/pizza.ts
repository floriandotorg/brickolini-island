import { Actor } from '../actor'
import { Pizzeria } from './pizzeria'

export class Pizza extends Actor {
  public override async onClick(): Promise<boolean> {
    const pizzeria = this._isle.getRoi('pizza').actor
    if (!(pizzeria instanceof Pizzeria)) {
      throw new Error('Pizzeria is not a Pizzeria')
    }
    pizzeria.onPizzaClicked()
    return true
  }
}
