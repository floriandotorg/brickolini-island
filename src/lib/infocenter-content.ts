import * as Actions from '../actions/infomain'
import type { AudioAction, RunAnimationAction } from './action-types'

export const returnDialogues: Record<1 | 2 | 3, readonly RunAnimationAction[]> = {
  1: [Actions.iicx26in_RunAnim, Actions.iic033in_RunAnim, Actions.iic034in_RunAnim, Actions.iic035in_RunAnim, Actions.iic036in_RunAnim],
  2: [Actions.iic048in_RunAnim, Actions.iic049in_RunAnim, Actions.iic050in_RunAnim],
  3: [Actions.iic055in_RunAnim, Actions.iic056in_RunAnim, Actions.iic057in_RunAnim, Actions.iic058in_RunAnim],
}
export const leaveDialogues: Record<1 | 2 | 3, readonly AudioAction[]> = {
  1: [Actions.iic039in_PlayWav, Actions.iic040in_PlayWav, Actions.iic041in_PlayWav, Actions.iic042in_PlayWav],
  2: [Actions.iic051in_PlayWav, Actions.iic052in_PlayWav, Actions.iic053in_PlayWav, Actions.iic054in_PlayWav],
  3: [Actions.iic059in_PlayWav, Actions.iic060in_PlayWav, Actions.iic061in_PlayWav],
}
export const act23Tips = [Actions.iic027in_RunAnim, Actions.iic029in_RunAnim, Actions.iic048in_RunAnim, Actions.iic056in_RunAnim, Actions.iicx23in_RunAnim]
export const bricksterDialogues = [Actions.sbleh2br_PlayWav, Actions.snshahbr_PlayWav]
export const mapAnnouncements = new Map<string, AudioAction>([
  ['Info_Ctl', Actions.iic007ra_PlayWav],
  ['Boat_Ctl', Actions.ijs002ra_PlayWav],
  ['Race_Ctl', Actions.irt001ra_PlayWav],
  ['Pizza_Ctl', Actions.ipz006ra_PlayWav],
  ['Gas_Ctl', Actions.igs004ra_PlayWav],
  ['Med_Ctl', Actions.iho003ra_PlayWav],
  ['Cop_Ctl', Actions.ips005ra_PlayWav],
])
