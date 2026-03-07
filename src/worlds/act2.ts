import { _Act2Main } from '../actions/act2main'
import { IsleBase } from './isle-base'

export class Act2 extends IsleBase {
  constructor() {
    super('act2', { wdbWorldName: 'ACT2', dtaWorldName: 'ACT2' })
  }

  public override async init(): Promise<void> {
    await super.init()

    await this.handleStartUpAction(_Act2Main)
  }
}
