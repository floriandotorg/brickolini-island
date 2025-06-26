import * as THREE from 'three'
import { Action } from '../../actions/types'
import { getSettings } from '../settings'

THREE.Cache.enabled = !import.meta.env.DEV

const hdFiles = new Set<string>([
  // spellchecker: disable
  'jukebox/0.m4a',
  'jukebox/1.m4a',
  'jukebox/11.m4a',
  'jukebox/12.m4a',
  'jukebox/13.m4a',
  'jukebox/3.m4a',
  'jukebox/4.m4a',
  'jukebox/5.m4a',
  'jukebox/55.m4a',
  'jukebox/56.m4a',
  'jukebox/57.m4a',
  'jukebox/58.m4a',
  'jukebox/59.m4a',
  'jukebox/6.m4a',
  'jukebox/60.m4a',
  'jukebox/8.m4a',
  'jukebox/9.m4a',
  'world/images/black.GIF.png',
  'world/images/bowtie.GIF.png',
  'world/images/bth1chst.GIF.png',
  'world/images/bth2chst.GIF.png',
  'world/images/construct.GIF.png',
  'world/images/copchest.GIF.png',
  'world/images/doctor.GIF.png',
  'world/images/dogface.GIF.png',
  'world/images/E.GIF.png',
  'world/images/flowers.GIF.png',
  'world/images/fruit.GIF.png',
  'world/images/G.GIF.png',
  'world/images/Gdface.GIF.png',
  'world/images/INFOCHST.GIF.png',
  'world/images/Infoface.GIF.png',
  'world/images/L.GIF.png',
  'world/images/L6.GIF.png',
  'world/images/Mamachst.GIF.png',
  'world/images/mamaface.GIF.png',
  'world/images/mech.GIF.png',
  'world/images/mustache.GIF.png',
  'world/images/Nickchst.GIF.png',
  'world/images/Nickface.GIF.png',
  'world/images/norachst.GIF.png',
  'world/images/Noraface.GIF.png',
  'world/images/O.GIF.png',
  'world/images/Papachst.GIF.png',
  'world/images/Papaface.GIF.png',
  'world/images/Peprchst.GIF.png',
  'world/images/Peprface.GIF.png',
  'world/images/polkadot.GIF.png',
  'world/images/postchst.GIF.png',
  'world/images/rac1chst.GIF.png',
  'world/images/rac2chst.GIF.png',
  'world/images/Shftchst.GIF.png',
  'world/images/Shftface.GIF.png',
  'world/images/Shftface2.GIF.png',
  'world/images/smile.GIF.png',
  'world/images/smileshd.GIF.png',
  'world/images/Unkchst.GIF.png',
  'world/images/vest.GIF.png',
  'world/images/Woman.GIF.png',
  'world/images/WomanShd.GIF.png',
  'world/model_textures/^CAVE_24X.GIF.png',
  'world/model_textures/^CAVEROCX.GIF.png',
  'world/model_textures/^CAVEROKX.GIF.png',
  'world/model_textures/^GRASSX.GIF.png',
  'world/model_textures/^MITESX.GIF.png',
  'world/model_textures/^PEBBLESX.GIF.png',
  'world/model_textures/^ROCKX.GIF.png',
  'world/model_textures/^WATER2X.GIF.png',
  'world/model_textures/BANK01.GIF.png',
  'world/model_textures/BEACH.GIF.png',
  'world/model_textures/BRELA_01.GIF.png',
  'world/model_textures/CAVE_24X.GIF.png',
  'world/model_textures/CAVEROCX.GIF.png',
  'world/model_textures/CAVEROKX.GIF.png',
  'world/model_textures/CHEKER01.GIF.png',
  'world/model_textures/CHJETL.GIF.png',
  'world/model_textures/CHJETR.GIF.png',
  'world/model_textures/CHWIND.GIF.png',
  'world/model_textures/DBFRFN.GIF.png',
  'world/model_textures/FINISH.GIF.png',
  'world/model_textures/GRASSX.GIF.png',
  'world/model_textures/JAILPAD.GIF.png',
  'world/model_textures/JSFRNT.GIF.png',
  'world/model_textures/JSFRNT1.GIF.png',
  'world/model_textures/JSFRNT3.GIF.png',
  'world/model_textures/JSFRNT4.GIF.png',
  'world/model_textures/JSWNSH.GIF.png',
  'world/model_textures/JSWNSH1.GIF.png',
  'world/model_textures/JSWNSH5.GIF.png',
  'world/model_textures/JSWNSH6.GIF.png',
  'world/model_textures/MEDIC01.GIF.png',
  'world/model_textures/MITESX.GIF.png',
  'world/model_textures/NOPIZZA.GIF.png',
  'world/model_textures/OCTAN01.GIF.png',
  'world/model_textures/OCTSQ01.GIF.png',
  'world/model_textures/PEBBLESX.GIF.png',
  'world/model_textures/PIANOKYS.GIF.png',
  'world/model_textures/pizza.gif.png',
  'world/model_textures/PIZZA01.GIF.png',
  'world/model_textures/POLBAR01.GIF.png',
  'world/model_textures/POLBAR02.GIF.png',
  'world/model_textures/POLBLA01.GIF.png',
  'world/model_textures/POLWHI01.GIF.png',
  'world/model_textures/POST.GIF.png',
  'world/model_textures/QUESTION.GIF.png',
  'world/model_textures/RADDIS01.GIF.png',
  'world/model_textures/RCBACK.GIF.png',
  'world/model_textures/RCFRNT.GIF.png',
  'world/model_textures/RCFRNT5.GIF.png',
  'world/model_textures/RCFRNT6.GIF.png',
  'world/model_textures/RCFRNT7.GIF.png',
  'world/model_textures/RCSIDE1.GIF.png',
  'world/model_textures/RCSIDE2.GIF.png',
  'world/model_textures/RCSIDE3.GIF.png',
  'world/model_textures/RCTAIL.GIF.png',
  'world/model_textures/REDSKUL.GIF.png',
  'world/model_textures/RELREL01.GIF.png',
  'world/model_textures/ROCK07.GIF.png',
  'world/model_textures/ROCK08.GIF.png',
  'world/model_textures/ROCKRD3B.GIF.png',
  'world/model_textures/ROCKX.GIF.png',
  'world/model_textures/SANDREDX.GIF.png',
  'world/model_textures/SHLDWN02.GIF.png',
  'world/model_textures/skull.gif.png',
  'world/model_textures/SMILE.GIF.png',
  'world/model_textures/SUPR2_01.GIF.png',
  'world/model_textures/TOWRTOP.GIF.png',
  'world/model_textures/VAL_02.GIF.png',
  'world/model_textures/WATER2X.GIF.png',
  'world/part_textures/^ROCKX.GIF.png',
  'world/part_textures/CHJETL.GIF.png',
  'world/part_textures/DONUT.GIF.png',
  'world/part_textures/POST.GIF.png',
  'world/part_textures/REDSKUL.GIF.png',
  'world/part_textures/ROCK.GIF.png',
  'world/part_textures/ROCK07.GIF.png',
  'world/part_textures/ROCKX.GIF.png',
  'world/part_textures/SMILESHD.GIF.png',
  // spellchecker: enable
])

