export const infoEntry = (act: number, state: string, firstVisit: boolean): 'firstWelcome' | 'saveSelected' | 'bookBack' | 'exitQuery' | 'resumeAct' | 'return' => {
  if (state === 'exitQueried') {
    return 'exitQuery'
  }
  if (state === 'selectedSave') {
    return act === 1 ? 'saveSelected' : 'resumeAct'
  }
  if (state === 'backToInfoAct1' && act === 1) {
    return 'bookBack'
  }
  return firstVisit && state === 'newState' && act === 1 ? 'firstWelcome' : 'return'
}

export const infoReturnRule = (act: number, previous: string | null, registered: boolean, player: boolean): 'none' | 'register' | 'return' => {
  if (act !== 1) {
    return 'return'
  }
  if (previous == null || ['histbook', 'elevbott', 'elevride', 'elevopen', 'seaview', 'observe', 'elevdown'].includes(previous)) {
    return 'none'
  }
  if (['infodoor', 'regbook', 'infoscor'].includes(previous)) {
    return 'return'
  }
  return !player ? 'none' : registered ? 'return' : 'register'
}
