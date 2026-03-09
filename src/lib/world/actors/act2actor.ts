import * as THREE from 'three'
import { switchWorld } from '../../switch-world'
import { PathActor } from './path-actor'

const NEXT_LOCATION: [number, number][] = [
  [3, 7],
  [2, 4],
  [3, 6],
  [5, 1],
  [7, 0],
  [6, 1],
  [0, 4],
  [2, 5],
  [0, 4],
]

export class Act2Actor extends PathActor {
  private readonly _locations: {
    position: THREE.Vector3
    direction: THREE.Vector3
    boundary: string
    cleared: boolean
  }[] = [
    {
      position: new THREE.Vector3(47.92, 7.0699968, -31.58),
      direction: new THREE.Vector3(-0.999664, 0.0, -0.025916),
      boundary: 'edg01_27',
      cleared: false,
    },
    {
      position: new THREE.Vector3(70.393349, 8.07, 3.151935),
      direction: new THREE.Vector3(-0.90653503, 0.0, 0.422131),
      boundary: 'int06',
      cleared: false,
    },
    {
      position: new THREE.Vector3(47.74, 4.079995, -52.3),
      direction: new THREE.Vector3(-0.98293, 0.0, -0.18398),
      boundary: 'edg01_08',
      cleared: false,
    },
    {
      position: new THREE.Vector3(26.273487, 0.069, 12.170015),
      direction: new THREE.Vector3(0.987199, 0.0, -0.159491),
      boundary: 'INT14',
      cleared: false,
    },
    {
      position: new THREE.Vector3(-26.16499, 0.069, 5.61),
      direction: new THREE.Vector3(0.027719, 0.0, 0.999616),
      boundary: 'INT22',
      cleared: false,
    },
    {
      position: new THREE.Vector3(-66.383446, 4.07, 32.387417),
      direction: new THREE.Vector3(0.979487, 0.0, -0.201506),
      boundary: 'edg02_27',
      cleared: false,
    },
    {
      position: new THREE.Vector3(-71.843285, 0.069, -49.524852),
      direction: new THREE.Vector3(0.99031502, 0.0, 0.13884),
      boundary: 'edg02_39',
      cleared: false,
    },
    {
      position: new THREE.Vector3(-26.470566, 0.069, -44.670845),
      direction: new THREE.Vector3(0.004602, 0.0, -0.99998897),
      boundary: 'int26',
      cleared: false,
    },
    {
      position: new THREE.Vector3(6.323625, 0.069, -47.96045),
      direction: new THREE.Vector3(-0.982068, 0.0, 0.188529),
      boundary: 'edg02_53',
      cleared: false,
    },
    {
      position: new THREE.Vector3(36.689, -0.978409, 31.449),
      direction: new THREE.Vector3(0.083792, -0.94303, -0.66398698),
      boundary: 'edg00_157',
      cleared: false,
    },
    {
      position: new THREE.Vector3(44.6, 0.1, 45.3),
      direction: new THREE.Vector3(0.95, 0.0, -0.3),
      boundary: 'edg00_154',
      cleared: false,
    },
  ]
  private _currentLocationIndex = -1

  private _setNextLocation(): void {
    const numClearedLocations = this._locations.filter(location => location.cleared).length
    console.log(
      'numClearedLocations',
      this._locations
        .map((location, index) => [index, location.cleared])
        .filter(([_, cleaned]) => cleaned)
        .map(([i]) => i),
    )
    if (this._currentLocationIndex === 8 && this._locations[8].cleared) {
      void switchWorld({ ending: 'bad' })
    }
    if (numClearedLocations >= 8 && this._currentLocationIndex !== 8) {
      this._currentLocationIndex = 8
      return
    }
    const currentLocationIndex = this._currentLocationIndex
    const selectedLocationIndex = NEXT_LOCATION[this._currentLocationIndex][Math.random() >= 0.5 ? 0 : 1]
    this._currentLocationIndex = selectedLocationIndex
    if (numClearedLocations >= 7) {
      return
    }
    while (this._locations[this._currentLocationIndex].cleared || this._currentLocationIndex === currentLocationIndex) {
      this._currentLocationIndex = (this._currentLocationIndex + 1) % 7
      if (this._currentLocationIndex === selectedLocationIndex) {
        throw new Error('No available location found')
      }
    }
  }

  private _navigateToNextLocation(): void {
    this._setNextLocation()
    console.log('setting next location to', this._currentLocationIndex)
    const location = this._locations[this._currentLocationIndex]
    this.navigateTo(location.boundary, location.position, location.direction)
    this._isle.debugDrawSphere(location.position.clone(), 'green', 3)
  }

  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    if (this._currentLocationIndex < 0) {
      this._currentLocationIndex = 0
      this._navigateToNextLocation()
      this.speed = 500
    }

    const result = super.update(delta)

    if (!this.isFollowingPath) {
      this._locations[this._currentLocationIndex].cleared = true
      this._navigateToNextLocation()
    }

    return result
  }
}