export const manager = new THREE.LoadingManager()
const fileLoader = new THREE.FileLoader(manager)
fileLoader.setResponseType('arraybuffer')

export const getFileUrl = (path: string) => {
  if (import.meta.env.VITE_HD_ASSETS_AVAILABLE === 'true' && getSettings().hdTextures && hdFiles.has(path)) {
    return `hd/${path}`
  }
  return `/org/${path}`
}

export const getFile = async (path: string): Promise<ArrayBuffer> => {
  const res = await fileLoader.loadAsync(path)
  if (!(res instanceof ArrayBuffer)) {
    throw new Error(`Failed to load ${path}`)
  }
  return res
}

const getExtension = (fileType: Action.FileType) => {
  switch (fileType) {
    case Action.FileType.SMK:
      return 'mp4'
    case Action.FileType.WAV:
      return 'm4a'
    case Action.FileType.OBJ:
      return 'gph'
    case Action.FileType.STL:
      return 'png'
  }

  throw new Error(`Unknown file type: ${fileType}`)
}

export const getActionFileUrl = (action: { id: number; siFile: string; fileType: Action.FileType }) => getFileUrl(`${action.siFile}/${action.id}.${getExtension(action.fileType)}`)

export const getAction = async (action: { id: number; siFile: string; fileType: Action.FileType }): Promise<ArrayBuffer> => getFile(getActionFileUrl(action))
