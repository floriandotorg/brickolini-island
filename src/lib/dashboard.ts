import { createAudioBuffer } from './assets'
import { BinaryReader } from './binary-reader'
import type { SIObject } from './si'

export enum Dashboards {
  Bike = 10,
  Helicopter = 21,
  // Jetski = 97,
  MotoBk = 150,
  Ambulance = 160,
  TowTrack = 170,
  // DuneCar = 187,
  Skate = 193,
}

export const dashboardForModel = (modelName: string): Dashboards | undefined => {
  switch (modelName) {
    case 'Bike':
      return Dashboards.Bike
    case 'Helicopter':
      return Dashboards.Helicopter
    // case 'Jetski':
    //   return Dashboards.Jetski
    case 'MotoBk':
      return Dashboards.MotoBk
    case 'Ambul':
      return Dashboards.Ambulance
    case 'Towtk':
      return Dashboards.TowTrack
    // case 'DuneCar':
    //   return Dashboards.DuneCar
    case 'skate':
      return Dashboards.Skate
  }
}

class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
  ) {}

  get isMagenta(): boolean {
    return this.r === 255 && this.g === 0 && this.b === 255
  }
}

class ImageSection {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public image: Color[],
  ) {}

  public worldToSection(x: number, y: number): [number, number] | null {
    if (x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.height) {
      const relativeX = x - this.x
      const relativeY = y - this.y
      return [relativeX, relativeY]
    }
    return null
  }

  public color(x: number, y: number): Color | null {
    const position = this.worldToSection(x, y)
    if (position != null) {
      const index = position[0] + position[1] * this.width
      return this.image[index]
    }
    return null
  }

  public checkClick(x: number, y: number): boolean {
    return this.color(x, y)?.isMagenta === false
  }

  public draw(ctx: CanvasRenderingContext2D, overwriteColor?: (col: number, row: number, color: Color) => Color | null) {
    const data = ctx.getImageData(this.x, this.y, this.width, this.height)
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const srcIndex = row * this.width + col
        let color: Color | null = this.image[srcIndex]
        if (overwriteColor != null) {
          color = overwriteColor(col, row, color)
        }
        if (color != null) {
          const alpha = color.isMagenta ? 0x00 : 0xff
          data.data.set(Uint8Array.of(color.r, color.g, color.b, alpha), srcIndex * 4)
        }
      }
    }
    ctx.putImageData(data, this.x, this.y)
  }
}

type Meter = {
  direction: (x: number, y: number, fill: number) => boolean
  fillColor: Color
  image: ImageSection
}

const zeroAsMax = (value: number, max: number) => {
  return value === 0 ? max : value
}

const loadBitmapWithColors = (obj: SIObject): { image: ImageSection; colors: Color[] } => {
  const reader = new BinaryReader(obj.data.buffer)
  // data starts with the DIB Header
  if (reader.readUint32() !== 40) {
    throw new Error('Invalid header size')
  }
  const width = reader.readInt32()
  const height = reader.readInt32()
  reader.readUint16() // Planes
  const bitsPerPixel = reader.readUint16()
  if (bitsPerPixel !== 8) {
    throw new Error(`Unsupported "bitsPerPixel" of ${bitsPerPixel}`)
  }
  reader.readUint32() // Compression
  reader.readUint32() // SizeImage
  reader.readUint32() // XPelsPerMeter
  reader.readUint32() // YPelsPerMeter
  const clrUsd = zeroAsMax(reader.readUint32(), 2 ** bitsPerPixel)
  zeroAsMax(reader.readUint32(), 2 ** bitsPerPixel) // ClrImportant

  const colors: Color[] = []
  for (let i = 0; i < clrUsd; i++) {
    const b = reader.readUint8()
    const g = reader.readUint8()
    const r = reader.readUint8()
    reader.readUint8()
    colors.push(new Color(r, g, b))
  }

  reader.seek(obj.chunkSizes[0])

  const bitsPerRow = width * bitsPerPixel

  const image = new Array<Color>(width * height)
  // if each row is not a multiple of 4 bytes make it
  const pad = (4 - (Math.ceil(bitsPerRow / 8) % 4)) % 4
  for (let row = height - 1; row >= 0; row--) {
    for (let col = 0; col < width; col++) {
      const colorIndex = reader.readUint8()
      const color: Color = colors[colorIndex]
      image[row * width + col] = color
    }
    if (pad > 0) {
      reader.skip(pad)
    }
  }

  return {
    image: new ImageSection(obj.location[0], obj.location[1], width, height, image),
    colors,
  }
}

