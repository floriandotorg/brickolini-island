import * as THREE from 'three'
// import { CNs001Pe, tns030bd_RunAnim } from '../actions/act2main'
import {
  Beach,
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
  Gas,
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
  InfoCenter_Entity,
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
  MedCtr,
  NoPizaz_Texture,
  NoPizza_Texture,
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
  Police,
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
  Racej,
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
} from '../../actions/isle'
import { Beach_Music, BeachBlvd_Music, Cave_Music, CentralNorthRoad_Music, CentralRoads_Music, GarageArea_Music, Hospital_Music, InformationCenter_Music, Jail_Music, Park_Music, PoliceStation_Music, Quiet_Audio, RaceTrackRoad_Music, ResidentalArea_Music } from '../../actions/jukebox'
import { type AnimationAction, type AudioAction, getExtraValue, type ParallelAction, type PhonemeAction, type PositionalAudioAction, type RunAnimationAction } from '../../lib/action-types'
import { type DTA, loadAnimationInfoFromDTA } from '../../lib/assets/dta'
import { calculateTransformationMatrix } from '../../lib/assets/model'
import { createTexture } from '../../lib/assets/texture'
import type { Composer } from '../../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../../lib/engine'
import { type Location, locations } from '../../lib/locations'
import { getSettings } from '../../lib/settings'
import { switchWorld } from '../../lib/switch-world'
import type { Vehicle, VehicleType } from '../../lib/world/dashboard'
import type { WorldName } from '../../lib/world/world'
import { IsleBase, type IsleParam } from '../isle-base'
import { PizzaMission } from './missions/pizza-mission'

// import { tns002br_RunAnim } from '../actions/act2main'

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

const CAM_HEIGHT = 1.25
const MAX_ROT_VEL = 80
const MAX_LINEAR_ACCEL = 10
const MAX_ROT_ACCEL = 30
const MAX_LINEAR_DECEL = 50
const MAX_ROT_DECEL = 50
const EPSILON = 0.0001

const TRANSPORTATION_MAX_LINEAR_VEL: {
  [key in VehicleType]: number
} = {
  ambul: 40,
  bike: 20,
  dunecar: 25,
  helicopter: 60,
  jetski: 25,
  moto: 40,
  racecar: 40,
  skate: 15,
  towtk: 40,
}

export class Isle extends IsleBase {
  private _cameraAnimationPlaying = false

  private _animationTrigger: Array<{
    center: THREE.Vector3
    radius: number
    animation: ParallelAction<AnimationAction | PositionalAudioAction | PhonemeAction | AudioAction>
  }> = []

  private _currentVehicle: Vehicle | null = null
  private _animationInfos: DTA.AnimationInfo[] = []
  private readonly _pizzaMission = new PizzaMission(this)

  public cameraAnimationTriggerEnabled = true
  public backgroundMusicTriggerEnabled = true

  public get animationInfos(): DTA.AnimationInfo[] {
    return this._animationInfos
  }

  public get cameraAnimationPlaying(): boolean {
    return this._cameraAnimationPlaying
  }

  public getVehicleMesh(vehicle: VehicleType): THREE.Object3D[] {
    let result: THREE.Object3D[] | THREE.Object3D | null = null

    switch (vehicle) {
      case 'bike':
        result = this._bikeMesh
        break
      case 'moto':
        result = this._motobkMesh
        break
      case 'skate':
        result = this._skateMesh
        break
      case 'ambul':
        result = this._ambulanceMesh
        break
      case 'towtk':
        result = this._towtruckMesh
        break
    }

    if (result == null) {
      throw new Error(`Vehicle mesh not found for ${vehicle}`)
    }

    return Array.isArray(result) ? result : [result]
  }

  public placeVehicle(vehicle: VehicleType, boundaryName: string, src: number, srcScale: number, dst: number, _dstScale: number): void {
    const { position, quaternion } = this._boundaryManager.getObjectPlacement(boundaryName, src, srcScale, dst, _dstScale)
    this.moveObjectTo(this.getVehicleMesh(vehicle), position, quaternion)
  }

  private get _currentVehicleMesh(): THREE.Object3D[] {
    if (this._currentVehicle == null) {
      throw new Error('No vehicle set')
    }
    return this.getVehicleMesh(this._currentVehicle.type)
  }

  constructor() {
    super('isle')
  }

