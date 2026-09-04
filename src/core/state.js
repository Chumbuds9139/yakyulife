import {R, ri} from './rng.js?v=1.5.18';
import {POS_AB} from '../data/abilities.js?v=1.5.18';
import {LV} from '../data/teams.js?v=1.5.18';
export let S=null, stepQ=[];
function bindLevelOrg(state){let current=state.lv;Object.defineProperty(state,'lv',{enumerable:true,configurable:true,get(){return current;},set(v){current=v;const l=LV[v];if(l&&l.org)state.org=l.org;}});const l=LV[current];if(l&&l.org)state.org=l.org;return state;}
export function setS(v){if(v&&v.traits&&v.traits.taiwan&&!v.traits.samurai)v.traits.samurai=true;if(v&&v.traits)delete v.traits.taiwan;S=bindLevelOrg(v);}
export function newState(name,jersey,pos,role){
 const ab={};POS_AB[pos].forEach(k=>ab[k]=ri(20,32));if(pos==='P'){ab.vel+=ri(0,6);ab.brk+=ri(0,4);}else{ab.con+=ri(0,6);ab.pow+=ri(0,4);}
 const pot={},sh=(pos==='C'?POS_AB[pos].filter(k=>k!=='rng'):POS_AB[pos].slice());for(let i=sh.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=sh[i];sh[i]=sh[j];sh[j]=t;}if(pos==='P')sh.forEach((k,i)=>pot[k]=i===0?ri(70,80):i===1?ri(58,68):i===2?ri(50,60):ri(44,54));else{sh.forEach((k,i)=>pot[k]=i===0?ri(72,80):i===1?ri(64,74):i===2?ri(56,68):ri(46,62));if(pos==='C')pot.rng=ri(32,40);}
 const hsMap={'早稻田實業':1,'智辯和歌山':1,'明德義塾':2,'東海大相模':2,'聖光学院':3,'作新学院':3};const schools=Object.keys(hsMap),myTeam=schools[Math.floor(R()*schools.length)];
 return bindLevelOrg({name,jersey,pos,role:pos==='P'?null:null,perfectLock:false,invincible:false,age:16,year:2026,stage:'HS',stageYr:1,pot,hsMap,hsTier:hsMap[myTeam],team:myTeam,potSum0:Object.values(pot).reduce((a,b)=>a+b,0),league:null,org:null,orgTeam:null,lastCpblTeam:null,teamTally:{CORP:{},INDEP:{},CPBL:{},NPB:{},MLB:{}},ab,
 traits:{genius:false,glass:false,iron:false,scum:false,late:false,disc:false,academy:false,intlace:false,franchise:false,clutch:false,favorite:false,phoenix:false,combo:false,onetool:false,rubber:false,legend:false,oldghost:false,adking:false,miraclegen:false,strongpitch:false,stronghit:false,championmaker:false,yips:false,distract:false,cancer:false,ambience:false,goldcloth:false,thief:false,latepractice:false,mrteam:false,confidante:false,smallschool:false,grinder:false,rainbow:false,samurai:false},removed:[],
 cntSave:0,cntSaveWin:0,cntTrainingSafeFail:0,cntNormWin:0,cntSnack:0,cntBoldWin:0,cntBoldFail:0,cntSocialBoldFail:0,cntEndorseBoldWin:0,hsChampions:0,oldGhostPending:false,oldGhostUsed:false,samePick:0,samePickKey:null,teamSeasons:0,teamYears:0,teamStarYears:0,franchiseActive:false,franchiseTeamName:null,six:0,bigInj:0,glassYear:null,ironStreak:0,npbYears:0,npbDraftEntered:false,injNext:0,tmpInj:0,rehab:0,marketInjury:'healthy',salary:0,outsideIncome:0,yearOutsideIncome:0,pool:0,pendStat:0,seasonFactor:1,
 stats:{CORP:null,INDEP:null,CPBL:null,NPB:null,MLB:null,MINOR:null},contracts:[],honors:[],legendLeagues:[],rainbowLeagues:[],pitcherTCLeagues:[],hitterTCLeagues:[],intlCount:0,intlLock:null,intlName:null,intlStat:{G:0,PA:0,AB:0,H:0,HR:0,RBI:0,BB:0,IP:0,SO:0,ER:0,W:0,SV:0},intlLog:[],intlBest:null,dpos:null,dposYears:{},roleYears:{},tradeRefuse:0,champThisTeam:false,svc:0,svcOrg:null,faElig:false,tradeHeat:0,complainCount:0,demotionRefused:false,tj:0,tjCount:0,tjCrises:0,effort:'普通',tjSuccess:0,lastLv:null,love:{st:'single',partner:null,kids:0,caught:0,affairs:0,exes:[],dyrs:0,datedTimes:0},traits2:{},log:[],ct:null,done:false});
}
export function playerName(){return `${S.name} #${S.jersey}`;}
export function blankStat(){return {yr:0,G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,AS:0,DEF:0,DPG:{}};}
export function bucketOf(lv){
  if(lv==='NPB_TRAIN'||lv==='NPB2'||lv==='NPB1')return 'NPB';
  if(lv==='CPBL2'||lv==='CPBL1')return 'CPBL';
  if(lv==='MLB')return 'MLB';
  if(lv==='CORP')return 'CORP';
  if(lv==='INDEP')return 'INDEP';
  const l=lv&&LV[lv];
  if(l&&(l.org==='CORP'||l.org==='INDEP'))return l.org;
  return l&&l.top?l.top:'MINOR';
}
export const CAREER_STAT_BUCKETS=['MLB','NPB','CPBL','INDEP','CORP','MINOR'];
export const CAREER_EVAL_BUCKETS=['MLB','NPB','CPBL'];
export function nextStep(){if(S.done){stepQ=[];return;}const f=stepQ.shift();if(f)f();}
export function stageLabel(){if(S.stage==='HS')return '高'+['一','二','三'][S.stageYr-1];if(S.stage==='U')return '大'+['一','二','三','四'][S.stageYr-1];if(S.stage==='CORP')return '社會人';if(S.stage==='INDEP')return '獨立聯盟';if(S.stage==='PRO'){if(S.lv==='NPB_TRAIN')return 'NPB育成';if(S.lv==='NPB2')return 'NPB二軍';if(S.lv==='NPB1')return 'NPB一軍';if(S.lv==='CPBL2')return '中職二軍／培養型';if(S.lv==='CPBL1')return '中職一軍／洋將';if(S.lv==='MLB')return 'MLB';const l=LV[S.lv];if(l)return l.n;}return '進行中';}
