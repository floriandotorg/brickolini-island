export const triggerMatches = (flags: number, inbound: boolean, player: boolean, ignoreDirection = false): boolean => {
  const actorMask = player ? 0x01000000 : 0x0e000000
  const directionMask = ignoreDirection ? 0x30000000 : inbound ? 0x10000000 : 0x20000000
  return (flags & actorMask) !== 0 && (flags & directionMask) !== 0
}
