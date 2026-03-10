import * as THREE from 'three'
import {
  CNs0x4Ma,
  CNs0x4Pa,
  CNs001Bd,
  CNs001Br,
  CNs001La,
  CNs001Ma,
  CNs001Ni,
  CNs001Pa,
  CNs001Pe,
  CNs001Pg,
  CNs001Rd,
  CNs001Sk,
  CNs001Sy,
  CNs001xx,
  CNs002Br,
  CNs002La,
  CNs002Ma,
  CNs002Ni,
  CNs002Pa,
  CNs002Pe,
  CNs002xx,
  CNs003Br,
  CNs003La,
  CNs003Ma,
  CNs003Ni,
  CNs003Pa,
  CNs003Pe,
  CNs003xx,
  CNs004Br,
  CNs004La,
  CNs004Ma,
  CNs004Ni,
  CNs004Pa,
  CNs004Pe,
  CNs004xx,
  CNs005Br,
  CNs005La,
  CNs005Ma,
  CNs005Ni,
  CNs005Pa,
  CNs005Pe,
  CNs005xx,
  CNs006Br,
  CNs006La,
  CNs006Ma,
  CNs006Ni,
  CNs006Pa,
  CNs006Pe,
  CNs006xx,
  CNs007Br,
  CNs007La,
  CNs007Ma,
  CNs007Ni,
  CNs007Pa,
  CNs007Pe,
  CNs007xx,
  CNs008Br,
  CNs008La,
  CNs008Ma,
  CNs008Ni,
  CNs008Pa,
  CNs008Pe,
  CNs008xx,
  CNs009Br,
  CNs009La,
  CNs009Ma,
  CNs009Ni,
  CNs009Pa,
  CNs009Pe,
  CNs009xx,
  CNs010Br,
  CNs010La,
  CNs010Ma,
  CNs010Ni,
  CNs010Pa,
  CNs010Pe,
  CNs010xx,
  CNs011Br,
  CNs011La,
  CNs011Ma,
  CNs011Ni,
  CNs011Pa,
  CNs011xx,
  CNs012Br,
  CNs012Ma,
  CNs012Pa,
  CNs012xx,
  CNs013Br,
  CNs013Ma,
  CNs013Pa,
  CNs014Br,
  CNs900Br,
  CNs901BR,
  CNsx11La,
  CNsx11Ni,
} from '../../actions/isle'
import { Sound10 } from '../../actions/sndanim'
import { colorAliases } from '../assets/mesh'
import { calculateTransformationMatrix, getGlobalPart, Roi3D, RoiModel } from '../assets/model'
import { engine } from '../engine'
import type { World } from './world'

enum Flags {
  UseColor = 1,
  UseTexture = 2,
}

export const CHARACTER_CYCLES = {
  generic: [CNs001xx, CNs002xx, CNs003xx, CNs004xx, CNs005xx, CNs007xx, CNs006xx, CNs008xx, CNs009xx, CNs010xx, CNs011xx, CNs012xx],
  pepper: [CNs001Pe, CNs002Pe, CNs003Pe, CNs004Pe, CNs005Pe, CNs007Pe, CNs006Pe, CNs008Pe, CNs009Pe, CNs010Pe, CNs001Sk],
  mama: [CNs001Ma, CNs002Ma, CNs003Ma, CNs004Ma, CNs005Ma, CNs007Ma, CNs006Ma, CNs008Ma, CNs009Ma, CNs010Ma, CNs0x4Ma, null, null, CNs011Ma, CNs012Ma, CNs013Ma],
  papa: [CNs001Pa, CNs002Pa, CNs003Pa, CNs004Pa, CNs005Pa, CNs007Pa, CNs006Pa, CNs008Pa, CNs009Pa, CNs010Pa, CNs0x4Pa, null, null, CNs011Pa, CNs012Pa, CNs013Pa],
  nick: [CNs001Ni, CNs002Ni, CNs003Ni, CNs004Ni, CNs005Ni, CNs007Ni, CNs006Ni, CNs008Ni, CNs009Ni, CNs010Ni, CNs011Ni, CNsx11Ni],
  laura: [CNs001La, CNs002La, CNs003La, CNs004La, CNs005La, CNs007La, CNs006La, CNs008La, CNs009La, CNs010La, CNs011La, CNsx11La],
  brickstr: [CNs001Br, CNs002Br, CNs003Br, CNs004Br, CNs005Br, CNs007Br, CNs006Br, CNs008Br, CNs009Br, CNs010Br, CNs011Br, CNs900Br, CNs901BR, CNs011Br, CNs012Br, CNs013Br, CNs014Br],
  bd: [CNs001xx, CNs002xx, CNs003xx, CNs004xx, CNs005xx, CNs007xx, CNs006xx, CNs008xx, CNs009xx, CNs010xx, CNs001Bd, CNs012xx],
  pg: [CNs001xx, CNs002xx, CNs003xx, CNs004xx, CNs005xx, CNs007xx, CNs006xx, CNs008xx, CNs009xx, CNs010xx, CNs001Pg, CNs012xx],
  rd: [CNs001xx, CNs002xx, CNs003xx, CNs004xx, CNs005xx, CNs007xx, CNs006xx, CNs008xx, CNs009xx, CNs010xx, CNs001Rd, CNs012xx],
  sy: [CNs001xx, CNs002xx, CNs003xx, CNs004xx, CNs005xx, CNs007xx, CNs006xx, CNs008xx, CNs009xx, CNs010xx, CNs001Sy, CNs012xx],
}

