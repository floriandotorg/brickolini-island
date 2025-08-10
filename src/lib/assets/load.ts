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
  'world/images/black.gif.png',
  'world/images/bowtie.gif.png',
  'world/images/bth1chst.gif.png',
  'world/images/bth2chst.gif.png',
  'world/images/construct.gif.png',
  'world/images/copchest.gif.png',
  'world/images/doctor.gif.png',
  'world/images/dogface.gif.png',
  'world/images/e.gif.png',
  'world/images/flowers.gif.png',
  'world/images/fruit.gif.png',
  'world/images/g.gif.png',
  'world/images/gdface.gif.png',
  'world/images/infochst.gif.png',
  'world/images/infoface.gif.png',
  'world/images/l.gif.png',
  'world/images/l6.gif.png',
  'world/images/mamachst.gif.png',
  'world/images/mamaface.gif.png',
  'world/images/mech.gif.png',
  'world/images/mustache.gif.png',
  'world/images/nickchst.gif.png',
  'world/images/nickface.gif.png',
  'world/images/norachst.gif.png',
  'world/images/noraface.gif.png',
  'world/images/o.gif.png',
  'world/images/papachst.gif.png',
  'world/images/papaface.gif.png',
  'world/images/peprchst.gif.png',
  'world/images/peprface.gif.png',
  'world/images/polkadot.gif.png',
  'world/images/postchst.gif.png',
  'world/images/rac1chst.gif.png',
  'world/images/rac2chst.gif.png',
  'world/images/shftchst.gif.png',
  'world/images/shftface.gif.png',
  'world/images/shftface2.gif.png',
  'world/images/smile.gif.png',
  'world/images/smileshd.gif.png',
  'world/images/unkchst.gif.png',
  'world/images/vest.gif.png',
  'world/images/woman.gif.png',
  'world/images/womanshd.gif.png',
  'world/model_textures/^cave_24x.gif.png',
  'world/model_textures/^caverocx.gif.png',
  'world/model_textures/^caverokx.gif.png',
  'world/model_textures/^grassx.gif.png',
  'world/model_textures/^mitesx.gif.png',
  'world/model_textures/^pebblesx.gif.png',
  'world/model_textures/^rockx.gif.png',
  'world/model_textures/^sandredx.gif.png',
  'world/model_textures/^water2x.gif.png',
  'world/model_textures/bank01.gif.png',
  'world/model_textures/beach.gif.png',
  'world/model_textures/brela_01.gif.png',
  'world/model_textures/cave_24x.gif.png',
  'world/model_textures/caverocx.gif.png',
  'world/model_textures/caverokx.gif.png',
  'world/model_textures/cheker01.gif.png',
  'world/model_textures/chjetl.gif.png',
  'world/model_textures/chjetr.gif.png',
  'world/model_textures/chwind.gif.png',
  'world/model_textures/dbfrfn.gif.png',
  'world/model_textures/finish.gif.png',
  'world/model_textures/gasroad.gif.png',
  'world/model_textures/grassx.gif.png',
  'world/model_textures/jailpad.gif.png',
  'world/model_textures/jfrnt.gif.png',
  'world/model_textures/jsfrnt.gif.png',
  'world/model_textures/jsfrnt1.gif.png',
  'world/model_textures/jsfrnt3.gif.png',
  'world/model_textures/jsfrnt4.gif.png',
  'world/model_textures/jswnsh.gif.png',
  'world/model_textures/jswnsh1.gif.png',
  'world/model_textures/jswnsh5.gif.png',
  'world/model_textures/jswnsh6.gif.png',
  'world/model_textures/medic01.gif.png',
  'world/model_textures/mitesx.gif.png',
  'world/model_textures/nopizza.gif.png',
  'world/model_textures/nwcurve.gif.png',
  'world/model_textures/octan01.gif.png',
  'world/model_textures/octsq01.gif.png',
  'world/model_textures/pebblesx.gif.png',
  'world/model_textures/pianokys.gif.png',
  'world/model_textures/pizcurve.gif.png',
  'world/model_textures/pizza.gif.png',
  'world/model_textures/pizza01.gif.png',
  'world/model_textures/polbar01.gif.png',
  'world/model_textures/polbar02.gif.png',
  'world/model_textures/polbla01.gif.png',
  'world/model_textures/polwhi01.gif.png',
  'world/model_textures/post.gif.png',
  'world/model_textures/question.gif.png',
  'world/model_textures/raddis01.gif.png',
  'world/model_textures/rcback.gif.png',
  'world/model_textures/rcfrnt.gif.png',
  'world/model_textures/rcfrnt5.gif.png',
  'world/model_textures/rcfrnt6.gif.png',
  'world/model_textures/rcfrnt7.gif.png',
  'world/model_textures/rcside1.gif.png',
  'world/model_textures/rcside2.gif.png',
  'world/model_textures/rcside3.gif.png',
  'world/model_textures/rctail.gif.png',
  'world/model_textures/redskul.gif.png',
  'world/model_textures/relrel01.gif.png',
  'world/model_textures/road1way.gif.png',
  'world/model_textures/road3wa2.gif.png',
  'world/model_textures/road3wa3.gif.png',
  'world/model_textures/road3way.gif.png',
  'world/model_textures/road4way.gif.png',
  'world/model_textures/roadstr8.gif.png',
  'world/model_textures/rock07.gif.png',
  'world/model_textures/rock08.gif.png',
  'world/model_textures/rockrd3b.gif.png',
  'world/model_textures/rockx.gif.png',
  'world/model_textures/sandredx.gif.png',
  'world/model_textures/se_curve.gif.png',
  'world/model_textures/shldwn02.gif.png',
  'world/model_textures/skull.gif.png',
  'world/model_textures/smile.gif.png',
  'world/model_textures/supr2_01.gif.png',
  'world/model_textures/tightcrv.gif.png',
  'world/model_textures/towrtop.gif.png',
  'world/model_textures/val_02.gif.png',
  'world/model_textures/w_curve.gif.png',
  'world/model_textures/water2x.gif.png',
  'world/model_textures/wnbars.gif.png',
  'world/part_textures/^rockx.gif.png',
  'world/part_textures/chjetl.gif.png',
  'world/part_textures/donut.gif.png',
  'world/part_textures/post.gif.png',
  'world/part_textures/redskul.gif.png',
  'world/part_textures/rock.gif.png',
  'world/part_textures/rock07.gif.png',
  'world/part_textures/rockx.gif.png',
  'world/part_textures/smileshd.gif.png',
  // spellchecker: enable
])

