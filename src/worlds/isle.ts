import * as THREE from 'three'
import {
  _Isle,
  AmbulanceDashboard,
  BikeDashboard,
  bho142en_RunAnim,
  bic143sy_RunAnim,
  bjs009gd_RunAnim,
  bns005p1_RunAnim,
  bns005pg_RunAnim,
  bns007gd_RunAnim,
  bns144rd_RunAnim,
  bns145rd_RunAnim,
  bns146rd_RunAnim,
  bns147rd_RunAnim,
  bns191en_RunAnim,
  cnsx12la_RunAnim,
  cnsx12ni_RunAnim,
  fjs019rd_RunAnim,
  fjs148gd_RunAnim,
  fjs149va_RunAnim,
  fns0x1re_RunAnim,
  fns001l1_RunAnim,
  fns001l2_RunAnim,
  fns001re_RunAnim,
  fns007re_RunAnim,
  fns011re_RunAnim,
  fns017la_RunAnim,
  fns185gd_RunAnim,
  fps181ni_RunAnim,
  fpz166p1_RunAnim,
  fpz172rd_RunAnim,
  fra157bm_RunAnim,
  fra163mg_RunAnim,
  fra192pe_RunAnim,
  frt025rd_RunAnim,
  frt132rd_RunAnim,
  frt135df_RunAnim,
  frt137df_RunAnim,
  frt139df_RunAnim,
  hho027en_RunAnim,
  hho142cl_RunAnim,
  hho143cl_RunAnim,
  hho144cl_RunAnim,
  hps116bd_RunAnim,
  hps117bd_RunAnim,
  hps118re_RunAnim,
  hps120en_RunAnim,
  hps122en_RunAnim,
  hpz047pe_RunAnim,
  hpz048pe_RunAnim,
  hpz049bd_RunAnim,
  hpz050bd_RunAnim,
  hpz052ma_RunAnim,
  hpz053pa_RunAnim,
  hpz055pa_RunAnim,
  hpz057ma_RunAnim,
  hpza51gd_RunAnim,
  hpzb51gd_RunAnim,
  hpzc51gd_RunAnim,
  hpzf51gd_RunAnim,
  hpzw51gd_RunAnim,
  hpzx51gd_RunAnim,
  hpzy51gd_RunAnim,
  hpzz51gd_RunAnim,
  igs001na_RunAnim,
  igs008na_RunAnim,
  ijs001sn_RunAnim,
  ijs006sn_RunAnim,
  ips001ro_RunAnim,
  ips002ro_RunAnim,
  ipz001rd_RunAnim,
  irt001in_RunAnim,
  irt007in_RunAnim,
  irtx01sl_RunAnim,
  ivo918in_RunAnim,
  MotoBikeDashboard,
  nca001ca_RunAnim,
  nca002sk_RunAnim,
  nca003gh_RunAnim,
  nic002pr_RunAnim,
  nic003pr_RunAnim,
  nic004pr_RunAnim,
  nja001pr_RunAnim,
  nja002pr_RunAnim,
  nla001ha_RunAnim,
  nla002sd_RunAnim,
  npa001ns_RunAnim,
  npa002ns_RunAnim,
  npa003ns_RunAnim,
  npa004ns_RunAnim,
  npa005dl_RunAnim,
  npa007dl_RunAnim,
  npa009dl_RunAnim,
  npa010db_RunAnim,
  npa012db_RunAnim,
  npa014db_RunAnim,
  npa015ca_RunAnim,
  npa017ca_RunAnim,
  npa019ca_RunAnim,
  npa020p1_RunAnim,
  npa022p1_RunAnim,
  npa024p1_RunAnim,
  npa025sh_RunAnim,
  npa027sh_RunAnim,
  npa029sh_RunAnim,
  npa030fl_RunAnim,
  npa031fl_RunAnim,
  npa032fl_RunAnim,
  npa034bh_RunAnim,
  npa035bh_RunAnim,
  npa036bh_RunAnim,
  npa038pn_RunAnim,
  npa039pn_RunAnim,
  npa040pn_RunAnim,
  npa042pm_RunAnim,
  npa043pm_RunAnim,
  npa044pm_RunAnim,
  npa046sr_RunAnim,
  npa047sr_RunAnim,
  npa048sr_RunAnim,
  npa050ba_RunAnim,
  npa051ba_RunAnim,
  npa052ba_RunAnim,
  npa054po_RunAnim,
  npa055po_RunAnim,
  npa056po_RunAnim,
  npa058r1_RunAnim,
  npa059r1_RunAnim,
  npa060r1_RunAnim,
  npa061r3_RunAnim,
  npa062r2_RunAnim,
  npa062r3_RunAnim,
  npa063r2_RunAnim,
  npa063r3_RunAnim,
  npa065r2_RunAnim,
  npz001bd_RunAnim,
  npz002bd_RunAnim,
  npz003bd_RunAnim,
  npz004bd_RunAnim,
  npz005bd_RunAnim,
  npz006bd_RunAnim,
  npz007bd_RunAnim,
  nrtflag0_RunAnim,
  pgs050nu_RunAnim,
  pgs051nu_RunAnim,
  pgs052nu_RunAnim,
  pho104re_RunAnim,
  pho105re_RunAnim,
  pho106re_RunAnim,
  pja126br_RunAnim,
  pja127br_RunAnim,
  pja129br_RunAnim,
  pja130br_RunAnim,
  pja131br_RunAnim,
  pja132br_RunAnim,
  pns017ml_RunAnim,
  pns100ml_RunAnim,
  pps025ni_RunAnim,
  pps026ni_RunAnim,
  pps027ni_RunAnim,
  ppz001pe_RunAnim,
  ppz006pa_RunAnim,
  ppz007pa_RunAnim,
  ppz008rd_RunAnim,
  ppz009pg_RunAnim,
  ppz010pa_RunAnim,
  ppz011pa_RunAnim,
  ppz013pa_RunAnim,
  ppz014pe_RunAnim,
  ppz015pe_RunAnim,
  ppz016pe_RunAnim,
  ppz029rd_RunAnim,
  ppz031ma_RunAnim,
  ppz035pa_RunAnim,
  ppz036pa_RunAnim,
  ppz037ma_RunAnim,
  ppz038ma_RunAnim,
  ppz054ma_RunAnim,
  ppz055ma_RunAnim,
  ppz056ma_RunAnim,
  ppz059ma_RunAnim,
  ppz060ma_RunAnim,
  ppz061ma_RunAnim,
  ppz064ma_RunAnim,
  ppz075pa_RunAnim,
  ppz082pa_RunAnim,
  ppz084pa_RunAnim,
  ppz086bs_RunAnim,
  ppz088ma_RunAnim,
  ppz089ma_RunAnim,
  ppz090ma_RunAnim,
  ppz093pe_RunAnim,
  ppz094pe_RunAnim,
  ppz095pe_RunAnim,
  ppz107ma_RunAnim,
  ppz114pa_RunAnim,
  ppz117ma_RunAnim,
  ppz118ma_RunAnim,
  ppz119ma_RunAnim,
  ppz120pa_RunAnim,
  prp101pr_RunAnim,
  prt072sl_RunAnim,
  prt073sl_RunAnim,
  prt074sl_RunAnim,
  SkateDashboard,
  sba001bu_RunAnim,
  sba002bu_RunAnim,
  sba003bu_RunAnim,
  sgs001na_RunAnim,
  sgs002na_RunAnim,
  sgs003na_RunAnim,
  sja001br_RunAnim,
  sja002br_RunAnim,
  sja003br_RunAnim,
  sja004br_RunAnim,
  sja005br_RunAnim,
  sja006br_RunAnim,
  sja007br_RunAnim,
  sja008br_RunAnim,
  sja009br_RunAnim,
  sja010br_RunAnim,
  sja011br_RunAnim,
  sja012br_RunAnim,
  sja013br_RunAnim,
  sja014br_RunAnim,
  sja015br_RunAnim,
  sja016br_RunAnim,
  sja017br_RunAnim,
  sja018br_RunAnim,
  sjs001sn_RunAnim,
  sjs001va_RunAnim,
  sjs002sn_RunAnim,
  sjs002va_RunAnim,
  sjs003sn_RunAnim,
  sjs003va_RunAnim,
  sjs004sn_RunAnim,
  sjs004va_RunAnim,
  sjs005sn_RunAnim,
  sjs007in_RunAnim,
  sjs012in_RunAnim,
  sjs013in_RunAnim,
  sjs014in_RunAnim,
  sjs015in_RunAnim,
  sns001cl_RunAnim,
  sns001ml_RunAnim,
  sns001nu_RunAnim,
  sns001pe_RunAnim,
  sns002cl_RunAnim,
  sns002mg_RunAnim,
  sns002ml_RunAnim,
  sns002nu_RunAnim,
  sns002pe_RunAnim,
  sns003cl_RunAnim,
  sns003la_RunAnim,
  sns003mg_RunAnim,
  sns003nu_RunAnim,
  sns003pe_RunAnim,
  sns004la_RunAnim,
  sns004mg_RunAnim,
  sns004rd_RunAnim,
  sns005in_RunAnim,
  sns005la_RunAnim,
  sns006bd_RunAnim,
  sns006in_RunAnim,
  sns006la_RunAnim,
  sns006ro_RunAnim,
  sns007la_RunAnim,
  sns007ni_RunAnim,
  sns007pe_RunAnim,
  sns007sy_RunAnim,
  sns008in_RunAnim,
  sns008la_RunAnim,
  sns008ni_RunAnim,
  sns008pe_RunAnim,
  sns009la_RunAnim,
  sns009ni_RunAnim,
  sns010la_RunAnim,
  sns010ni_RunAnim,
  sns010pe_RunAnim,
  sns011in_RunAnim,
  sns011la_RunAnim,
  sns011ni_RunAnim,
  sns012la_RunAnim,
  sns012ni_RunAnim,
  sns013la_RunAnim,
  sns013ni_RunAnim,
  sns014la_RunAnim,
  sns014ni_RunAnim,
  sns014pe_RunAnim,
  sns015la_RunAnim,
  sns015ni_RunAnim,
  sns015pe_RunAnim,
  sns017la_RunAnim,
  sns017ni_RunAnim,
  snsx31sh_RunAnim,
  sps001la_RunAnim,
  sps001ni_RunAnim,
  sps001ro_RunAnim,
  sps002la_RunAnim,
  sps002ni_RunAnim,
  sps002ro_RunAnim,
  sps003ni_RunAnim,
  sps003ro_RunAnim,
  sps004ni_RunAnim,
  sps004ro_RunAnim,
  sps005ni_RunAnim,
  sps006ni_RunAnim,
  spz001ma_RunAnim,
  spz001pa_RunAnim,
  spz002ma_RunAnim,
  spz002pa_RunAnim,
  spz003ma_RunAnim,
  spz003pa_RunAnim,
  spz004ma_RunAnim,
  spz004pa_RunAnim,
  spz004pe_RunAnim,
  spz005ma_RunAnim,
  spz005pa_RunAnim,
  spz005pe_RunAnim,
  spz006ma_RunAnim,
  spz006pa_RunAnim,
  spz007ma_RunAnim,
  spz007pa_RunAnim,
  spz008ma_RunAnim,
  spz008pa_RunAnim,
  spz009ma_RunAnim,
  spz009pa_RunAnim,
  spz010ma_RunAnim,
  spz010pa_RunAnim,
  spz011ma_RunAnim,
  spz011pa_RunAnim,
  spz011pe_RunAnim,
  spz012pa_RunAnim,
  spz013ma_RunAnim,
  spz013pa_RunAnim,
  spz013pe_RunAnim,
  spz014ma_RunAnim,
  spz014pa_RunAnim,
  spz015ma_RunAnim,
  spz015pa_RunAnim,
  srp006pe_RunAnim,
  srt001in_RunAnim,
  srt001rd_RunAnim,
  srt002in_RunAnim,
  srt003bd_RunAnim,
  srt003in_RunAnim,
  srt004in_RunAnim,
  srt005pg_RunAnim,
  sst001mg_RunAnim,
  TowTrackDashboard,
  wgs083nu_RunAnim,
  wgs085nu_RunAnim,
  wgs086nu_RunAnim,
  wgs087nu_RunAnim,
  wgs088nu_RunAnim,
  wgs089nu_RunAnim,
  wgs090nu_RunAnim,
  wgs091nu_RunAnim,
  wgs092nu_RunAnim,
  wgs093nu_RunAnim,
  wgs094nu_RunAnim,
  wgs095nu_RunAnim,
  wgs096nu_RunAnim,
  wgs097nu_RunAnim,
  wgs098nu_RunAnim,
  wgs099nu_RunAnim,
  wgs100nu_RunAnim,
  wgs101nu_RunAnim,
  wgs102nu_RunAnim,
  wgs103nu_RunAnim,
  wrt060bm_RunAnim,
  wrt074sl_RunAnim,
  wrt075rh_RunAnim,
  wrt076df_RunAnim,
  wrt078ni_RunAnim,
  wrt079bm_RunAnim,
} from '../actions/isle'
import { Beach_Music, BeachBlvd_Music, Cave_Music, CentralNorthRoad_Music, CentralRoads_Music, GarageArea_Music, Hospital_Music, InformationCenter_Music, Jail_Music, Park_Music, PoliceStation_Music, Quiet_Audio, RaceTrackRoad_Music, ResidentalArea_Music } from '../actions/jukebox'
import { type AnimationAction, type AudioAction, getExtraValue, type ParallelAction, type PhonemeAction, type PositionalAudioAction } from '../lib/action-types'
import { parse3DAnimation } from '../lib/assets/animation'
import { getAction } from '../lib/assets/load'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { getSettings } from '../lib/settings'
import { switchWorld } from '../lib/switch-world'
import { IsleBase } from './isle-base'

