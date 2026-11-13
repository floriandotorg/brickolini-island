import * as THREE from 'three'
import {
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
  HelicopterLand_Anim,
  HelicopterTakeOff_Anim,
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
  ijs006sn_RunAnim,
  ips001ro_RunAnim,
  ips002ro_RunAnim,
  ipz001rd_RunAnim,
  irt001in_RunAnim,
  irt007in_RunAnim,
  irtx01sl_RunAnim,
  ivo918in_RunAnim,
  nca001ca_RunAnim,
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
// import { CNs001Pe, tns030bd_RunAnim } from '../actions/act2main'
import { Beach_Music, BeachBlvd_Music, Cave_Music, CentralNorthRoad_Music, CentralRoads_Music, GarageArea_Music, Hospital_Music, InformationCenter_Music, Jail_Music, Park_Music, PoliceStation_Music, Quiet_Audio, RaceTrackRoad_Music, ResidentalArea_Music } from '../actions/jukebox'
import { BRS303_CloseJailDoor, TRS302_OpenJailDoor } from '../actions/sndanim'
import { act1State } from '../lib/act1-state'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../lib/engine'
import { jukeBoxState } from '../lib/jukebox-state'
import { raceResults } from '../lib/race-state.ts'
import { helicopterState, vehicleReturn } from '../lib/session-state.ts'
import { switchWorld } from '../lib/switch-world'
import { Ambulance } from '../lib/world/actors/ambulance'
import { BumpBuoy } from '../lib/world/actors/bump-buoy.ts'
import { FuelVehicle } from '../lib/world/actors/fuel-vehicle'
import { Helicopter } from '../lib/world/actors/helicopter'
import { Jetski } from '../lib/world/actors/jetski'
import { Pizzeria } from '../lib/world/actors/pizzeria'
import { TowTrack } from '../lib/world/actors/towtrack'
import { Vehicle } from '../lib/world/actors/vehicle'
import type { IsleMission } from '../lib/world/isle-mission.ts'
import { PlayerMovement } from '../lib/world/player-movement'
import { Isle } from './isle'
import type { IsleParam } from './isle-base'

const ANIMATIONS = [
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
]

// import { tns002br_RunAnim } from '../actions/act2main'

export class Act1 extends Isle {
  protected readonly _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )

  protected override get playerMovement(): PlayerMovement {
    return this._playerMovement
  }

  public backgroundMusicTriggerEnabled = true
  private _ambulance: Ambulance | null | undefined

  constructor() {
    super('act1', false)
  }

  public override async getRunAnimation(id: number): Promise<import('../lib/action-types').RunAnimationAction | null> {
    return ANIMATIONS.find(action => action.id === id) ?? super.getRunAnimation(id)
  }

  override async init(): Promise<void> {
    await super.init()
    this._playerMovement.boundaryManager = this.boundaryManager

    const takeOff = this.boundaryManager.getObjectPlacementFromLocation('helicopterTakenOff')
    const land = this.boundaryManager.getObjectPlacementFromLocation('helicopterLanded')
    this._playerMovement.flightInfo = { takeOff, land }

    this.boundaryManager.onTrigger((name, data, direction, roi) => {
      if (roi != null) {
        return
      }

      if (data === 0x168) {
        if (this.currentVehicle instanceof FuelVehicle) {
          this.currentVehicle.refuel()
        }
        return
      }

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

      if (name[2] === 'S') {
        if (data === 300) {
          void this.extras.placeBrickster()
        } else if (data === 301) {
          this.extras.setDurationAndLifetime(['brickstr'], 0, 20000)
        } else if (data === 305 && act1State.value !== 'ambulance') {
          void this.extras.placeMamaAndPapa()
        } else if (data === 306) {
          this.extras.setDurationAndLifetime(['mama', 'papa'], 0, 20000)
        }

        if (data === 302 && act1State.value !== 'pizza') {
          void this.playAnimation(TRS302_OpenJailDoor)
        } else if (data === 303) {
          void this.playAnimation(BRS303_CloseJailDoor)
        } else if (data === 310) {
          const buoy = this.findRoi('bouybump')?.actor
          if (buoy instanceof BumpBuoy) {
            void buoy.onClick()
          }
        }
      }

      if (name[2] === 'M' && this.backgroundMusicTriggerEnabled && !jukeBoxState.active && data >= 1 && data <= triggers.length) {
        if (direction === 'inbound') {
          void engine.switchBackgroundMusic(music[triggers[data - 1][0] - 1])
        } else {
          void engine.switchBackgroundMusic(music[triggers[data - 1][1] - 1])
        }
      } else if (name[2] === 'C') {
        void this.ambient.cameraTrigger(data)
      }
    })

    this._dashboard.onExit = () => {
      if ((!this._playerMovement.flightMode && !(this.currentVehicle instanceof Helicopter)) || (this.currentVehicle instanceof Helicopter && helicopterState.status === 0)) {
        void engine.transition({ keepMusic: true }).then(() => {
          this.currentVehicle?.exit()
          engine.finishTransition()
        })
      }
    }

    this._dashboard.onInfoButtonClicked = () => {
      if (this.currentVehicle instanceof Helicopter) {
        this._playerMovement.flightMode = false
      }
      if (this.currentVehicle != null) {
        this.currentVehicle.info()
      } else {
        this.abortMission()
        void switchWorld({ ending: null })
      }
    }

    this._dashboard.onFlightModeClick = async (mode: 'taking-off' | 'landing') => {
      const helicopter = this.currentVehicle
      const flightMode = mode === 'taking-off'
      if (!(helicopter instanceof Helicopter) || helicopterState.status !== (flightMode ? 0 : 2)) {
        return
      }
      helicopterState.status = flightMode ? 1 : 3
      this._playerMovement.resetVelocities()
      const animation = flightMode ? HelicopterTakeOff_Anim : HelicopterLand_Anim
      await this.playAnimation(animation)
      if (this.currentVehicle === helicopter) {
        this._playerMovement.flightMode = flightMode
        helicopterState.status = flightMode ? 2 : 0
      }
    }

    this.camera.position.set(9, 1.25, -47)
    this.camera.lookAt(19, 1, -43)
    this._playerMovement.placeOnGround(this.camera)

    // extra
    // this.playAnimation(CNs001Pe)

    // brickster is loose
    // this.playAnimation(tns030bd_RunAnim, new THREE.Vector3(this.camera.position.x + 2, 1, this.camera.position.z - 1))

    // hospital pizzeria scene
    // this.playAnimation(hpz057ma_RunAnim)

    // brickster scene (only works in ACT2)
    // this.playAnimation(tns002br_RunAnim)
  }

  public override escape(): boolean {
    this.skipAllRunningAnimations(true)
    this.abortMission()
    this.currentVehicle?.exit()
    return true
  }

  public override abortMission(): void {
    for (const mission of this.missions) {
      if (mission.missionActive) {
        mission.abort()
      }
    }
  }

  private get missions(): IsleMission[] {
    const pizza = this.findRoi('pizza')?.actor
    const tow = this.findRoi('towtk')?.actor
    return [this.ambulance, pizza instanceof Pizzeria ? pizza : null, tow instanceof TowTrack ? tow : null].filter((mission): mission is Ambulance | Pizzeria | TowTrack => mission != null)
  }

  private static readonly PICKUP_ROI_NAMES = new Set(['ps-gate', 'gd'])

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    const ambulance = this.ambulance
    if (act1State.value === 'ambulance' && ambulance != null && ambulance.isInPickupPhase) {
      this._dashboard.pointerDown(event)
      const name = this.pickRoiNameAt(event.normalizedX, event.normalizedY, Act1.PICKUP_ROI_NAMES)
      if (name != null) {
        ambulance.handlePickupClick(name)
      }
      return
    }
    await super.pointerDown(event)
  }

  private get ambulance(): Ambulance | null {
    if (this._ambulance !== undefined) {
      return this._ambulance
    }
    const actor = this.findRoi('ambul')?.actor
    this._ambulance = actor instanceof Ambulance ? actor : null
    return this._ambulance
  }

  public override async activate(composer: Composer, param?: IsleParam): Promise<void> {
    await super.activate(composer, param)
    for (const name of ['pizpie', 'rcred', 'towtk', 'stretch', 'bird']) {
      const roi = this.findRoi(name)
      if (roi != null) {
        roi.visible = false
      }
    }
    if (param != null) {
      const { position, quaternion } = this.boundaryManager.getObjectPlacement(param.position.boundaryName, param.position.source, param.position.sourceScale, param.position.destination, param.position.destinationScale)
      this.camera.position.copy(position)
      this.camera.quaternion.copy(quaternion)
    }
    if (vehicleReturn.type != null) {
      const type = vehicleReturn.type
      vehicleReturn.type = null
      const vehicle = this._buildMeshes.get(type) ?? this.findRoi(type === 'moto' ? 'motobk' : type)?.actor
      if (vehicle instanceof Vehicle) {
        await vehicle.enter(false)
      }
    }
    if (act1State.value === 'transitionToRacecar' && raceResults.car) {
      const car = this._buildMeshes.get('racecar')
      if (car instanceof Vehicle) {
        const placement = this.boundaryManager.getObjectPlacementFromLocation('carraceFinished')
        car.roi.moveRoiTo(placement.position, placement.quaternion)
        await car.enter(false)
        const score = engine.currentSaveGame.getScore('carRace', engine.currentSaveGame.player)
        void this.playHeldCameraAnimation(score === 3 ? srt001in_RunAnim : score === 2 ? srt002in_RunAnim : srt003in_RunAnim)
      }
      raceResults.car = false
      act1State.value = 'none'
    }
    if (act1State.value === 'transitionToJetski' && raceResults.jetski) {
      const jetski = this._buildMeshes.get('jetski')
      if (jetski instanceof Jetski) {
        const placement = this.boundaryManager.getObjectPlacementFromLocation('jetraceFinished')
        jetski.roi.moveRoiTo(placement.position, placement.quaternion)
        await jetski.enter(false)
        const score = engine.currentSaveGame.getScore('jetskiRace', engine.currentSaveGame.player)
        void this.playHeldCameraAnimation(score === 3 ? sjs012in_RunAnim : score === 2 ? sjs013in_RunAnim : sjs014in_RunAnim)
      }
      raceResults.jetski = false
      act1State.value = 'none'
    }
    if (act1State.value === 'transitionToTowtrack') {
      act1State.value = 'towtrack'
      const tow = this.findRoi('towtk')?.actor
      if (tow instanceof TowTrack) {
        void tow.startMission()
      }
    }
    if (act1State.value === 'transitionToAmbulance') {
      act1State.value = 'ambulance'
      this.cameraAnimationTriggerEnabled = false
      this.backgroundMusicTriggerEnabled = false
      const ambulance = this.ambulance
      if (ambulance != null) {
        const placement = this.boundaryManager.getObjectPlacementFromLocation('hospitalExited')
        ambulance.roi.moveRoiTo(placement.position, placement.quaternion)
        void ambulance.startMission()
      }
    }

    if (param?.music != null && act1State.value === 'none' && this.currentVehicle == null) {
      void engine.switchBackgroundMusic(param.music)
    }

    if (act1State.value === 'none') {
      this.allowExtras = true
      await this.extras.initialize()
      if (param?.spawn === 'pizzeriaExterior') {
        await this.extras.placeMamaAndPapa()
      }
    }

    if (param?.camLocation != null && act1State.value === 'none') {
      const reveals = [
        { spawn: 'garageExited', vehicle: 'dunecar', name: 'igs008na' },
        { spawn: 'jetskibuildExited', vehicle: 'jetski', name: 'ijs006sn' },
        { spawn: 'policeExited', vehicle: 'helicopter', name: 'ips002ro' },
        { spawn: 'racecarbuildExited', vehicle: 'racecar', name: 'irt007in' },
      ] as const
      const reveal = reveals.find(reveal => reveal.spawn === param.spawn)
      const state = reveal == null ? null : engine.currentSaveGame.getBuildState(reveal.vehicle)
      const info = reveal == null ? null : this.animationInfos.find(info => info.name.toLowerCase() === reveal.name)
      const action = info == null ? null : await this.getRunAnimation(info.objectId)
      if (reveal != null && state?.finishedBuild && !state.playedExitScript && action != null) {
        engine.currentSaveGame.setBuildState(reveal.vehicle, { ...state, playedExitScript: true })
        void this.playCameraAnimation(action).catch(error => {
          engine.currentSaveGame.setBuildState(reveal.vehicle, { ...state, playedExitScript: false })
          console.error(error)
        })
      } else {
        void this.ambient.cameraTrigger(param.camLocation)
      }
    }

    if (jukeBoxState.pendingStart) {
      jukeBoxState.pendingStart = false
      this._jukeboxEntity?.startAction()
    }
  }

  public override deactivate(): void {
    this.abortMission()
    super.deactivate()
  }

  public override getGroundPosition(): THREE.Vector3 {
    return this._playerMovement.getGroundPosition(this.camera.position, new THREE.Vector3(0, 0, 0))
  }

  public override placeOnGround(object: THREE.Object3D): void {
    this._playerMovement.placeOnGround(object)
  }

  public override keyPressed(key: string): void {
    if (key === 'Space') {
      const mission = this.missions.find(mission => mission.isInCutscene)
      if (mission != null) {
        mission.handleSpace()
        return
      }
    }

    super.keyPressed(key)

    if (key === 'KeyF' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }

    if (key === 'KeyM' && import.meta.env.DEV) {
      engine.currentSaveGame.nextSunPosition()
      this._updateSun()
    }
  }

  protected override get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return this._playerMovement.getDebugInfo()
  }

  public override get canMouseLook(): boolean {
    return super.canMouseLook && (!this.missions.some(mission => mission.isInCutscene) || this.hasReleasedPlayerAnimation) && (!(this.currentVehicle instanceof Helicopter) || helicopterState.status === 2)
  }

  public override update(delta: number): void {
    super.update(delta)

    const tow = this.findRoi('towtk')?.actor
    if (tow instanceof TowTrack && tow.missionActive && !tow.isInCutscene && this.currentVehicle !== tow) {
      tow.abort()
    }
    const ambulance = this.ambulance
    if (act1State.value === 'ambulance' && ambulance != null && ambulance.missionActive && !ambulance.isInCutscene && this.currentVehicle !== ambulance) {
      ambulance.abort()
    }

    if (this.isRunningCameraAnimation || (this.missions.some(mission => mission.isInCutscene) && !this.hasReleasedPlayerAnimation)) {
      void this.updateActors(delta, this.camera.position, this.camera.position)
      return
    }

    if (this.currentVehicle instanceof Helicopter && helicopterState.status !== 2) {
      this._dashboard.update(0, 0)
      void this.updateActors(delta, this.camera.position, this.camera.position)
      return
    }

    const { fromPos, toPos, normalizedSpeed } = this._playerMovement.update(delta, this.currentVehicle?.type ?? null)

    this.updateActors(delta, fromPos, toPos)

    this._dashboard.update(normalizedSpeed, this.currentVehicle?.fuel ?? 0, this._playerMovement.turn, delta)

    this.boundaryManager.update(fromPos, toPos, null)
  }
}
