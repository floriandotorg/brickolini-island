import type * as THREE from 'three'
import { RaceCarDashboard } from '../../actions/carrace'
import {
  AmbulanceDashboard,
  BikeDashboard,
  DuneCarDashboard,
  DuneCarDashboard1_Bitmap,
  DuneCarDashboard2_Bitmap,
  DuneCarDashboard3_Bitmap,
  DuneCarDashboard4_Bitmap,
  DuneCarDashboard5_Bitmap,
  DuneCarDashboard6_Bitmap,
  HelicopterDashboard,
  JetskiDashboard,
  JetskiDashboard11_Bitmap,
  JetskiDashboard12_Bitmap,
  JetskiDashboard13_Bitmap,
  JetskiDashboard14_Bitmap,
  JetskiDashboard15_Bitmap,
  JetskiDashboard16_Bitmap,
  JetskiDashboard21_Bitmap,
  JetskiDashboard22_Bitmap,
  JetskiDashboard23_Bitmap,
  JetskiDashboard24_Bitmap,
  JetskiDashboard25_Bitmap,
  JetskiDashboard26_Bitmap,
  JetskiDashboard31_Bitmap,
  JetskiDashboard32_Bitmap,
  JetskiDashboard33_Bitmap,
  JetskiDashboard34_Bitmap,
  JetskiDashboard35_Bitmap,
  JetskiDashboard36_Bitmap,
  JetskiDashboard41_Bitmap,
  JetskiDashboard42_Bitmap,
  JetskiDashboard43_Bitmap,
  JetskiDashboard44_Bitmap,
  JetskiDashboard45_Bitmap,
  JetskiDashboard46_Bitmap,
  JetskiDashboard51_Bitmap,
  JetskiDashboard52_Bitmap,
  JetskiDashboard53_Bitmap,
  JetskiDashboard54_Bitmap,
  JetskiDashboard55_Bitmap,
  JetskiDashboard56_Bitmap,
  JetskiDashboard61_Bitmap,
  JetskiDashboard62_Bitmap,
  JetskiDashboard63_Bitmap,
  JetskiDashboard64_Bitmap,
  JetskiDashboard65_Bitmap,
  JetskiDashboard66_Bitmap,
  MotoBikeDashboard,
  SkateDashboard,
  SkatePizza_Bitmap,
  TowTrackDashboard,
} from '../../actions/isle'
import { type AudioAction, type ControlAction, getExtraValue, type ImageAction, isAudioAction, isControlAction, isImageAction, isMeterAction, type MeterAction, type ParallelAction } from '../action-types'
import { CanvasSprite, createImageSprite } from '../assets/canvas-sprite'
import { Control } from '../assets/control'
import { getImage } from '../assets/image'
import type { ColorName } from '../assets/mesh'
import { type Composer, Render2D } from '../effect/composer'
import { engine } from '../engine'

export const VehicleTypes = ['bike', 'moto', 'ambul', 'towtk', 'jetski', 'racecar', 'helicopter', 'dunecar', 'skate'] as const
export type VehicleType = (typeof VehicleTypes)[number]
export const isVehicleType = (name: string): name is VehicleType => VehicleTypes.includes(name as VehicleType)
export type Vehicle =
  | {
      type: Exclude<VehicleType, 'skate'>
    }
  | {
      type: 'skate'
      showPizza: boolean
    }

const vehicleToDashboard: {
  [key in VehicleType]: ParallelAction<ImageAction | AudioAction | ControlAction>
} = {
  bike: BikeDashboard,
  moto: MotoBikeDashboard,
  skate: SkateDashboard,
  ambul: AmbulanceDashboard,
  towtk: TowTrackDashboard,
  jetski: JetskiDashboard,
  racecar: RaceCarDashboard,
  helicopter: HelicopterDashboard,
  dunecar: DuneCarDashboard,
}

const DashboardColorNames = ['lego green', 'lego red', 'lego yellow', 'lego black', 'lego blue', 'lego white'] as const
type DashboardColorName = (typeof DashboardColorNames)[number]

const getDashboardMap = <T>(color: ColorName, record: Record<DashboardColorName, T>): T => {
  const dashboardColor: DashboardColorName = DashboardColorNames.includes(color as DashboardColorName) ? (color as DashboardColorName) : 'lego green'
  return record[dashboardColor]
}

const duneCarDashboards: Record<DashboardColorName, ImageAction> = {
  'lego red': DuneCarDashboard2_Bitmap,
  'lego yellow': DuneCarDashboard3_Bitmap,
  'lego black': DuneCarDashboard4_Bitmap,
  'lego blue': DuneCarDashboard5_Bitmap,
  'lego white': DuneCarDashboard6_Bitmap,
  'lego green': DuneCarDashboard1_Bitmap,
}

