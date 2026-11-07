export const interchangeablePart = (candidate: string, next: string): boolean => candidate.slice(0, -3).toLowerCase() === next.slice(0, -3).toLowerCase()

export const shelfFrame = (start: number, interval: number, maximum: number, seconds: number): number => (start >= maximum ? 0 : Math.min(maximum, start + (interval * Math.min(10, Math.floor(seconds / 0.04))) / 10))

type BlinkWindow = readonly [number, number, number, string]
const windows: Record<string, readonly BlinkWindow[]> = {
  irt001d1_RunAnim: [
    [160, 160, 180, 'Exit_Ctl'],
    [260, 260, 280, 'ShelfUp_Ctl'],
    [330, 330, 340, 'Yellow_Ctl'],
    [340, 340, 360, 'Platform_Ctl'],
    [390, 390, 410, 'Exit_Ctl'],
  ],
  irt004d1_RunAnim: [
    [50, 50, 60, 'ShelfUp_Ctl'],
    [63, 65, 70, 'Yellow_Ctl'],
    [70, 70, 80, 'Platform_Ctl'],
    [95, 95, 105, 'Exit_Ctl'],
  ],
  irtxx4d1_RunAnim: [
    [22, 24, 29, 'Exit_Ctl'],
    [33, 35, 40, 'ShelfUp_Ctl'],
    [43, 45, 50, 'Yellow_Ctl'],
    [56, 58, 63, 'Platform_Ctl'],
  ],
  ijs001d4_RunAnim: [
    [291, 291, 311, 'Exit_Ctl'],
    [311, 311, 331, 'ShelfUp_Ctl'],
    [412, 412, 432, 'Yellow_Ctl'],
    [437, 437, 457, 'Platform_Ctl'],
    [485, 485, 505, 'Exit_Ctl'],
  ],
  ijsxx2d4_RunAnim: [
    [32, 34, 39, 'Exit_Ctl'],
    [68, 70, 75, 'ShelfUp_Ctl'],
    [105, 105, 115, 'Yellow_Ctl'],
    [133, 135, 140, 'Platform_Ctl'],
  ],
  ijs005d4_RunAnim: [[78, 78, 98, 'Exit_Ctl']],
  ijs006d4_RunAnim: [[93, 93, 113, 'Exit_Ctl']],
  igs001d3_RunAnim: [
    [155, 155, 175, 'Exit_Ctl'],
    [215, 215, 235, 'ShelfUp_Ctl'],
    [285, 285, 305, 'Yellow_Ctl'],
    [300, 300, 320, 'Platform_Ctl'],
    [340, 340, 360, 'Exit_Ctl'],
  ],
  igsxx1d3_RunAnim: [
    [23, 23, 33, 'Exit_Ctl'],
    [37, 39, 44, 'ShelfUp_Ctl'],
    [105, 105, 115, 'Yellow_Ctl'],
    [122, 124, 129, 'Platform_Ctl'],
  ],
  ips001d2_RunAnim: [
    [185, 185, 205, 'Exit_Ctl'],
    [235, 235, 255, 'ShelfUp_Ctl'],
    [292, 292, 312, 'Yellow_Ctl'],
    [315, 315, 335, 'Platform_Ctl'],
    [353, 353, 373, 'Exit_Ctl'],
  ],
  ipsxx1d2_RunAnim: [
    [43, 45, 50, 'Exit_Ctl'],
    [72, 74, 79, 'ShelfUp_Ctl'],
    [114, 116, 121, 'Yellow_Ctl'],
    [128, 130, 135, 'Platform_Ctl'],
  ],
  ips005d2_RunAnim: [
    [30, 30, 40, 'ShelfUp_Ctl'],
    [60, 60, 70, 'Yellow_Ctl'],
    [48, 48, 58, 'Platform_Ctl'],
  ],
}

export const hostBlink = (script: string, milliseconds: number): { control: string; pressed: 0 | 1 } | null => {
  const tick = Math.floor(milliseconds / 100)
  for (const [subtract, start, end, control] of windows[script] ?? []) {
    if (tick > start && tick < end) {
      return { control, pressed: Math.floor((tick - subtract) / 5) % 2 === 0 ? 1 : 0 }
    }
  }
  return null
}
