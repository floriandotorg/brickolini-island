import * as THREE from 'three'
import { VObehind0_PlayWav, VObehind1_PlayWav, VObehind2_PlayWav, VObehind3_PlayWav, VOhead0_PlayWav, VOhead1_PlayWav, VOinterrupt0_PlayWav, VOinterrupt1_PlayWav, VOinterrupt2_PlayWav, VOinterrupt3_PlayWav } from '../../../actions/act2main'
import { type Audio, Playlist } from '../../assets/audio'
import type { Roi3D } from '../../assets/model'
import { engine, type Interval, type Timeout } from '../../engine'
import { switchWorld } from '../../switch-world'
import { Plants } from '../plants'
import { PathActor } from './path-actor'

const getPlantHealth = (index: number): number => {
  switch (Plants.plants[index].variant) {
    case Plants.Variant.Flower:
      return 1
    case Plants.Variant.Bush:
    case Plants.Variant.Tree:
      return 2
    case Plants.Variant.Palm:
      return 3
  }
}

const buildingIndexToName = ['infocen', 'policsta', 'Jail', 'races', 'medcntr', 'gas', 'beach', 'racef', 'racej', 'Store', 'Bank', 'Post', 'haus1', 'haus2', 'haus3', 'Pizza']

namespace VoiceOvers {
  export const head = new Playlist([VOhead0_PlayWav, VOhead1_PlayWav])
  export const behind = new Playlist([VObehind0_PlayWav, VObehind1_PlayWav, VObehind2_PlayWav, VObehind3_PlayWav])
  export const interrupt = new Playlist([VOinterrupt0_PlayWav, VOinterrupt1_PlayWav, VOinterrupt2_PlayWav, VOinterrupt3_PlayWav])
}

