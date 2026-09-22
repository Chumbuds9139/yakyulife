import {S, stepQ, nextStep, stageLabel, levelName} from '../core/state.js?v=1.6.1';
import {R, ri, chance, clamp} from '../core/rng.js?v=1.6.1';
import {ABL, POS_AB} from '../data/abilities.js?v=1.6.1';
import {LV, PATHS, teamNick} from '../data/teams.js?v=1.6.1';
import {AMA_ANNUAL} from '../data/economy.js?v=1.6.1';
import {card, choose, board, divider} from '../ui/dom.js?v=1.6.1';
import {tlNote, tlPush, tlRestage} from '../ui/timeline.js?v=1.6.1';
import {allocUI} from '../ui/alloc.js?v=1.6.1';
import {addAb, ovr, ovrPit, ovrBat, dposReview, statBonusTxt, enforcePerfectAbilities} from '../engine/ability.js?v=1.6.1';
import {rollInjury, tjCap, tjEffortMult} from '../engine/injury.js?v=1.6.1';
import {isMrTeamEligible, accrueCpbl1Service} from '../engine/tenure.js?v=1.6.1';
import {amateurSeason, proSeason, slgOf, currentSalaryRating, baseballERA, baseballWHIP, seasonGrade} from '../engine/season.js?v=1.6.1';
import {championshipChance} from '../engine/championship.js?v=1.6.1';
import {ageGateJP, buyoutRemaining, contractAnnual, contractMarketProfile, controlledAnnual, crossOffers, daibaFarewell, extensionOffer, faFlow, fmtMoney, handleDemotion, homecomingFallbackOptions, levelMinAnnual, makeContract, makeOffers, offseasonTradeCheck, pickOfferUI, queueSalaryFloor, returnTeam, signTo, teamChampRate} from '../engine/contract.js?v=1.6.1';
import {drawEvents, removeTrait, checkChampionTrait} from './events.js?v=1.6.1';
import {loveEvent} from './love.js?v=1.6.1';
import {runDraft, pathChoiceHS, pathChoiceU4, advance} from '../engine/draft.js?v=1.6.1';
import {endGame} from '../ui/retire.js?v=1.6.1';
/* ================= 年度流程 ================= */
export function startYear(){ S.yearOutsideIncome=0; enforcePerfectAbilities(); stepQ.length=0; stepQ.push(phasePre,phaseMid,phaseEnd); divider(`${S.year} 年 · ${S.age} 歲 · ${stageLabel()}`); tlPush(); nextStep(); }
/* 七下保送幾顆「6」。天才需要 5 顆，保送不足的部分要玩家自己擲出來。
   這是二刀流整條路線的難度總開關。原作實測：保送 3 顆讓天才發生率約 88%，
   整包名人堂率約 1.47 倍單刀母體——進得去、但不是免費的。見 docs/twoway-design.md。 */
export const TW_SIX_GUARANTEED=3;
/* 中途轉入二刀流時，新增那一側的起點＝現有能力平均 × 這個比例（與 ri(20,32) 取高）。
   1.15 是原作量出來的：轉入型與七下型必須一樣難。分母含 rng/fld/arm 這些轉型後
   用不到的守備工具，會把平均往下拉，所以 ×1.15 之後新增側大約落在現有核心工具的水準。 */