const BODY_PARTS: {
  [key in 'top' | 'body' | 'infohat' | 'infogron' | 'head' | 'arm-lft' | 'arm-rt' | 'claw-lft' | 'claw-rt' | 'leg-lft' | 'leg-rt']: {
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
    pos: [-0.0, 0.0, 0.0],
    dir: [-0.0, 1.0, 0.0],
    up: [-1.0, 0.0, 1.0],
  },
  body: {
    flags: Flags.UseTexture,
    boundingSphere: [0.00158332, 0.401828, -0.00048697, 0.408071],
    boundingBox: [-0.287507, 0.150419, -0.147452, 0.289219, 0.649774, 0.14258],
    pos: [0.00089, 0.436353, 0.007277],
    dir: [-0.0, 0.0, 1.0],
    up: [-0.0, 1.0, 0.0],
  },
  infohat: {
    flags: Flags.UseColor,
    boundingSphere: [0.0, -0.00938, -0.01955, 0.35],
    boundingBox: [-0.231822, -0.140237, -0.320954, 0.234149, 0.076968, 0.249083],
    pos: [-0.000191, 1.519793, 0.001767],
    dir: [-0.0, 0.0, 1.0],
    up: [-0.0, 1.0, 0.0],
  },
  infogron: {
    flags: Flags.UseTexture,
    boundingSphere: [0.0, 0.11477, 0.00042, 0.26],
    boundingBox: [-0.285558, -0.134391, -0.142231, 0.285507, 0.152986, 0.143071],
    pos: [0.00089, 0.436353, 0.007277],
    dir: [-0.0, 0.0, 1.0],
    up: [-0.0, 1.0, 0.0],
  },
  head: {
    flags: Flags.UseTexture,
    boundingSphere: [0.0, -0.03006, 0.0, 0.3],
    boundingBox: [-0.189506, -0.209665, -0.189824, 0.189532, 0.228822, 0.194945],
    pos: [0.00105, 1.293115, 0.001781],
    dir: [-0.0, 0.0, 1.0],
    up: [-0.0, 1.0, 0.0],
  },
  'arm-lft': {
    flags: 2,
    boundingSphere: [-0.06815, -0.0973747, 0.0154655, 0.237],
    boundingBox: [-0.137931, -0.282775, -0.105316, 0.000989, 0.100221, 0.140759],
    pos: [0.225678, 0.963312, 0.023286],
    dir: [0.003031, -0.017187, 0.999848],
    up: [-0.173622, 0.984658, 0.017453],
  },
  'arm-rt': {
    flags: Flags.UseTexture,
    boundingSphere: [0.0680946, -0.097152, 0.0152722, 0.237],
    boundingBox: [0.00141, -0.289604, -0.100831, 0.138786, 0.09291, 0.145437],
    pos: [-0.223494, 0.963583, 0.018302],
    dir: [-0.0, 0.0, 1.0],
    up: [0.173648, 0.984808, 0.0],
  },
  'claw-lft': {
    flags: Flags.UseTexture,
    boundingSphere: [0.000773381, -0.101422, -0.0237761, 0.15],
    boundingBox: [-0.089838, -0.246208, -0.117735, 0.091275, 0.000263, 0.07215],
    pos: [0.341869, 0.700355, 0.092779],
    dir: [-0.000001, 0.000003, 1.0],
    up: [-0.190812, 0.981627, -0.000003],
  },
  'claw-rt': {
    flags: Flags.UseTexture,
    boundingSphere: [0.000773381, -0.101422, -0.0237761, 0.15],
    boundingBox: [-0.095016, -0.245349, -0.117979, 0.086528, 0.00067, 0.069743],
    pos: [-0.343317, 0.69924, 0.096123],
    dir: [-0.00606, -0.034369, 0.999391],
    up: [0.190704, 0.981027, 0.034894],
  },
  'leg-lft': {
    flags: Flags.UseTexture,
    boundingSphere: [0.00433584, -0.177404, -0.0313928, 0.33],
    boundingBox: [-0.129782, -0.440428, -0.184207, 0.13817, 0.118415, 0.122607],
    pos: [0.156339, 0.436087, 0.006822],
    dir: [-0.0, 0.0, 1.0],
    up: [-0.0, 1.0, 0.0],
  },
  'leg-rt': {
    flags: Flags.UseTexture,
    boundingSphere: [0.00433584, -0.177404, -0.0313928, 0.33],
    boundingBox: [-0.132864, -0.437138, -0.183944, 0.134614, 0.12043, 0.121888],
    pos: [-0.151154, 0.436296, 0.007373],
    dir: [-0.0, 0.0, 1.0],
    up: [-0.0, 1.0, 0.0],
  },
}

