import {S} from '../core/state.js?v=1.5.11';
import {R, ri, chance, clamp} from '../core/rng.js?v=1.5.11';
import {ABL, POS_AB, DPN, DP_TH, DP_BAR, POS_ADJ_RUNS, DP_RANK} from '../data/abilities.js?v=1.5.11';
import {LV} from '../data/teams.js?v=1.5.11';
import {card, choose, board} from '../ui/dom.js?v=1.5.11';

/* 能力系統只需要投手定位的純判定；不要反向依賴 season.js，避免 awards → ability → season → awards 的循環模組圖。 */
function pitcherRoleForAbility(){
  if(S.ab.sta>=52)return 'SP';
  const pd=(S.prevD!==undefined?S.prevD:(S.lastD||0));
  const currentTop=LV[S.lv]&&LV[S.lv].top, previousTop=LV[S.lastLv]&&LV[S.lastLv].top;
  const sameTopLeague=!!currentTop&&previousTop===currentTop;
  const d=(sameTopLeague&&S.role&&S.role!=='SP')?pd:-99;
  if(S.role==='CL')return d>=1?'CL':'MR';
  return d>=3?'CL':'MR';
}
function roleLabelForAbility(r){ return {SP:'先發',MR:'中繼',CL:'終結者'}[r]||'—'; }

