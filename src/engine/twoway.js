import {S} from '../core/state.js?v=1.5.30';
import {clamp} from '../core/rng.js?v=1.5.30';
import {LV} from '../data/teams.js?v=1.5.30';

export function isTwoWay(){ return S?.pos==='TW'; }
export function twHasPitch(){ return isTwoWay() || (S?.twSeasons||0)>0 || (S?.log||[]).some(r=>r?.st?.GP>0); }
export function twHasBat(){ return isTwoWay() || (S?.twSeasons||0)>0 || (S?.log||[]).some(r=>r?.st?.G>0 && r?.st?.PA>0); }
export function twoWayView(){ return isTwoWay() || (S?.twSeasons||0)>0 || (S?.log||[]).some(r=>r?.tw===true); }

/* 原作者規格的二刀流能力側：投球 3 工具＋體力、打擊 4 工具＋體力。
   不把守備能力納入二刀流的訓練成本；二刀流不投球的比賽日固定 DH。 */
export function twPitchOVR(){
  const a=S.ab||{}; return Math.round(a.vel*0.42+a.ctl*0.30+a.brk*0.18+a.sta*0.10);
}
export function twBatOVR(){
  const a=S.ab||{}; return Math.round(a.con*0.38+a.pow*0.27+a.eye*0.20+a.spd*0.15+a.sta*0.00);
}
export function twOVR(){ return Math.round((twPitchOVR()+twBatOVR())/2); }

export function twWorkloadPlan(){
  const plan=S?.twPlan||'two';
  return plan==='pitch'?{pitch:0.85,bat:1.00}:plan==='hit'?{pitch:0.50,bat:1.00}:{pitch:0.70,bat:1.00};
}
export function twSetPlan(plan){
  if(!isTwoWay())return false;
  if(!['pitch','two','hit'].includes(plan))return false;
  S.twPlan=plan; return true;
}

/* 收斂條件：任一側能力低於目前頂級聯盟門檻，依另一側能力較高者收斂。
   這個函式只負責狀態判定；實際季末 UI 由主流程決定，避免把日本版選秀／合約流程綁死。 */
export function twConvergence(lv=S.lv){
  if(!isTwoWay()||!LV[lv])return null;
  const par=Number(LV[lv].par)||50;
  const p=twPitchOVR(),b=twBatOVR();
  if(p>=par-3&&b>=par-3)return null;
  const target=p>=b?'P':'OF';
  S.pos=target;
  S.twAuditLv=lv;
  return target;
}

export function twCareerStat(st={}){
  return {
    G:Number(st.G)||0,GP:Number(st.GP||st.G)||0,PA:Number(st.PA)||0,AB:Number(st.AB)||0,
    H:Number(st.H)||0,pH:Number(st.pH)||0,HR:Number(st.HR)||0,pHR:Number(st.pHR)||0,
    BB:Number(st.BB)||0,pBB:Number(st.pBB)||0,IP:Number(st.IP)||0,SO:Number(st.SO)||0,
    ER:Number(st.ER)||0,W:Number(st.W)||0,L:Number(st.L)||0,SV:Number(st.SV)||0
  };
}

export function splitTwoWayStat(st={}){
  const x=twCareerStat(st);
  return {
    batting:{G:x.G,PA:x.PA,AB:x.AB,H:x.H,HR:x.HR,BB:x.BB},
    pitching:{GP:x.GP,IP:x.IP,pH:x.pH,pHR:x.pHR,pBB:x.pBB,SO:x.SO,ER:x.ER,W:x.W,L:x.L,SV:x.SV}
  };
}
