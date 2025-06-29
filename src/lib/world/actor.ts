import * as THREE from 'three'
import { calculateTransformationMatrix, getPart } from '../assets'
import { colorAliases } from '../assets/mesh'

enum Flags {
  UseColor = 1,
  UseTexture = 2,
}

const BODY_PARTS: {
  [key in 'top' | 'body' | 'hat' | 'groin' | 'head' | 'arm-lft' | 'arm-rt' | 'claw-lft' | 'claw-rt' | 'leg-lft' | 'leg-rt']: {
    flags: number
    boundingSphere: [number, number, number, number]
    boundingBox: [number, number, number, number, number, number]
    pos: [number, number, number]
    dir: [number, number, number]
    up: [number, number, number]
  }
} = {
  top: {
    flags: Flags.UseColor,
    boundingSphere: [0.000267, 0.780808, -0.01906, 0.951612],
    boundingBox: [-0.461166, -0.002794, -0.299442, 0.4617, 1.56441, 0.261321],
    pos: [0.0, 0.0, 0.0],
    dir: [0.0, 1.0, 0.0],
    up: [1.0, 0.0, 1.0],
  },
  body: {
    flags: Flags.UseTexture,
    boundingSphere: [0.00158332, 0.401828, -0.00048697, 0.408071],
    boundingBox: [-0.287507, 0.150419, -0.147452, 0.289219, 0.649774, 0.14258],
    pos: [-0.00089, 0.436353, 0.007277],
    dir: [0.0, 0.0, 1.0],
    up: [0.0, 1.0, 0.0],
  },
  hat: {
    flags: Flags.UseColor,
    boundingSphere: [0.0, -0.00938, -0.01955, 0.35],
    boundingBox: [-0.231822, -0.140237, -0.320954, 0.234149, 0.076968, 0.249083],
    pos: [0.000191, 1.519793, 0.001767],
    dir: [0.0, 0.0, 1.0],
    up: [0.0, 1.0, 0.0],
  },
  groin: {
    flags: Flags.UseTexture,
    boundingSphere: [0.0, 0.11477, 0.00042, 0.26],
    boundingBox: [-0.285558, -0.134391, -0.142231, 0.285507, 0.152986, 0.143071],
    pos: [-0.00089, 0.436353, 0.007277],
    dir: [0.0, 0.0, 1.0],
    up: [0.0, 1.0, 0.0],
  },
  head: {
    flags: Flags.UseTexture,
    boundingSphere: [0.0, -0.03006, 0.0, 0.3],
    boundingBox: [-0.189506, -0.209665, -0.189824, 0.189532, 0.228822, 0.194945],
    pos: [-0.00105, 1.293115, 0.001781],
    dir: [0.0, 0.0, 1.0],
    up: [0.0, 1.0, 0.0],
  },
  'arm-lft': {
    flags: 2,
    boundingSphere: [-0.06815, -0.0973747, 0.0154655, 0.237],
    boundingBox: [-0.137931, -0.282775, -0.105316, 0.000989, 0.100221, 0.140759],
    pos: [-0.225678, 0.963312, 0.023286],
    dir: [-0.003031, -0.017187, 0.999848],
    up: [0.173622, 0.984658, 0.017453],
  },
  'arm-rt': {
    flags: Flags.UseTexture,
    boundingSphere: [0.0680946, -0.097152, 0.0152722, 0.237],
    boundingBox: [0.00141, -0.289604, -0.100831, 0.138786, 0.09291, 0.145437],
    pos: [0.223494, 0.963583, 0.018302],
    dir: [0.0, 0.0, 1.0],
    up: [-0.173648, 0.984808, 0.0],
  },
  'claw-lft': {
    flags: Flags.UseTexture,
    boundingSphere: [0.000773381, -0.101422, -0.0237761, 0.15],
    boundingBox: [-0.089838, -0.246208, -0.117735, 0.091275, 0.000263, 0.07215],
    pos: [-0.341869, 0.700355, 0.092779],
    dir: [0.000001, 0.000003, 1.0],
    up: [0.190812, 0.981627, -0.000003],
  },
  'claw-rt': {
    flags: Flags.UseTexture,
    boundingSphere: [0.000773381, -0.101422, -0.0237761, 0.15],
    boundingBox: [-0.095016, -0.245349, -0.117979, 0.086528, 0.00067, 0.069743],
    pos: [0.343317, 0.69924, 0.096123],
    dir: [0.00606, -0.034369, 0.999391],
    up: [-0.190704, 0.981027, 0.034894],
  },
  'leg-lft': {
    flags: Flags.UseTexture,
    boundingSphere: [0.00433584, -0.177404, -0.0313928, 0.33],
    boundingBox: [-0.129782, -0.440428, -0.184207, 0.13817, 0.118415, 0.122607],
    pos: [-0.156339, 0.436087, 0.006822],
    dir: [0.0, 0.0, 1.0],
    up: [0.0, 1.0, 0.0],
  },
  'leg-rt': {
    flags: Flags.UseTexture,
    boundingSphere: [0.00433584, -0.177404, -0.0313928, 0.33],
    boundingBox: [-0.132864, -0.437138, -0.183944, 0.134614, 0.12043, 0.121888],
    pos: [0.151154, 0.436296, 0.007373],
    dir: [0.0, 0.0, 1.0],
    up: [0.0, 1.0, 0.0],
  },
}
type Name = 'pepper' | 'mama' | 'papa' | 'nick' | 'laura' | 'infoman' | 'brickstr' | 'studs' | 'rhoda' | 'valerie' | 'snap' | 'pt' | 'mg' | 'bu' | 'ml'