export function dpScore(p){ const a=S.ab;
  switch(p){
    case 'SS': return a.rng*0.5 + a.fld*0.3 + a.arm*0.2;   /* 游擊:範圍主導 */
    case '2B': return a.rng*0.45+ a.fld*0.4 + a.arm*0.15;  /* 二壘:範圍+守備,臂力次要 */
    case '3B': return a.arm*0.45+ a.fld*0.35+ a.rng*0.2;   /* 三壘:臂力主導 */
    case 'CF': return a.rng*0.55+ a.fld*0.3 + a.arm*0.15;  /* 中外野:範圍主導 */
    case 'RF': return a.arm*0.45+ a.rng*0.35+ a.fld*0.2;   /* 右外野:強臂 */
    case 'LF': return a.rng*0.4 + a.fld*0.35+ a.arm*0.25;   /* 左外野:範圍為主,要求低 */
    case 'C':  return a.fld*0.4 + a.cat*0.4 + a.arm*0.2;   /* 捕手:接球+配球+臂力,不看範圍 */
    case '1B': return a.fld*0.6 + a.rng*0.2 + a.arm*0.2;   /* 一壘:守備為主,門檻低 */
    default: return 99;
  }
}
export function posAdjLabel(p){ const v=POS_ADJ_RUNS[p]||0; return `薪資守位調整 ${v>0?'+':''}${v}／162 場`; }
export function dpBar(){ /* 年輕球員吃潛力紅利,球團不急著拔守位 */
  const base=DP_BAR[S.lv]||0;
  const disc=(S.age<=21?7:S.age<=24?5:S.age<=26?2:0)+(S.traits&&S.traits.favorite?3:0); /* 愛將:教練不急著拔你的守位 */
  return base-disc;
}
export function dpQual(p){
  if(p==='DH')return true;
  if(!DP_TH[p]||!DP_TH[p][S.lv])return true;   /* 非頂級聯盟不設限 */
  /* 年輕球員吃潛力紅利:門檻略降(球團給時間成長) */
  const youthAdj = (S.age<24?-3 : S.age<26?-1.5 : 0)+(S.traits&&S.traits.favorite?-3:0); /* 愛將:守位門檻永久紅利 */
  return dpScore(p) >= DP_TH[p][S.lv]+youthAdj;
}
export function dpList(){ /* 依守位難度掃描:內野手守內野序、外野手守外野序,選出守得動的(最高階在前) */
  /* 候選守位依當前守位群:內野走內野光譜、外野走外野光譜 */
  const order = S.pos==='IF'
    ? ['SS','2B','3B','1B']       /* 內野:游擊>二壘>三壘>一壘 */
    : ['CF','RF','LF','1B'];      /* 外野:中外野>右外野>左外野>(一壘) */
  const q=order.filter(dpQual); q.push('DH'); return q;
}
export function dposReview(cont){
  if(S.stage!=='PRO'||!(S.lv==='CPBL1'||S.lv==='NPB1'||S.lv==='MLB')){ cont(); return; }
  if(S.pos==='C'){ /* 捕手容忍度高,但爛到底也會被移去一壘或DH */
    if(!S.dpos)S.dpos='C';
    const cOk=()=>{ const bar=dpBar(), a=S.ab;
      return a.fld>=bar-6 && a.cat>=bar-4 && a.arm>=bar-2; };
    if(S.dpos==='C'){
      if(cOk()){ cont(); return; }
      const a=S.ab;
      /* 依接球、配球、臂力的當下能力值，顯示數值最低的一環。 */
      const issue=[['漏球',a.fld],['配球',a.cat],['阻殺率',a.arm]]
        .sort((x,y)=>x[1]-y[1])[0][0];
      const opts=[];
      if(dpQual('1B'))opts.push({t:'移防 一壘手',main:true,s:posAdjLabel('1B'),
        f:()=>{S.dpos='1B';card('info','守位調整','捕手裝備收進置物櫃——新球季改守<b class="hl">一壘</b>。');cont();}});
      opts.push({t:'轉任 指定打擊',main:!opts.length,s:posAdjLabel('DH'),
        f:()=>{S.dpos='DH';card('info','守位調整',`${issue}成了聯盟笑話，球團決定讓你專心打擊——<b class="hl">DH</b>。`);cont();}});
      choose(`守位會議：教練團已經不敢讓你蹲捕（${LV[S.lv].n}標準）`,opts); return;
    }
    if(cOk()){ /* 守備練回來了,可以回鍋蹲捕 */
      choose('守位會議：牛棚捕手回報你的接捕又行了',[
        {t:'重披捕手裝備',main:true,s:posAdjLabel('C'),
         f:()=>{S.dpos='C';card('good','守位調整','面罩戴回來——新球季重新登錄為<b class="hl">捕手</b>。');cont();}},
        {t:'維持現狀',f:()=>cont()}]); return; }
    if(S.dpos==='1B'&&!dpQual('1B')){ S.dpos='DH';
      card('info','守位調整','連一壘都站不住了，新球季登錄為<b class="hl">指定打擊</b>。'); }
    cont(); return; }
  if(S.pos==='P'){ /* 體力決定投手類型;牛棚→先發需玩家同意,先發→牛棚仍自動 */
    const nr=pitcherRoleForAbility(), old=S.role;
    if((old==='MR'||old==='CL')&&nr==='SP'){
      /* 後援投手體力練上先發線:球團徵詢,不強制轉 */
      choose('球團徵詢：你的體力已達先發水準，要轉任先發嗎？',[
        {t:'轉任先發，扛起輪值',main:true,f:()=>{ S.role='SP';
          card('info','定位調整',`你點頭接下先發任務。新球季起，你是輪值的一員——<b class="hl">先發</b>。`); cont(); }},
        {t:'留在牛棚，守住我的位置',s:'維持'+roleLabelForAbility(old)+'定位',f:()=>{ S.role=old;
          card('info','留守牛棚',`你婉拒了教練團的提議——永遠準備待命，在球隊最需要我的時候，登板救火。`); cont(); }}]);
      return;
    }
    S.role=nr;
    if(old&&old!==nr){
      /* 中繼與終結者互換看球季成績；先發與牛棚間的調整才看體力。 */
      const basis=old!=='SP'&&nr!=='SP'?'成績':'體力';
      card('info','定位調整',`教練團評估你的${basis}，將你登錄為 <b class="hl">${roleLabelForAbility(nr)}</b>。`); }
    else if(!old){
      card('info','投手定位',`教練團評估你的體力，將你登錄為 <b class="hl">${roleLabelForAbility(nr)}</b>。`); }
    cont(); return;
  }
  const q=dpList();
  if(!S.dpos){ S.dpos=q[0];
    card('info','守位登錄',`教練團評估守備工具後，將你登錄為 <b class="hl">${DPN[S.dpos]}</b>。`); cont(); return; }
  if(dpQual(S.dpos)){
    const best=q[0];
    if(DP_RANK[best]<DP_RANK[S.dpos]){ /* 更高身價守位站得住了 */
      choose(`守位會議：教練團想把你推上更吃重的位置`,[
        {t:`升防 ${DPN[best]}`,main:true,s:posAdjLabel(best),
         f:()=>{S.dpos=best;card('good','守位調整',`守備數據說服了所有人——新球季改守 <b class="hl">${DPN[best]}</b>。`);cont();}},
        {t:`留守 ${DPN[S.dpos]}`,f:()=>cont()}]); return; }
    cont(); return; }
  const opts=q.slice(0,2).map((p,i)=>({t:`移防 ${DPN[p]}`,main:i===0,
    s:p==='DH'?`守備已無處可站｜${posAdjLabel(p)}`:posAdjLabel(p),
    f:()=>{ S.dpos=p; card('info','守位調整',`球團季末評估後，新球季改守 <b class="hl">${DPN[p]}</b>。`); cont(); }}));
  choose(`守位會議：教練團認為你的守備已撐不住 ${DPN[S.dpos]}（${LV[S.lv].n}標準）`,opts);
}
/* 只會這個:只吃三種角色維度——打擊(力量/Contact)、跑壘(速度)、守備(綜合) */
export function careerAllStars(){ let n=0; ['CPBL','NPB','MLB'].forEach(b=>{ if(S.stats[b])n+=(S.stats[b].AS||0); }); return n; }
export function toolGap(){ const a=S.ab;
  const hit=Math.max(a.pow,a.con);        /* 打擊維度:力量或 Contact 取高 */
  const run=a.spd;                         /* 跑壘維度 */
  const def=S.pos==='C'?(a.rng+a.fld+a.arm+a.cat)/4:(a.rng+a.fld+a.arm)/3; /* 守備綜合 */
  const dims=[['hit',hit,'代打'],['run',run,'代跑'],['def',def,'代守']];
  dims.sort((x,y)=>y[1]-x[1]);
  const topDim=dims[0], secDim=dims[1];
  const gap=topDim[1]-secDim[1];
  /* 對照角色:代打看力量/Contact 哪個高決定文案來源 */
  const role=topDim[2];
  return {gap, role, val:topDim[1], dim:topDim[0]}; }