const jetSkiDashboards: Record<DashboardColorName, Record<DashboardColorName, ImageAction>> = {
  'lego red': {
    'lego red': JetskiDashboard22_Bitmap,
    'lego yellow': JetskiDashboard23_Bitmap,
    'lego black': JetskiDashboard24_Bitmap,
    'lego blue': JetskiDashboard25_Bitmap,
    'lego white': JetskiDashboard26_Bitmap,
    'lego green': JetskiDashboard21_Bitmap,
  },
  'lego yellow': {
    'lego red': JetskiDashboard32_Bitmap,
    'lego yellow': JetskiDashboard33_Bitmap,
    'lego black': JetskiDashboard34_Bitmap,
    'lego blue': JetskiDashboard35_Bitmap,
    'lego white': JetskiDashboard36_Bitmap,
    'lego green': JetskiDashboard31_Bitmap,
  },
  'lego black': {
    'lego red': JetskiDashboard42_Bitmap,
    'lego yellow': JetskiDashboard43_Bitmap,
    'lego black': JetskiDashboard44_Bitmap,
    'lego blue': JetskiDashboard45_Bitmap,
    'lego white': JetskiDashboard46_Bitmap,
    'lego green': JetskiDashboard41_Bitmap,
  },
  'lego blue': {
    'lego red': JetskiDashboard52_Bitmap,
    'lego yellow': JetskiDashboard53_Bitmap,
    'lego black': JetskiDashboard54_Bitmap,
    'lego blue': JetskiDashboard55_Bitmap,
    'lego white': JetskiDashboard56_Bitmap,
    'lego green': JetskiDashboard51_Bitmap,
  },
  'lego white': {
    'lego red': JetskiDashboard62_Bitmap,
    'lego yellow': JetskiDashboard63_Bitmap,
    'lego black': JetskiDashboard64_Bitmap,
    'lego blue': JetskiDashboard65_Bitmap,
    'lego white': JetskiDashboard66_Bitmap,
    'lego green': JetskiDashboard61_Bitmap,
  },
  'lego green': {
    'lego red': JetskiDashboard12_Bitmap,
    'lego yellow': JetskiDashboard13_Bitmap,
    'lego black': JetskiDashboard14_Bitmap,
    'lego blue': JetskiDashboard15_Bitmap,
    'lego white': JetskiDashboard16_Bitmap,
    'lego green': JetskiDashboard11_Bitmap,
  },
}

const leftToRight = (width: number, height: number, fill: number): { x: number; y: number; width: number; height: number } => ({
  x: 0,
  y: 0,
  width: width * fill,
  height: height,
})

const rightToLeft = (width: number, height: number, fill: number): { x: number; y: number; width: number; height: number } => ({
  x: width * (1 - fill),
  y: 0,
  width: width * fill,
  height: height,
})

const bottomToTop = (width: number, height: number, fill: number): { x: number; y: number; width: number; height: number } => ({
  x: 0,
  y: height * (1 - fill),
  width: width,
  height: height * fill,
})

const topToBottom = (width: number, height: number, fill: number): { x: number; y: number; width: number; height: number } => ({
  x: 0,
  y: 0,
  width: width,
  height: height * fill,
})

const parseDirection = (value: string): ((width: number, height: number, fill: number) => { x: number; y: number; width: number; height: number }) => {
  switch (value) {
    case 'left_to_right':
      return leftToRight
    case 'right_to_left':
      return rightToLeft
    case 'bottom_to_top':
      return bottomToTop
    case 'top_to_bottom':
      return topToBottom
    default:
      throw new Error(`unknown direction value ${value}`)
  }
}

class Meter {
  private readonly _fillColor: string
  private readonly _image: HTMLImageElement
  private readonly _sprite: CanvasSprite
  private readonly _direction: (width: number, height: number, fill: number) => { x: number; y: number; width: number; height: number }
  private _fill: number = 0

  private constructor(action: MeterAction, image: HTMLImageElement) {
    const fillerIndex = parseInt(getExtraValue(action, 'filler_index') ?? '', 10)
    const fillColor = Number.isInteger(fillerIndex) && fillerIndex > 0 ? action.colorPalette.at(fillerIndex) : null
    if (fillColor == null) {
      throw new Error('The filler_index is not a valid index')
    }
    this._fillColor = fillColor

    this._image = image
    this._sprite = new CanvasSprite(action.location[0], action.location[1], image.width, image.height)

    const directionType = getExtraValue(action, 'type')
    this._direction = directionType != null ? parseDirection(directionType) : leftToRight

    this._fill = 1 // force redraw
    this.draw(0)
  }

  public static async create(action: MeterAction): Promise<Meter> {
    const image = await getImage(action)
    return new Meter(action, image)
  }

  public get sprite(): THREE.Sprite {
    return this._sprite.sprite
  }

  public draw(fill: number): void {
    if (this._fill !== fill) {
      this._fill = fill
      const { x, y, width, height } = this._direction(this._image.width, this._image.height, fill)
      this._sprite.context.globalCompositeOperation = 'copy'
      this._sprite.context.drawImage(this._image, 0, 0)
      this._sprite.context.globalCompositeOperation = 'source-atop'
      this._sprite.context.fillStyle = this._fillColor
      this._sprite.context.fillRect(x, y, width, height)
      this._sprite.needsUpdate = true
    }
  }
}