const leftToRight = (x: number, _: number, fill: number): boolean => {
  return x < fill
}

const rightToLeft = (x: number, _: number, fill: number): boolean => {
  return x > fill
}

const bottomToTop = (_: number, y: number, fill: number): boolean => {
  return y > fill
}

const topToBottom = (_: number, y: number, fill: number): boolean => {
  return y < fill
}

const parseDirection = (value: string): ((x: number, _: number, fill: number) => boolean) => {
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

export class Dashboard {
  private readonly _background: ImageSection
  private readonly _speedMeter: Meter | null
  private readonly _fuelMeter: Meter | null
  private readonly _hornButton: {
    image: ImageSection
    imagePressed: ImageSection
    sound: AudioBuffer
    node: AudioBufferSourceNode | null
    pressed: boolean
  } | null
  private readonly _infoButton: ImageSection | null
  private readonly _arms: ImageSection
  private readonly _canvasContext: CanvasRenderingContext2D
  private readonly _audioContext: AudioContext

  private constructor(obj: SIObject, canvasContext: CanvasRenderingContext2D, audioContext: AudioContext, hornSound: AudioBuffer | null, background?: SIObject) {
    // TODO: Determine background object, might not be the first children (e.g. jetskis)
    // TODO: Determine how the other controls are determined
    this._background = loadBitmapWithColors(background ?? obj.children[0]).image
    this._canvasContext = canvasContext
    this._audioContext = audioContext

    this._speedMeter = null
    this._fuelMeter = null
    for (const child of obj.children) {
      if (child.presenter === 'LegoMeterPresenter') {
        const directionValue = child.extraValues.find('type')
        if (!directionValue) {
          console.log(`no direction for meter '${child.name}' defined`)
        }
        const direction = directionValue ? parseDirection(directionValue) : leftToRight
        const fillerIndex = child.extraValues.find('filler_index') ?? '1'
        const { image, colors } = loadBitmapWithColors(child)
        const fillColor = colors[Number.parseInt(fillerIndex)]
        const meter = { direction, fillColor, image }
        const variable = child.extraValues.find('variable')?.toLowerCase()
        if (!variable) {
          console.log(`no variable for meter '${child.name}' defined`)
        } else if (variable.endsWith('speed')) {
          if (this._speedMeter) {
            console.log(`speed meter already defined, ignoring '${child.name}'`)
          } else {
            this._speedMeter = meter
          }
        } else if (variable.endsWith('fuel')) {
          if (this._fuelMeter) {
            console.log(`fuel meter already defined, ignoring '${child.name}'`)
          } else {
            this._fuelMeter = meter
          }
        } else {
          console.log(`unknown variable '${variable}' defined for '${child.name}'`)
        }
      }
    }

    const hornCtl = obj.children.find(child => child.name.toLowerCase().endsWith('horn_ctl'))
    if (hornCtl != null) {
      if (hornSound == null) {
        throw new Error('Horn control defined without sound')
      }
      // Horn_Ctl
      //  - HornUp_Bitmap <!-- default image here + location
      //  - HornDown
      //    - HornDown_Bitmap <!-- pressed image here + location
      const defaultImageObject = hornCtl.children.find(child => child.name.toLowerCase().endsWith('hornup_bitmap'))
      if (defaultImageObject == null) {
        throw new Error('Default horn bitmap missing')
      }
      const pressedImageObject = hornCtl.children.find(child => child.name.toLowerCase().endsWith('horndown'))?.children.find(child => child.name.toLowerCase().endsWith('horndown_bitmap'))
      if (pressedImageObject == null) {
        throw new Error('Pressed horn bitmap missing')
      }
      this._hornButton = {
        image: loadBitmapWithColors(defaultImageObject).image,
        imagePressed: loadBitmapWithColors(pressedImageObject).image,
        sound: hornSound,
        node: null,
        pressed: false,
      }
    } else if (hornSound != null) {
      throw new Error('Horn sound defined without control')
    } else {
      this._hornButton = null
    }
    const info = obj.children.find(child => child.name.toLowerCase().endsWith('info_ctl'))?.children[0]
    this._infoButton = info ? loadBitmapWithColors(info).image : null
    const arms = obj.children.find(child => child.name.toLowerCase().endsWith('arms_ctl'))?.children[0]
    if (arms == null) {
      throw new Error('Arms not set')
    }
    this._arms = loadBitmapWithColors(arms).image
  }

  public static async create(obj: SIObject, canvasContext: CanvasRenderingContext2D, audioContext: AudioContext, background?: SIObject): Promise<Dashboard> {
    const hornSound = obj.children.find(child => child.name.toLowerCase().endsWith('horn_sound'))
    const hornAudioBuffer = hornSound != null ? await createAudioBuffer(hornSound, audioContext) : null
    return new Dashboard(obj, canvasContext, audioContext, hornAudioBuffer, background)
  }

  private _drawWithBackground(image: ImageSection) {
    image.draw(this._canvasContext, (col, row, color) => {
      if (color.isMagenta) {
        const absoluteX = image.x + col
        const absoluteY = image.y + row
        const backgroundColor = this._background.color(absoluteX, absoluteY)
        if (backgroundColor) {
          return backgroundColor
        }
      }
      return color
    })
  }

  public mouseUp() {
    if (this._hornButton != null) {
      this._hornButton.pressed = false
      this.drawBackground()
    }
  }

  public checkClick(x: number, y: number): boolean {
    const pixelX = Math.round(x)
    const pixelY = Math.round(y)
    if (this._hornButton?.image.checkClick(pixelX, pixelY) === true) {
      console.log('honk')
      if (this._hornButton.node == null) {
        this._hornButton.node = this._audioContext.createBufferSource()
        this._hornButton.node.buffer = this._hornButton.sound
        this._hornButton.node.connect(this._audioContext.destination)
        this._hornButton.node.onended = () => {
          if (this._hornButton) {
            this._hornButton.node = null
          }
        }
        this._hornButton.node.start()
      }
      this._hornButton.pressed = true
      this.drawBackground()
      return false
    }
    if (this._infoButton?.checkClick(pixelX, pixelY) === true) {
      console.log('info')
      return false
    }
    if (this._arms.checkClick(pixelX, pixelY)) {
      console.log('exit')
      return true
    }
    console.log('none')
    return false
  }

  public drawBackground() {
    this.clear()
    this._background.draw(this._canvasContext)
    if (this._hornButton != null) {
      this._drawWithBackground(this._hornButton.pressed ? this._hornButton.imagePressed : this._hornButton.image)
    }
  }

  public clear() {
    this._canvasContext.clearRect(0, 0, this._canvasContext.canvas.width, this._canvasContext.canvas.height)
  }

  private _drawMeter(meter: Meter, ctx: CanvasRenderingContext2D, fill: number) {
    meter.image.draw(ctx, (col, row, color) => {
      if (!color.isMagenta) {
        const x = col / meter.image.width
        const y = row / meter.image.height
        if (meter.direction(x, y, fill)) {
          return meter.fillColor
        }
        return color
      }
      return null
    })
  }

  public drawMeters(speed: number, fuel: number, ctx: CanvasRenderingContext2D) {
    if (this._speedMeter) {
      this._drawMeter(this._speedMeter, ctx, speed)
    }
    if (this._fuelMeter) {
      this._drawMeter(this._fuelMeter, ctx, fuel)
    }
  }
}