export class Act2Actor extends PathActor {
  private readonly _locations: {
    position: THREE.Vector3
    direction: THREE.Vector3
    boundary: string
    cleared: boolean
    targets: (
      | {
          type: 'plant'
          index: number
          health: number
        }
      | {
          type: 'building'
          index: number
          health: number
        }
    )[]
    next: [number, number]
  }[] = [
    // 4,8 = 1 / 2
    {
      position: new THREE.Vector3(47.92, 7.0699968, -31.58),
      direction: new THREE.Vector3(-0.999664, 0.0, -0.025916),
      boundary: 'edg01_27',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 12,
          health: 2,
        },
        {
          type: 'building',
          index: 14,
          health: 2,
        },
        {
          type: 'plant',
          index: 2,
          health: getPlantHealth(2),
        },
        {
          type: 'plant',
          index: 23,
          health: getPlantHealth(23),
        },
        {
          type: 'plant',
          index: 32,
          health: getPlantHealth(32),
        },
        {
          type: 'plant',
          index: 66,
          health: getPlantHealth(66),
        },
        {
          type: 'plant',
          index: 71,
          health: getPlantHealth(71),
        },
        {
          type: 'plant',
          index: 72,
          health: getPlantHealth(72),
        },
        {
          type: 'plant',
          index: 73,
          health: getPlantHealth(73),
        },
      ],
      next: [3, 7],
    },
    {
      position: new THREE.Vector3(70.393349, 8.07, 3.151935),
      direction: new THREE.Vector3(-0.90653503, 0.0, 0.422131),
      boundary: 'int06',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 13,
          health: 2,
        },
        {
          type: 'plant',
          index: 0,
          health: getPlantHealth(0),
        },
        {
          type: 'plant',
          index: 7,
          health: getPlantHealth(7),
        },
        {
          type: 'plant',
          index: 16,
          health: getPlantHealth(16),
        },
        {
          type: 'plant',
          index: 18,
          health: getPlantHealth(18),
        },
        {
          type: 'plant',
          index: 20,
          health: getPlantHealth(20),
        },
        {
          type: 'plant',
          index: 21,
          health: getPlantHealth(21),
        },
        {
          type: 'plant',
          index: 34,
          health: getPlantHealth(34),
        },
        {
          type: 'plant',
          index: 49,
          health: getPlantHealth(49),
        },
        {
          type: 'plant',
          index: 58,
          health: getPlantHealth(58),
        },
        {
          type: 'plant',
          index: 59,
          health: getPlantHealth(59),
        },
        {
          type: 'plant',
          index: 63,
          health: getPlantHealth(63),
        },
        {
          type: 'plant',
          index: 65,
          health: getPlantHealth(65),
        },
        {
          type: 'plant',
          index: 69,
          health: getPlantHealth(69),
        },
        {
          type: 'plant',
          index: 74,
          health: getPlantHealth(74),
        },
      ],
      next: [2, 4],
    },
    {
      position: new THREE.Vector3(47.74, 4.079995, -52.3),
      direction: new THREE.Vector3(-0.98293, 0.0, -0.18398),
      boundary: 'edg01_08',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 9,
          health: 2,
        },
        {
          type: 'building',
          index: 11,
          health: 2,
        },
        {
          type: 'plant',
          index: 12,
          health: getPlantHealth(12),
        },
        {
          type: 'plant',
          index: 19,
          health: getPlantHealth(19),
        },
        {
          type: 'plant',
          index: 24,
          health: getPlantHealth(24),
        },
        {
          type: 'plant',
          index: 48,
          health: getPlantHealth(48),
        },
        {
          type: 'plant',
          index: 60,
          health: getPlantHealth(60),
        },
      ],
      next: [3, 6],
    },
    {
      position: new THREE.Vector3(26.273487, 0.069, 12.170015),
      direction: new THREE.Vector3(0.987199, 0.0, -0.159491),
      boundary: 'INT14',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 7,
          health: 2,
        },
        {
          type: 'building',
          index: 8,
          health: 1,
        },
        {
          type: 'building',
          index: 3,
          health: 2,
        },
        {
          type: 'plant',
          index: 8,
          health: getPlantHealth(8),
        },
        {
          type: 'plant',
          index: 15,
          health: getPlantHealth(15),
        },
        {
          type: 'plant',
          index: 46,
          health: getPlantHealth(46),
        },
      ],
      next: [5, 1],
    },
    {
      position: new THREE.Vector3(-26.16499, 0.069, 5.61),
      direction: new THREE.Vector3(0.027719, 0.0, 0.999616),
      boundary: 'INT22',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 5,
          health: 2,
        },
        {
          type: 'building',
          index: 10,
          health: 2,
        },
        {
          type: 'plant',
          index: 25,
          health: getPlantHealth(25),
        },
        {
          type: 'plant',
          index: 26,
          health: getPlantHealth(26),
        },
        {
          type: 'plant',
          index: 28,
          health: getPlantHealth(28),
        },
        {
          type: 'plant',
          index: 29,
          health: getPlantHealth(29),
        },
        {
          type: 'plant',
          index: 38,
          health: getPlantHealth(38),
        },
        {
          type: 'plant',
          index: 39,
          health: getPlantHealth(39),
        },
        {
          type: 'plant',
          index: 42,
          health: getPlantHealth(42),
        },
        {
          type: 'plant',
          index: 50,
          health: getPlantHealth(50),
        },
        {
          type: 'plant',
          index: 51,
          health: getPlantHealth(51),
        },
        {
          type: 'plant',
          index: 56,
          health: getPlantHealth(56),
        },
      ],
      next: [7, 0],
    },
    {
      position: new THREE.Vector3(-66.383446, 4.07, 32.387417),
      direction: new THREE.Vector3(0.979487, 0.0, -0.201506),
      boundary: 'edg02_27',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 4,
          health: 1,
        },
        {
          type: 'plant',
          index: 3,
          health: getPlantHealth(3),
        },
        {
          type: 'plant',
          index: 40,
          health: getPlantHealth(40),
        },
        {
          type: 'plant',
          index: 53,
          health: getPlantHealth(53),
        },
        {
          type: 'plant',
          index: 55,
          health: getPlantHealth(55),
        },
      ],
      next: [6, 1],
    },
    {
      position: new THREE.Vector3(-71.843285, 0.069, -49.524852),
      direction: new THREE.Vector3(0.99031502, 0.0, 0.13884),
      boundary: 'edg02_39',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 2,
          health: 2,
        },
        {
          type: 'plant',
          index: 22,
          health: getPlantHealth(22),
        },
        {
          type: 'plant',
          index: 33,
          health: getPlantHealth(33),
        },
        {
          type: 'plant',
          index: 41,
          health: getPlantHealth(41),
        },
        {
          type: 'plant',
          index: 45,
          health: getPlantHealth(45),
        },
        {
          type: 'plant',
          index: 67,
          health: getPlantHealth(67),
        },
      ],
      next: [0, 4],
    },
    {
      position: new THREE.Vector3(-26.470566, 0.069, -44.670845),
      direction: new THREE.Vector3(0.004602, 0.0, -0.99998897),
      boundary: 'int26',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 6,
          health: 2,
        },
        {
          type: 'plant',
          index: 13,
          health: getPlantHealth(13),
        },
        {
          type: 'plant',
          index: 30,
          health: getPlantHealth(30),
        },
        {
          type: 'plant',
          index: 31,
          health: getPlantHealth(31),
        },
        {
          type: 'plant',
          index: 62,
          health: getPlantHealth(62),
        },
      ],
      next: [2, 5],
    },
    {
      position: new THREE.Vector3(6.323625, 0.069, -47.96045),
      direction: new THREE.Vector3(-0.982068, 0.0, 0.188529),
      boundary: 'edg02_53',
      cleared: false,
      targets: [
        {
          type: 'plant',
          index: 1,
          health: getPlantHealth(1),
        },
        {
          type: 'plant',
          index: 27,
          health: getPlantHealth(27),
        },
        {
          type: 'plant',
          index: 37,
          health: getPlantHealth(37),
        },
        {
          type: 'plant',
          index: 44,
          health: getPlantHealth(44),
        },
        {
          type: 'plant',
          index: 47,
          health: getPlantHealth(47),
        },
        {
          type: 'plant',
          index: 54,
          health: getPlantHealth(54),
        },
        {
          type: 'plant',
          index: 61,
          health: getPlantHealth(61),
        },
        {
          type: 'plant',
          index: 64,
          health: getPlantHealth(64),
        },
        {
          type: 'building',
          index: 15,
          health: 2,
        },
      ],
      next: [0, 4],
    },
  ]
  private readonly _lastBrick = {
    position: new THREE.Vector3(44.6, 0.1, 45.3),
    direction: new THREE.Vector3(0.95, 0.0, -0.3),
    boundary: 'edg00_154',
  }
  private readonly _hiding = {
    position: new THREE.Vector3(36.689, -0.978409, 31.449),
    direction: new THREE.Vector3(0.083792, -0.94303, -0.66398698),
    boundary: 'edg00_157',
  }

  private _currentLocationIndex = -1
  private _droppedBricks = 0
  private _lastDropTimeout: Timeout | null = null
  private _voiceOver: Audio | null = null
  private _state: { name: 'going-to-next-location' } | { name: 'shooting'; targetIndex: number } | { name: 'going-to-drop-last-brick' } | { name: 'going-to-hiding' } | { name: 'hidden' } = { name: 'going-to-next-location' }

  private _setNextLocation(): void {
    const numClearedLocations = this._locations.filter(location => location.cleared).length
    if (this._currentLocationIndex === 8 && this._locations[8].cleared) {
      void switchWorld({ ending: 'bad' })
    }
    if (numClearedLocations >= 8 && this._currentLocationIndex !== 8) {
      this._currentLocationIndex = 8
      return
    }
    const currentLocationIndex = this._currentLocationIndex
    const selectedLocationIndex = this._locations[this._currentLocationIndex].next[Math.random() >= 0.5 ? 0 : 1]
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
    this._navigateTo(location)
    this._state = { name: 'going-to-next-location' }
    this.speed = 4
  }

  private _navigateToDropLastBrick(): void {
    this._navigateTo(this._lastBrick)
    this._state = { name: 'going-to-drop-last-brick' }
  }

  private _navigateToHiding(): void {
    this._navigateTo(this._hiding)
    this._state = { name: 'going-to-hiding' }
  }

  private _navigateTo(location: { position: THREE.Vector3; direction: THREE.Vector3; boundary: string }) {
    this.navigateTo(location.boundary, location.position, location.direction)
    this._speed = 4
  }

  private _dropBrick(): void {
    if (this._droppedBricks < 6) {
      this._playVoiceOver(VoiceOvers.behind)
      this._droppedBricks++
      console.log('dropped brick number ', this._droppedBricks)
      this._lastDropTimeout = engine.createTimeout(3500)
      if (this._droppedBricks === 5) {
        this._navigateToDropLastBrick()
      } else if (this._droppedBricks >= 6) {
        this._navigateToHiding()
      }
    }
  }

  private async _playVoiceOver(playlist: Playlist): Promise<void> {
    if (this._voiceOver == null || this._voiceOver.ended) {
      const action = playlist.play()
      this._voiceOver = await engine.playAudio(action, 'speech')
    }
  }

  private _selectNextTarget(): void {
    const targetIndex = this._locations[this._currentLocationIndex].targets.findIndex(target => target.health > 0)
    if (targetIndex === -1) {
      this._locations[this._currentLocationIndex].cleared = true
      this._navigateToNextLocation()
      return
    }
    this._state = { name: 'shooting', targetIndex }
    this._shootSelectedTarget()
  }

  private _shootSelectedTarget(): void {
    if (this._state.name !== 'shooting') {
      throw new Error('Not in shooting state')
    }
    console.log('shooting', this._locations[this._currentLocationIndex].targets[this._state.targetIndex].health)
    const animation = this._animationActions.get(-1)
    if (animation == null) {
      throw new Error('Animation not found')
    }
    const targetPosition = this._getTargetRoi(this._state.targetIndex).position.clone()
    const direction = targetPosition.sub(this.roi.position)
    direction.y = 0
    direction.normalize()
    const dir = direction.multiplyScalar(-1)
    const worldUp = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(worldUp, dir).normalize()
    const up = new THREE.Vector3().crossVectors(dir, right).normalize()
    const matrix = new THREE.Matrix4().makeBasis(right, up, dir)
    const rotation = new THREE.Quaternion().setFromRotationMatrix(matrix)
    this._isle.playPositionalAudio('xarrow', this.roi.model)
    void this._isle.playAnimation(animation, { location: this.roi.position.clone().add(new THREE.Vector3(0, 1, 0)), rotation, overrideLoop: THREE.LoopOnce }).then(() => {
      if (this._state.name !== 'shooting') {
        throw new Error('Animation finished but not in shooting state')
      }

      this._locations[this._currentLocationIndex].targets[this._state.targetIndex].health -= 1
      if (this._locations[this._currentLocationIndex].targets[this._state.targetIndex].health <= 0) {
        this._getTargetRoi(this._state.targetIndex).visible = false
        this._selectNextTarget()
      } else {
        this._shootSelectedTarget()
      }
    })
  }

  private _getTargetRoi(targetIndex: number): Roi3D {
    if (this._locations[this._currentLocationIndex].targets[targetIndex].type === 'plant') {
      return Plants.getRoi(this._locations[this._currentLocationIndex].targets[targetIndex].index)
    }
    return this._isle.getRoi(buildingIndexToName[this._locations[this._currentLocationIndex].targets[targetIndex].index])
  }

  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    if (this._currentLocationIndex < 0) {
      this._currentLocationIndex = 0
      this._navigateToNextLocation()
    }

    const playerToAmbulance = this.roi.position.clone().sub(this._isle.camera.position)
    if (playerToAmbulance.lengthSq() < 75) {
      const cameraDir = this._isle.camera.getWorldDirection(new THREE.Vector3())
      if (cameraDir.dot(playerToAmbulance) >= 0) {
        const roiDir = this.roi.getWorldDirection(new THREE.Vector3())
        const behind = playerToAmbulance.dot(roiDir) < 0
        if (behind) {
          if (this._lastDropTimeout == null || this._lastDropTimeout.isExpired) {
            this._dropBrick()
          }
        } else {
          this._playVoiceOver(VoiceOvers.head)
        }
      }
    }

    if (!this.isFollowingPath) {
      switch (this._state.name) {
        case 'going-to-next-location':
          this.speed = -1
          this._selectNextTarget()
          break
        case 'going-to-hiding':
          this.speed = 0
          this.roi.visible = false
          this._state = { name: 'hidden' }
          break
        case 'going-to-drop-last-brick':
          this._dropBrick()
          break
      }
    }

    if (this._state.name === 'shooting') {
      return { from: this.roi.position.clone(), to: this.roi.position.clone() }
    }

    return super.update(delta)
  }
}