// spellchecker: disable

enum HatPart {
  Baseball = 'baseball',
  Chef = 'chef',
  Cap = 'cap',
  CopHat = 'cophat',
  Helmet = 'helmet',
  Ponytail = 'ponytail',
  Pageboy = 'pageboy',
  Shrthair = 'shrthair',
  Bald = 'bald',
  Flower = 'flower',
  Cboyhat = 'cboyhat',
  Cuphat = 'cuphat',
  Cathat = 'cathat',
  Backbcap = 'backbcap',
  Pizhat = 'pizhat',
  Caprc = 'caprc',
  Capch = 'capch',
  Capdb = 'capdb',
  Capjs = 'capjs',
  Capmd = 'capmd',
  Sheet = 'sheet',
  Phat = 'phat',
  Icap = 'icap',
}

const HAT_PARTS = [
  HatPart.Baseball,
  HatPart.Chef,
  HatPart.Cap,
  HatPart.CopHat,
  HatPart.Helmet,
  HatPart.Ponytail,
  HatPart.Pageboy,
  HatPart.Shrthair,
  HatPart.Bald,
  HatPart.Flower,
  HatPart.Cboyhat,
  HatPart.Cuphat,
  HatPart.Cathat,
  HatPart.Backbcap,
  HatPart.Pizhat,
  HatPart.Caprc,
  HatPart.Capch,
  HatPart.Capdb,
  HatPart.Capjs,
  HatPart.Capmd,
  HatPart.Sheet,
  HatPart.Phat,
  HatPart.Icap,
]

const PEPPER_HAT_PARTS = [HatPart.Phat, ...HAT_PARTS]

const INFOMAN_HAT_PARTS = [HatPart.Icap]

const _GHOST_HAT_PARTS = [HatPart.Sheet]

enum BodyPart {
  Body = 'body',
  BodyRed = 'bodyred',
  BodyBlack = 'bodyblck',
  BodyWhite = 'bodywhte',
  BodyYellow = 'bodyyllw',
  BodyBlue = 'bodyblue',
  BodyGren = 'bodygren',
  BodyBrwn = 'bodybrwn',
}

enum ChestTexture {
  Pepper = 'peprchst.gif',
  Mama = 'mamachst.gif',
  Papa = 'papachst.gif',
  Nick = 'nickchst.gif',
  Nora = 'norachst.gif',
  Info = 'infochst.gif',
  Shft = 'shftchst.gif',
  Rac1 = 'rac1chst.gif',
  Rac2 = 'rac2chst.gif',
  Bth1 = 'bth1chst.gif',
  Bth2 = 'bth2chst.gif',
  Mech = 'mech.gif',
  Polkadot = 'polkadot.gif',
  Bowtie = 'bowtie.gif',
  Post = 'postchst.gif',
  Vest = 'vest.gif',
  Doctor = 'doctor.gif',
  Cop = 'copchest.gif',
  L = 'l.gif',
  E = 'e.gif',
  G = 'g.gif',
  O = 'o.gif',
  Fruit = 'fruit.gif',
  Flowers = 'flowers.gif',
  Construct = 'construct.gif',
  Paint = 'paint.gif',
}