  override async init(): Promise<void> {
    await super.init()

    this._animationInfos = await loadAnimationInfoFromDTA('ACT1')
    for (const animationInfo of this._animationInfos) {
      animationInfo.active = true
    }

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

      if (this._pizzaMission.handleTrigger(name[2], data)) {
        return
      }

      if (name[2] === 'M' && this.backgroundMusicTriggerEnabled) {
        if (direction === 'inbound') {
          engine.switchBackgroundMusic(music[triggers[data - 1][0] - 1])
        } else {
          engine.switchBackgroundMusic(music[triggers[data - 1][1] - 1])
        }
      } else if (name[2] === 'C') {
        const location = locations.at(data)

        if (this.cameraAnimationTriggerEnabled && (location == null || !location.animationPlayedAtLocation || location.frequency < Math.floor(Math.random() * 101))) {
          const indices = (() => {
            let firstIndex = -1
            for (let n = 0; n < this._animationInfos.length; ++n) {
              if (this._animationInfos[n].location === -1) {
                return null
              }
              if (this._animationInfos[n].location === data) {
                firstIndex = n
                break
              }
            }
            if (firstIndex < 0) {
              return null
            }
            let lastIndex = firstIndex
            for (let n = firstIndex + 1; n < this._animationInfos.length; ++n) {
              if (this._animationInfos[n].location !== data) {
                lastIndex = n
                break
              }
            }

            return { firstIndex, lastIndex }
          })()

          if (indices != null) {
            const animationInfosAtLocation = this._animationInfos.slice(indices.firstIndex, indices.lastIndex)
            let lastAnimationNumPlayed = Number.MAX_SAFE_INTEGER
            let animationToPlay: DTA.AnimationInfo | undefined
            for (const animationInfo of animationInfosAtLocation) {
              if (!this._cameraAnimationPlaying && animationInfo.actorMask & engine.currentPlayerMask && animationInfo.active && animationInfo.numPlayed < lastAnimationNumPlayed && (animationInfo.numPlayed === 0 || animationInfo.name[0] !== 'i') && animationInfo.name[0] !== 'I') {
                lastAnimationNumPlayed = animationInfo.numPlayed
                animationToPlay = animationInfo
              }
            }
            if (animationToPlay) {
              const animationAction = ANIMATIONS.find(a => a.id === animationToPlay.objectId)
              if (animationAction == null) {
                throw new Error(`Animation action not found for animation info ${animationToPlay.name}`)
              }
              this.playCameraAnimation(animationAction, animationToPlay, location)
            }
          }
        }
      }
    }

    for (const child of [Gas, Police, InfoCenter_Entity, Beach, Racej, MedCtr]) {
      const entity = getExtraValue(child, 'Object')?.toLowerCase()
      const worldName: WorldName | undefined = (() => {
        switch (entity) {
          case 'hospitalentity':
            return 'hospital'
          case 'gasstationentity':
            return 'garage'
          case 'infocenterentity':
            return 'infomain'
          case 'policeentity':
            return 'police'
          case 'beachhouseentity':
            return 'jetski'
          case 'racestandsentity':
            return 'racecar'
          default:
            return undefined
        }
      })()
      if (worldName == null) {
        throw new Error(`World name not found for ${child.name}`)
      }
      if (child.children[0] == null) {
        throw new Error(`Action for world ${worldName} has no children`)
      }
      const meshName = getExtraValue(child.children[0], 'DB_CREATE')?.toLowerCase()
      if (meshName == null) {
        throw new Error(`Found no valid mesh name for world ${worldName}`)
      }
      const buildingMeshes = this.getObjectsByPrefix(meshName)
      if (buildingMeshes.length < 1) {
        throw new Error(`Mesh ${meshName} not found`)
      }
      this.addClickListener(buildingMeshes, async () => {
        if (this._pizzaMission.isActive || this._cameraAnimationPlaying) {
          return false
        }
        console.log(`switched to ${meshName}, ${worldName}`)
        void switchWorld(worldName)
        return true
      })
    }

    const isle = this.scene.getObjectByName('isle_hi')
    if (isle == null || !(isle instanceof THREE.Object3D)) {
      throw new Error('Isle mesh not found')
    }
    this._isleMesh = isle

    this._bikeMesh = this.scene.getObjectByName('bike') ?? null
    this._motobkMesh = this.scene.getObjectByName('motobk') ?? null
    this._skateMesh = this.scene.getObjectByName('skate') ?? null
    this._ambulanceMesh = this.getObjectsByPrefix('ambul') ?? []
    this._towtruckMesh = this.getObjectsByPrefix('towtk') ?? []

    if (this._bikeMesh == null || this._motobkMesh == null || this._skateMesh == null || this._ambulanceMesh.length < 1 || this._towtruckMesh.length < 1) {
      throw new Error('Vehicle meshes not found')
    }