export type Name =
  | 'pepper'
  | 'mama'
  | 'papa'
  | 'nick'
  | 'laura'
  | 'infoman'
  | 'brickstr'
  | 'studs'
  | 'rhoda'
  | 'valerie'
  | 'snap'
  | 'pt'
  | 'mg'
  | 'bu'
  | 'ml'
  | 'nu'
  | 'na'
  | 'cl'
  | 'en'
  | 're'
  | 'ro'
  | 'd1'
  | 'd2'
  | 'd3'
  | 'd4'
  | 'l1'
  | 'l2'
  | 'l3'
  | 'l4'
  | 'l5'
  | 'l6'
  | 'b1'
  | 'b2'
  | 'b3'
  | 'b4'
  | 'cm'
  | 'gd'
  | 'rd'
  | 'pg'
  | 'bd'
  | 'sy'
  | 'gn'
  | 'df'
  | 'bs'
  | 'lt'
  | 'st'
  | 'bm'
  | 'jk'
  | 'ghost'
  | 'ghost01'
  | 'ghost02'
  | 'ghost03'
  | 'ghost04'
  | 'ghost05'
  | 'hg'
  | 'pntgy'
  | 'pep'
  | 'cop01'
  | 'actor_01'
  | 'actor_02'
  | 'actor_03'
  | 'actor_04'
  | 'actor_05'
  | 'btmncycl'
  | 'cboycycl'
  | 'boatman'

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

const GHOST_HAT_PARTS = [HatPart.Sheet]

