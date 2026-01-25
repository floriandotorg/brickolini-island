import * as THREE from 'three'
import {
  _Isle,
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
  ijs006sn_RunAnim,
  ips001ro_RunAnim,
  ips002ro_RunAnim,
  ipz001rd_RunAnim,
  irt001in_RunAnim,
  irt007in_RunAnim,
  irtx01sl_RunAnim,
  ivo918in_RunAnim,
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
} from '../../actions/isle'
// import { CNs001Pe, tns030bd_RunAnim } from '../actions/act2main'
import { Beach_Music, BeachBlvd_Music, Cave_Music, CentralNorthRoad_Music, CentralRoads_Music, GarageArea_Music, Hospital_Music, InformationCenter_Music, Jail_Music, Park_Music, PoliceStation_Music, Quiet_Audio, RaceTrackRoad_Music, ResidentalArea_Music } from '../../actions/jukebox'
import { type AnimationAction, type AudioAction, isActorAction, isBoundaryAction, isEntityAction, type ParallelAction, type PhonemeAction, type PositionalAudioAction, type RunAnimationAction } from '../../lib/action-types'
import type { DTA } from '../../lib/assets/dta'
import { calculateTransformationMatrix } from '../../lib/assets/model'
import { createTexture } from '../../lib/assets/texture'
import type { Composer } from '../../lib/effect/composer'
import { engine, type NormalizedMouseEvent } from '../../lib/engine'
import { type Location, locations } from '../../lib/locations'
import { PlayerMovement } from '../../lib/world/player-movement'
import { IsleBase, type IsleParam } from '../isle-base'
import { PizzaMission } from './missions/pizza-mission'

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

export class Isle extends IsleBase {
  private readonly _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this.boundaryManager.walls,
    () => this._isleMesh,
  )

  private _animationTrigger: Array<{
    center: THREE.Vector3
    radius: number
    animation: ParallelAction<AnimationAction | PositionalAudioAction | PhonemeAction | AudioAction>
  }> = []

  private _cameraAnimationPlaying = false
  private readonly _pizzaMission = new PizzaMission(this)

  public backgroundMusicTriggerEnabled = true

  constructor() {
    super('isle', { wdbWorldName: 'ACT1', dtaWorldName: 'ACT1' })
  }

  override async init(): Promise<void> {
    await super.init()

    for (const child of _Isle.children) {
      if (isBoundaryAction(child)) {
        await this.loadBoundaries(child)
      } else if (isActorAction(child)) {
        await this.handleActorAction(child)
      } else if (isEntityAction(child)) {
        await this.handleEntityAction(child)
      } else if (child.presenter === 'LegoLocomotionAnimPresenter') {
        // Run animations, can be ignored
      } else if (child.presenter === 'LegoLoadCacheSoundPresenter') {
        // We don't need to cache
      } else {
        console.warn('Unknown action type:', child)
      }
    }

    this.boundaryManager.onTrigger = (name, data, direction) => {
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
          void engine.switchBackgroundMusic(music[triggers[data - 1][0] - 1])
        } else {
          void engine.switchBackgroundMusic(music[triggers[data - 1][1] - 1])
        }
      } else if (name[2] === 'C') {
        const location = locations.at(data)

        if (this.cameraAnimationTriggerEnabled && (location == null || !location.animationPlayedAtLocation || location.frequency < Math.floor(Math.random() * 101))) {
          const indices = (() => {
            let firstIndex = -1
            for (let n = 0; n < this.animationInfos.length; ++n) {
              if (this.animationInfos[n].location === -1) {
                return null
              }
              if (this.animationInfos[n].location === data) {
                firstIndex = n
                break
              }
            }
            if (firstIndex < 0) {
              return null
            }
            let lastIndex = firstIndex
            for (let n = firstIndex + 1; n < this.animationInfos.length; ++n) {
              if (this.animationInfos[n].location !== data) {
                lastIndex = n
                break
              }
            }

            return { firstIndex, lastIndex }
          })()

          if (indices != null) {
            const animationInfosAtLocation = this.animationInfos.slice(indices.firstIndex, indices.lastIndex)
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
              void this.playCameraAnimation(animationAction, animationToPlay, location)
            }
          }
        }
      }
    }

    const isle = this.scene.getObjectByName('isle_hi')
    if (isle == null || !(isle instanceof THREE.Object3D)) {
      throw new Error('Isle mesh not found')
    }
    this._isleMesh = isle

    await this._pizzaMission.init()

    this._dashboard.onExit = () => {
      this.currentVehicle?.exit()
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

  public override async activate(composer: Composer, param?: IsleParam): Promise<void> {
    await super.activate(composer, param)
    if (param != null) {
      const { position, quaternion } = this.boundaryManager.getObjectPlacement(param.position.boundaryName, param.position.source, param.position.sourceScale, param.position.destination, param.position.destinationScale)
      this.camera.position.copy(position)
      this.camera.quaternion.copy(quaternion)
    }
    const noPizzaSign = this.scene.getObjectByName('nopizza')?.children[0]
    if (noPizzaSign == null || !(noPizzaSign instanceof THREE.Mesh)) {
      throw new Error('No pizza sign found')
    }
    noPizzaSign.material.map = engine.currentSaveGame.player === 'pepper' ? createTexture(NoPizaz_Texture) : createTexture(NoPizza_Texture)
  }

  public override getGroundPosition(): THREE.Vector3 {
    return this._playerMovement.getGroundPosition(this.camera.position, new THREE.Vector3(0, 0, 0))
  }

  public override placeOnGround(object: THREE.Object3D): void {
    this._playerMovement.placeOnGround(object)
  }

  public async playCameraAnimation(action: RunAnimationAction, animationInfo?: DTA.AnimationInfo, location?: Location): Promise<void> {
    if (animationInfo == null) {
      animationInfo = this.animationInfos.find(a => a.objectId === action.id)
      if (animationInfo == null) {
        throw new Error(`Animation info not found for action ${action.name}`)
      }
      location = locations.at(animationInfo.location)
    }

    this._playerMovement.resetVelocities()

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

  public override resize(width: number, height: number): void {
    super.resize(width, height)
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    await super.pointerDown(event)
    this._dashboard.pointerDown(event.normalizedX, event.normalizedY)
  }

  public override pointerUp(event: NormalizedMouseEvent): void {
    super.pointerUp(event)
    this._dashboard.pointerUp()
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }

    if (key === 'm') {
      engine.currentSaveGame.nextSunPosition()
      this._updateSun()
    }
  }

  protected override get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return this._playerMovement.getDebugInfo()
  }

  public override update(delta: number): void {
    super.update(delta)

    this._pizzaMission.update()

    if (this._water != null) {
      this._water.material.uniforms.time.value += delta * 0.1
    }

    if (this.isRunningCameraAnimation) {
      return
    }

    const { fromPos, toPos, normalizedSpeed } = this._playerMovement.update(delta, this.currentVehicle?.type ?? null)

    this.updateActors(delta, fromPos, toPos)

    this._dashboard.update(normalizedSpeed)

    this.boundaryManager.update(fromPos, toPos)
    for (const trigger of this._animationTrigger) {
      const distance = toPos.distanceTo(trigger.center)
      if (distance <= trigger.radius && fromPos.distanceTo(trigger.center) > trigger.radius) {
        console.log(`Playing animation ${trigger.animation.name}`)
        void this.playAnimation(trigger.animation)
      }
    }
  }
}