    this.placeVehicle('bike', 'INT44', 2, 0.5, 0, 0.5)
    this.placeVehicle('moto', 'INT43', 4, 0.5, 1, 0.5)
    this.placeVehicle('skate', 'EDG02_84', 4, 0.5, 0, 0.5)

    await this._pizzaMission.init()

    if (import.meta.hot) {
      import.meta.hot.accept('../../lib/world/dashboard', newModule => {
        if (newModule == null) {
          return
        }
        this._dashboard = new newModule.Dashboard()
        this._dashboard.onExit = () => {
          this._exitVehicle()
        }
        this._showDashboard()
      })
    }

    this.addClickListener(this._bikeMesh, async () => {
      if (this._pizzaMission.isActive || this._cameraAnimationPlaying) {
        return false
      }
      await this.enterVehicle({ type: 'bike' })
      return true
    })
    this.addClickListener(this._motobkMesh, async () => {
      if (this._pizzaMission.isActive || this._cameraAnimationPlaying) {
        return false
      }
      await this.enterVehicle({ type: 'moto' })
      return true
    })
    this.addClickListener(this._skateMesh, async () => {
      if (this._pizzaMission.isActive || this._cameraAnimationPlaying) {
        return false
      }
      await this.enterVehicle({ type: 'skate', showPizza: false })
      return true
    })
    this.addClickListener(this._ambulanceMesh, async () => {
      if (this._pizzaMission.isActive || this._cameraAnimationPlaying) {
        return false
      }
      await this.enterVehicle({ type: 'ambul' })
      return true
    })
    this.addClickListener(this._towtruckMesh, async () => {
      if (this._pizzaMission.isActive || this._cameraAnimationPlaying) {
        return false
      }
      await this.enterVehicle({ type: 'towtk' })
      return true
    })

    this._dashboard.onExit = () => {
      this._exitVehicle()
    }

    this.camera.position.set(9, CAM_HEIGHT, -47)
    this.camera.lookAt(19, 1, -43)
    this._placeObjectOnGround(this.camera)

    // extra
    // this.playAnimation(CNs001Pe)

    // brickster is loose
    // this.playAnimation(tns030bd_RunAnim, new THREE.Vector3(this.camera.position.x + 2, 1, this.camera.position.z - 1))

    // hospital pizzeria scene
    // this.playAnimation(hpz057ma_RunAnim)