enum BodyPart {
  Body = 'body',
  BodyRed = 'bodyred',
  BodyBlack = 'bodyblck',
  BodyWhite = 'bodywhte',
  BodyYellow = 'bodyyllw',
  BodyBlue = 'bodyblue',
  BodyGreen = 'bodygren',
  BodyBrown = 'bodybrwn',
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
  Unknown = 'unkchst.gif',
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

const nextColor = (color: Color) => {
  switch (color) {
    case Color.White:
      return Color.Black
    case Color.Black:
      return Color.Yellow
    case Color.Yellow:
      return Color.Red
    case Color.Red:
      return Color.Blue
    case Color.Blue:
      return Color.Brown
    case Color.Brown:
      return Color.LightGray
    case Color.LightGray:
      return Color.Green
    case Color.Green:
      return Color.White
  }
}

export const ACTORS: {
  [key in Name]: {
    bodyPart: BodyPart
    hatParts: HatPart[]
    hatPart: number
    hatColor: Color
    body: { texture: ChestTexture } | { color: Color }
    faceTexture: FaceTexture
    groinColor: Color
    leftArmColor: Color
    rightArmColor: Color
    leftClawColor: Color
    rightClawColor: Color
    leftLegColor: Color
    rightLegColor: Color
  }
} = {
  pepper: {
    bodyPart: BodyPart.BodyRed,
    hatParts: PEPPER_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { texture: ChestTexture.Pepper },
    faceTexture: FaceTexture.Pepper,
    groinColor: Color.Blue,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  mama: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 1,
    hatColor: Color.White,
    body: { texture: ChestTexture.Mama },
    faceTexture: FaceTexture.Mama,
    groinColor: Color.White,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  papa: {
    bodyPart: BodyPart.BodyBlack,
    hatParts: HAT_PARTS,
    hatPart: 1,
    hatColor: Color.White,
    body: { texture: ChestTexture.Papa },
    faceTexture: FaceTexture.Papa,
    groinColor: Color.Black,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  nick: {
    bodyPart: BodyPart.BodyBlack,
    hatParts: HAT_PARTS,
    hatPart: 3,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Nick },
    faceTexture: FaceTexture.Nick,
    groinColor: Color.Blue,
    leftArmColor: Color.Black,
    rightArmColor: Color.Black,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  laura: {
    bodyPart: BodyPart.BodyBlack,
    hatParts: HAT_PARTS,
    hatPart: 3,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Nora },
    faceTexture: FaceTexture.Nora,
    groinColor: Color.Blue,
    leftArmColor: Color.Black,
    rightArmColor: Color.Black,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  infoman: {
    bodyPart: BodyPart.BodyRed,
    hatParts: INFOMAN_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.Red,
    body: { texture: ChestTexture.Info },
    faceTexture: FaceTexture.Info,
    groinColor: Color.White,
    leftArmColor: Color.Black,
    rightArmColor: Color.Black,
    leftClawColor: Color.White,
    rightClawColor: Color.White,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  brickstr: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 13,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Shft },
    faceTexture: FaceTexture.Shft,
    groinColor: Color.Black,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.White,
    rightClawColor: Color.Blue,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  studs: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 4,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Rac1 },
    faceTexture: FaceTexture.Dog,
    groinColor: Color.Black,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  rhoda: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 4,
    hatColor: Color.Red,
    body: { texture: ChestTexture.Rac2 },
    faceTexture: FaceTexture.WomanShd,
    groinColor: Color.Black,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  valerie: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: Color.Red,
    body: { texture: ChestTexture.Bth1 },
    faceTexture: FaceTexture.WomanShd,
    groinColor: Color.Red,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Yellow,
    rightLegColor: Color.Yellow,
  },
  snap: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.Blue,
    body: { texture: ChestTexture.Bth2 },
    faceTexture: FaceTexture.SmileShd,
    groinColor: Color.Black,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Yellow,
    rightLegColor: Color.Yellow,
  },
  pt: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 6,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Mech },
    faceTexture: FaceTexture.WomanShd,
    groinColor: Color.Black,
    leftArmColor: Color.Blue,
    rightArmColor: Color.Blue,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  mg: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 6,
    hatColor: Color.Brown,
    body: { texture: ChestTexture.Polkadot },
    faceTexture: FaceTexture.Woman,
    groinColor: Color.Blue,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  bu: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Brown,
    body: { texture: ChestTexture.Bowtie },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Brown,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Brown,
    rightLegColor: Color.Brown,
  },
  ml: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 2,
    hatColor: Color.Blue,
    body: { texture: ChestTexture.Post },
    faceTexture: FaceTexture.Mustache,
    groinColor: Color.Black,
    leftArmColor: Color.Blue,
    rightArmColor: Color.Blue,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  nu: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Mech },
    faceTexture: FaceTexture.Dog,
    groinColor: Color.Blue,
    leftArmColor: Color.Blue,
    rightArmColor: Color.Blue,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  na: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 10,
    hatColor: Color.Red,
    body: { texture: ChestTexture.Vest },
    faceTexture: FaceTexture.WomanShd,
    groinColor: Color.Red,
    leftArmColor: Color.Blue,
    rightArmColor: Color.Blue,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Red,
    rightLegColor: Color.Red,
  },
  cl: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 19,
    hatColor: Color.White,
    body: { texture: ChestTexture.Doctor },
    faceTexture: FaceTexture.Mustache,
    groinColor: Color.Blue,
    leftArmColor: Color.Blue,
    rightArmColor: Color.Blue,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  en: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { texture: ChestTexture.Doctor },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.White,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  re: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { texture: ChestTexture.Doctor },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.White,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  ro: {
    bodyPart: BodyPart.BodyBlack,
    hatParts: HAT_PARTS,
    hatPart: 3,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Cop },
    faceTexture: FaceTexture.SmileShd,
    groinColor: Color.Black,
    leftArmColor: Color.Black,
    rightArmColor: Color.Black,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  d1: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 15,
    hatColor: Color.White,
    body: { texture: ChestTexture.Mech },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Blue,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  d2: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 16,
    hatColor: Color.White,
    body: { texture: ChestTexture.Mech },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Blue,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  d3: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 17,
    hatColor: Color.White,
    body: { texture: ChestTexture.Mech },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Blue,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  d4: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 18,
    hatColor: Color.White,
    body: { texture: ChestTexture.Mech },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Blue,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  l1: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: Color.Black,
    body: { texture: ChestTexture.L },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.White,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  l2: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 6,
    hatColor: Color.Black,
    body: { texture: ChestTexture.E },
    faceTexture: FaceTexture.Mustache,
    groinColor: Color.White,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  l3: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { texture: ChestTexture.G },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.White,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  l4: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { texture: ChestTexture.O },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.White,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  l5: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Unknown },
    faceTexture: FaceTexture.Mustache,
    groinColor: Color.Red,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  l6: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Unknown },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Red,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  b1: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { color: Color.Black },
    faceTexture: FaceTexture.Mustache,
    groinColor: Color.Black,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  b2: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: Color.Black,
    body: { color: Color.Black },
    faceTexture: FaceTexture.Woman,
    groinColor: Color.Blue,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  b3: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Brown,
    body: { color: Color.Blue },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Black,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  b4: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { color: Color.Black },
    faceTexture: FaceTexture.SmileShd,
    groinColor: Color.Black,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  cm: {
    bodyPart: BodyPart.BodyYellow,
    hatParts: HAT_PARTS,
    hatPart: 9,
    hatColor: Color.Yellow,
    body: { texture: ChestTexture.Fruit },
    faceTexture: FaceTexture.WomanShd,
    groinColor: Color.Red,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Red,
    rightLegColor: Color.Red,
  },
  gd: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { color: Color.Black },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.LightGray,
    leftArmColor: Color.LightGray,
    rightArmColor: Color.LightGray,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.LightGray,
    rightLegColor: Color.LightGray,
  },
  rd: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.Red,
    body: { color: Color.Red },
    faceTexture: FaceTexture.SmileShd,
    groinColor: Color.Green,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Green,
    rightLegColor: Color.Green,
  },
  pg: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: Color.Red,
    body: { color: Color.Red },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Red,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Red,
    rightLegColor: Color.Red,
  },
  bd: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.LightGray,
    body: { color: Color.LightGray },
    faceTexture: FaceTexture.Mustache,
    groinColor: Color.Black,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  sy: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: Color.LightGray,
    body: { color: Color.Blue },
    faceTexture: FaceTexture.Woman,
    groinColor: Color.Blue,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  gn: {
    bodyPart: BodyPart.BodyGreen,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Brown,
    body: { texture: ChestTexture.Bowtie },
    faceTexture: FaceTexture.SmileShd,
    groinColor: Color.Brown,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Brown,
    rightLegColor: Color.Brown,
  },
  df: {
    bodyPart: BodyPart.BodyBlue,
    hatParts: HAT_PARTS,
    hatPart: 6,
    hatColor: Color.Brown,
    body: { texture: ChestTexture.Flowers },
    faceTexture: FaceTexture.WomanShd,
    groinColor: Color.LightGray,
    leftArmColor: Color.Blue,
    rightArmColor: Color.Blue,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.LightGray,
    rightLegColor: Color.LightGray,
  },
  bs: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Red,
    body: { texture: ChestTexture.Bth2 },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Green,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Yellow,
    rightLegColor: Color.Yellow,
  },
  lt: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Bth2 },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Blue,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Yellow,
    rightLegColor: Color.Yellow,
  },
  st: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: Color.Brown,
    body: { texture: ChestTexture.Bth1 },
    faceTexture: FaceTexture.Woman,
    groinColor: Color.Red,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Yellow,
    rightLegColor: Color.Yellow,
  },
  bm: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.Blue,
    body: { texture: ChestTexture.Construct },
    faceTexture: FaceTexture.Dog,
    groinColor: Color.Blue,
    leftArmColor: Color.LightGray,
    rightArmColor: Color.LightGray,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  jk: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.Blue,
    body: { texture: ChestTexture.Construct },
    faceTexture: FaceTexture.SmileShd,
    groinColor: Color.Blue,
    leftArmColor: Color.LightGray,
    rightArmColor: Color.LightGray,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  ghost: {
    bodyPart: BodyPart.Body,
    hatParts: GHOST_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { color: Color.White },
    faceTexture: FaceTexture.Black,
    groinColor: Color.White,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.White,
    rightClawColor: Color.White,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  ghost01: {
    bodyPart: BodyPart.Body,
    hatParts: GHOST_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { color: Color.White },
    faceTexture: FaceTexture.Black,
    groinColor: Color.White,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.White,
    rightClawColor: Color.White,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  ghost02: {
    bodyPart: BodyPart.Body,
    hatParts: GHOST_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { color: Color.White },
    faceTexture: FaceTexture.Black,
    groinColor: Color.White,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.White,
    rightClawColor: Color.White,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  ghost03: {
    bodyPart: BodyPart.Body,
    hatParts: GHOST_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { color: Color.White },
    faceTexture: FaceTexture.Black,
    groinColor: Color.White,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.White,
    rightClawColor: Color.White,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  ghost04: {
    bodyPart: BodyPart.Body,
    hatParts: GHOST_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { color: Color.White },
    faceTexture: FaceTexture.Black,
    groinColor: Color.White,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.White,
    rightClawColor: Color.White,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  ghost05: {
    bodyPart: BodyPart.Body,
    hatParts: GHOST_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { color: Color.White },
    faceTexture: FaceTexture.Black,
    groinColor: Color.White,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.White,
    rightClawColor: Color.White,
    leftLegColor: Color.White,
    rightLegColor: Color.White,
  },
  hg: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 8,
    hatColor: Color.Red,
    body: { color: Color.Red },
    faceTexture: FaceTexture.WomanShd,
    groinColor: Color.Red,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Red,
    rightClawColor: Color.Red,
    leftLegColor: Color.Red,
    rightLegColor: Color.Red,
  },
  pntgy: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.Red,
    body: { color: Color.Red },
    faceTexture: FaceTexture.Dog,
    groinColor: Color.Red,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Red,
    rightClawColor: Color.Red,
    leftLegColor: Color.Red,
    rightLegColor: Color.Red,
  },
  pep: {
    bodyPart: BodyPart.BodyRed,
    hatParts: PEPPER_HAT_PARTS,
    hatPart: 0,
    hatColor: Color.White,
    body: { texture: ChestTexture.Pepper },
    faceTexture: FaceTexture.Pepper,
    groinColor: Color.Blue,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  cop01: {
    bodyPart: BodyPart.BodyBlack,
    hatParts: HAT_PARTS,
    hatPart: 3,
    hatColor: Color.Black,
    body: { texture: ChestTexture.Cop },
    faceTexture: FaceTexture.SmileShd,
    groinColor: Color.Black,
    leftArmColor: Color.Black,
    rightArmColor: Color.Black,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  actor_01: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: Color.LightGray,
    body: { color: Color.Blue },
    faceTexture: FaceTexture.Woman,
    groinColor: Color.Blue,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  actor_02: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.LightGray,
    body: { color: Color.LightGray },
    faceTexture: FaceTexture.Mustache,
    groinColor: Color.Black,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Black,
    rightLegColor: Color.Black,
  },
  actor_03: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Black,
    body: { color: Color.Black },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.LightGray,
    leftArmColor: Color.LightGray,
    rightArmColor: Color.LightGray,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.LightGray,
    rightLegColor: Color.LightGray,
  },
  actor_04: {
    bodyPart: BodyPart.BodyRed,
    hatParts: HAT_PARTS,
    hatPart: 6,
    hatColor: Color.Brown,
    body: { texture: ChestTexture.Polkadot },
    faceTexture: FaceTexture.Woman,
    groinColor: Color.Blue,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Blue,
    rightLegColor: Color.Blue,
  },
  actor_05: {
    bodyPart: BodyPart.BodyYellow,
    hatParts: HAT_PARTS,
    hatPart: 9,
    hatColor: Color.Yellow,
    body: { texture: ChestTexture.Fruit },
    faceTexture: FaceTexture.WomanShd,
    groinColor: Color.Red,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Red,
    rightLegColor: Color.Red,
  },
  btmncycl: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 5,
    hatColor: Color.Red,
    body: { color: Color.Red },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Red,
    leftArmColor: Color.White,
    rightArmColor: Color.White,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Red,
    rightLegColor: Color.Red,
  },
  cboycycl: {
    bodyPart: BodyPart.BodyWhite,
    hatParts: HAT_PARTS,
    hatPart: 7,
    hatColor: Color.Red,
    body: { texture: ChestTexture.Bth2 },
    faceTexture: FaceTexture.Smile,
    groinColor: Color.Green,
    leftArmColor: Color.Yellow,
    rightArmColor: Color.Yellow,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Yellow,
    rightLegColor: Color.Yellow,
  },
  boatman: {
    bodyPart: BodyPart.Body,
    hatParts: HAT_PARTS,
    hatPart: 0,
    hatColor: Color.Red,
    body: { color: Color.Red },
    faceTexture: FaceTexture.SmileShd,
    groinColor: Color.Green,
    leftArmColor: Color.Red,
    rightArmColor: Color.Red,
    leftClawColor: Color.Yellow,
    rightClawColor: Color.Yellow,
    leftLegColor: Color.Green,
    rightLegColor: Color.Green,
  },
}

export type CharacterName = keyof typeof ACTORS

// spellchecker: enable

export class Character extends Roi3D {
  private _headMaterial: THREE.MeshBasicMaterial | null = null
  private _head: Roi3D | null = null
  private _originalHeadTexture: THREE.Texture | null = null
  private _worldPosition = new THREE.Vector3()
  private _worldQuaternion = new THREE.Quaternion()

  public onClicked: () => boolean = () => false

  public get headMaterial() {
    if (this._headMaterial == null) {
      throw new Error('Head material not found')
    }
    return this._headMaterial
  }

  public get head(): Roi3D {
    if (this._head == null) {
      throw new Error('Head mesh not found')
    }
    return this._head
  }

  public override get position(): THREE.Vector3 {
    return this._worldPosition
  }

  private constructor(
    name: CharacterName,
    private _info: (typeof ACTORS)[keyof typeof ACTORS],
  ) {
    super(new RoiModel(), name)
    this.model.name = name
    this.model.roi3d = this
  }

  public override moveRoiTo(targetPosition: THREE.Vector3, targetQuaternion?: THREE.Quaternion): void {
    const inverseOldQuaternion = this._worldQuaternion.clone().invert()
    const newQuaternion = targetQuaternion ?? this._worldQuaternion.clone()

    for (const object of this.getAllModels()) {
      if (object === this.model) {
        continue
      }
      const relativePosition = object.position.clone().sub(this._worldPosition).applyQuaternion(inverseOldQuaternion)
      const relativeQuaternion = inverseOldQuaternion.clone().multiply(object.quaternion)

      object.position.copy(targetPosition.clone().add(relativePosition.applyQuaternion(newQuaternion)))
      object.quaternion.copy(newQuaternion.clone().multiply(relativeQuaternion))
      object.updateMatrix()
    }

    this._worldPosition.copy(targetPosition)
    this._worldQuaternion.copy(newQuaternion)
  }

  public resetHeadTexture(): void {
    if (this._originalHeadTexture == null) {
      throw new Error('Original head texture not found')
    }
    this.headMaterial.map = this._originalHeadTexture
    this.headMaterial.needsUpdate = true
  }

  public static async create(world: World, name: CharacterName): Promise<Character> {
    const actor = new Character(name, ACTORS[name as keyof typeof ACTORS])

    for (const [bodyPartName, part] of Object.entries(BODY_PARTS)) {
      if (bodyPartName === 'top') {
        actor.model.boundingBox = new THREE.Box3(new THREE.Vector3(part.boundingBox[0], part.boundingBox[1], part.boundingBox[2]), new THREE.Vector3(part.boundingBox[3], part.boundingBox[4], part.boundingBox[5]))
        actor.model.boundingSphere = new THREE.Sphere(new THREE.Vector3(part.boundingSphere[1], part.boundingSphere[2], part.boundingSphere[3]), part.boundingSphere[0])
        continue
      }

      if (bodyPartName === 'infohat' && actor._info.hatParts[actor._info.hatPart] === 'bald') {
        continue
      }

      const partRoi = await (async () => {
        switch (bodyPartName) {
          case 'infohat':
            return getGlobalPart(actor._info.hatParts[actor._info.hatPart], colorAliases[actor._info.hatColor], null)
          case 'body': {
            return getGlobalPart(actor._info.bodyPart, 'color' in actor._info.body ? colorAliases[actor._info.body.color] : null, 'color' in actor._info.body ? null : actor._info.body.texture)
          }
          case 'infogron':
            return getGlobalPart('infogron', colorAliases[actor._info.groinColor], null)
          case 'head': {
            actor._head = await getGlobalPart('head', null, actor._info.faceTexture)
            const faceMesh = actor._head.model.children.find(child => child instanceof THREE.Mesh && child.material.map != null)
            if (faceMesh == null || !(faceMesh instanceof THREE.Mesh)) {
              throw new Error('Head material not found')
            }
            actor._headMaterial = faceMesh.material
            actor._originalHeadTexture = faceMesh.material.map
            return actor._head
          }
          case 'arm-lft':
            return getGlobalPart('arm-lft', colorAliases[actor._info.leftArmColor], null)
          case 'arm-rt':
            return getGlobalPart('arm-rt', colorAliases[actor._info.rightArmColor], null)
          case 'claw-lft':
            return getGlobalPart('claw-lft', colorAliases[actor._info.leftClawColor], null)
          case 'claw-rt':
            return getGlobalPart('claw-lft', colorAliases[actor._info.rightClawColor], null)
          case 'leg-lft':
            return getGlobalPart('leg', colorAliases[actor._info.leftLegColor], null)
          case 'leg-rt':
            return getGlobalPart('leg', colorAliases[actor._info.rightLegColor], null)
        }
        throw new Error(`Unknown part: ${bodyPartName}`)
      })()

      const bodyPartModel = new RoiModel()
      bodyPartModel.name = bodyPartName.toLowerCase()
      bodyPartModel.add(partRoi.model)
      partRoi.model.name = `${partRoi.model.name}-part`
      actor.model.add(bodyPartModel)
      const bodyPartRoi = new Roi3D(bodyPartModel, bodyPartName)
      actor.children.push(bodyPartRoi)

      world.addClickListener(bodyPartRoi, async () => {
        if (engine.currentSaveGame.player === 'nick') {
          switch (bodyPartName) {
            case 'head':
            case 'infohat':
              actor._info.hatColor = nextColor(actor._info.hatColor)
              actor.children
                .find(child => child.name === 'infohat')
                ?.model.clear()
                .add((await getGlobalPart(actor._info.hatParts[actor._info.hatPart], colorAliases[actor._info.hatColor], null)).model)
              break
            case 'body':
            case 'infogron':
              actor._info.groinColor = nextColor(actor._info.groinColor)
              actor.children
                .find(child => child.name === 'infogron')
                ?.model.clear()
                .add((await getGlobalPart('infogron', colorAliases[actor._info.groinColor], null)).model)
              break
            case 'claw-lft':
            case 'arm-lft':
              actor._info.leftArmColor = nextColor(actor._info.leftArmColor)
              actor.children
                .find(child => child.name === 'arm-lft')
                ?.model.clear()
                .add((await getGlobalPart('arm-lft', colorAliases[actor._info.leftArmColor], null)).model)
              break
            case 'claw-rt':
            case 'arm-rt':
              actor._info.rightArmColor = nextColor(actor._info.rightArmColor)
              actor.children
                .find(child => child.name === 'arm-rt')
                ?.model.clear()
                .add((await getGlobalPart('arm-rt', colorAliases[actor._info.rightArmColor], null)).model)
              break
            case 'leg-lft':
              actor._info.leftLegColor = nextColor(actor._info.leftLegColor)
              actor.children
                .find(child => child.name === 'leg-lft')
                ?.model.clear()
                .add((await getGlobalPart('leg', colorAliases[actor._info.leftLegColor], null)).model)
              break
            case 'leg-rt':
              actor._info.rightLegColor = nextColor(actor._info.rightLegColor)
              actor.children
                .find(child => child.name === 'leg-rt')
                ?.model.clear()
                .add((await getGlobalPart('leg', colorAliases[actor._info.rightLegColor], null)).model)
              break
            default:
              throw new Error(`Unknown part: ${bodyPartName}`)
          }

          void world.playPositionalAudio(Sound10, bodyPartModel)

          return true
        }

        return actor.onClicked()
      })

      const matrix = calculateTransformationMatrix(part.pos, part.dir, part.up)
      matrix.decompose(bodyPartModel.position, bodyPartModel.quaternion, bodyPartModel.scale)
    }

    world.addClickListener(actor, async (): Promise<boolean> => {
      if (engine.currentSaveGame.player === 'pepper') {
        const hatParentMesh = actor.children.find(child => child.name === 'infohat')
        if (hatParentMesh == null) {
          return false
        }

        actor._info.hatPart = (actor._info.hatPart + 1) % actor._info.hatParts.length

        if (actor._info.hatParts[actor._info.hatPart] === 'bald') {
          return true
        }

        hatParentMesh.model.clear()
        const mesh = await getGlobalPart(actor._info.hatParts[actor._info.hatPart], colorAliases[actor._info.hatColor], null)
        mesh.model.name = `${mesh.model.name}-part`
        hatParentMesh.model.add(mesh.model)

        return true
      }

      return false
    })

    return actor
  }
}