export const TW_CONVERT_RATIO=1.15;
export function convertToTwoWay(origin){
  const shuffle=arr=>{ for(let i=arr.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=arr[i];arr[i]=arr[j];arr[j]=t;} return arr; };
  const cur=Object.keys(S.ab).map(k=>S.ab[k]);
  const avg=cur.length?cur.reduce((a,b)=>a+b,0)/cur.length:26;
  const base=Math.round(avg*TW_CONVERT_RATIO);
  const add=(keys,tiers)=>{
    const fresh=keys.filter(k=>!(k in S.ab));
    fresh.forEach(k=>{ S.ab[k]=clamp(Math.max(ri(20,32),base),1,80); });
    shuffle(fresh).forEach((k,i)=>{ S.pot[k]=tiers[Math.min(i,tiers.length-1)](); });
    return fresh;
  };
  const gainedPit=add(['vel','ctl','brk'],[()=>ri(70,80),()=>ri(58,68),()=>ri(50,60)]);
  const gainedBat=add(['con','pow','spd','eye'],[()=>ri(72,80),()=>ri(62,72),()=>ri(54,66),()=>ri(46,60)]);
  S.pot.sta=Math.max(S.pot.sta||0,ri(60,74));
  S.pos='TW'; S.twOrigin=origin||'genius'; S.role=null; S.dpos='DH'; S.twSeasons=0; S.twAuditLv=null;
  return {gainedPit,gainedBat};
}
export const TW_BAR=0.5;
function perfBarOf(L){ return (L.min-L.par)-TW_BAR; }
function twPerfPass(keepPit){
  const st=S.lastSt, LL=LV[S.lastLv||S.lv];
  if(!st||!LL||!Number.isFinite(LL.min))return false;
  const dv=keepPit?st.dBat:st.dPit;
  if(!Number.isFinite(dv))return false;
  return dv>=perfBarOf(LL);
}
export function twoWayAudit(){
  if(S.pos!=='TW'||S.stage!=='PRO')return false;
  const L=LV[S.lv]; if(!L||!Number.isFinite(L.min))return false;
  if(!S.twAuditLv){ S.twAuditLv=S.lv; return false; }
  const seen=LV[S.twAuditLv]||L, promoted=seen.min<L.min;
  const J=promoted?seen:L;
  S.twAuditLv=S.lv;
  const bar=J.min-TW_BAR, p=ovrPit(), b=ovrBat();
  if(p>=bar&&b>=bar)return false;
  const keepPit=p>=b;
  if(twPerfPass(keepPit))return false;
  const lost=keepPit?'打擊':'投球';
  S.twFellAge=S.age; S.twFellLv=S.lv;
  S.pos=keepPit?'P':'OF';
  S.twFell=keepPit?'pit':'bat';
  if(keepPit){
    S.dpos=null;
  }else{
    S.role=null;
    ['rng','fld','arm'].forEach(k=>{ if(!(k in S.ab)){ S.ab[k]=ri(18,26); S.pot[k]=ri(28,40); } });
    S.dpos='DH';
  }
  card('bad','二刀流終止',
    `球團把數據攤在你面前:你的${lost}已經跟不上<b class="dn">${J.n}</b>的水準了。`+
    `再撐下去只是兩頭落空——從今天起，你專心當一個<b class="hl">${keepPit?'投手':'打者'}</b>。`+
    `<br>那些年投進${lost}的訓練，沒有人會還給你。`);
  const TW_ESTABLISHED=5;
  if(S.twOrigin==='tap'&&S.traits.genius&&(S.twSeasons||0)<TW_ESTABLISHED){
    removeTrait('genius','天才'); S.six=0;
    card('bad','天才褪去',
      '那份與生俱來的手感，好像是為了二刀流才借給你的。當這條路走不下去，它也一起離開了——'+
      '<b class="dn">「天才」解除</b>，訓練骰回到常人的 1～6 點。<br>剩下的路，要用練的。');
  }
  board(1);
  return true;
}
/* ---------- 季初 ---------- */
export function phasePre(){
  board(0); S.tmpInj=0; S.seasonFactor=1; S.skipMid=false; S.marketInjury='healthy'; S.prevD=S.lastD||0; S.lastD=0; S.lastPayD=0; /* 先保留上季 d 供投手定位判定 */
  checkChampionTrait(); /* 舊存檔已有五冠時也會補解鎖。 */
  if(S.age>=48){ buyoutRemaining(1,true); endGame('身體已到極限，'+S.year+' 年春訓後宣布引退。'); return; }
  const declAge=S.age-(S.traits.disc?2:0); /* 自律狂:衰退曲線整體延後兩年 */
  if(!S.perfectLock&&declAge>=32){ const baseDec=declAge>=35?5+(declAge-35):2;
    const oldGhostActive=!!(S.oldGhostPending&&!S.oldGhostUsed);
    const dec=oldGhostActive?Math.max(1,Math.round(baseDec*0.5)):baseDec;
    const catcherCallDec=S.pos==='C'?Math.max(1,Math.round(dec*0.5)):dec;
    POS_AB[S.pos].forEach(k=>S.ab[k]=clamp(S.ab[k]-(k==='cat'?catcherCallDec:dec),1,80));
    if(oldGhostActive){ S.oldGhostPending=false; S.oldGhostUsed=true; }
    const declineText=S.pos==='C'
      ?`配球以外能力 <b class="dn">−${dec}</b>（你的配球經驗是你珍貴的財產，不會急遽衰退，配球<b class="dn">−${catcherCallDec}</b>）`
      :`所有能力 <b class="dn">−${dec}</b>`;
    card('bad','歲月不饒人',`${declAge>=35?'第二階段（逐年加劇）':'第一階段'}衰退：${declineText}${S.traits.disc?'（自律狂：生涯延後兩年）':''}${oldGhostActive?`（老鬼：原衰退 −${baseDec}，本年減緩 50%）`:''}。訓練加點照常，但身體回不去了。`); board(0); }
  twoWayAudit();
  S.pitchOut=false;
  if(S.rehab>0&&S.rehabPitchOnly&&S.pos==='TW'){
    S.rehab--; S.rehabPitchOnly=false; S.pitchOut=true; S.marketInjury='rehab';
    card('bad','復健年（只停投球）',`手肘的重建還沒走完，這一季<b class="dn">完全不會登板</b>——但你還握得住球棒。球團把你排進打線，讓你用打擊撐過這一年。`);
  }
  else if(S.rehab>0){ S.rehab--; S.skipMid=true; S.seasonFactor=0; S.marketInjury='rehab';
    card('bad','復健年',`大傷尚未痊癒，本季確定<b class="dn">全年報銷</b>，只能在復健室度過。（擲骰減為 2 顆）`);
    const dummySt = {G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,avg:0,era:0,WHIP:0,DEF:0};
    S.log.push({y:S.year,age:S.age,tm:S.stage==='PRO'?S.teamName():(S.team||stageLabel()),line:'復健年・全年報銷', inj: true, st: S.stage==='PRO'?dummySt:null}); }
  let afterAsk=()=>{
    let n=S.skipMid?2:(()=>{const r=R();return r<0.35?3:r<0.75?4:r<0.95?5:6;})();
    if(S.traits.distract&&!S.skipMid)n=Math.max(2,n-1); /* 外務纏身 */
    if(S.traits.academy&&!S.skipMid&&chance(35))n++; /* 學院派:期望值略升 */
    if(S.pos==='TW'&&!S.skipMid)n=Math.max(n,5);
    let forced=new Set();
    if(S.twOrigin==='tap'&&!S.traits.genius&&S.stage==='HS'&&!S.skipMid&&TW_SIX_GUARANTEED>0){
      const yr=clamp(S.stageYr||1,1,3);
      const target=Math.min(TW_SIX_GUARANTEED,Math.ceil(TW_SIX_GUARANTEED*yr/3));
      let need=clamp(target-S.six,0,n);
      while(forced.size<need)forced.add(Math.floor(R()*n));
    }
    const dice=[]; let newSix=0, justUnlockedGenius=false;
    for(let i=0;i<n;i++){ const v=forced.has(i)?6:(S.traits.genius?ri(4,6):S.traits.late?ri(3,6):ri(1,6)); dice.push(v);
      if(v===6&&S.age<22&&!S.traits.genius){S.six++;newSix++;} }
      
    let msg=`自主訓練擲出 <b class="hl">${n}</b> 顆骰。`;
    if(newSix&&!S.traits.genius)msg+=` 高標值「6」累計 <b class="hl">${S.six}/5</b> 次。`;
    
    /* 【修正】大巧不工改為：自動擲骰並加點，滿額溢出轉為成績加成 */
    if(S.traits.combo && !S.skipMid && (S.comboKey||S.samePickKey)) {
      const ck = S.comboKey||S.samePickKey; /* 永遠用解鎖當下鎖定的能力 */
      const cv = S.traits.genius?ri(4,6):S.traits.late?ri(3,6):ri(1,6);
      const gained = addAb(ck, cv);
      const overflow = S.lastOverflow || 0;

      if(overflow > 0) S.pendStat = (S.pendStat || 0) + overflow;

      let cmsg = `<br>大巧不工發動：系統自動擲出 <b class="hl">${cv}</b> 點，挹注於 <b class="hl">${ABL[ck]}</b>`;
      if(gained > 0) cmsg += `（<b class="up">+${gained}</b>）`;
      if(overflow > 0) cmsg += `（頂峰造極：溢出的 ${overflow} 點轉為${statBonusTxt(overflow)}）`;
      if(gained===0 && overflow===0) cmsg += `（<b class="dn">未升級</b>）`;
      msg += cmsg + `。`;
    }
    
    card('','季初特訓',msg);
    if(S.six>=5&&!S.traits.genius&&S.age<22){ S.traits.genius=true; S.geniusEver=true;
      {
      const exDef=S.pos==='C'?['rng','fld','arm','cat']:[];
      /* 潛力 70 以上已是高天賦，不再吃掉重新評估名額；最高只會由 69 提升至 79。 */
      const cands=POS_AB[S.pos].filter(k=>S.ab[k]<70&&(S.pot[k]||62)<70&&!exDef.includes(k));
      for(let i=cands.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=cands[i];cands[i]=cands[j];cands[j]=t;}
      const boost=cands.slice(0,2), bl=[];
      boost.forEach(k=>{ const oldPot=S.pot[k]||62,newPot=Math.min(80,oldPot+10),potGain=newPot-oldPot;
        S.pot[k]=newPot; S.ab[k]=clamp(S.ab[k]+5,1,80);
        bl.push(`${ABL[k]} <b class="up">+5</b>（潛力上限 ${oldPot} → ${newPot}，實際 +${potGain}）`); });
      card('gold','隱藏素質解鎖：天才','22 歲前五度擲出高標值！從今以後，每一顆訓練骰<b class="hl">永久固定 4 點以上</b>，事件卡好結果機率提升至 <b class="hl">70%</b>。'+(bl.length?`天賦覺醒，潛能重新被評估：${bl.join('、')}。`:'')+'天賦，是藏不住的。');
      board(1);
      justUnlockedGenius=true;
    } }
    const toAlloc=()=>choose('分配訓練成果',[{t:'<i class="ph-bold ph-gear" aria-hidden="true"></i>開始分配',s:`${dice.length} 顆骰`,main:true,f:()=>dposReview(()=>allocUI({dice},'分配訓練成果（點骰套用｜球探量表：'+(S.pos==='P'?'60/70/75':S.pos==='TW'?'球威 60/70/75｜其餘 70/75':'70/75')+' 以上成長遞減）',()=>nextStep()))}]);
    if(justUnlockedGenius&&S.stage==='HS'&&S.pos!=='TW'){
      const wasP=S.pos==='P';
      choose('<span class="ev-h">天賦覺醒 · 教練把你叫進辦公室</span>'+
        `<small>「你這種身體，只做一半太可惜了。」他把${wasP?'球棒':'手套跟球'}放到你面前。</small>`,[
        {t:'兩邊都要——走二刀流',main:true,
         s:`${wasP?'重新學打擊':'重新學投球'}（從你目前水準起步）｜訓練骰保底 5 顆｜任一側跟不上層級水準就會被強制收斂，投在另一側的點數不退還`,
         f:()=>{ const g=convertToTwoWay('genius');
           const names=k=>ABL[k];
           card('gold','二刀流',
             `你點了頭。從這一天起，你不再只是${wasP?'投手':'打者'}——<b class="hl">${wasP?'球棒':'投手丘'}</b>也成了你的功課。`+
             `<br>新增能力：${g.gainedPit.concat(g.gainedBat).map(names).join('、')}（從你目前水準起步）。`+
             `<br>訓練骰顆數保底 <b class="hl">5 顆</b>；但只要投或打其中一側跟不上所在層級的水準，`+
             `球團就會把你收斂回單刀，而那些年投進另一側的點數<b class="dn">沒有人會還給你</b>。`);
           board(1); toAlloc(); }},
        {t:`專心當${wasP?'投手':'打者'}`,s:'維持現狀。這個邀請不會再出現',
         f:()=>{ S.twDeclined=true;
           card('info','婉拒','你搖搖頭。把一件事做到最好，本身就已經夠難了。'); toAlloc(); }}]);
      return;
    }
    toAlloc();
  };
  /* 投手開季：投球強度(續航+TJ 量表) */
  const preAsk=afterAsk;
  if((S.pos==='P'||S.pos==='TW')&&S.stage==='PRO'&&!S.skipMid&&!S.pitchOut){
    afterAsk=()=>{
      const arm=(function(){const r=S.tj/tjCap();return S.rehab>0?'復健中':r>=0.85?'手肘隱隱作痛':r>=0.6?'手臂略感疲勞':r>=0.35?'狀況尚可':'手感輕盈';})();
      const opts=S.pos==='TW'
        ? [{t:'以投為主',warn:true,s:`先發場次 85%｜打擊出賽 90%｜TJ 累積 ×${tjEffortMult('TW','全力投').toFixed(2)}`,f:()=>{S.effort='全力投';preAsk();}},
           {t:'投打並重',main:true,s:`先發場次 70%｜打擊全勤｜TJ 累積 ×${tjEffortMult('TW','普通投').toFixed(2)}`,f:()=>{S.effort='普通投';preAsk();}},
           {t:'以打為主',s:`先發場次 50%｜打擊全勤｜TJ 累積 ×${tjEffortMult('TW','養生球').toFixed(2)}`,f:()=>{S.effort='養生球';preAsk();}}]
        : [{t:'全力投',warn:true,s:`成績最佳｜手臂負荷最大（TJ 累積 ×${tjEffortMult('P','全力投').toFixed(2)}）`,f:()=>{S.effort='全力投';preAsk();}},
           {t:'普通投',main:true,s:'標準強度｜TJ 累積正常',f:()=>{S.effort='普通投';preAsk();}},
           {t:'養生球',s:`成績保守｜省手臂（TJ 累積 ×${tjEffortMult('P','養生球').toFixed(2)}）`,f:()=>{S.effort='養生球';preAsk();}}];
      choose(`${S.pos==='TW'?'開季投打配比':'開季投球規劃'}（手臂狀況：${arm}）`,opts);
    };
  }
  /* 大學季前：日本職棒選秀／旅外（大二～大四）。日職選秀每人一生只有一次。 */
  if(S.stage==='U'&&S.stageYr>=2){
    const o=ovr();
    /* 接受任何職業去向後，都要把本年已建立的「大學」時間軸改成實際職業身分。 */
    const finishDecision=()=>{ if(S.stage==='PRO')tlRestage(); afterAsk(); };
    const opts=[];
    if(!S.npbDraftEntered){
      opts.push({t:'投入日本職棒選秀',s:`目前綜合 ${o}｜年齡加權：越年輕評價越高｜生涯僅一次`,f:()=>runDraft(true,finishDecision)});
    }
    /* 依原遊戲邏輯保留旅美合約；日本職棒則統一透過日職選秀。 */
    const agePenalty=Math.max(0,S.age-18);
    const reqMiLB=50+Math.floor(agePenalty/2);
    const bonusMiLB=Math.max(150,1500-agePenalty*350);
    const goPro=finishDecision;
    if(o>=reqMiLB)opts.push({t:'洽談旅美合約',s:`休學挑戰小聯盟｜大齡影響簽約金`,f:()=>{
      S.stage='PRO'; S.team=''; S.svc=0; S.faElig=false;
      pickOfferUI('大聯盟球團報價','MiLB',makeOffers('MiLB',2,bonusMiLB,3,4,o>=55?'A1':'R',null),goPro);}});
    if(!opts.length){ afterAsk(); return; }
    /* 續留選項固定放在所有選秀／旅外選項之後。 */
    opts.push({t:'留在大學繼續磨練',main:true,f:afterAsk});
    choose(`大${['一','二','三','四'][S.stageYr-1]}季前 · 升學與職棒的十字路口`,opts);
    return;
  }
  if(S.stage==='PRO'&&S.age>=36&&S.rehab===0){
    const oldOpts=[{t:'再戰一年',main:true,f:afterAsk}];
    /* 旅美老將(衰退期):放棄現有合約，設法回日本打最後幾年；日職沒人要，再考慮其他出路。
       身在日職的老將已經在家鄉，不套用這條——直接引退或再戰一年就好。 */
    if(S.org==='MiLB'){
      const o=ovr();
      if(o>=LV.INDEP.min){
        oldOpts.push({t:'放棄合約，設法回日本',s:'想把職業生涯最後幾年留給日本球迷',f:()=>{
          if(o>=LV.NPB1.min&&chance(Math.round(50*ageGateJP()))){
            signTo('NPB','NPB1',returnTeam('NPB').team);
            card('good','回到日本',`狀態雖然已經不在巔峰，但日職球團看重的是你在海外累積的經驗與名氣——你決定放棄合約，回到日本，把職業生涯最後幾年留給球迷。`);
            tlRestage(); afterAsk();
          }else if(o>=LV.NPB2.min&&chance(45)){
            signTo('NPB','NPB2',returnTeam('NPB').team);
            card('good','回到日本',`一軍球團暫時沒有位置，但二軍球隊願意給你舞台——你決定放棄合約，回到日本，從支配下球員重新出發。`);
            tlRestage(); afterAsk();
          }else{
            const opts=homecomingFallbackOptions(o,{done:()=>{tlRestage();afterAsk();}});
            if(opts.length){
              card('info','日職沒有回音','你試著聯繫日本職棒球團，但沒有球隊願意開價——所幸還有其他邀約。');
              choose('還有其他選擇',opts);
            }else{
              card('bad','四處碰壁','日職球團沒有回應，其他聯盟也沒有球隊聯繫你，只能繼續留在原地。');
              afterAsk();
            }
          }
        }});
      }
    }
    oldOpts.push({t:'召開引退記者會',warn:true,s:'結束選手生涯',f:()=>{buyoutRemaining(0.7,true);daibaFarewell(()=>endGame('功成身退，於 '+S.year+' 年宣布引退。'));}});
    choose('又是一年春訓，身體大不如前了',oldOpts);
    return;
  }
  afterAsk();
}
/* ---------- 賽季中 ---------- */
export function phaseMid(){
  board(1);
  if(S.skipMid){ S.ironStreak=0; nextStep(); return; }
  loveEvent(()=>drawEvents(()=>{
    choose('季中健康檢查',[{t:'<i class="ph-bold ph-stethoscope" aria-hidden="true"></i>查看報告',main:true,f:()=>{ rollInjury();
      choose('球季表現',[{t:'<i class="ph-fill ph-baseball" aria-hidden="true"></i>查看結果',main:true,f:()=>{
        if(S.stage==='PRO')proSeason();
        else amateurSeason(); }}]); }}]);
  }));
}
const RAINBOW_RULES={CPBL:['中職',3],NPB:['日職',5],MLB:['大聯盟',5]};
/* 三聯盟的七彩球衣各自累積；回傳這次新解鎖的聯盟，方便流程顯示一次取得訊息。 */
export function unlockRainbowLeagues(state=S){
  const owned=Array.isArray(state.rainbowLeagues)?state.rainbowLeagues.filter(Boolean):[];
  /* 舊存檔只有單一 rainbowLg，先搬進新陣列，之後仍可解鎖另外兩個聯盟。 */
  if(state.rainbowLg&&!owned.includes(state.rainbowLg))owned.push(state.rainbowLg);
  const added=[];
  Object.entries(RAINBOW_RULES).forEach(([league,[label,minTeams]])=>{
    const teams=Object.keys((state.teamTally&&state.teamTally[league])||{}).length;
    if(teams>minTeams&&!owned.includes(label)){
      owned.push(label);
      added.push({league,label,teams});
    }
  });
  state.rainbowLeagues=[...new Set(owned)];
  if(state.rainbowLeagues.length){
    state.traits.rainbow=true;
    if(!state.rainbowLg)state.rainbowLg=state.rainbowLeagues[0]; /* 保留舊版欄位供相容 */
  }
  return added;
}
/* 球隊年資在季末交易前結算：交易屬於下一季異動，剛打完的球季必須記在原隊。 */
export function updateTeamTenureTraits(){
  if(S.stage!=='PRO'||!S.orgTeam)return;
  S.teamSeasons=(S.teamSeasons||0)+1; /* 同一球團全部球季：二軍、復健年也算忠誠年資。 */
  if(LV[S.lv].top&&!S.skipMid){
    S.teamYears=(S.teamYears||0)+1; /* 樣本不足仍是在一軍度過的球季，照常累積一軍年資。 */
    if(seasonGrade(S.lastSt,S.lv)>=2)S.teamStarYears=(S.teamStarYears||0)+1;
  }

  if(!S.traits.goldcloth&&S.orgTeam==='台中猛獁'&&(S.teamTally.CPBL&&S.teamTally.CPBL['台中猛獁']>=10)){
    S.traits.goldcloth=true;
    card('gold','隱藏屬性解鎖：黃金聖衣','效力 台中猛獁 滿十年，你愛猛獁，不離不棄。'); board(1);
  }

  if(!S.traits.franchise&&S.teamYears>=7&&S.champThisTeam&&S.champTeam===S.orgTeam){
    const removedCancer=!!S.traits.cancer;
    if(removedCancer)removeTrait('cancer','更衣室毒瘤');
    S.traits.franchise=true; S.franchiseActive=true; S.franchiseTeamName=S.orgTeam;
    card('gold','隱藏屬性解鎖：神主牌','小孩指著你說：「我媽媽從小就看你打球」。球團高層很清楚，放你走球迷會把主場拆了——<b class="hl">合約市場保有 4% 招牌球星溢價，並提高引退評價</b>。'+(removedCancer?'<br><b class="hl">你以長年貢獻重新贏回休息室信任，「更衣室毒瘤」解除。</b>':'')); board(1);
  }else if(S.traits.franchise&&!S.franchiseActive&&S.teamYears>=7){
    S.franchiseActive=true; S.franchiseTeamName=S.orgTeam;
    card('gold','神主牌效果恢復',`來到 <b class="hl">${S.orgTeam}</b> 的第七個頂級球季，你再一次成為城市無法割捨的招牌——<b class="hl">交易保護與 4% 合約溢價重新生效</b>。`); board(1);
  }

  /* ◯◯先生：同隊至少 15 個一軍球季，且其中至少 2/3 達明星級表現。 */
  const mrEligible=isMrTeamEligible(S.teamYears,S.teamStarYears);
  if(!S.traits.mrteam&&mrEligible){ S.traits.mrteam=true; S.mrTeamName=S.orgTeam;
    const nick=teamNick(S.orgTeam),starNeed=Math.ceil(S.teamYears*2/3);
    card('gold','隱藏稱號：'+nick+'先生',`在同一支球隊走過 <b class="hl">${S.teamSeasons}</b> 個球季，其中 <b class="hl">${S.teamYears}</b> 季站在一軍，並有 <b class="hl">${S.teamStarYears}</b> 季達明星級表現（所需 ${starNeed} 季）。球迷不再喊你的名字，他們喊你「<b class="hl">${nick}先生</b>」——你就是這支球隊的代名詞。`); board(1);
  }

  /* ◯◯七彩球衣：同一聯盟生涯效力球隊數超標（中職>3、日職>5、美職>5）。 */
  unlockRainbowLeagues().forEach(({label,teams})=>{
    card('info','隱藏稱號：'+label+'七彩球衣',`打開衣櫃，${teams} 件不同的球衣掛在眼前——${label}的球隊你快穿過一輪了。球迷笑稱你是「<b class="hl">七彩球衣</b>」：去到哪裡都能活下來，這也是一種本事。`); board(1);
  });
}
/* ---------- 季末 ---------- */
export function phaseEnd(){
  board(2);
  const outside=Math.round(S.yearOutsideIncome||0);
  const outsideText=outside?`<br>業外收入：<b class="hl">+${fmtMoney(outside)}</b>`:'';
  if(S.stage==='PRO'){
    if(!S.ct)S.ct=makeContract(1,1,S.lv,currentSalaryRating(S.lastD||0),undefined,null,'預設約');
    const sal=contractAnnual(); /* 合約保證年薪：不因本季表現、受傷或能力變動而重算 */
    S.salary+=sal;
    /* 球季成績先於季末結算寫入；把本年度薪資／業外收入補回同一列，供結算圖使用。 */
    const seasonLog=[...(S.log||[])].reverse().find(r=>r.st&&r.y===S.year);
    /* 一併記下這一季是由哪一份合約給付的，結算年表才分得出
       「同一份合約的第幾年」與「另外簽的單年約」。 */
    if(seasonLog){ seasonLog.salary=sal; seasonLog.outsideIncome=outside;
      seasonLog.ctId=(S.ct&&S.ct.__ctid)||null; }
    let extra='';
    if(LV[S.lv].top&&S.seasonFactor>0){
      const tp=LV[S.lv].top;
      const pc=teamChampRate(S.orgTeam,S.year);
      let pcc=pc;
      if(S.tradeRefuse>0){ pcc*=0.75; } /* 否決交易:戰力略受影響(成本已降) */
      pcc=championshipChance(pcc,!!S.traits.championmaker);
      if(chance(pcc)){ const cN={CPBL:'中職總冠軍',NPB:'日本一',MLB:'世界大賽冠軍'}[LV[S.lv].top];
        S.honors.push(`${S.year} ${cN}`); S.wonChamp=true; S.champThisTeam=true; S.champTeam=S.orgTeam; checkChampionTrait(); extra=`<br>球隊奪下 <b class="hl">${cN}</b>，全城陷入瘋狂！`; } }
    if(S.tradeRefuse>0)S.tradeRefuse--;
    if(S.tradeHeat>0)S.tradeHeat=Math.max(0,S.tradeHeat-5);
    card('','季末結算',`本年度薪資：<b class="hl">${fmtMoney(sal)}</b>（生涯累計 ${fmtMoney(Math.round(S.salary))}）${S.ct?`｜合約剩 ${Math.max(0,S.ct.yrs-1)} 年`:''}${outsideText}${extra}`);
    board(2);
  }else if(S.stage==='AMA'){ /* DEAD：日本線業餘是 CORP／INDEP 且 stage=PRO；舊存檔才可能走到這裡。 */
    S.salary+=AMA_ANNUAL;
    card('','企業隊年度收入',`本年度工作年薪：<b class="hl">${fmtMoney(AMA_ANNUAL)}</b>（每月 4 萬；生涯累計 ${fmtMoney(Math.round(S.salary))}）。有時候你分不清，你是員工，還是球員？${outsideText}`);
    board(2);
  }
  /* 冠軍、薪資與國際賽都結算完畢後，先把本季記在原隊，再進入季末交易。 */
  if(S.stage==='PRO')updateTeamTenureTraits();
  const go=()=>S.stage==='PRO'?offseasonTradeCheck(()=>movement()):movement();
  if(S.pool>0){ const p=S.pool; S.pool=0;
    choose('分配能力點',[{t:'<i class="ph-bold ph-gear" aria-hidden="true"></i>開始分配',s:`${p} 點・大賽／國際賽成果`,main:true,f:()=>allocUI({pool:p},'季末能力點分配（大賽／國際賽成果）',go)}]); }
  else go();
}
/* ---------- 升降級與去向 ---------- */
export function annualHomecomingEligible(org,lv){
  /* 只有旅美（小聯盟）才談得上「回不回得去日本」；日職二軍本來就在日本國內，
     不該每季都跳出「回日職」選項。 */
  return org==='MiLB'&&!!LV[lv]&&!LV[lv].top;
}
export function finishContractYear(o){
  if(!S.ct)S.ct=makeContract(2,1,S.lv,currentSalaryRating(S.lastD||0),undefined,null,'預設約');
  S.ct.yrs--;
  if(S.ct.annualSchedule&&S.ct.annualSchedule.length)S.ct.annualSchedule.shift();
  /* 母隊延長/換約時機:多年約跑到倒數第二年、或最後一張約剩1年,可談延長 */
  if(S.ct.yrs===1&&LV[S.lv].top&&!S.ct.extOffered&&S.faElig&&(S.lastD||0)>=1&&chance(45)){
    S.ct.extOffered=true; extensionOffer(o); return;
  }
  if(S.ct.yrs<=0){
    if(LV[S.lv].top){
      if(S.faElig){ faFlow(o); return; }
      /* 菜鳥5年內:球團行使續約權,續短約,薪資不低於層級基數 */
      const renewalProfile=contractMarketProfile(S.lastD||0), renewalD=renewalProfile.rating, renewalAnnual=controlledAnnual(S.lv,renewalD,renewalProfile.aav);
      S.ct=makeContract(ri(1,2),1,S.lv,renewalD,renewalAnnual,{extOffered:false,controlled:true},'球團續約');
      card('info','球團續約',`你仍在選秀球隊掌控期（服務 ${S.svc}/5 年），球團依服務年資與近年表現行使續約權——固定年薪 <b class="hl">${fmtMoney(S.ct.annual)}</b> × <b class="hl">${S.ct.yrs} 年</b>，合約總額 <b class="hl">${fmtMoney(S.ct.annual*S.ct.yrs)}</b>。`); board(1);
    } else { S.ct=makeContract(ri(1,2),1,S.lv,currentSalaryRating(S.lastD||0),undefined,null,'球團續約'); } /* 非頂級層級 */
  }
  /* 仍在小聯盟養成層級時，每個球季結束都讓玩家重新決定要不要試著回日本。
     順位固定：先設法回日職，日職沒人要才輪到社會人／獨立聯盟／中職洋將；
     四處碰壁的話就只能繼續留在小聯盟拚下去，不會被強制引退。 */
  if(annualHomecomingEligible(S.org,S.lv)){
    const tryJapan=()=>{
      if(o>=LV.NPB1.min&&chance(Math.round(50*ageGateJP()))){
        signTo('NPB','NPB1',returnTeam('NPB').team);
        card('gold','轉戰日職一軍',`你決定結束小聯盟的挑戰，帶著累積的經驗回到日本，挑戰日職一軍。`); advance(); return true;
      }
      if(o>=LV.NPB2.min&&chance(45)){
        signTo('NPB','NPB2',returnTeam('NPB').team);
        card('info','轉戰日職二軍',`你決定結束小聯盟的挑戰，回到日本，從日職二軍的支配下球員重新出發。`); advance(); return true;
      }
      return false;
    };
    choose('旅美生涯抉擇',[
      {t:'繼續挑戰小聯盟',main:true,s:`留在${LV[S.lv].n}，繼續朝大聯盟前進`,f:()=>crossOffers(o)},
      {t:'考慮回日本發展',s:'先設法談日職合約，若無人問津再考慮其他出路',f:()=>{
        if(tryJapan())return;
        const opts=homecomingFallbackOptions(o,{done:advance});
        if(opts.length){
          card('info','日職沒有回音','你試著聯繫日本職棒球團，但沒有球隊願意開出合約——所幸還有其他邀約。');
          choose('還有其他選擇',opts);
        }else{
          card('bad','四處碰壁','日職球團沒有回應，其他聯盟也沒有球隊聯繫你。看來，你只能繼續留在小聯盟拚下去。');
          crossOffers(o);
        }
      }}
    ]);
    return;
  }
  crossOffers(o);
}
export function movement(){
  const o=ovr();
  if(S.stage==='HS'){ if(S.stageYr<3)advance(); else pathChoiceHS(); return; }
  if(S.stage==='U'){ if(S.stageYr<4)advance(); else pathChoiceU4(); return; }
  if(S.stage==='AMA'){ /* DEAD：日本線不會把 stage 設成 AMA。 */
    if(S.age>=26){ endGame('選秀多年落榜，'+S.year+' 年結束球員身分，轉任基層教練。'); return; }
    const amaOpts=[];
    if(!S.npbDraftEntered)amaOpts.push({t:'參加日本職棒選秀',main:true,f:()=>runDraft(false,()=>advance())});
    else amaOpts.push({t:'再留一年',main:true,f:()=>advance()});
    amaOpts.push({t:'高掛球鞋',warn:true,f:()=>endGame('在業餘球隊劃下句點。')});
    choose('業餘年度結束',amaOpts);
    return;
  }
  /* 社會人／獨立聯盟不是 NPB 農場，季末不走 PATHS 升降、也不因戰力外直接進日職二軍。
     去向由 amateurOffseasonDecision（選秀／十二球團買斷／再留一年）決定。 */
  if(S.org==='CORP'||S.org==='INDEP'){ advance(); return; }
  /* 職業 */
  if(S.org==='NPB')S.npbYears++;
  if(LV[S.lv].top){ /* 轉換聯盟：直接解除球團 5 年控制期限制，往後只要合約到期就是自由球員 */
    if(S.svcOrg && S.svcOrg!==S.org){ S.faElig=true; }
    S.svcOrg=S.org;
    S.svc=(S.svc||0)+1; if(S.svc>=5)S.faElig=true;
  }
  if(S.skipMid){ finishContractYear(o); return; } /* 復健年不升降級，但照常累積年資、消耗合約年度與處理到期續約。 */
  if(accrueCpbl1Service(S)){
    card('gold','視同本土',
      `中華職棒聯盟來了公文。一軍年資累積滿九年——從今天起，你不再佔用球隊的洋將名額，登錄規定<b class="hl">視同本土球員</b>。`+
      `<br>休息室有人把你名牌上的「洋將」劃掉：「你現在是自己人了。」`);
    board(2);
  }
  if(o<30){ buyoutRemaining(1); const floorName=levelName(S.lv)||'目前層級'; endGame('能力已跌破'+floorName+'最低水準，'+S.year+' 年球季後遭釋出，被迫引退。'); return; }
  const path=PATHS[S.org];
  /* 中職洋將等海外市場若漏登 PATHS，不能讓 indexOf 把整個季末流程炸掉（行動面板已被上一顆按鈕清掉）。 */
  if(!path){ finishContractYear(o); return; }
  const idx=path.indexOf(S.lv);
  if(idx<0){ finishContractYear(o); return; }
  let minReq=LV[S.lv].min;
  if(S.org==='NPB'&&S.npbYears>=8){ minReq-=4; }
  if(S.lv==='CPBL1'&&S.cpblDomestic){ minReq-=4; }
  const perf=(S.seasonFactor>=0.5)?(S.lastD||0):null; /* 傷缺季不看成績 */
  /* 得獎保護傘:當季拿過個人獎項(MVP/王/最佳投手,不含明星賽)→絕不下放/釋出 */
  const wonAward = S.honors.some(x=>x.startsWith(String(S.year))&&/王|MVP|賽揚|澤村|最佳投手|最佳打者|金手套|守備聖經/.test(x)&&!/明星賽/.test(x));
  /* Fix C:實際成績達標保護傘——用當季真實數據(不看能力 d),打得好就不下放 */
  let goodReal=false;
  { const st=S.lastSt;
    if(st&&S.seasonFactor>=0.5){
      if(S.pos==='P'||S.pos==='TW'){
        const era=baseballERA(st)??99, whip=baseballWHIP(st)??99;
        /* 投手:ERA 或 WHIP 達聯盟一線水準,或有一定救援/中繼產能 */
        if((st.IP||0)>0&&(era<=4.20||whip<=1.35||(st.SV||0)>=15||(st.HLD||0)>=15))goodReal=true;
      }
      if(S.pos!=='P'&&!goodReal){
        const obp=st.PA>0?(st.H+st.BB)/st.PA:0, slg=slgOf(st), ops=obp+slg;
        /* 野手:OPS 達聯盟主力水準(.720+),或雙位數轟/盜等實質產能 */
        if(ops>=0.720||st.HR>=12||st.SB>=15||st.RBI>=(LV[S.lv].g>=150?70:55))goodReal=true;
      }
    }
  }
  if(wonAward||goodReal){ /* 拿獎 或 帳面成績達標 → 球團不會處理掉 */ }
  else if(o<minReq){
    if(perf!==null&&perf>=0){ /* 帳面成績夠好,球團續留觀察 */
      card('info','球團評估',`體能檢測數字亮紅燈，但你用<b class="hl">實際成績</b>說話——本季表現達聯盟水準，球團決定續留一線觀察。`);
    }else{ handleDemotion(o,path,idx); return; }
  }else if(perf!==null&&perf<=-6&&chance(55)){ /* 能力還在但成績崩盤,一樣會被下放 */
    card('bad','球團評估','帳面數據遠低於聯盟水準，教練團失去耐心。');
    handleDemotion(o,path,idx); return;
  }
  /* 升級：能力門檻 ＋ 帳面成績（壓倒性表現可連跳兩級）
     舊版只看 ovr 與能力值 d，等於「體檢過關就上一軍」，實際打得如何完全不影響。
     現在是兩道關卡：能力達標之後還要看當季真實數據(seasonGrade)，打不出來就再練一年；
     反過來，能力檢測差最多 3 點但成績壓倒性，球團會破格拔擢——真實棒球的「打出來的」升法。

     判定順序刻意是「先看能力是否遠超門檻，再看樣本是否足夠，最後才看成績」：
     ① 能力已達「再下一級」的門檻(overQual) → 無條件升級。這種球員留在原層級沒有任何
        意義，不該被一次擲骰卡住（實例：能力 62 的外野手在 1A，連大聯盟門檻 56 都過了，
        卻因為受傷只出賽 25 場而被留隊）。
     ② 樣本不足(grade<0：傷缺季或打席/局數太少) → 無從論斷成績，回到看能力的舊行為。
     ③ 樣本足夠 → 依成績評等決定機率。
     ②③ 必須分開，否則「打擊率 .358 但只出賽 25 場」會被當成「成績普通」，
     跳出的訊息還會反過來說他帳面成績不夠好。 */
  if(idx<path.length-1){ const nx=path[idx+1];
    const grade=S.lastSt?seasonGrade(S.lastSt,S.lv):-1;
    const abilityOK=o>=LV[nx].min;
    const nx2=idx<path.length-2?path[idx+2]:null;
    /* 遠超門檻＝已達再下一級的標準；沒有再下一級時以 min+5 代之(各層級間距約 4~5)。 */
    const overQual=abilityOK&&(nx2?o>=LV[nx2].min:o>=LV[nx].min+5);
    const forced=!abilityOK&&o>=LV[nx].min-3&&grade>=3;
    let promote=false;
    if(abilityOK){
      if(overQual)promote=true;                    /* ① 能力遠超門檻 */
      else if(grade<0)promote=chance(85);          /* ② 樣本不足:看能力 */
      else promote=grade>=3?true:grade===2?chance(90):grade===1?chance(70):chance(25);
    }
    else if(forced)promote=chance(55);
    if(!promote&&abilityOK){
      if(grade<0)card('info','球團評估',`體能檢測已達 <b>${LV[nx].n}</b> 的標準，但本季<b class="hl">出賽場數不足</b>，球團看不到足夠的樣本——再打一個完整球季。`);
      else if(grade<=1)card('info','球團評估',`體能檢測已達 <b>${LV[nx].n}</b> 的標準，但帳面成績還沒說服教練團——<b class="hl">再打一年給他們看</b>。`);
    }
    if(promote){
      let to=nx;
      /* 連跳兩級:成績壓倒性,或能力已明顯凌駕再下一級(受傷球季也給得到) */
      if(nx2&&o>=LV[nx2].min+2&&(grade>=3||o>=LV[nx2].min+6))to=nx2;
      const oldAnnual=S.ct?(S.ct.annualSchedule&&S.ct.annualSchedule.length?S.ct.annualSchedule[0]:S.ct.annual):null;
      S.lv=to;
      tlRestage();
      if(forced)card('good','破格拔擢','體能檢測的數字還差一點，但你的成績讓球團無法忽視——<b class="hl">直接把你拉上去</b>。');
      card('good','升級通知',`表現獲得肯定，${to!==nx?'<b class="hl">連跳兩級</b>':'晉升'} <b class="hl">${LV[to].n}</b>！`); board(2);
      if(S.ct&&Number.isFinite(oldAnnual)&&levelMinAnnual(to)>oldAnnual)queueSalaryFloor(to,oldAnnual);
      if(LV[to].top)tlNote(2,'升上'+LV[to].n);
      if(S.traits.yips){ removeTrait('yips','失憶症'); card('good','走出陰影','將身體與心靈重新來過，終於爬回了原本的高度，——<b class="hl">失憶症痊癒</b>。'); } } }
  finishContractYear(o);
}