    // brickster scene (only works in ACT2)
    // this.playAnimation(tns002br_RunAnim)
  }

  public enterVehicle = async (vehicle: Vehicle): Promise<void> => {
    await engine.transition()

    this._currentVehicle = vehicle

    for (const mesh of this._currentVehicleMesh) {
      mesh.visible = false
    }
    this.camera.position.set(this._currentVehicleMesh[0].position.x, this._currentVehicleMesh[0].position.y, this._currentVehicleMesh[0].position.z)
    this.camera.quaternion.copy(this._currentVehicleMesh[0].quaternion)
    this._placeObjectOnGround(this.camera)

    this._showDashboard()
  }

  public override activate(composer: Composer, param?: IsleParam): void {
    super.activate(composer, param)
    this._dashboard.activate(composer)
    if (param != null) {
      const { position, quaternion } = this._boundaryManager.getObjectPlacement(param.position.boundaryName, param.position.source, param.position.sourceScale, param.position.destination, param.position.destinationScale)
      this.camera.position.copy(position)
      this.camera.quaternion.copy(quaternion)
    }
    const noPizzaSign = this.scene.getObjectByName('nopizza')?.children[0]
    if (noPizzaSign == null || !(noPizzaSign instanceof THREE.Mesh)) {
      throw new Error('No pizza sign found')
    }
    noPizzaSign.material.map = engine.currentSaveGame.player === 'pepper' ? createTexture(NoPizaz_Texture) : createTexture(NoPizza_Texture)
  }

  public async playCameraAnimation(action: RunAnimationAction, animationInfo?: DTA.AnimationInfo, location?: Location): Promise<void> {
    if (animationInfo == null) {
      animationInfo = this.animationInfos.find(a => a.objectId === action.id)
      if (animationInfo == null) {
        throw new Error(`Animation info not found for action ${action.name}`)
      }
      location = locations.at(animationInfo.location)
    }

    this._verticalVel = 0
    this._pitchVel = 0
    this._rotVel = 0
    this._linearVel = 0

    this._cameraAnimationPlaying = true
    ++animationInfo.numPlayed
    if (location != null) {
      location.animationPlayedAtLocation = true
    }
    const extraTracks = (() => {
      if (location == null || !animationInfo.hasCameraAnimation) {
        return undefined
      }
      const matrix = calculateTransformationMatrix(location.position, location.direction, location.up)
      const position = new THREE.Vector3()
      const quaternion = new THREE.Quaternion()
      matrix.decompose(position, quaternion, new THREE.Vector3())
      // for some reason we need to rotate yaw by 180 degrees
      const rotationQuaternion = new THREE.Quaternion()
      rotationQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      quaternion.premultiply(rotationQuaternion)
      quaternion.normalize()
      const cameraQuaternion = new THREE.Quaternion()
      cameraQuaternion.copy(this.camera.quaternion)
      cameraQuaternion.normalize()
      // ensure shortest path
      if (cameraQuaternion.dot(quaternion) < 0) {
        quaternion.x *= -1
        quaternion.y *= -1
        quaternion.z *= -1
        quaternion.w *= -1
      }
      return [
        new THREE.VectorKeyframeTrack('camera.position', [0, 1], [this.camera.position.x, this.camera.position.y, this.camera.position.z, position.x, position.y, position.z]),
        new THREE.QuaternionKeyframeTrack('camera.quaternion', [0, 1], [this.camera.quaternion.x, this.camera.quaternion.y, this.camera.quaternion.z, this.camera.quaternion.w, quaternion.x, quaternion.y, quaternion.z, quaternion.w]),
      ]
    })()
    return this.playAnimation(action, {
      extraTracks,
      unskippable: extraTracks != null,
      lockCamera: extraTracks != null,
    }).then(() => {
      this._cameraAnimationPlaying = false
    })
  }

  private _showDashboard(): void {
    if (this._currentVehicle == null) {
      return
    }

    this._dashboard.show(this._currentVehicle)
  }

  public hidePizzaIfOnSkateboard(): void {
    if (this._currentVehicle == null) {
      return
    }
    this._dashboard.clear()
    this._dashboard.show({ type: 'skate', showPizza: false })
  }

  private _exitVehicle(): void {
    if (this._currentVehicle == null) {
      return
    }

    const groundPosition = this._getGroundPosition(this.camera.position, new THREE.Vector3(0, 0, 0))
    this.moveObjectTo(this._currentVehicleMesh, groundPosition, this.camera.quaternion)
    for (const mesh of this._currentVehicleMesh) {
      mesh.visible = true
    }

    this.camera.position.add(new THREE.Vector3(0, 0, -4).applyQuaternion(this.camera.quaternion))
    this._placeObjectOnGround(this.camera)

    this._dashboard.clear()
    this._currentVehicle = null

    this._pizzaMission.abort()
  }

  public override resize(width: number, height: number): void {
    super.resize(width, height)
  }

  public override pointerDown(event: NormalizedMouseEvent): void {
    super.pointerDown(event)
    this._dashboard.pointerDown(event.normalizedX, event.normalizedY)
  }

  public override pointerUp(event: NormalizedMouseEvent): void {
    super.pointerUp(event)
    this._dashboard.pointerUp()
  }

  private _getGroundPosition(position: THREE.Vector3, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): THREE.Vector3 {
    const downRay = new THREE.Raycaster(position.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3(0, -1, 0), 0, 1000)
    const hit = downRay.intersectObjects(this._groundGroup)[0]
    if (hit) {
      return hit.point.clone().add(offset)
    }
    throw new Error('No ground hit')
  }

  private _placeObjectOnGround(object: THREE.Object3D, offset = new THREE.Vector3(0, CAM_HEIGHT, 0)): void {
    object.position.copy(this._getGroundPosition(object.position, offset))
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

    this._pizzaMission.update()

    if (this._water != null) {
      this._water.material.uniforms.time.value += delta * 0.1
    }

    if (this.isRunningCameraAnimation) {
      return
    }

    const speedMultiplier = this._slewMode ? 4 : 1

    const maxLinearVel = TRANSPORTATION_MAX_LINEAR_VEL[this._currentVehicle?.type as VehicleType] ?? 6

    const targetLinearVel = (engine.isKeyDown('ArrowUp') ? maxLinearVel : engine.isKeyDown('ArrowDown') ? -maxLinearVel : 0) * speedMultiplier

    const targetRotVel = engine.isKeyDown('ArrowLeft') ? MAX_ROT_VEL : engine.isKeyDown('ArrowRight') ? -MAX_ROT_VEL : 0

    const targetVerticalVel = this._slewMode ? (engine.isKeyDown('q') ? maxLinearVel * speedMultiplier : engine.isKeyDown('e') ? -maxLinearVel * speedMultiplier : 0) : 0

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
    const maxVelCurrent = maxLinearVel * (this._slewMode ? 4 : 1)
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