const CAM_HEIGHT = 1.24
const MAX_LINEAR_VEL = 10
const MAX_ROT_VEL = 80
const MAX_LINEAR_ACCEL = 15
const MAX_ROT_ACCEL = 30
const MAX_LINEAR_DECEL = 50
const MAX_ROT_DECEL = 50
const EPSILON = 0.0001

export type IsleParam = {
  position: {
    boundaryName: string
    source: number
    sourceScale: number
    destination: number
    destinationScale: number
  }
}

export class Isle extends IsleBase {
  private _animationTrigger: Array<{
    center: THREE.Vector3
    radius: number
    animation: ParallelAction<AnimationAction | PositionalAudioAction | PhonemeAction | AudioAction>
  }> = []

  override async init(): Promise<void> {
    await super.init()

    this._boundaryManager.onTrigger = (name, data, direction) => {
      const music = [ResidentalArea_Music, BeachBlvd_Music, Cave_Music, CentralRoads_Music, Jail_Music, Hospital_Music, InformationCenter_Music, PoliceStation_Music, Park_Music, CentralNorthRoad_Music, GarageArea_Music, RaceTrackRoad_Music, Beach_Music, Quiet_Audio]

      const triggers: [number, number][] = [
        [11, 10],
        [6, 10],
        [3, 1],
        [4, 1],
        [1, 4],
        [1, 4],
        [13, 2],
        [13, 2],
        [13, 2],
        [4, 10],
        [11, 9],
        [9, 7],
        [8, 7],
        [8, 5],
        [5, 2],
        [2, 4],
        [4, 2],
        [4, 5],
        [11, 4],
        [12, 10],
        [10, 12],
        [10, 12],
        [14, 2],
        [14, 2],
      ]

      if (name[2] === 'M') {
        if (direction === 'inbound') {
          engine.switchBackgroundMusic(music[triggers[data - 1][0] - 1])
        } else {
          engine.switchBackgroundMusic(music[triggers[data - 1][1] - 1])
        }
      }
    }

    for (const child of _Isle.children) {
      const entity = getExtraValue(child, 'Object')?.toLowerCase()
      const worldName = (() => {
        switch (entity) {
          case 'hospitalentity':
            return 'hospital'
          case 'gasstationentity':
            return 'garage'
          case 'infocenterentity':
            return 'infomain'
          case 'policeentity':
            return 'police'
          default:
            return undefined
        }
      })()
      if (worldName == null) {
        continue
      }
      if (child.children[0] == null) {
        throw new Error(`Action for world ${worldName} has no children`)
      }
      const meshName = getExtraValue(child.children[0], 'DB_CREATE')?.toLowerCase()
      if (meshName == null) {
        throw new Error(`Found no valid mesh name for world ${worldName}`)
      }
      const buildingMesh = this.scene.getObjectByName(meshName)
      if (buildingMesh == null || !(buildingMesh instanceof THREE.Mesh)) {
        throw new Error(`Mesh ${meshName} not found`)
      }
      this.addClickListener(buildingMesh, async () => {
        console.log(`switched to ${meshName}, ${worldName}`)
        switchWorld(worldName)
        return true
      })
    }

    const isle = this.scene.getObjectByName('isle_hi')
    if (isle == null || !(isle instanceof THREE.Mesh)) {
      throw new Error('Isle mesh not found')
    }
    this._isleMesh = isle

    const bikeMesh = this.scene.getObjectByName('bike')
    const motobkMesh = this.scene.getObjectByName('motobk')
    const skateMesh = this.scene.getObjectByName('skate')
    const ambulanceMesh = this.scene.getObjectByName('ambul')
    const towtruckMesh = this.scene.getObjectByName('towtk')

    if (bikeMesh == null || !(bikeMesh instanceof THREE.Mesh) || motobkMesh == null || !(motobkMesh instanceof THREE.Mesh) || skateMesh == null || !(skateMesh instanceof THREE.Mesh) || ambulanceMesh == null || !(ambulanceMesh instanceof THREE.Mesh) || towtruckMesh == null || !(towtruckMesh instanceof THREE.Mesh)) {
      throw new Error('Vehicle meshes not found')
    }

    this._boundaryManager.placeObject(bikeMesh, 'INT44', 2, 0.5, 0, 0.5)
    this._boundaryManager.placeObject(motobkMesh, 'INT43', 4, 0.5, 1, 0.5)
    this._boundaryManager.placeObject(skateMesh, 'EDG02_84', 4, 0.5, 0, 0.5)

    const enterVehicle = async (vehicle: THREE.Mesh): Promise<void> => {
      await engine.transition()

      this._vehicleMesh = vehicle
      this._vehicleMesh.visible = false
      this.camera.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z)
      this.camera.quaternion.copy(vehicle.quaternion)
      this._placeObjectOnGround(this.camera)

      this._showDashboard()
    }

