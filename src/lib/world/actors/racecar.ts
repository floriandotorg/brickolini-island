import { switchWorld } from '../../switch-world'
import { Actor } from '../actor'

export class RaceCar extends Actor {
  public override async onClick(): Promise<boolean> {
    switchWorld({ name: 'carrace' })
    return true
  }
}
