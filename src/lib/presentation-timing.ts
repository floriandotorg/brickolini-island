export const isPresenterVisible = (start: number, duration: number, elapsed: number): boolean => elapsed >= start && elapsed < start + duration