export class Dashboard {
  private _render = new Render2D()
  private _background: THREE.Sprite | null = null
  private _armsMask: Control | null = null
  private _hornControl: Control | null = null
  private _hornSound: AudioAction | null = null
  private _infoControl: Control | null = null
  private _speedMeter: Meter | null = null
  private _fuelMeter: Meter | null = null

  public onExit: () => void = () => {}
  public onInfoButtonClicked: () => void = () => {}

  public pointerDown(normalizedX: number, normalizedY: number): void {
    if (this._armsMask?.pointerDown(normalizedX, normalizedY) != null) {
      this.onExit()
    }

    if (this._hornControl?.pointerDown(normalizedX, normalizedY) != null && this._hornSound != null) {
      void engine.playAudio(this._hornSound, 'effects')
    }

    if (this._infoControl?.pointerDown(normalizedX, normalizedY) != null) {
      this.onInfoButtonClicked()
    }
  }

  public pointerUp(): void {
    if (this._hornControl != null) {
      this._hornControl.pointerUp()
    }

    if (this._infoControl != null) {
      this._infoControl.pointerUp()
    }
  }

  public async show(vehicle: Vehicle): Promise<void> {
    this.clear()

    const action = vehicleToDashboard[vehicle.type]
    if (action == null) {
      throw new Error(`Unknown vehicle: ${vehicle}`)
    }

    for (const child of action.children) {
      if (isMeterAction(child)) {
        const variable = getExtraValue(child, 'variable')?.toLowerCase()
        if (variable == null) {
          throw new Error('Meter without variable is not supported')
        } else if (variable.endsWith('speed')) {
          this._speedMeter = await Meter.create(child)
          this._render.scene.add(this._speedMeter.sprite)
        } else if (variable.endsWith('fuel')) {
          this._fuelMeter = await Meter.create(child)
          // For now to at least show something
          this._fuelMeter.draw(0.5)
          this._render.scene.add(this._fuelMeter.sprite)
        }
      }
    }

    const dashboardAction = (() => {
      switch (vehicle.type) {
        case 'dunecar': {
          const frontColor = engine.currentSaveGame.getColor('c_dbfrfny4')
          return getDashboardMap(frontColor, duneCarDashboards)
        }
        case 'jetski': {
          const windshieldColor = engine.currentSaveGame.getColor('c_jswnshy5')
          const windshieldDashboards = getDashboardMap(windshieldColor, jetSkiDashboards)
          const frontColor = engine.currentSaveGame.getColor('c_jsfrnty5')
          return getDashboardMap(frontColor, windshieldDashboards)
        }
        // biome-ignore lint/suspicious/noFallthroughSwitchClause: same as default clause unless it should show a pizza
        case 'skate':
          if (vehicle.showPizza) {
            return SkatePizza_Bitmap
          }
        default:
          return action.children.find(child => child.name.endsWith('Dashboard_Bitmap'))
      }
    })()
    if (dashboardAction != null && isImageAction(dashboardAction)) {
      this._background = createImageSprite(dashboardAction, -1)
      this._render.scene.add(this._background)
    }

    const armsAction = action.children.find(child => child.name.endsWith('Arms_Ctl'))
    if (armsAction == null || !isControlAction(armsAction)) {
      throw new Error('Arms control not found')
    }

    this._armsMask = await Control.create(armsAction)
    this._render.scene.add(this._armsMask.sprite)

    const hornAction = action.children.find(child => child.name.endsWith('Horn_Ctl'))
    if (hornAction != null && isControlAction(hornAction)) {
      this._hornControl = await Control.create(hornAction)
      this._render.scene.add(this._hornControl.sprite)
      this._hornControl.draw()
      const sound = action.children.find(child => isAudioAction(child) && child.name.endsWith('Horn_Sound'))
      if (!isAudioAction(sound)) {
        throw new Error('Horn sound not found')
      }
      this._hornSound = sound
    }

    const infoAction = action.children.find(child => child.name.endsWith('Info_Ctl'))
    if (isControlAction(infoAction)) {
      this._infoControl = await Control.create(infoAction)
      this._render.scene.add(this._infoControl.sprite)
      this._infoControl.draw()
    }
  }

  public clear(): void {
    this._background?.removeFromParent()
    this._armsMask?.sprite.removeFromParent()
    this._hornControl?.sprite.removeFromParent()
    this._infoControl?.sprite.removeFromParent()
    this._speedMeter?.sprite.removeFromParent()
    this._fuelMeter?.sprite.removeFromParent()

    this._hornSound = null
    this._background = null
    this._armsMask = null
    this._hornControl = null
    this._infoControl = null
    this._speedMeter = null
    this._fuelMeter = null
  }

  public update(velocity: number): void {
    this._speedMeter?.draw(velocity)
  }

  public activate(composer: Composer): void {
    composer.add(this._render)
  }
}
