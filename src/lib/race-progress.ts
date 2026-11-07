export class RaceProgress {
  private _lastWaypointNo = 0
  private _lap = 0
  private readonly _laps: number
  private readonly _waypoints: number

  constructor(laps: number, waypoints: number) {
    this._laps = laps
    this._waypoints = waypoints
  }

  public visit = (waypoint: number): boolean => {
    if (this.finished || waypoint <= this._lastWaypointNo || waypoint >= this._lastWaypointNo + 5 || waypoint > this._waypoints) {
      return false
    }
    if (waypoint === this._waypoints) {
      this._lastWaypointNo = 0
      ++this._lap
    } else {
      this._lastWaypointNo = waypoint
    }
    return true
  }

  public get finished(): boolean {
    return this._lap >= this._laps
  }
  public get lastWaypointNo(): number {
    return this._lastWaypointNo
  }
  public get lap(): number {
    return this._lap
  }
  public get progress(): number {
    return (this._lap * this._waypoints + this._lastWaypointNo) / (this._laps * this._waypoints)
  }
}