    if (import.meta.hot) {
      import.meta.hot.accept('../lib/world/dashboard', newModule => {
        if (newModule == null) {
          return
        }
        this._dashboard = new newModule.Dashboard()
        this._dashboard.onExit = () => {
          this._exitVehicle()
        }
        this._dashboard.resize(engine.width, engine.height)
        this._showDashboard()
      })
    }

    this.addClickListener(bikeMesh, async () => {
      await enterVehicle(bikeMesh)
      return true
    })
    this.addClickListener(motobkMesh, async () => {
      await enterVehicle(motobkMesh)
      return true
    })
    this.addClickListener(skateMesh, async () => {
      await enterVehicle(skateMesh)
      return true
    })
    this.addClickListener(ambulanceMesh, async () => {
      await enterVehicle(ambulanceMesh)
      return true
    })
    this.addClickListener(towtruckMesh, async () => {
      await enterVehicle(towtruckMesh)
      return true
    })

    this._dashboard.onExit = () => {
      this._exitVehicle()
    }

    this.camera.position.set(20, CAM_HEIGHT, 30)
    this.camera.lookAt(60, 0, 25)
    this._placeObjectOnGround(this.camera)

    this.playAnimation(hpz055pa_RunAnim)

    const loadTriggerAnimations = async () => {
      for (const animation of [
        sba001bu_RunAnim,
        sba002bu_RunAnim,
        sba003bu_RunAnim,
        bns146rd_RunAnim,
        bns144rd_RunAnim,
        fns017la_RunAnim,
        bns005p1_RunAnim,
        bns147rd_RunAnim,
        igs001na_RunAnim,
        sns003nu_RunAnim,
        sgs001na_RunAnim,
        sns001nu_RunAnim,
        sns002nu_RunAnim,
        sgs002na_RunAnim,
        sgs003na_RunAnim,
        fns001re_RunAnim,
        fns0x1re_RunAnim,
        fns007re_RunAnim,
        fns011re_RunAnim,
        sns001cl_RunAnim,
        sns002cl_RunAnim,
        sns003cl_RunAnim,
        bns191en_RunAnim,
        bho142en_RunAnim,
        bic143sy_RunAnim,
        sja004br_RunAnim,
        sja005br_RunAnim,
        sja006br_RunAnim,
        sja007br_RunAnim,
        sja008br_RunAnim,
        sja009br_RunAnim,
        sja010br_RunAnim,
        sja011br_RunAnim,
        sja012br_RunAnim,
        sja013br_RunAnim,
        sja014br_RunAnim,
        sja015br_RunAnim,
        sja016br_RunAnim,
        sja017br_RunAnim,
        sja018br_RunAnim,
        sja001br_RunAnim,
        sja002br_RunAnim,
        sja003br_RunAnim,
        ijs001sn_RunAnim,
        fjs148gd_RunAnim,
        fjs149va_RunAnim,
        sjs001va_RunAnim,
        sjs002va_RunAnim,
        sjs003va_RunAnim,
        sjs004va_RunAnim,
        fjs019rd_RunAnim,
        bjs009gd_RunAnim,
        sjs001sn_RunAnim,
        sjs002sn_RunAnim,
        sjs003sn_RunAnim,
        sjs004sn_RunAnim,
        sjs005sn_RunAnim,
        snsx31sh_RunAnim,
        bns007gd_RunAnim,
        fns001l1_RunAnim,
        fns001l2_RunAnim,
        fra157bm_RunAnim,
        bns145rd_RunAnim,
        ips001ro_RunAnim,
        sns010ni_RunAnim,
        sns003la_RunAnim,
        fps181ni_RunAnim,
        ipz001rd_RunAnim,
        spz004ma_RunAnim,
        spz005ma_RunAnim,
        spz006ma_RunAnim,
        spz004pa_RunAnim,
        spz013ma_RunAnim,
        spz006pa_RunAnim,
        spz014ma_RunAnim,
        spz005pa_RunAnim,
        spz015ma_RunAnim,
        spz007ma_RunAnim,
        spz013pa_RunAnim,
        spz008ma_RunAnim,
        spz014pa_RunAnim,
        spz009ma_RunAnim,
        spz015pa_RunAnim,
        spz007pa_RunAnim,
        spz011pe_RunAnim,
        spz008pa_RunAnim,
        spz009pa_RunAnim,
        spz010ma_RunAnim,
        spz010pa_RunAnim,
        spz011ma_RunAnim,
        spz011pa_RunAnim,
        spz012pa_RunAnim,
        spz001ma_RunAnim,
        spz002ma_RunAnim,
        spz003ma_RunAnim,
        spz003pa_RunAnim,
        fpz166p1_RunAnim,
        fpz172rd_RunAnim,
        spz001pa_RunAnim,
        spz002pa_RunAnim,
        ppz086bs_RunAnim,
        ppz008rd_RunAnim,
        ppz009pg_RunAnim,
        ivo918in_RunAnim,
        spz004pe_RunAnim,
        spz005pe_RunAnim,
        srp006pe_RunAnim,
        spz013pe_RunAnim,
        sns001pe_RunAnim,
        fra192pe_RunAnim,
        fra163mg_RunAnim,
        fns185gd_RunAnim,
        irt001in_RunAnim,
        irtx01sl_RunAnim,
        frt135df_RunAnim,
        frt137df_RunAnim,
        frt139df_RunAnim,
        frt025rd_RunAnim,
        frt132rd_RunAnim,
        srt001rd_RunAnim,
        srt003bd_RunAnim,
        sst001mg_RunAnim,
        sns004la_RunAnim,
        sns005la_RunAnim,
        sns006la_RunAnim,
        sps004ni_RunAnim,
        sps005ni_RunAnim,
        sps006ni_RunAnim,
        sns007la_RunAnim,
        sns008la_RunAnim,
        sns009la_RunAnim,
        sns007ni_RunAnim,
        sns008ni_RunAnim,
        sns009ni_RunAnim,
        pns017ml_RunAnim,
        sns010la_RunAnim,
        sns010pe_RunAnim,
        sns011la_RunAnim,
        sns012la_RunAnim,
        sns007pe_RunAnim,
        sns008pe_RunAnim,
        sns013la_RunAnim,
        sns013ni_RunAnim,
        sns014la_RunAnim,
        sns014ni_RunAnim,
        sns015la_RunAnim,
        sns015ni_RunAnim,
        sns011ni_RunAnim,
        sns012ni_RunAnim,
        sns014pe_RunAnim,
        sns015pe_RunAnim,
        sns003pe_RunAnim,
        sns017ni_RunAnim,
        sps001ni_RunAnim,
        sps002ni_RunAnim,
        sps003ni_RunAnim,
        sns017la_RunAnim,
        sps001la_RunAnim,
        sps002la_RunAnim,
        bns005pg_RunAnim,
        sns001ml_RunAnim,
        sns002mg_RunAnim,
        sns002ml_RunAnim,
        sns002pe_RunAnim,
        sns003mg_RunAnim,
        sns004mg_RunAnim,
        sns004rd_RunAnim,
        sns006bd_RunAnim,
        sns006ro_RunAnim,
        sns011in_RunAnim,
        sps001ro_RunAnim,
        sps002ro_RunAnim,
        sps003ro_RunAnim,
        sps004ro_RunAnim,
        srt005pg_RunAnim,
        pns100ml_RunAnim,
        ppz029rd_RunAnim,
        sns007sy_RunAnim,
        cnsx12la_RunAnim,
        cnsx12ni_RunAnim,
        ijs006sn_RunAnim,
        igs008na_RunAnim,
        irt007in_RunAnim,
        ips002ro_RunAnim,
        hho142cl_RunAnim,
        hho143cl_RunAnim,
        hho144cl_RunAnim,
        hho027en_RunAnim,
        hps116bd_RunAnim,
        hps117bd_RunAnim,
        hps118re_RunAnim,
        hps120en_RunAnim,
        hps122en_RunAnim,
        hpz047pe_RunAnim,
        hpz048pe_RunAnim,
        hpz049bd_RunAnim,
        hpz050bd_RunAnim,
        hpz052ma_RunAnim,
        hpz053pa_RunAnim,
        hpz055pa_RunAnim,
        hpz057ma_RunAnim,
        hpza51gd_RunAnim,
        hpzb51gd_RunAnim,
        hpzc51gd_RunAnim,
        hpzf51gd_RunAnim,
        hpzw51gd_RunAnim,
        hpzx51gd_RunAnim,
        hpzy51gd_RunAnim,
        hpzz51gd_RunAnim,
        nic002pr_RunAnim,
        nic003pr_RunAnim,
        nic004pr_RunAnim,
        pps025ni_RunAnim,
        pps026ni_RunAnim,
        pps027ni_RunAnim,
        ppz001pe_RunAnim,
        ppz006pa_RunAnim,
        ppz007pa_RunAnim,
        ppz010pa_RunAnim,
        ppz011pa_RunAnim,
        ppz013pa_RunAnim,
        ppz014pe_RunAnim,
        ppz015pe_RunAnim,
        ppz016pe_RunAnim,
        pgs050nu_RunAnim,
        pgs051nu_RunAnim,
        pgs052nu_RunAnim,
        ppz031ma_RunAnim,
        ppz035pa_RunAnim,
        ppz036pa_RunAnim,
        ppz037ma_RunAnim,
        ppz038ma_RunAnim,
        ppz054ma_RunAnim,
        ppz055ma_RunAnim,
        ppz056ma_RunAnim,
        ppz059ma_RunAnim,
        ppz060ma_RunAnim,
        ppz061ma_RunAnim,
        ppz064ma_RunAnim,
        prt072sl_RunAnim,
        prt073sl_RunAnim,
        prt074sl_RunAnim,
        pho104re_RunAnim,
        pho105re_RunAnim,
        pho106re_RunAnim,
        ppz075pa_RunAnim,
        ppz082pa_RunAnim,
        ppz084pa_RunAnim,
        ppz088ma_RunAnim,
        ppz089ma_RunAnim,
        ppz090ma_RunAnim,
        ppz093pe_RunAnim,
        ppz094pe_RunAnim,
        ppz095pe_RunAnim,
        prp101pr_RunAnim,
        pja126br_RunAnim,
        pja127br_RunAnim,
        pja129br_RunAnim,
        pja130br_RunAnim,
        pja131br_RunAnim,
        pja132br_RunAnim,
        ppz107ma_RunAnim,
        ppz114pa_RunAnim,
        ppz117ma_RunAnim,
        ppz118ma_RunAnim,
        ppz119ma_RunAnim,
        ppz120pa_RunAnim,
        wgs083nu_RunAnim,
        wgs085nu_RunAnim,
        wgs086nu_RunAnim,
        wgs087nu_RunAnim,
        wgs088nu_RunAnim,
        wgs089nu_RunAnim,
        wgs090nu_RunAnim,
        wgs091nu_RunAnim,
        wgs092nu_RunAnim,
        wgs093nu_RunAnim,
        wgs094nu_RunAnim,
        wgs095nu_RunAnim,
        wgs096nu_RunAnim,
        wgs097nu_RunAnim,
        wgs098nu_RunAnim,
        wgs099nu_RunAnim,
        wgs100nu_RunAnim,
        wgs101nu_RunAnim,
        wgs102nu_RunAnim,
        wgs103nu_RunAnim,
        wrt060bm_RunAnim,
        wrt074sl_RunAnim,
        wrt075rh_RunAnim,
        wrt076df_RunAnim,
        wrt078ni_RunAnim,
        wrt079bm_RunAnim,
        npz001bd_RunAnim,
        npz002bd_RunAnim,
        npz003bd_RunAnim,
        npz004bd_RunAnim,
        npz005bd_RunAnim,
        npz006bd_RunAnim,
        npz007bd_RunAnim,
        nca001ca_RunAnim,
        nca002sk_RunAnim,
        nca003gh_RunAnim,
        nla001ha_RunAnim,
        nla002sd_RunAnim,
        npa001ns_RunAnim,
        npa002ns_RunAnim,
        npa003ns_RunAnim,
        npa004ns_RunAnim,
        npa005dl_RunAnim,
        npa007dl_RunAnim,
        npa009dl_RunAnim,
        npa010db_RunAnim,
        npa012db_RunAnim,
        npa014db_RunAnim,
        npa015ca_RunAnim,
        npa017ca_RunAnim,
        npa019ca_RunAnim,
        npa020p1_RunAnim,
        npa022p1_RunAnim,
        npa024p1_RunAnim,
        npa025sh_RunAnim,
        npa027sh_RunAnim,
        npa029sh_RunAnim,
        npa030fl_RunAnim,
        npa031fl_RunAnim,
        npa032fl_RunAnim,
        npa034bh_RunAnim,
        npa035bh_RunAnim,
        npa036bh_RunAnim,
        npa038pn_RunAnim,
        npa039pn_RunAnim,
        npa040pn_RunAnim,
        npa042pm_RunAnim,
        npa043pm_RunAnim,
        npa044pm_RunAnim,
        npa046sr_RunAnim,
        npa047sr_RunAnim,
        npa048sr_RunAnim,
        npa050ba_RunAnim,
        npa051ba_RunAnim,
        npa052ba_RunAnim,
        npa054po_RunAnim,
        npa055po_RunAnim,
        npa056po_RunAnim,
        npa058r1_RunAnim,
        npa059r1_RunAnim,
        npa060r1_RunAnim,
        npa061r3_RunAnim,
        npa062r2_RunAnim,
        npa062r3_RunAnim,
        npa063r2_RunAnim,
        npa063r3_RunAnim,
        npa065r2_RunAnim,
        nja001pr_RunAnim,
        nja002pr_RunAnim,
        sjs007in_RunAnim,
        sns005in_RunAnim,
        sns006in_RunAnim,
        sns008in_RunAnim,
        sjs012in_RunAnim,
        sjs013in_RunAnim,
        sjs014in_RunAnim,
        sjs015in_RunAnim,
        srt001in_RunAnim,
        srt002in_RunAnim,
        srt003in_RunAnim,
        srt004in_RunAnim,
        nrtflag0_RunAnim,
      ]) {
        const animationPresenter = animation.children.find(child => child.presenter === 'LegoAnimPresenter')
        if (animationPresenter == null) {
          console.warn(`No animation found: ${animation.name}`)
          continue
        }
        getAction(animationPresenter).then(action => {
          try {
            const parsed = parse3DAnimation(action)
            this.debugDrawSphere(new THREE.Vector3(parsed.center[0], parsed.center[1], parsed.center[2]), 'red', parsed.radius)
            this._animationTrigger.push({
              center: new THREE.Vector3(parsed.center[0], parsed.center[1], parsed.center[2]),
              radius: parsed.radius,
              animation: {
                ...animation,
                children: animation.children.filter(child => child.presenter !== 'LegoLoopingAnimPresenter'),
              },
            })
          } catch (err) {
            if (err instanceof Error && err.message.includes('Parse scene not supported')) {
              console.warn(`Animation ${animation.name} caused "Parse scene not supported" error`)
            } else {
              throw err
            }
          }
        })
      }
    }