enum FaceTexture {
  Pepper = 'peprface.gif',
  Mama = 'mamaface.gif',
  Papa = 'papaface.gif',
  Nick = 'nickface.gif',
  Nora = 'noraface.gif',
  Info = 'infoface.gif',
  Shft = 'shftface.gif',
  Dog = 'dogface.gif',
  WomanShd = 'womanshd.gif',
  SmileShd = 'smileshd.gif',
  Woman = 'woman.gif',
  Smile = 'smile.gif',
  Mustache = 'mustache.gif',
  Black = 'black.gif',
}

// spellchecker: enable

enum Color {
  White = 'lego white',
  Black = 'lego black',
  Yellow = 'lego yellow',
  Red = 'lego red',
  Blue = 'lego blue',
  Brown = 'lego brown',
  LightGray = 'lego lt grey',
  Green = 'lego green',
}

const COLOR = [Color.White, Color.Black, Color.Yellow, Color.Red, Color.Blue, Color.Brown, Color.LightGray, Color.Green]

const ACTORS: {
  [key in Name]: {
    bodyPart: BodyPart
    hatParts: HatPart[]
    hatPart: number
    hatColor: number
    body: ChestTexture | Color
    faceTexture: FaceTexture
    groinColor: number
    leftArmColor: number
    rightArmColor: number
    leftClawColor: string
    rightClawColor: string
    leftLegColor: number
    rightLegColor: number
  }
} = {
  pepper: {
    bodyPart: BodyPart.BodyRed,
    hatParts: PEPPER_HAT_PARTS,
    hatPart: 0,
    hatColor: 0,
    body: ChestTexture.Pepper,
    faceTexture: FaceTexture.Pepper,
    groinColor: 4,
    leftArmColor: 3,
    rightArmColor: 3,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 4,
    rightLegColor: 4,
  },
  mama: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 1,
    hatColor: 0,
    body: ChestTexture.Mama,
    faceTexture: FaceTexture.Mama,
    groinColor: 0,
    leftArmColor: 3,
    rightArmColor: 3,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 0,
    rightLegColor: 0,
  },
  papa: {
    bodyPart: BodyPart.BodyBlack,
    hatParts: HAT_PARTS,
    hatPart: 1,
    hatColor: 0,
    body: ChestTexture.Papa,
    faceTexture: FaceTexture.Papa,
    groinColor: 1,
    leftArmColor: 0,
    rightArmColor: 0,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 1,
    rightLegColor: 1,
  },
  nick: {
    bodyPart: BodyPart.BodyBlack,
    hatParts: HAT_PARTS,
    hatPart: 3,
    hatColor: 1,
    body: ChestTexture.Nick,
    faceTexture: FaceTexture.Nick,
    groinColor: 4,
    leftArmColor: 1,
    rightArmColor: 1,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 4,
    rightLegColor: 4,
  },
  laura: {
    bodyPart: BodyPart.BodyBlack,
    hatParts: HAT_PARTS,
    hatPart: 3,
    hatColor: 1,
    body: ChestTexture.Nora,
    faceTexture: FaceTexture.Nora,
    groinColor: 4,
    leftArmColor: 1,
    rightArmColor: 1,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 4,
    rightLegColor: 4,
  },
  infoman: {
    bodyPart: BodyPart.BodyRed,
    hatParts: INFOMAN_HAT_PARTS,
    hatPart: 0,
    hatColor: 3,
    body: ChestTexture.Info,
    faceTexture: FaceTexture.Info,
    groinColor: 0,
    leftArmColor: 1,
    rightArmColor: 1,
    leftClawColor: Color.White,
    rightClawColor: Color.White,
    leftLegColor: 0,
    rightLegColor: 0,
  },
  brickstr: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 13,
    hatColor: 1,
    body: ChestTexture.Shft,
    faceTexture: FaceTexture.Shft,
    groinColor: 1,
    leftArmColor: 0,
    rightArmColor: 0,
    leftClawColor: Color.White,
    rightClawColor: Color.Blue,
    leftLegColor: 1,
    rightLegColor: 1,
  },
  studs: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 4,
    hatColor: 1,
    body: ChestTexture.Rac1,
    faceTexture: FaceTexture.Dog,
    groinColor: 1,
    leftArmColor: 0,
    rightArmColor: 0,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 1,
    rightLegColor: 1,
  },
  rhoda: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 4,
    hatColor: 3,
    body: ChestTexture.Rac2,
    faceTexture: FaceTexture.WomanShd,
    groinColor: 1,
    leftArmColor: 3,
    rightArmColor: 3,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 1,
    rightLegColor: 1,
  },
  valerie: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: 3,
    body: ChestTexture.Bth1,
    faceTexture: FaceTexture.WomanShd,
    groinColor: 3,
    leftArmColor: 2,
    rightArmColor: 2,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 2,
    rightLegColor: 2,
  },
  snap: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: 4,
    body: ChestTexture.Bth2,
    faceTexture: FaceTexture.SmileShd,
    groinColor: 1,
    leftArmColor: 2,
    rightArmColor: 2,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 2,
    rightLegColor: 2,
  },
  pt: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 6,
    hatColor: 1,
    body: ChestTexture.Mech,
    faceTexture: FaceTexture.WomanShd,
    groinColor: 1,
    leftArmColor: 4,
    rightArmColor: 4,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 1,
    rightLegColor: 1,
  },
  mg: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 6,
    hatColor: 5,
    body: ChestTexture.Polkadot,
    faceTexture: FaceTexture.Woman,
    groinColor: 4,
    leftArmColor: 0,
    rightArmColor: 0,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 4,
    rightLegColor: 4,
  },
  bu: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: 5,
    body: ChestTexture.Bowtie,
    faceTexture: FaceTexture.Smile,
    groinColor: 5,
    leftArmColor: 0,
    rightArmColor: 0,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 5,
    rightLegColor: 5,
  },
  ml: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 2,
    hatColor: 4,
    body: ChestTexture.Post,
    faceTexture: FaceTexture.Mustache,
    groinColor: 1,
    leftArmColor: 4,
    rightArmColor: 4,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: 1,
    rightLegColor: 1,
  },
}