export function ovr(){
  const a=S.ab;
  if(S.pos==='P'){ const arr=[a.vel,a.ctl,a.brk].sort((x,y)=>y-x);
    return Math.round(arr[0]*0.42+arr[1]*0.30+arr[2]*0.18+a.sta*0.10); }
  const off=[a.con,a.pow,a.eye,a.spd].sort((x,y)=>y-x);
  const offv=off[0]*0.38+off[1]*0.27+off[2]*0.20+off[3]*0.15;
  /* 守備分:用當前守位的 dpScore(與守位門檻系統一致);DH 無守備價值 → 以「1B 守備分 −12」計(確保同打擊下 1B 恆 > DH);未定守位則取最佳可守守位的分 */
  const dpForOvr = S.dpos || (S.pos==='C'?'C':(S.pos==='OF'?'CF':'SS'));
  const def = S.dpos==='DH' ? (dpScore('1B')-12) : dpScore(dpForOvr);
  /* 守備權重:關鍵守位(SS/CF/C)最高 30%,角落降低;DH 用與 1B 相同權重(守備分已內含 DH 懲罰) */
  const dw=S.dpos?({SS:0.30,CF:0.30,C:0.30,'2B':0.22,'3B':0.22,RF:0.20,'1B':0.12,LF:0.14,DH:0.12})[S.dpos]??0.22:0.24;
  let v=Math.round(offv*(1-dw)+def*dw);
  if(S.traits.yips)v-=3; /* 失憶症:心理陰影,系統評價 -3 */
  return v;
}
export function playerType(){
  const a=S.ab;
  const decliningVeteran=S.stage==='PRO'&&(S.age-(S.traits.disc?2:0))>=32;
  const p=S.pos==='P'?((a.vel+a.ctl+a.brk)/3):((a.con+a.pow+a.eye+a.spd)/4);
  const styles=[];
  if(S.pos==='P'){
    if(a.vel>=72&&a.brk>=68)styles.push('火球型');
    if(a.ctl>=72&&a.brk>=68)styles.push('控球王牌');
    if(a.sta>=72&&a.ctl>=65)styles.push('吃局型');
    if(a.brk>=72)styles.push('變化球鬼才');
    if(a.vel>=70&&a.ctl<50)styles.push('暴力速球');
    if(a.ctl>=70&&a.vel<50)styles.push('精密機械');
    if(a.vel>=68&&a.brk<55)styles.push('火球但單調');
    if(a.sta<45)styles.push('玻璃大砲');
    if(a.ctl<45)styles.push('控球災難');
    if(S.role==='CL')styles.push('終結者');
    else if(S.role==='MR')styles.push('中繼專家');
    else styles.push('先發投手');
  } else {
 ... (truncated)