    if (new URLSearchParams(window.location.search).get('noAnimations') !== 'true') {
      void loadTriggerAnimations()
    }
  }

  public override activate(composer: Composer, param?: IsleParam): void {
    super.activate(composer, param)
    this._dashboard.activate(composer)
    if (param != null) {
      this._boundaryManager.placeObject(this.camera, param.position.boundaryName, param.position.source, param.position.sourceScale, param.position.destination, param.position.destinationScale)
    }
  }

  private _showDashboard(): void {
    if (this._vehicleMesh == null) {
      return
    }

    switch (this._vehicleMesh.name) {
      case 'bike':
        this._dashboard.show(BikeDashboard)
        break
      case 'motobk':
        this._dashboard.show(MotoBikeDashboard)
        break
      case 'skate':
        this._dashboard.show(SkateDashboard)
        break
      case 'ambul':
        this._dashboard.show(AmbulanceDashboard)
        break
      case 'towtk':
        this._dashboard.show(TowTrackDashboard)
        break
      default:
        throw new Error(`Unknown vehicle: ${this._vehicleMesh.name}`)
    }
  }

  private _exitVehicle(): void {
    if (this._vehicleMesh == null) {
      return
    }

    this._vehicleMesh.position.copy(this.camera.position)
    this._vehicleMesh.quaternion.copy(this.camera.quaternion)
    this._placeObjectOnGround(this._vehicleMesh, new THREE.Vector3(0, 0, 0))
    this._vehicleMesh.visible = true

    this.camera.position.add(new THREE.Vector3(0, 0, -2).applyQuaternion(this.camera.quaternion))
    this._placeObjectOnGround(this.camera)

    this._dashboard.clear()
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height)
    this._dashboard.resize(width, height)
  }

  public override pointerDown(event: MouseEvent, normalizedX: number, normalizedY: number): void {
    super.pointerDown(event, normalizedX, normalizedY)
    this._dashboard.pointerDown(normalizedX, normalizedY)
  }

  public override pointerUp(event: MouseEvent): void {
    super.pointerUp(event)
    this._dashboard.pointerUp()
  }

  private _placeObjectOnGround(object: THREE.Object3D, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): void {
    const downRay = new THREE.Raycaster(object.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObjects(this._groundGroup)[0]
    if (hit) {
      object.position.copy(hit.point.clone().add(offset))
    }
  }

  private _calculateSlopeTilt(): number {
    const downRay = new THREE.Raycaster(this.camera.position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 10)
    const hit = downRay.intersectObjects(this._groundGroup)[0]

    if (hit?.face != null) {
      const worldNormal = hit.face.normal.clone()
      worldNormal.transformDirection(hit.object.matrixWorld)

      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
      forward.y = 0
      forward.normalize()

      const slopeAngle = Math.atan2(worldNormal.dot(forward), worldNormal.y)

      return -slopeAngle
    }

    return 0
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f' && import.meta.env.DEV) {
      this._slewMode = !this._slewMode

      if (!this._slewMode) {
        this._linearVel = 0
        this._rotVel = 0
        this._verticalVel = 0
        this._pitchVel = 0
        this.camera.position.y = 100
        this._placeObjectOnGround(this.camera)
      }
    }

    if (key === 'm') {
      this._dayTime = (Math.round(((this._dayTime + 0.25) % 1) / 0.25) * 0.25) % 1
      this._updateSun()
    }
  }

  private _calculateNewVel(targetVel: number, currentVel: number, accel: number, delta: number): number {
    let newVel = currentVel
    const velDiff = targetVel - currentVel
    if (Math.abs(velDiff) > EPSILON) {
      const vSign = velDiff > 0 ? 1 : -1
      const deltaVel = accel * delta
      newVel = currentVel + deltaVel * vSign
      newVel = vSign > 0 ? Math.min(newVel, targetVel) : Math.max(newVel, targetVel)
    }
    return newVel
  }

  private _collideAndSlide(startPos: THREE.Vector3, moveVec: THREE.Vector3): THREE.Vector3 {
    const totalMove = new THREE.Vector3()
    const remaining = moveVec.clone()
    const pos = startPos.clone()
    const MAX_ITERATIONS = 5
    const COLLISION_BUFFER = 0.5
    for (let n = 0; n < MAX_ITERATIONS && remaining.length() > EPSILON; ++n) {
      const dir = remaining.clone().normalize()
      const ray = new THREE.Raycaster(pos, dir, 0, remaining.length() + COLLISION_BUFFER)
      const hit = getSettings().freeRoam && this._isleMesh != null ? ray.intersectObject(this._isleMesh)[0] : ray.intersectObject(this._boundaryManager.walls)[0]
      if (!hit) {
        totalMove.add(remaining)
        break
      }

      const dist = Math.max(hit.distance - COLLISION_BUFFER, 0)
      const moveAllowed = dir.clone().multiplyScalar(dist)
      totalMove.add(moveAllowed)
      pos.add(moveAllowed)

      const m3 = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
      const normal = hit.face?.normal.clone().applyMatrix3(m3).normalize() ?? new THREE.Vector3()

      remaining.sub(moveAllowed)
      const projection = remaining.clone().sub(normal.multiplyScalar(remaining.dot(normal)))
      remaining.copy(projection)
    }
    return totalMove
  }

  public override update(delta: number): void {
    super.update(delta)

    this._dayTime = (this._dayTime + delta * (1 / (24 * 60))) % 1
    this._updateSun()

    if (this._water != null) {
      this._water.material.uniforms.time.value += delta * 0.1
    }

    if (this.isRunningCameraAnimation) {
      return
    }

    const speedMultiplier = this._slewMode ? 4 : 1

    const targetLinearVel = (engine.isKeyDown('ArrowUp') ? MAX_LINEAR_VEL : engine.isKeyDown('ArrowDown') ? -MAX_LINEAR_VEL : 0) * speedMultiplier

    const targetRotVel = engine.isKeyDown('ArrowLeft') ? MAX_ROT_VEL : engine.isKeyDown('ArrowRight') ? -MAX_ROT_VEL : 0

    const targetVerticalVel = this._slewMode ? (engine.isKeyDown('q') ? MAX_LINEAR_VEL * speedMultiplier : engine.isKeyDown('e') ? -MAX_LINEAR_VEL * speedMultiplier : 0) : 0

    const targetPitchVel = this._slewMode ? (engine.isKeyDown('w') ? MAX_ROT_VEL : engine.isKeyDown('s') ? -MAX_ROT_VEL : 0) : 0

    const linearAccel = targetLinearVel !== 0 ? MAX_LINEAR_ACCEL : MAX_LINEAR_DECEL
    const rotAccel = (targetRotVel !== 0 ? MAX_ROT_ACCEL : MAX_ROT_DECEL) * 40

    const pitchAccel = (targetPitchVel !== 0 ? MAX_ROT_ACCEL : MAX_ROT_DECEL) * 40

    if (this._slewMode) {
      this._linearVel = targetLinearVel
      this._rotVel = targetRotVel
      this._verticalVel = targetVerticalVel
      this._pitchVel = targetPitchVel
    } else {
      this._linearVel = this._calculateNewVel(targetLinearVel, this._linearVel, linearAccel, delta)
      this._rotVel = this._calculateNewVel(targetRotVel, this._rotVel, rotAccel, delta)
      this._verticalVel = this._calculateNewVel(targetVerticalVel, this._verticalVel, linearAccel, delta)
      this._pitchVel = this._calculateNewVel(targetPitchVel, this._pitchVel, pitchAccel, delta)
    }

    const vel = this._linearVel < 0 ? -this._linearVel : this._linearVel
    const maxVelCurrent = MAX_LINEAR_VEL * (this._slewMode ? 4 : 1)
    this._dashboard.update(vel / maxVelCurrent)

    this.camera.rotation.y += THREE.MathUtils.degToRad(this._rotVel * delta)
    if (this._slewMode) {
      this.camera.rotation.x += THREE.MathUtils.degToRad(this._pitchVel * delta)
      if (this.camera.rotation.x > Math.PI / 2) {
        this.camera.rotation.x = Math.PI / 2
      }
      if (this.camera.rotation.x < -Math.PI / 2) {
        this.camera.rotation.x = -Math.PI / 2
      }
    } else {
      this.camera.rotation.x = this._calculateSlopeTilt()
    }
    this.camera.rotation.z = 0

    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    if (this._slewMode) {
      forward.y = 0
      forward.normalize()
    }

    const fromPos = this.camera.position.clone()
    let toPos = fromPos.clone()
    const moveVec = forward.clone().multiplyScalar(this._linearVel * delta)
    moveVec.y += this._verticalVel * delta
    if (moveVec.length() > 0) {
      if (this._slewMode) {
        this.camera.position.add(moveVec)
      } else {
        const slideMove = this._collideAndSlide(this.camera.position, moveVec)
        if (slideMove.length() > EPSILON) {
          this.camera.position.add(slideMove)
          toPos = this.camera.position.clone()
        }
      }
    }

    this._boundaryManager.update(fromPos, toPos)
    for (const trigger of this._animationTrigger) {
      const distance = toPos.distanceTo(trigger.center)
      if (distance <= trigger.radius && fromPos.distanceTo(trigger.center) > trigger.radius) {
        console.log(`Playing animation ${trigger.animation.name}`)
        void this.playAnimation(trigger.animation)
      }
    }

    this.setDebugData(this.camera.position, new THREE.Vector3(0, 0, 1).applyEuler(this.camera.rotation), this._slewMode)

    if (!this._slewMode) {
      this._placeObjectOnGround(this.camera)
    }
  }
}