export class Actor {
  private _mesh: THREE.Mesh = new THREE.Mesh()

  public get mesh() {
    return this._mesh
  }

  static async create(name: Name): Promise<Actor> {
    const actor = new Actor()
    actor.mesh.name = name

    for (const [partName, part] of Object.entries(BODY_PARTS)) {
      if (partName === 'top') {
        continue
      }

      const info = ACTORS[name]

      const mesh = await (() => {
        switch (partName) {
          case 'hat':
            return getPart(info.hatParts[info.hatPart], colorAliases[COLOR[info.hatColor]], null)
          case 'body': {
            // biome-ignore lint/suspicious/noExplicitAny: needed here
            const isColor = Object.values(COLOR).includes(info.body as any)
            return getPart(info.bodyPart, isColor ? null : colorAliases[info.body], isColor ? null : info.body)
          }
          case 'groin':
            return getPart('infogron', colorAliases[COLOR[info.groinColor]], null)
          case 'head':
            console.log(info.faceTexture)
            return getPart('head', null, info.faceTexture)
          case 'arm-lft':
            return getPart('arm-lft', colorAliases[COLOR[info.leftArmColor]], null)
          case 'arm-rt':
            return getPart('arm-rt', colorAliases[COLOR[info.rightArmColor]], null)
          case 'claw-lft':
            return getPart('claw-lft', colorAliases[info.leftClawColor], null)
          case 'claw-rt':
            return getPart('claw-lft', colorAliases[info.rightClawColor], null)
          case 'leg-lft':
            return getPart('leg', colorAliases[COLOR[info.leftLegColor]], null)
          case 'leg-rt':
            return getPart('leg', colorAliases[COLOR[info.rightLegColor]], null)
        }
        throw new Error(`Unknown part: ${partName}`)
      })()

      const parentMesh = new THREE.Mesh()
      parentMesh.name = partName
      parentMesh.add(mesh)
      actor.mesh.add(parentMesh)

      const matrix = calculateTransformationMatrix(part.pos, part.dir, part.up)
      matrix.decompose(parentMesh.position, parentMesh.quaternion, parentMesh.scale)
    }

    return actor
  }
}