export const manager = new THREE.LoadingManager()
const fileLoader = new THREE.FileLoader(manager)
fileLoader.setResponseType('arraybuffer')

export const getFileUrl = (path: string) => {
  if (import.meta.env.VITE_HD_ASSETS_AVAILABLE === 'true' && getSettings().graphics.hdTextures) {
    if (hdFiles.has(path)) {
      return `hd/${path}`
    }
    if (hdFiles.has(path.replace('.png', '.jpeg'))) {
      return `hd/${path.replace('.png', '.jpeg')}`
    }
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

const getExtension = (fileType: Action.FileType, presenter: string | null) => {
  switch (fileType) {
    case Action.FileType.SMK:
      return 'mp4'
    case Action.FileType.WAV:
      return 'm4a'
    case Action.FileType.OBJ:
      if (presenter == null) {
        throw new Error(`Presenter is null for file type: ${fileType}`)
      }
      if (presenter === 'LegoAnimPresenter') {
        return 'ani'
      }
      return 'gph'
    case Action.FileType.STL:
      return 'png'
    case Action.FileType.FLC:
      return 'mp4'
  }

  throw new Error(`Unknown file type: ${fileType}`)
}

export const getActionFileUrl = (action: { id: number; siFile: string; fileType: Action.FileType; presenter: string | null }) => getFileUrl(`${action.siFile}/${action.id}.${getExtension(action.fileType, action.presenter)}`)

export const getAction = async (action: { id: number; siFile: string; fileType: Action.FileType; presenter: string | null }): Promise<ArrayBuffer> => getFile(getActionFileUrl(action))
