export const damagedCounter = (counter: number, initial: number, damage: number): number => {
  const value = (counter < 0 ? initial : counter) - damage
  return value <= 1 ? 0 : value
}

export const damagedHeight = (initialY: number, counter: number, initialCounter: number, scale: number): number => (counter < 0 ? initialY : initialY - (initialCounter - counter) * scale)
