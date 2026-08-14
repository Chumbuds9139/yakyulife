import {SEED, setSeed, seedInit, R, ri, pick, chance, clamp, N0} from './core/rng.js';
import {stageLabel} from './core/state.js';
import {TL, resetTL, tlStage, tlPush, tlNote, renderTimeline, tlScrollTo, careerTimelineCard} from './ui/timeline.js';
import {$, _curYearBody, scrollBottom, logTarget, teamChip, modalOpen, modalClose, menuModal, restartModal, card, divider, board, actClear, actToggleSync, choose} from './ui/dom.js';
import {traitName, traitTagStyle, renderTraits} from './ui/traits.js';
import {THEME_KEY, BIG_KEY, applyTheme, applyMobileUI, isMobileLayout, applyBigText, THEME_NAMES, updDispSum, themeModal} from './ui/prefs.js';
import {ALLOC, setAlloc, clearAlloc, allocFullOpen, allocFullClose, allocPlace} from './ui/alloc.js';
import {teamNick} from './data/teams.js';
import {dpScore, posAdjLabel, dpBar, dpQual, dpList, dposReview, careerAllStars, toolGap, ovr, playerType, abCost, normalizeAbCarry, addAb, addAbStat, statBonus} from './engine/ability.js';
import {tjAccrue, tjCap, tjGamble, tjDeltaText, tjRepeatDamage, tjBigInjury, afterGamble, injuryProb, injuryMarketStatus, rollInjury, injStatLoss} from './engine/injury.js';
import {pitcherRole, fmtIP, roleN, isSP, scaledSteals, capSteals, simSeason, applySeasonForm, defRuns, pitcherSalaryRole, seasonSalaryRating, currentSalaryRating, normalizeBatterStats, normalizePitchingStats, accStat, statLine, slgOf, amateurSeason, proSeason, roleName3} from './engine/season.js';
import {pitcherContractCap, hasMlbService, levelMinAnnual, salaryFor, fmtMoney, calcContractAnnual, ratingAtLevel, contractAnnual, makeContract, postingReleaseFee, controlledAnnual, salParts, teamChampRate, marketRating, contractMarketProfile, faYears, demotionAudit, offseasonTradeCheck, doTradeExec, buyoutRemaining, daibaFarewell, handleDemotion, outOfOrg, teamListOf, signTo, pickOfferUI, makeOffers, termParams, termEstimate, termChoice, extensionOffer, faFlow, marketRetirementText, retireFromMarket, homecomingAfterRejectedOffer, faMarket, ageGateUSA, ageGateJP, crossOffers} from './engine/contract.js';
import {awardP, awards} from './engine/awards.js';
import {intlStatLine, addIntlStat, intlMvpRate, intlFormat, maybeIntl} from './engine/intl.js';
import {positionScore, careerScore, primaryPos, capTeam, defShare, posLegendPhrase, honorScore, tierOf, statTable, milestoneLevel, milestoneLine, careerMilestones, honorRank, honorGroups, yearRanges, honorText} from './engine/career.js';
import {APP_VER, OFFICIAL_URL, OFFICIAL_HOST} from './config.js';
import {S, setS, stepQ, nextStep, newState, playerName, blankStat, bucketOf} from './core/state.js';
import {ABL, POS_AB, POSN, DPN, DP_TH, DP_BAR, POS_ADJ_RUNS, DP_RANK, GLOVE_TH} from './data/abilities.js';
import {TEAM_COLOR, CPBL_TEAMS, NPB_TEAMS, MLB_TEAMS, LV, PATHS, HS_CUPS, U_CUPS, LG_N} from './data/teams.js';
import {TRAIT_KEYS, TRAIT_N, TRAIT_FX} from './data/traits.js';
import {EVENTS} from './data/events.js';
import {AMA_ANNUAL, LEVEL_MIN_ANNUAL, MLB_SERVICE_MINOR_MIN, TIER_TH, MILESTONE_DEF, FAN, RP_TICKS, RP_LV_SUF} from './data/economy.js';

/* ================= 靜態資料 ================= */
/* 各守位守備分公式:依守位看重不同能力(回傳一個綜合守備分) */
function traitCard(key,name,desc,tone){ S.traits[key]=true;
  card(tone||'gold','隱藏屬性解鎖：'+name,desc); board(0); }
function removeTrait(key,label){ if(S.traits[key]){ S.traits[key]=false;
    if(!S.removed.includes(label))S.removed.push(label); } }
/* 加點介面：mode {dice:[..]} 或 {pool:n} */
function allocUI(mode,label,done){
  actClear();
  const a=$('act'); const keys=POS_AB[S.pos];
  let dice=mode.dice?mode.dice.slice():null, pool=mode.pool||0, idx=0, hist=[];
  a.innerHTML=`<div class="title">${label}</div><div id="al-top"></div><div id="al-rows"></div><div class="row2" id="al-btm"></div>`;
  const touchedKeys={};
  const top=$('al-top'),rows=$('al-rows'),btm=$('al-btm');
  /* allocPlace() below decides panel vs overlay from the current settings, and can be
     called again by applyMobileUI / applyBigText if the player changes them mid-allocation */
  setAlloc({top,rows,btm,label,render});
  function remaining(){ return dice?dice.length-idx:pool; }
  function render(){
    if(dice){ top.innerHTML='<div id="dice">'+dice.map((v,i)=>`<div class="die ${i<idx?'used':''} ${i===idx?'active':''} ${v===6?'six':''}">${v}</div>`).join('')+'</div>'; }
    else top.innerHTML=`<div class="pool">剩餘可分配點數：${pool} 點（點一下能力 +1）</div>`;
    const cue=$('al-cue'); if(cue)cue.textContent=dice?`剩餘 ${remaining()} 顆骰子未分配`:`剩餘 ${remaining()} 點未分配`;
    rows.innerHTML='';
    keys.forEach(k=>{ normalizeAbCarry(k); const v=S.ab[k],cap=v>=80;
      const r=document.createElement('div'); r.className='abrow'+(cap?' capped':'');
      const pk=(S.pot&&S.pot[k])||62, cst=abCost(k), cr=(S.carry&&S.carry[k])||0;
      r.innerHTML=`<span class="nm">${ABL[k]}</span><span class="bar"><i style="width:${v/80*100}%"></i><em style="left:${pk/80*100}%"></em></span><span class="val" style="line-height:1.1">${v}<small style="opacity:.5">/${pk}</small>${cst>1?`<span style="display:block;opacity:.5;font-size:10.5px;letter-spacing:1px;margin-top:-2px">${cr}/${cst}</span>`:''}</span>`;
      if(!cap&&remaining()>0)r.onclick=()=>{ const amt=dice?dice[idx]:1;
        const pc=(S.carry&&S.carry[k])||0;
        const got=addAb(k,amt); touchedKeys[k]=(touchedKeys[k]||0)+amt; hist.push([k,got,pc]); if(dice)idx++; else pool--;
        r.querySelector('.val').innerHTML=`${S.ab[k]} <b style="display:block;font-size:10.5px">${got>0?'+'+got:'蓄力中'}</b>`; render(); board(0); };
      rows.appendChild(r); });
    btm.innerHTML='';
    /* 復原鈕固定佔位:無可復原時 disabled 而非消失,避免版面跳動誤觸 */
    const u=document.createElement('button'); u.className='btn'; u.style.textAlign='center';
    u.textContent='↩ 復原'; u.disabled=!hist.length;
    u.style.opacity=hist.length?'1':'0.35'; u.style.cursor=hist.length?'pointer':'default';
    if(hist.length)u.onclick=()=>{ const [k,got,pc]=hist.pop(); S.ab[k]-=got; if(S.carry)S.carry[k]=pc; if(dice)idx--; else pool++; render(); board(0); };
    btm.appendChild(u);
    const allCap=keys.every(k=>S.ab[k]>=80);
    if(remaining()===0||allCap){ const c=document.createElement('button'); c.className='btn main';
      c.textContent=(remaining()>0&&allCap)?'能力已達上限，捨棄剩餘骰子 ▸':'確認 ▸';
      c.onclick=()=>{ actClear(); allocDone(touchedKeys,dice?true:false); done(); }; btm.appendChild(c); }
    actToggleSync();
  }
  allocPlace();
  /* Roll-in animation on first render only; purely visual (Math.random, not the
     seeded RNG) — game values always come from dice[]. Scoped to `top` rather than #act
     because in the overlay form the dice live in #af-body, where #act cannot see them. */
  if(dice && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    top.querySelectorAll('#dice .die').forEach((el,i)=>{
      el.classList.add('rolling');
      const iv=setInterval(()=>{ el.textContent=1+Math.floor(Math.random()*6); },70);
      setTimeout(()=>{ clearInterval(iv); el.classList.remove('rolling'); el.textContent=dice[i];
        if(dice[i]===6)el.classList.add('flash6'); },260+i*90);
    });
  }
}
/* ================= 年度流程 ================= */
function startYear(){ stepQ.length=0; stepQ.push(phasePre,phaseMid,phaseEnd); divider(`${S.year} 年 · ${S.age} 歲 · ${stageLabel()}`); tlPush(); nextStep(); }
/* ---------- 季初 ---------- */
function phasePre(){
  board(0); S.tmpInj=0; S.seasonFactor=1; S.skipMid=false; S.marketInjury='healthy'; S.prevD=S.lastD||0; S.lastD=0; S.lastPayD=0; /* 先保留上季 d 供投手定位判定 */
  if(S.age>=48){ buyoutRemaining(1,true); endGame('身體已到極限，'+S.year+' 年春訓後宣布引退。'); return; }
  const declAge=S.age-(S.traits.disc?2:0); /* 自律狂:衰退曲線整體延後兩年 */
  if(declAge>=32){ const dec=declAge>=35?5+(declAge-35):2;
    POS_AB[S.pos].forEach(k=>S.ab[k]=clamp(S.ab[k]-dec,1,80));
    card('bad','歲月不饒人',`${declAge>=35?'第二階段（逐年加劇）':'第一階段'}衰退：所有能力 <b class="dn">−${dec}</b>${S.traits.disc?'（自律狂：生涯延後兩年）':''}。訓練加點照常，但身體回不去了。`); board(0); }
  if(S.rehab>0){ S.rehab--; S.skipMid=true; S.seasonFactor=0; S.marketInjury='rehab';
    card('bad','復健年',`大傷尚未痊癒，本季確定<b class="dn">全年報銷</b>，只能在復健室度過。（擲骰減為 2 顆）`);
    const dummySt = {G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,avg:0,era:0,WHIP:0,DEF:0};
    S.log.push({y:S.year,age:S.age,tm:S.stage==='PRO'?S.teamName():(S.team||stageLabel()),line:'復健年・全年報銷', inj: true, st: S.stage==='PRO'?dummySt:null}); }
  let afterAsk=()=>{
    let n=S.skipMid?2:(()=>{const r=R();return r<0.35?3:r<0.75?4:r<0.95?5:6;})();
    if(S.traits.distract&&!S.skipMid)n=Math.max(2,n-1); /* 外務纏身 */
    if(S.traits.academy&&!S.skipMid&&chance(35))n++; /* 學院派:期望值略升 */
    
    const dice=[]; let newSix=0;
    for(let i=0;i<n;i++){ const v=S.traits.genius?ri(4,6):S.traits.late?ri(3,6):ri(1,6); dice.push(v);
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
      if(gained > 0) cmsg += `（能力 <b class="up">+${gained}</b>）`;
      if(overflow > 0) cmsg += `（頂峰造極：溢出的 ${overflow} 點轉為<b class="up">本季成績加成</b>）`;
      if(gained===0 && overflow===0) cmsg += `（能力加點，但不足以提升一級）`;
      msg += cmsg + `。`;
    }
    
    card('','季初特訓',msg);
    if(S.six>=5&&!S.traits.genius&&S.age<22){ S.traits.genius=true;
      {
      const exDef=S.pos==='C'?['rng','fld','arm','cat']:[];
      const cands=POS_AB[S.pos].filter(k=>S.ab[k]<70&&!exDef.includes(k));
      for(let i=cands.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=cands[i];cands[i]=cands[j];cands[j]=t;}
      const boost=cands.slice(0,2), bl=[];
      boost.forEach(k=>{ S.pot[k]=Math.min(80,(S.pot[k]||62)+10);
        S.ab[k]=clamp(S.ab[k]+5,1,80); bl.push(`${ABL[k]} <b class="up">+5</b>（潛力上限 +10 → ${S.pot[k]}）`); });
      card('gold','隱藏素質解鎖：天才','22 歲前五度擲出高標值！從今以後，每一顆訓練骰<b class="hl">永久固定 4 點以上</b>，事件卡好結果機率提升至 <b class="hl">70%</b>。'+(bl.length?`天賦覺醒，潛能重新被評估：${bl.join('、')}。`:'')+'天賦，是藏不住的。');
      board(1);
    } }
    choose('',[{t:`▸ 分配訓練成果（${dice.length} 顆骰）`,main:true,f:()=>dposReview(()=>allocUI({dice},'分配訓練成果（點骰套用｜球探量表：'+(S.pos==='P'?'60/70/75':'70/75')+' 以上成長遞減）',()=>nextStep()))}]);
  };
  /* 投手開季：投球強度(續航+TJ 量表) */
  const preAsk=afterAsk;
  if(S.pos==='P'&&S.stage==='PRO'&&!S.skipMid){
    afterAsk=()=>{
      choose(`開季投球規劃（手臂狀況：${(function(){const r=S.tj/tjCap();return S.rehab>0?'復健中':r>=0.85?'手肘隱隱作痛':r>=0.6?'手臂略感疲勞':r>=0.35?'狀況尚可':'手感輕盈';})()}）`,[
        {t:'全力投',warn:true,s:'成績最佳｜手臂負荷最大（TJ 累積 ×1.30）',f:()=>{S.effort='全力投';preAsk();}},
        {t:'普通投',main:true,s:'標準強度｜TJ 累積正常',f:()=>{S.effort='普通投';preAsk();}},
        {t:'養生球',s:'成績保守｜省手臂（TJ 累積 ×0.80）',f:()=>{S.effort='養生球';preAsk();}}]);
    };
  }
  /* 大學季前：是否投入選秀與旅外（大二～大四） */
  if(S.stage==='U'&&S.stageYr>=2){
    const o=ovr();
    const opts=[
      {t:'投入中華職棒選秀',s:`目前綜合 ${o}｜年齡加權：越年輕評價越高`,f:()=>runDraft(true,afterAsk)},
      {t:'留在大學繼續磨練',main:true,f:afterAsk}
    ];
    /* 年齡懲罰：每長一歲，門檻微調，但簽約金大幅縮水 */
    const agePenalty = Math.max(0, S.age - 18);
    const reqNPB = 44 + Math.floor(agePenalty / 2);   // 門檻：18歲44 -> 22歲46
    const reqMiLB = 50 + Math.floor(agePenalty / 2);  // 門檻：18歲50 -> 22歲52
    const bonusNPB = Math.max(100, 800 - agePenalty * 180);   // 日職簽約金逐年大減
    const bonusMiLB = Math.max(150, 1500 - agePenalty * 350); // 美職簽約金逐年大減
    if(o>=reqNPB)opts.push({t:'洽談旅日合約',s:`休學挑戰日職｜大齡影響簽約金`,f:()=>{
      S.stage='PRO'; S.team=''; S.svc=0; S.faElig=false;
      pickOfferUI('日職球團報價','NPB',makeOffers('NPB',2,bonusNPB,2,3,'NPB2',null),afterAsk);}});
    if(o>=reqMiLB)opts.push({t:'洽談旅美合約',s:`休學挑戰小聯盟｜大齡影響簽約金`,f:()=>{
      S.stage='PRO'; S.team=''; S.svc=0; S.faElig=false;
      pickOfferUI('大聯盟球團報價','MiLB',makeOffers('MiLB',2,bonusMiLB,3,4,o>=55?'A1':'R',null),afterAsk);}});
    choose(`大${['一','二','三','四'][S.stageYr-1]}季前 · 升學與職棒的十字路口`,opts);
    return;
  }
  if(S.stage==='PRO'&&S.age>=36&&S.rehab===0){
    const oldOpts=[{t:'再戰一年',main:true,f:afterAsk}];
    /* 旅外老將(衰退期):放棄現有合約,落葉歸根返台;ovr<30(真的打不動)不給 */
    if(S.org!=='CPBL'&&ovr()>=LV.CPBL2.min){
      oldOpts.push({t:'放棄合約，落葉歸根',s:'狀態不再，仍想把最後的球打給家鄉看',f:()=>{
        card('good','落葉歸根',`狀態早已不在巔峰。但家鄉球隊仍然向你招手——他們要的不是現在的數據，是你這個名字陪著大家走過的那些年。你決定放棄合約，回家，把最後的球打給臺灣的球迷看。`);
        signTo('CPBL','CPBL1'); afterAsk();
      }});
    }
    oldOpts.push({t:'召開引退記者會',warn:true,s:'結束選手生涯',f:()=>{buyoutRemaining(0.7,true);daibaFarewell(()=>endGame('功成身退，於 '+S.year+' 年宣布引退。'));}});
    choose('又是一年春訓，身體大不如前了',oldOpts);
    return;
  }
  afterAsk();
}
/* ---------- 賽季中 ---------- */
function phaseMid(){
  board(1);
  if(S.skipMid){ S.ironStreak=0; nextStep(); return; }
  const nEv=S.stage==='PRO'?3:2;
  loveEvent(()=>drawEvents(nEv,()=>{
    choose('',[{t:'▸ 季中健康檢查',main:true,f:()=>{ rollInjury();
      choose('',[{t:'▸ 查看球季表現',main:true,f:()=>{
        if(S.stage==='PRO')proSeason();
        else amateurSeason(); }}]); }}]);
  }));
}
function evOdds(){ /* 事件卡成功率:顯示與擲骰共用同一來源 */
  let base=(S.traits.genius||S.traits.late||S.traits.clutch)?70:50; /* 天才/大器晚成/大心臟 70 */
  if(S.traits.thief)base-=10; /* 薪水小倫 -10 */
  const boldPen=S.traits.clutch?0:15; /* 大心臟:豪賭無懲罰 */
  return {safe:Math.min(95,base+20), norm:base, bold:base-boldPen};
}
function drawEvents(n,done){
  if(n<=0){ done(); return; }
  choose('',[{t:`抽事件卡（剩 ${n} 張）`,main:true,f:()=>{
    const pool=EVENTS.filter(e=>e.for==='*'||(e.for==='P'&&S.pos==='P')||((e.for==='A'||e.for==='B')&&S.pos!=='P')||(e.for==='PRO'&&S.stage==='PRO'));
    const ev=pick(pool);
    const od=evOdds(); /* 與實際擲骰同源 */
    const after=()=>{ board(1); drawEvents(n-1,done); };
    choose(`事件｜${ev.n} — 你要怎麼應對？`,[
      {t:'全力一搏',warn:true,s:`成功率 ${od.bold}%｜${S.traits.clutch?'成功 +4／失敗僅 −2':'加成／減益幅度最大（±3）'}`,f:()=>{resolveEvent(ev,'bold',after);}},
      {t:'照常執行',main:true,s:`成功率 ${od.norm}%｜標準幅度（±2）`,f:()=>{resolveEvent(ev,'norm',after);}},
      {t:'保守應對',s:`成功率 ${od.safe}%｜加成／減益幅度最小（±1）`,f:()=>{resolveEvent(ev,'safe',after);}}]);
  }}]);
}
/* 出廠預設為全虛構人名;玩家可透過隱藏編輯器自訂名單(僅存於玩家本機) */
let CHEER=['林曉晴','陳若彤','張沛慈','王詠恩','許昀熙','蘇采蓁','周依潔','郭芷萱'];
const CHEER_DEFAULT=CHEER.slice();
let CHEER_SAFE=['馮海莎']; /* 不會變成小三的名單:可交往/結婚,永不出現在外遇人選 */
function datePool(){ /* 交往/結婚名單 */
  if(CHEER_SAFE.length>=CHEER.length) return CHEER_SAFE.slice();      /* 安全名單較長:直接整組替換 */
  return CHEER_SAFE.concat(CHEER.slice(CHEER_SAFE.length));           /* 較短:同數量替換進名單 */
}
function affairPool(){ return CHEER.slice(); } /* 外遇名單=原啦啦隊名單 */
function loveEvent(next){
  const L=S.love;
  if(S.stage!=='PRO'||S.age<20){ next(); return; }
  /* ---------- 交往中:每年必定走一輪(不吃機率門檻) ---------- */
  if(L.st==='dating'){
    L.dyrs=(L.dyrs||0)+1;
    const y=L.dyrs;
    /* 交往太久不結婚 → 分手風險逐年升高 */
    const cheatPen=(L.cheatYr===S.year-1||L.cheatYr===S.year)?30:0; /* 劈腿當年分手率+30% */
    const bkP=(y>=4?20+(y-4)*15:0)+cheatPen;
    if(bkP>0&&chance(bkP)){
      const k1=pick(POS_AB[S.pos]),k2=pick(POS_AB[S.pos]);
      const g1=addAb(k1,-3),g2=addAb(k2,-3); board(1);
      const ex=L.partner; L.st=L.exes.length?'divorced':'single'; L.partner=null; L.dyrs=0;
      card('bad','分手',`${cheatPen?'那晚的事她其實都知道。':''}交往 ${y} 年，婚期一延再延。<b class="hl">${ex}</b> 最後留下一句：「我等不到了。」轉身離開。整個休賽季你魂不守舍——<b class="dn">${ABL[k1]} ${g1}、${ABL[k2]} ${g2}</b>。`);
      next(); return; }
    const ask=()=>proposalAsk(next);
    if(chance(30)){ /* 三成機率先來一段插曲,結束後照樣問婚 */
      const r=R()*100;
      if(r<40){ const t=pick(affairPool().filter(n=>n!==L.partner));
        choose(`聚餐散場，${t} 說順路想搭你的車`,[
          {t:'讓她上車（賭一把）',warn:true,s:'沒被抓到＝體力提升｜被抓到＝能力下跌、當年分手率+30%',f:()=>{
            L.affairs++;
            if(chance(55)){ const gt=loveGainTxt('sta',2); board(1);
              card('bad','深夜兜風',`沒有人拍到。你把方向盤握得很緊——${gt}。（這條路不會有好結局）`); ask(); }
            else loveCaughtDating(next); }},
          {t:`「不順路。」直接載 ${L.partner} 回家`,main:true,s:'感情穩固，絕對不虧',f:()=>{
            const gt=loveGainTxt('sta',1); board(1);
            card('good','正確答案',`你傳訊息給 ${L.partner}：「馬上到。」——${gt}。`); ask(); }}]); return; }
      if(r<70){ const gt=loveGainTxt('sta',1); board(1);
        card('good','明星賽放閃',`明星賽表演賽，鏡頭掃到看台上的 <b class="hl">${L.partner}</b>，你隔著全場比了一個手勢，轉播單位立刻切出愛心特效，隔天甜上熱搜——${gt}。`); ask(); return; }
      const gt=loveGainTxt('sta',1); board(1);
      card('good','愛情長跑',`交往邁入第 ${y} 年。沒有大新聞，只有每個客場系列賽結束後，機場出口那杯她替你買好的熱美式——${gt}。`); ask(); return; }
    ask(); return;
  }
  const fire=(L.st==='married'&&L.kids===0)?40:(L.st==='single'||L.st==='divorced')?40:30;
  if(!chance(fire)){ next(); return; }
  /* ---------- 未婚/離婚:緋聞 → 雙重關卡 → 交往 ---------- */
  if(L.st==='single'||L.st==='divorced'){
    const p=pick(datePool());
    card('info','場外話題',`你和啦啦隊女神 <b class="hl">${p}</b> 被拍到球場外同框，緋聞登上娛樂版頭條。${L.exes.length?'（評論區：「離過婚還這麼搶手」）':''}`);
    choose('記者把麥克風遞到你面前：「兩位是在交往嗎？」',[
      {t:'大方承認：「請大家祝福我們」',s:'還要看她那邊敢不敢承認（球團有禁愛令傳聞）',f:()=>{
        if(chance(65)){ L.st='dating'; L.partner=p; L.dyrs=0; L.datedTimes=(L.datedTimes||0)+1;
          const gt=loveGainTxt('sta',1); board(1);
          card('gold','戀情公開',`<b class="hl">${p}</b> 在社群發出十指緊扣的照片：「謝謝大家的祝福。」戀愛使人容光煥發——${gt}。你們正式交往了。`);
          if(L.datedTimes>=3&&L.kids===0&&!S.traits.married&&!S.traits.confidante){ S.traits.confidante=true;
            card('gold','隱藏稱號：閨中密友',`第三段戀情，還是走到了同樣的結局。「我愛上了你，你卻只把我當好姊妹。」——有些人註定是別人生命裡的過客。`); board(1); }
        }
        else{ card('bad','單方面承認',`她隔天透過經紀公司否認：「只是普通朋友。」據傳啦啦隊<b class="dn">禁愛令</b>壓力不小。你一個人站在風裡，超級尷尬。`); }
        next(); }},
      {t:'笑而不答，快步走過',main:true,s:'不承認就沒有下文',f:()=>{
        card('info','未完待續','緋聞燒了三天就退燒。也許時機還沒到。'); next(); }}]); return;
  }
  /* ---------- 已婚 ---------- */
  if(L.kids<4&&chance([65,45,30,20][L.kids])){ /* 生子:第一胎最優先,越生越少 */
    L.kids++; const kk=pick(POS_AB[S.pos]); const gt=loveGainTxt(kk,2); board(1);
    card('gold','新生命',`${L.partner} 平安生下你們的第 <b class="hl">${L.kids}</b> 個孩子。當了${L.kids>1?'幾次':''}爸爸的男人，眼神都不一樣了——${gt}。`);
    next(); return;
  }
  const r=R()*100;
  if(r<40){ /* 外遇誘惑:唯一可以賭的婚內事件 */
    const t=pick(affairPool().filter(n=>n!==L.partner));
    const kidWord=L.kids===1?'孩子':'孩子們';
    const rejectAffairText=L.kids===0
      ?'回訊息：「準備和家人視訊了，晚安」'
      :`回訊息：「陪${kidWord}讀完故事書了，晚安」`;
    const homeVideoText=L.kids===0
      ?`${L.partner} 在鏡頭那頭笑著向你揮手。`
      :`${L.partner} 和${kidWord}在鏡頭那頭揮手。`;
    choose(`客場飯店酒吧，${t} 傳來訊息：「睡了嗎？」`,[
      {t:'赴約（賭一把）',warn:true,s:'沒被抓到＝體力提升｜被抓到＝能力下跌、婚姻危機',f:()=>{
        L.affairs++;
        if(chance(55)){ const gt=loveGainTxt('sta',2); board(1);
          card('bad','深夜行程',`你僥倖沒被拍到。不知為何，罪惡感反而讓你精神亢奮——${gt}。（你知道這不會有好下場）`);
          next(); }
        else loveCaught(next); }},
      {t:rejectAffairText,main:true,s:'家庭和睦，絕對不虧',f:()=>{
        const gt=loveGainTxt('sta',1); board(1);
        card('good','家的方向',`你把手機扣在桌上，撥了視訊回家。${homeVideoText}心定了，身體就穩了——${gt}。`); next(); }}]); return; }
  if(r<70&&L.kids>0){ /* 愛小孩新聞 */
    const gt=loveGainTxt('sta',1); board(1);
    card('good','球場邊的父親',`你被拍到賽前隔著護網教孩子怎麼戴手套，影片配文「最強棒球教室」瘋傳。網友：「這才是人生勝利組。」——${gt}。`); next(); return; }
  /* 結婚紀念日 */
  const gt=loveGainTxt('sta',1); board(1);
  card('good','結婚紀念日',`結婚紀念日，你推掉了自主訓練，陪 <b class="hl">${L.partner}</b> 回到當年辦婚禮的場地。她說：「明年也要來喔。」——${gt}。`); next();
}
function divorceRec(){ const L=S.love;
  L.exes.push({name:L.partner,kids:L.kids});
  L.st='divorced'; L.partner=null; L.kids=0; /* 再婚後小孩重新計算 */ }
function loveCaught(next){
  const L=S.love; L.caught++;
  const kk=pick(POS_AB[S.pos]); const g=addAb(kk,-3);
  let extra='';
  if(L.caught>=2){
    if(!S.traits.scum){ S.traits.scum=true;
      card('bad','隱藏屬性解鎖：渣男','第二次被逮個正著。從今以後你在球迷心中的形象定型了——<b class="dn">每次外遇被抓到，全能力 −5</b>。'); }
    POS_AB[S.pos].forEach(k=>{ S.ab[k]=clamp(S.ab[k]-5,1,80); });
    extra='<b class="dn">全能力 −5</b>（渣男的代價）。'; }
  board(1);
  card('bad','頭版醜聞',`狗仔的鏡頭比你想的更快，照片鋪滿版面。贊助商緊急撤圖，你在鏡頭前鞠躬 90 度。<b class="dn">${ABL[kk]} ${g}</b>。${extra}`);
  choose(`${L.partner} 把離婚協議書放在餐桌上`,[
    {t:'跪著道歉，求她再給一次機會',s:'成功保住婚姻｜失敗＝再扣能力並離婚',f:()=>{
      if(chance(40)){
        card('info','低谷之後',`長談了一整夜。<b class="hl">${L.partner}</b> 最後說：「為了孩子，也為了那個我認識的你——最後一次。」婚姻保住了，但有些東西回不去了。`); next(); }
      else{ const k2=pick(POS_AB[S.pos]); const g2=addAb(k2,-2);
        const ex=L.partner; divorceRec(); board(1);
        card('bad','道歉無效',`她聽完只是搖頭，隔天律師的存證信函就到了。<b class="hl">${ex}</b> 正式與你離婚，輿論二次發酵——<b class="dn">${ABL[k2]} ${g2}</b>。`); next(); } }},
    {t:'簽字離婚',f:()=>{ const ex=L.partner; divorceRec();
      card('bad','離婚',`你在協議書上簽了名。<b class="hl">${ex}</b> 的聲明只有一句：「祝彼此安好。」`); next(); }}]);
}
function proposalAsk(next){
  const L=S.love; if(L.st!=='dating'){ next(); return; }
  choose(`交往第 ${L.dyrs} 年——${L.partner} 看著別人的婚禮影片看了很久`,[
    {t:'就是現在——求婚',s:'固定加成：全體力提升、本季更不容易受傷',f:()=>{
      L.st='married'; L.kids=0; L.dyrs=0;
      const gTxt=loveGainTxt('sta',2)+'、'; S.tmpInj-=5; board(1);
      card('gold','婚禮',`你在主場本壘板後方單膝跪地，大螢幕打出「Marry Me」。<b class="hl">${L.partner}</b> 哭著點頭。休賽季完婚，紅毯用壘包排成——${gTxt}本季受傷機率 <b class="up">−5%</b>。`); next(); }},
    {t:'再存一點錢吧',main:true,s:'她沒說什麼,但交往越久分手風險越高',f:()=>{
      card('info','再等等','她關掉影片，笑著說沒事。你假裝沒看到她眼裡的東西。'); next(); }}]);
}
function loveCaughtDating(next){
  const L=S.love; L.caught++; L.cheatYr=S.year; /* 被抓到才觸發當年分手率+30% */
  const kk=pick(POS_AB[S.pos]); const g=addAb(kk,-3);
  let extra='';
  if(L.caught>=2){
    if(!S.traits.scum){ S.traits.scum=true;
      card('bad','隱藏屬性解鎖：渣男','第二次被逮個正著。從今以後你在球迷心中的形象定型了——<b class="dn">每次劈腿/外遇被抓到，全能力 −5</b>。'); }
    POS_AB[S.pos].forEach(k=>{ S.ab[k]=clamp(S.ab[k]-5,1,80); });
    extra='<b class="dn">全能力 −5</b>（渣男的代價）。'; }
  board(1);
  card('bad','劈腿曝光',`行車紀錄器畫面流出，時間軸對得整整齊齊。<b class="dn">${ABL[kk]} ${g}</b>。${extra}`);
  choose(`${L.partner} 已讀不回三天後，終於答應見面`,[
    {t:'道歉，求她再給一次機會',s:'成功保住感情｜失敗＝再扣能力並分手',f:()=>{
      if(chance(40)){
        card('info','低谷之後',`她哭著罵完，最後說：「最後一次。」感情保住了，但信任的裂痕補不回來。`); next(); }
      else{ const k2=pick(POS_AB[S.pos]); const g2=addAb(k2,-2);
        const ex=L.partner; L.st=L.exes.length?'divorced':'single'; L.partner=null; L.dyrs=0; board(1);
        card('bad','道歉無效',`她把你送的東西整箱寄回。<b class="hl">${ex}</b> 封鎖了所有聯絡方式——<b class="dn">${ABL[k2]} ${g2}</b>。`); next(); } }},
    {t:'坦然分手',f:()=>{ const ex=L.partner;
      L.st=L.exes.length?'divorced':'single'; L.partner=null; L.dyrs=0;
      card('bad','分手',`<b class="hl">${ex}</b> 的限時動態只有一片黑。粉絲全都知道是誰的錯。`); next(); }}]);
}
function loveGainTxt(k,amt){ /* 戀愛事件加點:機制同事件卡(addAbStat);回傳誠實的顯示文字 */
  const before=S.pendStat||0;
  const g=addAbStat(k,amt);
  const over=(S.pendStat||0)-before;
  if(g>0&&over>0)return `<b class="up">${ABL[k]} +${g}</b>（溢出 ${over} 點轉為本季成績加成）`;
  if(g>0)return `<b class="up">${ABL[k]} +${g}</b>`;
  if(over>0)return `<b class="up">本季成績加成 +${over}</b>（${ABL[k]} 已達潛力上限）`;
  return `${ABL[k]} 能力加點，但不足以提升一級`;
}
function resolveEvent(ev,mode,done){
  done=done||function(){};
  const od=evOdds(); /* 與畫面顯示同源,保證所見即所得 */
  if(mode==='safe')S.cntSave++;
  let good,tag;
  if(mode==='safe'){ good=chance(od.safe); tag='保守應對'; }
  else if(mode==='bold'){ good=chance(od.bold); tag='全力一搏';
    if(good)S.cntBoldWin++; else S.cntBoldFail++; }
  else { good=chance(od.norm); tag=''; }
  if(mode==='safe'&&good)S.cntSaveWin=(S.cntSaveWin||0)+1; /* 自律狂:保守成功才算 */
  if((ev.n==='宵夜文化'||ev.n==='場外代言邀約')&&mode!=='safe'&&!good)S.cntSnack++;
  /* 效果固定 ±1;豪賭成功則同一項再 +1(等於賭中加倍成長),豪賭失敗則 -1 再 -1 */
  /* 效果級距:保守 ±1 / 照常 ±2 / 豪賭 ±3;大心臟豪賭成功 +4、失敗 -2 */
  let mag=mode==='safe'?1:mode==='bold'?3:2;
  if(mode==='bold'&&S.traits.clutch)mag=good?4:2; /* 大心臟:上檔更高、下檔更軟 */
  const fx=good?ev.g:ev.b; let out=[],touched=false;
  const applyAbil=(k,dir)=>{ const step=dir*mag;
    if(dir>0){
      const pk=(S.pot&&S.pot[k])||62;
      const isP=S.pos==='P';
      let cur=S.ab[k], bud=step, cr=(S.carry&&S.carry[k])||0, gained=0;
      
      if(cur>=pk){
        statBonus(bud,out); /* 全額轉換為成績加成 */
      } else {
        while(bud>0 && cur<pk){
          let c = isP ? (cur>=66?7:cur>=58?4:cur>=50?2:1) : (cur>=72?3:cur>=64?2:1);
          bud--; cr++; if(cr>=c){ cr-=c; cur++; gained++; }
        }
        if(!S.carry) S.carry={}; S.carry[k]=cr; S.ab[k]=cur;
        
        if(gained>0) out.push(`${ABL[k]} <span class="up">+${gained}</span>`);
        else if(bud<=0) out.push(`${ABL[k]}：能力加點，但不足以提升一級`); /* 點數進了進度槽,未滿一級 */
        if(bud>0) statBonus(bud,out); /* 溢出部分轉換為成績加成 */
      }
      touched=true;
    } else { const g=addAb(k,step); touched=true;
      out.push(`${ABL[k]} <span class="dn">${g}</span>`); }
  };
  for(const k in fx){ const dir=fx[k]>0?1:-1;
    if(k==='inj'){ let v=({1:8,2:12,3:16,4:16})[mag]; if(mode==='bold'&&S.traits.clutch)v=12; /* 大心臟:豪賭受傷率降到普通級 */ S.tmpInj+=v; out.push(`本季受傷機率 <span class="dn">+${v}%</span>`);}
    else if(k==='rand'){ applyAbil(pick(POS_AB[S.pos]),dir); }
    else if(k in S.ab){ applyAbil(k,dir); } }
  if(!touched){ applyAbil(pick(POS_AB[S.pos]),good?1:-1); }
  card(good?'good':'bad','事件卡｜'+ev.n+(tag?`（${tag}）`:''),
    `${good?ev.gt:ev.bt}。${mode==='bold'&&good?'<b class="hl">豪賭成功！</b>':''}${mode==='bold'&&!good?'<b class="dn">豪賭失敗……</b>':''}<br>${out.join('｜')||'（能力加點，但不足以提升一級）'}`);
  checkTraitsMid();
  done();
}
/* 賽季中即時可解鎖的特性 */
function allocDone(touched,isDice){
  const keys=Object.keys(touched);
  if(isDice&&S.stage!=='HS'&&keys.length){ /* 只計職業/大學季初骰的專注度 */
    const tot=Object.values(touched).reduce((a,b)=>a+b,0);
    let mk=keys[0]; keys.forEach(k=>{ if(touched[k]>touched[mk])mk=k; });
    const focused=(touched[mk]/tot>=0.75)?mk:null; /* 七成五以上灌同一項 */
    if(focused&&focused===S.samePickKey)S.samePick++;
    else if(focused){ S.samePickKey=focused; S.samePick=1; }
    else { S.samePickKey=null; S.samePick=0; }
    if(S.samePick>=3&&!S.traits.combo){ S.traits.combo=true; S.samePickBonus=true;
      S.comboKey=S.samePickKey; /* 鎖定解鎖當下的能力,之後不再變動 */
      traitCard('combo','大巧不工',`連續三年，你把所有汗水都澆在同一個工具上——<b class="hl">季初系統會自動擲 1 顆骰，永遠加在你專精的「${ABL[S.comboKey]}」上</b>。專精者的複利。`); }
  }
  /* 大器晚成:25 歲後單季加點總幅度 >=8 */
  const gain=Object.values(touched).reduce((a,b)=>a+b,0);
  if(!S.traits.late&&!S.traits.genius&&ovr()<47&&S.age>=25&&S.age<32&&isDice&&gain>=16){
    S.traits.late=true;
    const exDef=S.pos==='C'?['rng','fld','arm','cat']:[];
    const cands=POS_AB[S.pos].filter(k=>S.ab[k]<70&&!exDef.includes(k));
    for(let i=cands.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=cands[i];cands[i]=cands[j];cands[j]=t;}
    const boost=cands.slice(0,2), bl=[];
    boost.forEach(k=>{ S.pot[k]=Math.min(80,(S.pot[k]||62)+10); S.ab[k]=clamp(S.ab[k]+5,1,80);
      bl.push(`${ABL[k]} <b class="up">+5</b>（潛力上限 +10 → ${S.pot[k]}）`); });
    card('gold','隱藏素質解鎖：大器晚成',`別人都以為你到頂了，你卻在這一年脫胎換骨——從今以後，每一顆訓練骰<b class="hl">永久固定 3 點以上</b>，事件卡好結果機率提升至 <b class="hl">70%</b>。`+(bl.length?`潛能重新被評估：${bl.join('、')}。`:'')+'你的故事，才正要展開。');
    board(1); }
}
function checkTraitsMid(){
  /* 自律狂:25 歲前累積保守「成功」15 次 + 從未外遇被抓 + 宵夜 <5 次 */
  if(!S.traits.disc&&S.age<25&&(S.cntSaveWin||0)>=15&&S.love.caught===0&&S.cntSnack<5){
    traitCard('disc','自律狂','你見過凌晨四點的洛杉磯嗎？——年紀輕輕就把身體當成聖殿經營，沒有派對、沒有酒精，只有重訓室的鐵片聲：<b class="hl">整條衰退曲線延後兩年</b>，你的巔峰比同梯更長。'); }
  /* 大心臟:25 歲前豪賭(全力一搏)成功 7 次(允許失敗) */
  if(!S.traits.clutch&&S.age<25&&S.cntBoldWin>=7){
    traitCard('clutch','大心臟','每次的豪賭淬鍊出你無與無比的心性，愈刺激的狀況只會讓你更加幹勁十足。從此以後，愈賭愈強，成功獎勵愈大，失敗懲罰愈少，不過在豪賭的路上，還是要注意一下身邊的其他人……<br><b class="hl">「全力一搏」成功率提升至天才級、成功加成 +4、失敗只 −2、受傷風險降到普通級；國際賽個人成績獲得小幅加成</b>。'); }
  /* 外務纏身:宵夜/代言/緋聞累計(以宵夜次數 + 感情事件觸發次數估) */
  if(!S.traits.distract&&!S.traits.disc&&(S.love.affairs+S.love.caught+S.cntSnack)>=4&&(S.love.affairs+S.love.caught)>=1){
    traitCard('distract','外務纏身','通告、代言、社群媒體佔據了你太多心神，休賽季很久沒有完整專注在棒球上——<b class="dn">季初擲骰永久 −1 顆</b>（最低 2 顆）。','bad'); }
  /* 更衣室毒瘤:豪賭失敗 4+ 次,或渣男 */
  if(!S.traits.cancer&&!S.traits.franchise&&!S.traits.intlace&&(S.cntBoldFail>=10||S.traits.scum)){
    traitCard('cancer','更衣室毒瘤','教練受夠了你的不可控，隊友對你的新聞指指點點。比起成績，球團現在更想清理休息室的氣氛——<b class="dn">季末被交易機率大增、續約條件惡化</b>。','bad'); }
}
/* ---------- 季末 ---------- */
function phaseEnd(){
  board(2);
  if(S.stage==='PRO'){
    if(!S.ct)S.ct=makeContract(1,1,S.lv,currentSalaryRating(S.lastD||0));
    const sal=contractAnnual(); /* 合約保證年薪：不因本季表現、受傷或能力變動而重算 */
    S.salary+=sal;
    let extra='';
    if(LV[S.lv].top&&S.seasonFactor>0){
      const tp=LV[S.lv].top;
      const pc=clamp(({CPBL:15,NPB:8,MLB:3.5})[tp]+(S.lastD||0)*0.5,2,({CPBL:26,NPB:15,MLB:9})[tp]);
      let pcc=pc;
      if(S.tradeRefuse>0){ pcc*=0.75; } /* 否決交易:戰力略受影響(成本已降) */
      if(chance(pcc)){ const cN={CPBL:'中職總冠軍',NPB:'日本一',MLB:'世界大賽冠軍'}[LV[S.lv].top];
        S.honors.push(`${S.year} ${cN}`); S.wonChamp=true; S.champThisTeam=true; S.champTeam=S.orgTeam; extra=`<br>球隊奪下 <b class="hl">${cN}</b>，全城陷入瘋狂！`; } }
    if(S.tradeRefuse>0)S.tradeRefuse--;
    if(S.tradeHeat>0)S.tradeHeat=Math.max(0,S.tradeHeat-5);
    card('','季末結算',`本年度薪資：<b class="hl">${fmtMoney(sal)}</b>（生涯累計 ${fmtMoney(Math.round(S.salary))}）${S.ct?`｜合約剩 ${Math.max(0,S.ct.yrs-1)} 年`:''}${extra}`);
    board(2);
  }else if(S.stage==='AMA'){
    S.salary+=AMA_ANNUAL;
    card('','企業隊年度收入',`本年度工作年薪：<b class="hl">${fmtMoney(AMA_ANNUAL)}</b>（每月 4 萬；生涯累計 ${fmtMoney(Math.round(S.salary))}）。這是企業隊職員收入，不是職業球員合約。`);
    board(2);
  }
  /* 冠軍、薪資與國際賽都結算完畢後才進入季末交易；新球隊從下一季起生效。 */
  const go=()=>S.stage==='PRO'?offseasonTradeCheck(()=>movement()):movement();
  if(S.pool>0){ const p=S.pool; S.pool=0;
    choose('',[{t:`▸ 分配能力點（${p} 點·大賽／國際賽成果）`,main:true,f:()=>allocUI({pool:p},'季末能力點分配（大賽／國際賽成果）',go)}]); }
  else go();
}
/* ---------- 升降級與去向 ---------- */
function finishContractYear(o){
  if(!S.ct)S.ct=makeContract(2,1,S.lv,currentSalaryRating(S.lastD||0));
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
      S.ct=makeContract(ri(1,2),1,S.lv,renewalD,renewalAnnual,{extOffered:false,controlled:true});
      card('info','球團續約',`你仍在選秀球隊掌控期（服務 ${S.svc}/5 年），球團依服務年資與近年表現行使續約權——固定年薪 <b class="hl">${fmtMoney(S.ct.annual)}</b> × <b class="hl">${S.ct.yrs} 年</b>，合約總額 <b class="hl">${fmtMoney(S.ct.annual*S.ct.yrs)}</b>。`); board(1);
    } else { S.ct=makeContract(ri(1,2),1,S.lv,currentSalaryRating(S.lastD||0)); } /* 非頂級層級 */
  }
  crossOffers(o);
}
function movement(){
  const o=ovr();
  if(S.stage==='HS'){ if(S.stageYr<3)advance(); else pathChoiceHS(); return; }
  if(S.stage==='U'){ if(S.stageYr<4)advance(); else pathChoiceU4(); return; }
  if(S.stage==='AMA'){
    if(S.age>=26){ endGame('選秀多年落榜，'+S.year+' 年結束球員身分，轉任基層教練。'); return; }
    choose('業餘年度結束',[
      {t:'再次投入中職選秀',main:true,f:()=>runDraft(false,()=>advance())},
      {t:'高掛球鞋',warn:true,f:()=>endGame('在業餘球隊劃下句點。')}]);
    return;
  }
  /* 職業 */
  if(S.org==='NPB')S.npbYears++;
  if(LV[S.lv].top){ /* 轉換聯盟：直接解除球團 5 年控制期限制，往後只要合約到期就是自由球員 */
    if(S.svcOrg && S.svcOrg!==S.org){ S.faElig=true; }
    S.svcOrg=S.org;
    S.svc=(S.svc||0)+1; if(S.svc>=5)S.faElig=true;
  }
  if(S.skipMid){ finishContractYear(o); return; } /* 復健年不升降級，但照常累積年資、消耗合約年度與處理到期續約。 */
  if(o<30){ buyoutRemaining(1); endGame('能力已跌破中職二軍最低水準，'+S.year+' 年球季後遭釋出，被迫引退。'); return; }
  /* 神主牌:同隊連續年數(轉隊會歸零,見 doTrade/signTo) */
  if(S.stage==='PRO'&&LV[S.lv].top){ S.teamYears=(S.teamYears||0)+1;
    if(!S.traits.goldcloth&&S.orgTeam==='台中猛獁'&&(S.teamTally.CPBL&&S.teamTally.CPBL['台中猛獁']>=10)){ S.traits.goldcloth=true;
      card('gold','隱藏屬性解鎖：黃金聖衣','效力 台中猛獁 滿十年，你已是這支球隊的象徵。披上那件黃金戰袍，你就是主場的信仰。'); board(1); }
    if(!S.traits.franchise&&S.teamYears>=7&&S.champThisTeam&&S.champTeam===S.orgTeam){ S.traits.franchise=true;
      card('gold','隱藏屬性解鎖：神主牌','這座城市的球迷看著你長大。球團高層很清楚，放你走球迷會把主場拆了——<b class="hl">合約市場保有 4% 招牌球星溢價，並提高引退評價</b>。'); }
    /* ◯◯先生:同一支球隊效力滿 15 年且成績穩定 */
    if(!S.traits.mrteam&&S.teamYears>=15&&(S.lastD||0)>=0){ S.traits.mrteam=true; S.mrTeamName=S.orgTeam;
      const nick=teamNick(S.orgTeam);
      card('gold','隱藏稱號：'+nick+'先生',`十五個年頭，同一件球衣。球迷不再喊你的名字，他們喊你「<b class="hl">${nick}先生</b>」——你就是這支球隊的代名詞。`); board(1); }
    /* ◯◯七彩球衣:同一聯盟生涯效力球隊數超標(中職>3、日職>5、美職>5) */
    if(!S.traits.rainbow){
      const RB={CPBL:['中職',3],NPB:['日職',5],MLB:['大聯盟',5]};
      for(const lg in RB){
        const n=Object.keys((S.teamTally&&S.teamTally[lg])||{}).length;
        if(n>RB[lg][1]){ S.traits.rainbow=true; S.rainbowLg=RB[lg][0];
          card('info','隱藏稱號：'+RB[lg][0]+'七彩球衣',`打開衣櫃，${n} 件不同的球衣掛在眼前——${RB[lg][0]}的球隊你快穿過一輪了。球迷笑稱你是「<b class="hl">七彩球衣</b>」：去到哪裡都能活下來，這也是一種本事。`); board(1); break; }
      }
    } }
  const path=PATHS[S.org], idx=path.indexOf(S.lv);
  let minReq=LV[S.lv].min;
  if(S.org==='NPB'&&S.npbYears>=8){ minReq-=4; }
  const perf=(S.seasonFactor>=0.5)?(S.lastD||0):null; /* 傷缺季不看成績 */
  /* 得獎保護傘:當季拿過個人獎項(MVP/王/最佳投手,不含明星賽)→絕不下放/釋出 */
  const wonAward = S.honors.some(x=>x.startsWith(String(S.year))&&/王|MVP|賽揚|澤村|最佳投手|金手套|守備聖經/.test(x)&&!/明星賽/.test(x));
  /* Fix C:實際成績達標保護傘——用當季真實數據(不看能力 d),打得好就不下放 */
  let goodReal=false;
  { const st=S.lastSt;
    if(st&&S.seasonFactor>=0.5){
      if(S.pos==='P'){
        const era=st.IP>0?st.ER*9/st.IP:99, whip=st.IP>0?(st.H+st.BB)/st.IP:99;
        /* 投手:ERA 或 WHIP 達聯盟一線水準,或有一定救援/中繼產能 */
        if(era<=4.20||whip<=1.35||(st.SV||0)>=15||(st.HLD||0)>=15)goodReal=true;
      }else{
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
  /* 升級(壓倒性表現可連跳兩級) */
  if(idx<path.length-1){ const nx=path[idx+1];
    if(o>=LV[nx].min&&((S.lastD||0)>=0||chance(50))){
      let to=nx;
      if(idx<path.length-2){ const nx2=path[idx+2];
        if(o>=LV[nx2].min+2&&(S.lastD||0)>=4)to=nx2; }
      const oldAnnual=S.ct?(S.ct.annualSchedule&&S.ct.annualSchedule.length?S.ct.annualSchedule[0]:S.ct.annual):null;
      S.lv=to; card('good','升級通知',`表現獲得肯定，${to!==nx?'<b class="hl">連跳兩級</b>':'晉升'} <b class="hl">${LV[to].n}</b>！`); board(2);
      if(S.ct&&Number.isFinite(oldAnnual)&&levelMinAnnual(to)>oldAnnual){
        const raised=contractAnnual();
        card('info','升級薪資保障',`原合約固定年薪 <b>${fmtMoney(oldAnnual)}</b> 低於 ${LV[to].n}保障標準；自下季起調整為 <b class="hl">${fmtMoney(raised)}</b>，後續即使下放也不會再降回原薪。`);
      }
      if(LV[to].top)tlNote(2,'升上'+LV[to].n);
      if(S.traits.yips){ removeTrait('yips','失憶症'); card('good','走出陰影','重回上一層舞台，你終於找回了節奏——<b class="hl">失憶症痊癒</b>。'); } } }
  finishContractYear(o);
}
/* ---------- 選秀與生涯路口 ---------- */
function runDraft(fromSchool,cb){
  const o=ovr(); const score=o+Math.max(0,22-S.age)*2+ri(-4,4);
  const rd=score>=56?1:score>=49?2:score>=43?ri(3,4):score>=37?ri(5,7):score>=30?ri(8,10):0;
  if(rd===0){
    card('bad','選秀落榜',`唱名一輪又一輪，始終沒有你的名字。（綜合 ${o}｜年齡加權後評價 ${score}）`);
    if(fromSchool){ card('info','','回到校隊，明年再來。'); cb(); }
    else cb('fail');
    return;
  }
  const bonus=[0,1000,600,350,350,150,150,150,50,50,50][rd]||50;
  const lv=(rd===1&&o>=50)?'CPBL1':'CPBL2';
  const team=pick(CPBL_TEAMS);
  const accept=()=>{
    S.stage='PRO'; S.team=''; S.salary+=bonus; S.svc=0; S.faElig=false;
    signTo('CPBL',lv,team,ri(2,3),1); /* 菜鳥分段短約(2~3年) */
    card('gold','中華職棒選秀會',`第 <b class="hl">${rd}</b> 輪獲 <b class="hl">${team}</b> 指名！簽約金依順位為 <b class="hl">${fmtMoney(bonus)}</b>。${lv==='CPBL1'?'即戰力評價，直接放入一軍名單。':'先從二軍出發。'}`);
    tlNote(4,'選秀第'+rd+'輪');
    board(0); cb();
  };
  /* 輪次不滿意(第 3 輪以後)可選擇重返業餘再拚一年;年齡太大(24+)則不給這選項,避免拖太久 */
  if(rd>=3 && S.age<24){
    choose(`中華職棒選秀會 · 第 ${rd} 輪獲 ${team} 指名`,[
      {t:'接受指名，加盟球隊',main:true,s:`簽約金 ${fmtMoney(bonus)}｜${lv==='CPBL1'?'一軍':'二軍'}出發`,f:accept},
      {t: (S.stage==='HS'||(S.stage==='U'&&S.stageYr<4))?'重返校園，再拚一年':'重返業餘，再拚一年',warn:true,s:'放棄本次指名，明年重新參加選秀',f:()=>{
        const goUni = (S.stage==='HS')||(S.stage==='U'&&S.stageYr<4);
        const fresh = (S.stage==='HS');
        card('info', goUni?'重返校園':'重返業餘', `看到被選到的輪次，雙眼發黑，原本以為會在前段輪次被選中，卻落到了後段的輪次。你握緊了拳頭，決定${goUni?(fresh?'進入大學繼續深造':'留在校隊繼續磨練'):'重返業餘'}，這一次，你一定要上台戴上所屬球隊的帽子。`);
        if(fresh){ S.stage='U'; S.stageYr=0; S.team=pick(['文化大學','輔仁大學','國立體大','台灣體大','開南大學']); }
        else if(!goUni){ S.stage='AMA'; S.team=pick(['合電','台庫','安妞先物','美麗珊瑚']); }
        if(fromSchool) cb(); else advance();
      }}]);
    return;
  }
  accept();
}
function pathChoiceHS(){
  const o=ovr();
  const opts=[{t:'就讀大學（延長養成）',s:'一年僅 2 場大賽加點｜大二起每年可投入選秀',f:()=>{
      S.stage='U'; S.stageYr=0; S.team=pick(['文化大學','輔仁大學','國立體大','台灣體大','開南大學']);
      card('info','升學',`進入 <b class="hl">${S.team}</b> 棒球隊。`); advance(); }},
    {t:'投入中華職棒選秀',s:'目前綜合 '+o,f:()=>runDraft(false,r=>{
      if(r==='fail')choose('落榜之後',[
        {t:'改就讀大學',main:true,f:()=>{S.stage='U';S.stageYr=0;S.team=pick(['文化大學','輔仁大學','國立體大','台灣體大']);advance();}},
        {t:'加入業餘成棒隊',f:()=>{S.stage='AMA';S.team=pick(['合電','台庫','安妞先物','美麗珊瑚']);advance();}}]);
      else advance(); })}];
  if(o>=44)opts.push({t:'洽談旅日合約',s:'從日職二軍（支配下）出發｜滿 8 年視同本土',f:()=>{
    S.stage='PRO';
    pickOfferUI('日職球團的育成報價','NPB',makeOffers('NPB',ri(2,3),800,3,3,'NPB2',null),()=>{
      card('gold','旅日','目標：一軍初登場。'); advance(); }); }});
  if(o>=50)opts.push({t:'洽談旅美合約',main:true,s:`從${o>=54?' 1A ':'新人聯盟'}出發，逐級挑戰大聯盟`,f:()=>{
    S.stage='PRO';
    pickOfferUI('大聯盟球團的國際簽約報價','MiLB',makeOffers('MiLB',ri(2,3),1500,3,4,o>=54?'A1':'R',null),()=>{
      card('gold','旅美','美國的紅土，等著你去征服。'); advance(); }); }});
  choose(`高中畢業 · 綜合能力 ${o} · 人生的第一個路口`,opts);
}
function pathChoiceU4(){
  const o=ovr();
  const opts=[{t:'投入中華職棒選秀',main:true,s:'綜合 '+o+'｜大學畢業年齡加權下降',f:()=>runDraft(false,r=>{
    if(r==='fail')choose('落榜之後',[
      {t:'加入業餘成棒隊',f:()=>{S.stage='AMA';S.team=pick(['合電','台庫','安妞先物']);advance();}},
      {t:'高掛球鞋',warn:true,f:()=>endGame('大學畢業選秀落榜，決定告別球場。')}]);
    else advance(); })}];

  /* 大四畢業 (約22歲)，套用最大年齡懲罰 (Senior Sign) */
  const agePenalty = Math.max(0, S.age - 18);
  const reqNPB = 44 + Math.floor(agePenalty / 2);
  const reqMiLB = 50 + Math.floor(agePenalty / 2);
  const bonusNPB = Math.max(100, 800 - agePenalty * 180);
  const bonusMiLB = Math.max(150, 1500 - agePenalty * 350);
  if(o>=reqNPB)opts.push({t:'洽談旅日合約',s:'大齡新秀，簽約行情極低',f:()=>{S.stage='PRO';
    pickOfferUI('日職球團報價','NPB',makeOffers('NPB',2,bonusNPB,2,3,'NPB2',null),advance);}});
  if(o>=reqMiLB)opts.push({t:'洽談旅美合約',s:'大齡底薪簽約 (Senior Sign)',f:()=>{S.stage='PRO';
    pickOfferUI('大聯盟球團報價','MiLB',makeOffers('MiLB',2,bonusMiLB,3,4,o>=55?'A1':'R',null),advance);}});
  choose(`大學畢業 · 綜合能力 ${o}`,opts);
}
if(typeof document!=='undefined'&&document.getElementById('btn-menu')){
  document.getElementById('btn-menu').onclick=menuModal;
}
function advance(){
  S.age++; S.year++; S.stageYr++; startYear();
}
/* ================= 結算圖資料建構 =================
   Data builders for shareImage()'s canvas layout (design handoff 2026-08-14).
   All values come from S.*; the in-game settlement cards are untouched. */
/* Baseball tick marks: precomputed points on the left seam (a quadratic from
   (7.6,1.9) over (2.6,12) to (7.6,22.1)); the right seam mirrors them at x=24-x. */
function rpTagline(){
  const first=S.log.length?S.log[0].y:'?';
  return `${primaryPos()}｜${playerType()}｜${first}–${S.year}｜引退時 ${S.age} 歲`+
    (S.pos==='P'&&(S.tjCrises||S.tjCount)?`｜手肘危機×${S.tjCrises||0}／TJ×${S.tjCount}`:'');
}
function rpFamily(){
  const lv=S.love, kid=n=>n?`（育${n}）`:'';
  const cur=lv.st==='married'?`老婆 ${lv.partner}${kid(lv.kids)}`
    :lv.st==='dating'?`交往中 ${lv.partner}（${lv.dyrs||0} 年）`
    :lv.st==='divorced'?'離婚':'未婚';
  const ex=lv.exes.length?`｜前妻 ${lv.exes.map(e=>`${e.name}${kid(e.kids)}`).join('、')}`:'';
  const kids=lv.kids+lv.exes.reduce((t,e)=>t+e.kids,0);
  return `家庭：${cur}${ex}｜子女共 ${kids} 人${lv.affairs?`｜外遇 ${lv.affairs} 次（抓 ${lv.caught}）`:''}`;
}
const RP_F3=v=>v==null?'-':v.toFixed(3).replace(/^0/,'');
const RP_F2=v=>v==null?'-':v.toFixed(2);
function rpCumData(){ /* per-league career totals; best-of-column marks need 2+ rows */
  const isP=S.pos==='P';
  const order=['MLB','NPB','CPBL','MINOR'].filter(b=>S.stats[b]);
  const hd=isP?['Yrs','G','IP','W','L','SV','HLD','SO','BB','ERA','WHIP']
             :['Yrs','G','PA','AVG','OBP','SLG','OPS','H','HR','RBI','SB','DEF'];
  const rows=order.map(b=>{ const st=S.stats[b];
    if(isP){
      const era=st.IP>0?st.ER*9/st.IP:null, whip=st.IP>0?(st.H+st.BB)/st.IP:null;
      return {b,txt:[st.yr,st.G,fmtIP(st.IP),st.W,st.L,st.SV||0,st.HLD||0,st.SO,st.BB||0,RP_F2(era),RP_F2(whip)],
              num:[st.yr,st.G,st.IP,st.W,st.L,st.SV||0,st.HLD||0,st.SO,st.BB||0,era,whip]};
    }
    const obp=st.PA>0?(st.H+st.BB)/st.PA:null, slg=st.AB>0?slgOf(st):null,
          avg=st.AB>0?st.H/st.AB:null, ops=(obp!=null&&slg!=null)?obp+slg:null;
    return {b,txt:[st.yr,st.G,st.PA,RP_F3(avg),RP_F3(obp),RP_F3(slg),RP_F3(ops),st.H,st.HR,st.RBI,st.SB,(st.DEF>0?'+':'')+(st.DEF||0)],
            num:[st.yr,st.G,st.PA,avg,obp,slg,ops,st.H,st.HR,st.RBI,st.SB,st.DEF||0]};
  });
  /* Yrs never marked; L/BB "best" is meaningless; ERA/WHIP take the minimum */
  const minCols=isP?{9:1,10:1}:{}, skip=isP?{0:1,4:1,8:1}:{0:1}, best={};
  if(rows.length>=2)hd.forEach((_,i)=>{ if(skip[i])return;
    const vs=rows.map(r=>r.num[i]).filter(v=>v!=null&&!(v===0&&!minCols[i]));
    if(vs.length)best[i]=minCols[i]?Math.min(...vs):Math.max(...vs); });
  rows.forEach(r=>r.best=r.num.map((v,i)=>best[i]!=null&&v===best[i]));
  return {hd,rows};
}
function rpIntlData(){
  const isP=S.pos==='P', IS=S.intlStat, il=S.intlLog||[];
  if(isP){
    return {hd:['G','IP','W','SV','SO','ERA'],
      rows:il.map(r=>{ const st=r.st; return {year:r.year,name:r.name,rank:r.rank,
        txt:[st.G,fmtIP(st.IP),st.W,st.SV,st.SO,RP_F2(st.IP>0?st.ER*9/st.IP:null)]}; }),
      tot:[IS.G,fmtIP(IS.IP),IS.W,IS.SV,IS.SO,RP_F2(IS.IP>0?IS.ER*9/IS.IP:null)]};
  }
  return {hd:['G','PA','AVG','H','HR','RBI'],
    rows:il.map(r=>{ const st=r.st; return {year:r.year,name:r.name,rank:r.rank,
      txt:[st.G,st.PA,RP_F3(st.AB>0?st.H/st.AB:null),st.H,st.HR,st.RBI]}; }),
    tot:[IS.G,IS.PA,RP_F3(IS.AB>0?IS.H/IS.AB:null),IS.H,IS.HR,IS.RBI]};
}
function rpHonorItems(){ /* [[text,accent?],...] per item; ×N gets the accent color */
  return careerMilestones().map(t=>[[t,0]])
    .concat(honorGroups().map(g=>{ const ranges=yearRanges(g.yrs), n=g.yrs.length, parts=[[g.awd,0]];
      if(n>1)parts.push([` ×${n}`,1]);
      if(ranges.length)parts.push([` (${ranges.join('、')})`,0]);
      return parts; }));
}
function rpOrgOf(r){ /* org team + league + level label for one pro-log row */
  let tm=r.tm||'', lvl='';
  for(const s of RP_LV_SUF){ if(tm.endsWith(s)){ lvl=s; tm=tm.slice(0,-s.length); break; } }
  const lg=CPBL_TEAMS.includes(tm)?'CPBL':NPB_TEAMS.includes(tm)?'NPB':MLB_TEAMS.includes(tm)?'MLB'
    :(r.lv&&LV[r.lv]?(LV[r.lv].top||(LV[r.lv].org==='MiLB'?'MLB':LV[r.lv].org)):'CPBL');
  if(!lvl)lvl=lg==='MLB'?'大聯盟':'一軍';
  return {team:tm,lg,lvl,minor:lvl!=='一軍'&&lvl!=='大聯盟'};
}
function rpProData(proLogs){ /* team segments: a new block whenever the org changes */
  const isP=S.pos==='P';
  const hd=isP?['G','IP','W-L','SV','HLD','SO','BB','ERA','WHIP']
             :['G','PA','AVG','OBP','SLG','OPS','H','HR','RBI','SB','DEF'];
  const blocks=[]; let cur=null;
  proLogs.forEach(r=>{ const o=rpOrgOf(r);
    if(!cur||cur.team!==o.team||cur.lg!==o.lg){ cur={team:o.team,lg:o.lg,rows:[]}; blocks.push(cur); }
    const s=r.st||blankStat(); let txt,era=null,ops=null;
    if(isP){ era=s.IP>0?s.ER*9/s.IP:null;
      txt=[s.G,fmtIP(s.IP),`${s.W}-${s.L}`,s.SV||0,s.HLD||0,s.SO,s.BB||0,RP_F2(era),RP_F2(s.IP>0?(s.H+s.BB)/s.IP:null)];
    } else { const obp=s.PA>0?(s.H+s.BB)/s.PA:null, slg=s.AB>0?slgOf(s):null;
      ops=(obp!=null&&slg!=null)?obp+slg:null;
      txt=[s.G,s.PA,RP_F3(s.AB>0?s.H/s.AB:null),RP_F3(obp),RP_F3(slg),RP_F3(ops),s.H,s.HR,s.RBI,s.SB,(s.DEF>0?'+':'')+(s.DEF||0)];
    }
    /* level cell carries the season's role: fielding position for batters (一軍·CF),
       SP/MR/CL for pitchers (一軍·先發). A forced-DH season reads as DH, matching how
       dposYears/awards count it. */
    const dp=isP?(r.role?roleN(r.role):''):(s._dh?'DH':(r.p||''));
    cur.rows.push({y:r.y,age:r.age,lvl:o.lvl+(dp?'·'+dp:''),minor:o.minor,
      inj:!!r.inj,txt,sv:s.SV||0,era,hr:s.HR||0,ops});
  });
  /* career-best marks: SV + ERA for pitchers, HR + OPS for batters (ties all marked);
     a single pro season has no "best" to speak of, so 2+ rows are required */
  let bSV=0,bERA=null,bHR=0,bOPS=null;
  const nRows=blocks.reduce((a,b)=>a+b.rows.length,0);
  blocks.forEach(b=>b.rows.forEach(r=>{
    bSV=Math.max(bSV,r.sv); bHR=Math.max(bHR,r.hr);
    if(r.era!=null&&(bERA==null||r.era<bERA))bERA=r.era;
    if(r.ops!=null&&(bOPS==null||r.ops>bOPS))bOPS=r.ops; }));
  blocks.forEach(b=>b.rows.forEach(r=>{
    r.best=hd.map(()=>false);
    if(nRows<2)return;
    if(isP){ if(bSV>0&&r.sv===bSV)r.best[3]=true; if(r.era!=null&&r.era===bERA)r.best[7]=true; }
    else { if(bHR>0&&r.hr===bHR)r.best[7]=true; if(r.ops!=null&&r.ops===bOPS)r.best[5]=true; } }));
  return {hd,blocks};
}
function retireScene(tiers){
  /* tiers: {CPBL:{i,sc},NPB:...,MLB:...} 有出賽才有 */
  /* 生涯代表聯盟＝出賽最久的頂級聯盟;分級取生涯最佳(i 最小) */
  let lg=bucketOf(S.lv), bestI=4;
  const order=['MLB','NPB','CPBL'];
  order.forEach(b=>{ if(tiers[b]&&tiers[b].i<bestI){ bestI=tiers[b].i; } });
  /* 代表聯盟:在最佳分級的聯盟中,取出賽年資最多者 */
  let repYr=-1;
  order.forEach(b=>{ if(tiers[b]&&tiers[b].i===bestI){ const yy=S.stats[b]?S.stats[b].yr:0; if(yy>repYr){repYr=yy;lg=b;} } });
  const t=tiers[lg], i=t?t.i:4, yr=S.year;
  let txt='';
  if(lg==='CPBL'){
    if(i===0)txt=`引退戰選在<b class="hl">臺北大巨蛋</b>。四萬人把巨蛋塞得水洩不通，外野看板掛滿你生涯每一年的照片。九局下最後一個打席結束，全場燈光暗下，只剩一道追光打在你身上——隊友哭成一團，對手全員列隊脫帽，天團在二壘後方唱起你的應援曲改編的慢版。你繞場一周，把手套輕輕放在本壘板上。轉播單位說，這是中職史上收視最高的一場例行賽。`;
    else if(i===1)txt=`球團為你舉辦了引退儀式。主場滿場，大螢幕播放生涯回顧影片，從高中甲子園夢碎到${S.pos==='P'?'職棒初登板':'職棒初安打'}，一幕一幕。老隊友從各地回來替你獻花，總教練在致詞時哽咽到說不下去。最後你脫下球帽向四個方向的看板深深鞠躬，應援團的鼓聲直到你走進休息室都沒有停。`;
    else if(i===2)txt=`${S.pos==='P'?'球季最後一個主場日，球團安排你先發登板。投完第一局後被換下場，全場觀眾起立鼓掌，隊友在休息室門口排成兩排跟你擊掌。沒有煙火，沒有演唱會，但看台上有人拉起手寫布條：「謝謝你投出的每一顆全力的球」。':'球季最後一個主場日，球團安排你先發打第一棒。第一個打席結束後被換下場，全場觀眾起立鼓掌，隊友在休息室門口排成兩排跟你擊掌。沒有煙火，沒有演唱會，但看台上有人拉起手寫布條：「謝謝你的每一次全力奔跑」。'}`;
    else txt=`你在球團官網的一則新聞稿裡宣布引退。發文的那個晚上，還是有幾十個老球迷湧進你的社群留言：「辛苦了」。職業棒球就是這樣——不是每個人都有儀式，但每個認真打過球的人，都有人記得。`;
  }else if(lg==='NPB'){
    if(i<=1)txt=`球團為你安排了<b class="hl">引退試合</b>。最後一個守備半局結束，你被單獨留在場上，兩軍球員沿著邊線列隊。花束贈呈、監督擁抱、隊友把你高高拋起——三次、四次、五次的<b class="hl">胴上げ</b>。你抱著花束繞場一周，看台上的日本球迷舉著用中文寫的「謝謝」毛巾。引退記者會上你說：「能在這裡打球，是我人生最驕傲的事。」隔天所有體育報頭版都是你被拋在空中的那張照片。`;
    else if(i===2)txt=`最終戰賽後，球團在場邊為你舉行了簡短的引退セレモニー：花束、紀念框裱的球衣、與監督的合影。廣播念出你的生涯成績時，客場球迷也起立鼓掌。記者會上有記者用不太標準的中文問你「還會回來嗎」，你笑著點頭。`;
    else txt=`你透過球團發表引退聲明。整理置物櫃的那天，翻譯陪你走完最後一段球員通道，警衛伯伯跟你深深鞠了一躬。異鄉打拚的日子結束了，行李箱裡裝著幾件捨不得丟的練習衫。`;
  }else if(lg==='MLB'){
    if(i<=1)txt=`主場最終戰，你最後一個打席前，全場觀眾起立鼓掌長達三分鐘，主審退到一旁靜靜等待。打席結束，你被換下場，隊友全部走出休息室與你擁抱，大螢幕播放致敬影片——<b class="hl">Curtain Call</b>，你走出休息室向全場揮帽致意兩次。賽後記者會擠滿各國媒體，台灣的轉播單位做了整夜特別節目。`;
    else if(i===2)txt=`球隊在你生涯最後一個系列賽前於場邊舉行了簡單儀式：致贈裱框球衣與紀念浮雕，隊友列隊擊掌。當地報紙寫道：「他不是超級巨星，但他是每個總教練都想要的那種球員。」`;
    else txt=`你在社群媒體上發了一張空蕩球場的照片，配文只有一句英文：「Thank you, baseball.」按讚數在台灣時間的深夜默默破了十萬。`;
  }else{
    txt=`沒有鎂光燈。你把釘鞋擦乾淨放進袋子，跟隊友一一擁抱，走出球場時回頭看了記分板最後一眼。二軍球場的夕陽跟十年前一樣好看。`;
  }
  card('gold','引退之日',txt);
  if(S.traits.mrteam){
    const mrTitle=(teamNick(S.mrTeamName||'')||'球隊')+'先生・背號退休';
    card('gold','引退兩年後・'+mrTitle,`引退兩年後，你重新穿上了球衣，踏上了熟悉的主場。當你往投手丘一步步走去，觀眾的歡呼聲幾乎讓整個球場震動。當你踏上了投手板，你接過了主持人手中的球與手套，就像你做過幾萬次的那樣，把球往昔日的隊友手套裡扔去，雖然已經沒有了球速，但你聽到球進手套的聲音，卻是無比清脆。<br><br>你的背號 <b class="hl">#${S.jersey}</b> 被掛在了牆壁上，你曾經用表現守護著這座球場，而現在你是這座球場上永遠不可或缺的榮耀。`);
  }
  /* 名人堂票選(可多聯盟並存) */
  const hofs=[]; let firstBallot=false; const hofLeagues=[];
  const HOF_CFG={CPBL:{n:'中華職棒名人堂',wait:5,total:132,lg:'中職'},NPB:{n:'日本野球殿堂',wait:5,total:326,lg:'日職'},MLB:{n:'美國棒球名人堂',wait:5,total:389,lg:'大聯盟'}};
  ['CPBL','NPB','MLB'].forEach(b=>{ const t=tiers[b]; if(!t)return;
    const cfg=HOF_CFG[b];
    if(t.i===0){
      /* 第一年當選門檻:評價分明顯超標(1.15×名人堂門檻)才 first-ballot,否則需等 N 年 */
      const th=TIER_TH[b][0];
      const fbMult={CPBL:1.12,NPB:1.12,MLB:1.2}[b]||1.2; /* 大聯盟最嚴,中職日職放寬 */
      const firstNow = t.sc>=th*fbMult;
      const ballotYr = firstNow?1:ri(2,6);
      if(firstNow){ firstBallot=true; }
      hofLeagues.push(cfg.lg);
      const pct=Math.min(99.1,75+ (t.sc-th)/th*40 + R()*6 - (ballotYr-1)*4);
      const votes=Math.round(cfg.total*Math.max(75,pct)/100);
      if(!S.hofInfo)S.hofInfo=[]; S.hofInfo.push({lg:cfg.lg,yr:ballotYr,pct:Math.max(75,pct).toFixed(1)}); /* 供結算圖 */
      const cap=capTeam(b), phr=posLegendPhrase(b);
      hofs.push(`引退 <b class="hl">${cfg.wait}</b> 年後（${yr+cfg.wait} 年）進入候選，於<b class="hl">第 ${ballotYr} 年投票</b>以 <b class="hl">${votes}</b> 票（得票率 ${Math.max(75,pct).toFixed(1)}%）榮登<b class="hl">${cfg.n}</b>——你以 <b class="hl">${cap||'—'}</b> 的代表球員身分${phr}留名。${ballotYr===1?'<b class="hl">一票入魂，首輪即殿堂。</b>':''}名匾上的隊徽，是 ${cap||'—'}。`);
    }else if(t.i===1){
      const pct=55+R()*17, tries=ri(3,9);
      hofs.push(`你連續 ${tries} 年入圍${cfg.n}票選，最高曾獲得 ${pct.toFixed(1)}% 得票率，可惜始終未能跨過 75% 門檻。`);
    } });
  if(firstBallot&&!S.traits.legend){ S.traits.legend=true;
    S.legendLeague=hofLeagues[0]||''; }
  if(hofs.length)card('gold','名人堂票選',hofs.join('<br><br>'));
  if(S.traits.legend){ card('gold','隱藏屬性解鎖：'+(S.legendLeague||'')+'歷史級球星',
    `第一年投票就披上名人堂金袍——你不只是進了殿堂，你<b class="hl">定義了一個時代</b>。這個名字，會被寫進${S.legendLeague||''}的歷史課本。`); }
}
function endGame(reason){
  S.done=true; actClear();
  /* 引退前可能剛結清剩餘合約；所有款項入帳後再刷新記分板，與結算共用同一個 S.salary。 */
  board(2);
  divider('生涯終幕');
  card('info','引退',reason);
  tlNote(5,'引退'); careerTimelineCard();
  /* 各聯盟數據與評價 */
  let tables='',evals=[],best=99; const tiersByLg={};
  ['MLB','NPB','CPBL','MINOR'].forEach(b=>{ if(S.stats[b]){ tables+=statTable(b);
    if(b!=='MINOR'){ const t=tierOf(b); tiersByLg[b]=t; evals.push(`<span class="tag">${t.name}</span>（評價分 ${t.sc}）`); best=Math.min(best,t.i); } } });
  if(best===99)best=4;
  retireScene(tiersByLg);
  /* 成就門檻:中職名人堂 或 站上日職/大聯盟 */
  const reachedTop = (tiersByLg.CPBL&&tiersByLg.CPBL.i===0) || !!S.stats.NPB || !!S.stats.MLB;
  if(reachedTop){
    /* 小學校之光:T3 弱旅出身 */
    if(!S.traits.smallschool && S.hsTier===3){ S.traits.smallschool=true;
      card('gold','隱藏特性：小學校之光',`當年那所沒沒無聞的小學校，走出了一個站上頂級舞台的男人。你證明了：出身，從來不是天花板。`); }
    /* 努力仔:初始潛力總和偏低(投手≤237/野手≤469) */
    const grindTh = S.pos==='P'?237:469;
    if(!S.traits.grinder && (S.potSum0||999)<=grindTh){ S.traits.grinder=true;
      card('gold','隱藏特性：努力仔',`天賦平庸的球員千千萬萬，能走到這裡的卻寥寥無幾。你不是天選之人，你是把汗水熬成天賦的那種人。`); }
  }
  /* 25 歲前離開棒球:每個球員都有第二人生的好劇本 */
  if(S.age<25){
    const nm=S.name;
    const second=[
      `你加入了乙組業餘棒球隊。平日上班、週末穿上球衣，去年在協會盃敲出再見安打的影片被瘋傳，底下最熱門的留言是：「這揮棒不像業餘的。」——因為本來就不是。你比誰都清楚，愛棒球不一定要靠它吃飯。`,
      `你考到了不動產營業員執照。帶看時爬六樓透天面不改色，客戶都說你氣場不一樣——十六歲就在幾千人面前投球的人，還會怕開價嗎？三年後你成了店裡的銷售王，名片頭銜下面偷偷印了一行小字：「前職業棒球選手」。`,
      `你跟著舅舅去做板模。工地的日子曬得比春訓還黑，但你的核心力量和不服輸讓老師傅都點頭。五年後你自己出來帶班，薪水不比二軍差，而且——你笑著說——這裡沒有人會把你下放。`,
      `你穿上襯衫走進辦公室，同事只知道你「以前有在打球」。直到公司壘球隊比賽那天，你一棒把球送出圍牆，全場安靜三秒。後來每年比賽，對手公司都會先問一句：「那個人今年還在嗎？」`,
      `你頂下一間早餐店，招牌取名「滿壘」。店裡掛著你高中的球衣，蛋餅煎得跟你的守備一樣扎實。附近的少棒隊員放學都來報到，因為老闆會一邊煎蘿蔔糕一邊講解怎麼看投手的放球點——加蛋不加價。`,
      `你回到母校當教練，月薪不高，但你把自己沒走完的路畫成地圖交給學弟。第七年，你帶的投手在選秀會上被第一輪指名，電視轉播帶到你的時候，你哭得比他還慘。`,
      `你創了業，做棒球訓練科技——用手機慢動作幫素人抓揮棒軌跡。第一年差點倒閉，第三年被運動中心整批採購。募資簡報的第一頁只有一句話：「我沒能站上去的舞台，我想讓更多人站上去。」`,
      `你考上了消防員。體能測驗全項第一，教官問你以前練什麼的，你說棒球。第一次出勤救人那晚，你突然明白：肩膀不能再投一百五，但還能扛著人走出火場——這雙手還是有用的。`];
    card('gold','第二人生',second[Math.floor(R()*second.length)].replace(/{n}/g,nm)+`<br><br><span class="sub">離開球場的人生，也是人生。${nm}，辛苦了。</span>`);
  }
  /* 逐年成績年表 (分為業餘與職業) */
  if(S.log.length){
    const amaLogs = S.log.filter(r => !r.st);
    const proLogs = S.log.filter(r => r.st);
    if(amaLogs.length > 0){
      const amaRows = amaLogs.map(r=>`<tr><td style="white-space:nowrap">${r.y}</td><td style="white-space:nowrap">${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}</td><td style="text-align:left;font-size:11px;${r.inj?'color:var(--bad);font-weight:700;':''}">${r.line}</td></tr>`).join('');
      card('','生涯年表（業餘成績）',`<table class="fin"><tr><th>年度</th><th>齡</th><th style="text-align:left">球隊</th><th style="text-align:left">成績</th></tr>${amaRows}</table>`);
    }
    if(proLogs.length > 0){
      const isP = S.pos === 'P';
      const head = isP
        ? `<tr><th>年</th><th>齡</th><th style="text-align:left">球隊</th><th>G</th><th>IP</th><th>W</th><th>L</th><th>SV</th><th>HLD</th><th>SO</th><th>BB</th><th>ERA</th><th>WHIP</th></tr>`
        : `<tr><th>年</th><th>齡</th><th style="text-align:left">球隊</th><th>G</th><th>PA</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th><th>H</th><th>HR</th><th>RBI</th><th>SB</th><th>DEF</th></tr>`;
      const rows = proLogs.map(r => {
        const cS = r.inj ? 'color:var(--bad);font-weight:700;' : '';
        const s = r.st || {G:0,PA:0,AB:0,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,avg:0,era:0,WHIP:0,DEF:0};
        if(isP){
          const era = s.IP>0 ? (s.ER*9/s.IP).toFixed(2) : '-';
          const whip = s.IP>0 ? ((s.H+s.BB)/s.IP).toFixed(2) : '-';
          return `<tr style="${cS}"><td>${r.y}</td><td>${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}</td><td>${s.G}</td><td>${fmtIP(s.IP)}</td><td>${s.W}</td><td>${s.L}</td><td>${s.SV||0}</td><td>${s.HLD||0}</td><td>${s.SO}</td><td>${s.BB||0}</td><td>${era}</td><td>${whip}</td></tr>`;
        } else {
          const obpN = s.PA>0 ? (s.H+s.BB)/s.PA : 0;
          const slgN = slgOf(s);
          const avg = s.AB>0 ? (s.H/s.AB).toFixed(3).replace(/^0/,'') : '-';
          const obp = s.PA>0 ? obpN.toFixed(3).replace(/^0/,'') : '-';
          const slg = s.AB>0 ? slgN.toFixed(3).replace(/^0/,'') : '-';
          const ops = s.AB>0 ? (obpN+slgN).toFixed(3).replace(/^0/,'') : '-';
          return `<tr style="${cS}"><td>${r.y}</td><td>${r.age}</td><td style="text-align:left;white-space:nowrap">${r.tm}${r.p?"·"+r.p:""}</td><td>${s.G}</td><td>${s.PA}</td><td>${avg}</td><td>${obp}</td><td>${slg}</td><td>${ops}</td><td>${s.H}</td><td>${s.HR}</td><td>${s.RBI}</td><td>${s.SB}</td><td>${s.DEF>0?'+':''}${s.DEF||0}</td></tr>`;
        }
      }).join('');
      card('','生涯年表（職業成績）',`<table class="fin">${head}${rows}</table>`);
    }
  }
  let intlTable='';
  if(S.intlCount>0){ const IS=S.intlStat;
    const il=S.intlLog||[];
    if(S.pos==='P'){
      const rows=il.map(r=>{ const st=r.st, era=st.IP>0?(st.ER*9/st.IP).toFixed(2):'-'; return `<tr><td>${r.year}</td><td style="text-align:left;white-space:nowrap">${r.name}</td><td>${r.rank}</td><td>${st.G}</td><td>${fmtIP(st.IP)}</td><td>${st.W}</td><td>${st.SV}</td><td>${st.SO}</td><td>${era}</td></tr>`; }).join('');
      const era=IS.IP>0?(IS.ER*9/IS.IP).toFixed(2):'-';
      intlTable=`<h4 style="margin:12px 0 4px">國際賽逐屆成績（中華隊 ${S.intlCount} 屆）</h4><table class="fin"><tr><th>年度</th><th>賽事</th><th>結果</th><th>G</th><th>IP</th><th>W</th><th>SV</th><th>SO</th><th>ERA</th></tr>${rows}<tr><th colspan="3">國際賽通算</th><td>${IS.G}</td><td>${fmtIP(IS.IP)}</td><td>${IS.W}</td><td>${IS.SV}</td><td>${IS.SO}</td><td>${era}</td></tr></table>`;
    } else {
      const rows=il.map(r=>{ const st=r.st, avg=st.AB>0?(st.H/st.AB).toFixed(3).replace(/^0/,''):'-'; return `<tr><td>${r.year}</td><td style="text-align:left;white-space:nowrap">${r.name}</td><td>${r.rank}</td><td>${st.G}</td><td>${st.PA}</td><td>${avg}</td><td>${st.H}</td><td>${st.HR}</td><td>${st.RBI}</td></tr>`; }).join('');
      const avg=IS.AB>0?(IS.H/IS.AB).toFixed(3).replace(/^0/,''):'-';
      intlTable=`<h4 style="margin:12px 0 4px">國際賽逐屆成績（中華隊 ${S.intlCount} 屆）</h4><table class="fin"><tr><th>年度</th><th>賽事</th><th>結果</th><th>G</th><th>PA</th><th>AVG</th><th>H</th><th>HR</th><th>RBI</th></tr>${rows}<tr><th colspan="3">國際賽通算</th><td>${IS.G}</td><td>${IS.PA}</td><td>${avg}</td><td>${IS.H}</td><td>${IS.HR}</td><td>${IS.RBI}</td></tr></table>`;
    }
  }
  card('','生涯累積數據',(tables||'<p>（無職業層級出賽紀錄）</p>')+intlTable);
  if(evals.length)card('gold','生涯評價',evals.join('<br>'));
  /* 結算排序：名人堂 → 通算／各聯盟里程碑 → 國家隊 → MLB → NPB → CPBL → 業餘。 */
  const settlementItems=careerMilestones().concat(honorGroups().map(honorText));
  const honorsHTML=settlementItems.length?settlementItems.map(x=>'· '+x).join('<br>'):'（生涯未獲得任何獎項或里程碑）';
  card(settlementItems.length?'gold':'','獎項、大賽與里程碑',honorsHTML);
  /* 特質與薪資 */
  const tr=[];
  [...TRAIT_KEYS.pos,...TRAIT_KEYS.neg].forEach(k=>{ if(S.traits[k])tr.push(`<span class="tag" style="${traitTagStyle(k)}">${traitName(k)}</span>`); });
  (S.removed||[]).forEach(lbl=>tr.push(`<span class="tag" style="text-decoration:line-through;opacity:.4;color:#8a8a8a;border-color:#4a4a4a">${lbl}</span>`));
  const lv=S.love;
  const cur=lv.st==='married'?`老婆 ${lv.partner}（${lv.kids}）`:lv.st==='dating'?`交往中 ${lv.partner}（${lv.dyrs||0} 年）`:lv.st==='divorced'?'離婚':'未婚';
  const exStr=lv.exes.length?`｜前妻 ${lv.exes.map(e=>`${e.name}（${e.kids}）`).join('、')}`:'';
  const totKids=lv.kids+lv.exes.reduce((t,e)=>t+e.kids,0);
  card('','生涯檔案',`隱藏素質：${tr.join(' ')||'（無）'}<br>家庭：${cur}${exStr}｜子女共 ${totKids} 人${lv.affairs?`｜外遇 ${lv.affairs}(${lv.caught})`:''}<br>國際賽出賽：${S.intlCount} 次｜生涯大傷：${S.bigInj} 次${S.pos==='P'?`｜手肘危機：${S.tjCrises||0} 次｜Tommy John 手術：${S.tjCount} 次`:''}<br>生涯總薪資：<b class="hl" style="font-size:18px">${fmtMoney(Math.round(S.salary))}</b> 台幣`);
  /* 球迷留言 */
  const pool=FAN[best].filter(p=>S.pos!=='P'||!p.includes('代打人生')); const picks=[];
  while(picks.length<3&&pool.length)picks.push(pool.splice(Math.floor(R()*pool.length),1)[0]);
  /* 盤子留言:低聯盟明星以上,旅外到更高聯盟卻淪替補/邊緣 */
  { const LGR={CPBL:0,NPB:1,MLB:2}, CTY={CPBL:'台灣',NPB:'日本',MLB:'美國'};
    ['CPBL','NPB','MLB'].forEach(low=>{ ['CPBL','NPB','MLB'].forEach(high=>{
      if(LGR[high]>LGR[low] && tiersByLg[low] && tiersByLg[high] && tiersByLg[low].i<=1 && tiersByLg[high].i>=3){
        picks.push(`在${CTY[low]}是${LG_N[low]}的招牌，到了${CTY[high]}的${LG_N[high]}卻完全打不出來——「這人是誰？」當地球迷一臉問號，簽他的球團真是盤子`);
      }
    }); });
  }
  if(S.traits.glass)picks.push('如果沒有那些傷，他的生涯會是什麼樣子……不敢想');
  if(S.traits.iron)picks.push('鐵人謝幕。那個連續出賽紀錄，大概很久都不會被打破了');
  if(S.traits.genius&&best<=1)picks.push('高中就被叫做天才的男人，真的把天賦兌現了');
  if(S.honors.some(h=>h.includes('經典賽冠軍')))picks.push('經典賽奪冠那一夜，全台灣都沒睡。謝謝你');
  if(S.love.caught)picks.push('球技沒話說，私生活就……唉，不說了');
  if(S.traits.scum)picks.push('引退串裡不准提那些事，今天只談棒球。……好啦還是很氣');
  if(S.traits.franchise)picks.push('一隊一人，退休號碼準備掛上去了。謝謝你留下來');
  if(S.traits.legend)picks.push('這輩子能看到你打球，是我們這代球迷的福氣。歷史級的');
  if(S.traits.intlace)picks.push('穿上國家隊球衣的那個男人，永遠的國家英雄');
  if(S.traits.taiwan)picks.push('六度披上國家隊戰袍，從不推辭。他比劃胸口的那一幕，我手機桌布放到現在');
  if(S.traits.disc)picks.push('自律到可怕，凌晨四點的球場都認得他');
  if(S.traits.cancer)picks.push('球是打得好啦，但那個態度……更衣室少了他反而清靜');
  if(S.traits.thief)picks.push('當年拒絕下放又打不出來，薪水小倫這名號是自己掙來的');
  if(S.traits.mrteam)picks.push('十五年只為一隊，'+(teamNick(S.mrTeamName||'')||'')+'先生這個稱號，他當之無愧');
  if(S.traits.confidante)picks.push('場上叱吒風雲，感情路上卻總是差一步，唉');
  if(S.traits.smallschool)picks.push('從那種小學校打到職業，這故事夠拍一部電影了');
  if(S.traits.grinder)picks.push('沒什麼天分卻拼到這種成就，這種球員最讓人尊敬');
  if(S.traits.goldcloth)picks.push('我愛台中猛獁，不離不棄');
  if(S.traits.phoenix)picks.push('從手術台爬回來還能拿獎，這種心臟是鈦合金做的吧');
  if(S.traits.onetool&&S.toolRole)picks.push(`那招${S.toolRole}真的無解，關鍵時刻換他上場就對了`);
  if(S.traits.clutch)picks.push('大場面先生，越關鍵的時刻越信任他');
  if(S.love.st==='married'&&S.love.kids>=2)picks.push('引退後好好陪家人吧，孩子們等你很久了');
  card('info','球迷看板・引退串',picks.map(p=>'「'+p.replace(/{n}/g,S.name)+'」').join('<br>'));
  /* 一鍵分享 */
  const sh=document.createElement('div'); sh.className='card';
  sh.innerHTML=`<div class="title">分享這段生涯</div>
    <div class="row2" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn main" id="sh-img" style="flex:1">📸 產生結算圖</button>
      <button class="btn" id="sh-url" style="flex:1">🔗 複製重播連結</button>
    </div><div id="sh-out" style="margin-top:8px"></div>`;
  $('log').appendChild(sh);
  sh.querySelector('#sh-img').onclick=()=>shareImage(evals,picks,sh.querySelector('#sh-out'));
  sh.querySelector('#sh-url').onclick=e=>{
    const url=OFFICIAL_URL+'?seed='+SEED;
    const okmsg=()=>{e.target.textContent='✅ 已複製';setTimeout(()=>e.target.textContent='🔗 複製重播連結',1600);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(okmsg,()=>prompt('手動複製連結：',url));
    else prompt('手動複製連結：',url);
  };
  choose('',[
    {t:'⚾ 開啟新的人生（新種子）',main:true,f:()=>{location.href=location.pathname;}},
    {t:'用同一個種子重來',s:'seed: '+SEED,f:()=>{location.href=location.pathname+'?seed='+SEED;}}]);
  /* 結算定錨:蓋過預設的捲到底,改捲到「生涯終幕」開頭,玩家從結算第一行開始看 */
  setTimeout(()=>{ try{
    const heads=document.querySelectorAll('.yr-head');
    for(const h of heads){ if(h.textContent==='生涯終幕'){ h.scrollIntoView({behavior:'auto',block:'start'}); break; } }
  }catch(e){} }, 250);
}
/* 結算圖（Canvas 產生 PNG，可長按儲存或自動下載）
   Single-sheet settlement layout from the design handoff, drawn 1:1 at the
   design's 820px width. The layout is rendered twice: a measure pass on a
   throwaway canvas walks the full flow to learn the total height, then the
   real pass paints background, border, content and footer. */
function shareImage(evals,picks,out){
  const isP=S.pos==='P';
  const tiers=(evals||[]).map(t=>String(t).replace(/<[^>]+>/g,''));
  const hist=S.log.slice(), amaLogs=hist.filter(r=>!r.st), proLogs=hist.filter(r=>r.st);
  const cum=rpCumData(), honors=rpHonorItems();
  const pro=proLogs.length?rpProData(proLogs):null;
  const intl=S.intlCount>0?rpIntlData():null;
  const fans=(picks||[]).map(p=>'「'+p.replace(/{n}/g,S.name)+'」');
  const W=820,PADX=36,CW=W-PADX*2,scale=2;
  /* Canvas colors/fonts follow the active theme tokens (read from computed style) */
  const _css=getComputedStyle(document.body), _tk=(n,fb)=>((_css.getPropertyValue(n)||'').trim()||fb);
  const C_BG=_tk('--bg','#081510'), C_EDGE=_tk('--edge','#2b4d3a'), C_DIM=_tk('--dim','#93ab9c'),
        C_ACC=_tk('--accent','#ffc95c'), C_TX=_tk('--text','#ece7d6'), C_GOOD=_tk('--good','#8fd08f'),
        C_BAD=_tk('--bad','#e2695c'), C_INFO=_tk('--info','#7fb3d5'), C_P2=_tk('--panel2','#1a382a'),
        C_PANEL=_tk('--panel','#132920'), C_ROW=_tk('--row','#0d2115'), C_GOLD=_tk('--gold','#ffc95c'),
        C_BTNEDGE=_tk('--btnedge',C_EDGE);
  const F_SANS=_tk('--sans',"'Noto Sans TC',sans-serif"), F_MONO=_tk('--mono',"'IBM Plex Mono',monospace"),
        F_HEAD=_tk('--head',F_SANS);
  const GLOW=_tk('--glow','none')!=='none';
  const glowC=(_tk('--bgfx','none').match(/rgba?\([^)]*\)/)||[])[0]||null;
  const LGC={MLB:C_INFO,NPB:C_BAD,CPBL:C_ACC,MINOR:C_DIM};
  /* 特性(保留 + 刪除線標記) */
  const keepTr=[...TRAIT_KEYS.pos,...TRAIT_KEYS.neg].filter(k=>S.traits[k]).map(k=>({label:traitName(k),key:k,neg:TRAIT_KEYS.neg.includes(k)}));
  const remTr=(S.removed||[]).map(l=>({label:l,key:'',neg:false,rem:true}));
  function tagColor(o){ /* keep in sync with traitTagStyle() + the .tag defaults */
    if(o.rem)return {bg:'#242424',bd:'#4a4a4a',fg:'#8a8a8a'};
    if(o.key==='legend'||o.key==='taiwan')return {bg:'#3a2c05',bd:'#ffc95c',fg:'#ffe08a'}; /* 金(歷史級/Team Taiwan) */
    if(o.key==='goldcloth')return {bg:'#3a3505',bd:'#e8d43a',fg:'#fff35a'}; /* 黃 */
    if(o.key==='mrteam')return teamChip(TEAM_COLOR[S.mrTeamName]||'#ffc95c');
    if(o.key==='genius')return {bg:'#232733',bd:'#c8d0e0',fg:'#e8eef7'}; /* 銀 */
    if(o.neg)return {bg:'#2a0f0f',bd:'#c0392b',fg:'#ff8b7a'};             /* 紅 */
    return {bg:C_P2,bd:C_EDGE,fg:C_ACC};                                  /* 主題色 */
  }
  function rr(c,x,y,w,h,r){ c.beginPath();
    c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
  function drawBall(c,cx,cy,d){ /* stylized baseball, 24-box geometry scaled to d */
    const k=d/24, X=x=>cx-d/2+x*k, Y=y=>cy-d/2+y*k;
    c.save();
    c.beginPath(); c.arc(cx,cy,d/2-k*.5,0,Math.PI*2);
    c.fillStyle='#faf7ee'; c.fill();
    /* ring rides --text so the white face keeps its outline on light themes too */
    c.save(); c.globalAlpha=.55; c.lineWidth=Math.max(1,1.6*k); c.strokeStyle=C_TX; c.stroke(); c.restore();
    c.lineCap='round'; c.strokeStyle=C_BAD;
    c.lineWidth=1.5*k; c.beginPath();
    c.moveTo(X(7.6),Y(1.9)); c.quadraticCurveTo(X(2.6),Y(12),X(7.6),Y(22.1));
    c.moveTo(X(16.4),Y(1.9)); c.quadraticCurveTo(X(21.4),Y(12),X(16.4),Y(22.1)); c.stroke();
    c.lineWidth=1.1*k; c.beginPath();
    RP_TICKS.forEach(p=>{ c.moveTo(X(p[0]),Y(p[1])); c.lineTo(X(p[2]),Y(p[3]));
      c.moveTo(X(24-p[0]),Y(p[1])); c.lineTo(X(24-p[2]),Y(p[3])); });
    c.stroke(); c.restore(); }
  function wrap(c,t,font,maxW){ c.font=font; const out=[]; let cur='';
    for(const ch of String(t)){ if(c.measureText(cur+ch).width>maxW&&cur){ out.push(cur); cur=ch; } else cur+=ch; }
    if(cur)out.push(cur); return out; }
  function render(c){
    let y=32;
    const ls=v=>{ try{c.letterSpacing=v;}catch(e){} };
    /* All text is anchored on the alphabetic baseline: 'top'/'middle' derive from the
       font bounding box, which Safari and Chrome compute differently, so device renders
       drifted vertically. mid() centers a string on cy using its measured ink box. */
    c.textBaseline='alphabetic'; c.textAlign='left'; c.lineJoin='round';
    const mid=(t,x,cy)=>{ const m=c.measureText(t), a=m.actualBoundingBoxAscent, d=m.actualBoundingBoxDescent;
      c.fillText(t,x,cy+((a!=null?a:8)-(d!=null?d:0))/2); };
    /* ---- 刊頭 lockup (main text, sub and ball share one baseline) ---- */
    const wmBase=y+25;
    c.font='900 32px '+F_HEAD; c.fillStyle=C_TX; ls('1.3px');
    const w1=c.measureText('YaKy').width;
    c.fillText('YaKy',PADX,wmBase);
    drawBall(c,PADX+w1+11.5,wmBase-9,21);
    c.fillText('Life',PADX+w1+23,wmBase);
    const wmW=w1+23+c.measureText('Life').width;
    ls('0px');
    c.font='13px '+F_SANS; c.fillStyle=C_DIM; ls('3.6px');
    c.fillText('棒球人生模擬器',PADX+wmW+12,wmBase); ls('0px');
    /* 引退紀念鋼印章 */
    c.font='700 12px '+F_SANS; ls('3.6px');
    const stT='引退紀念', stW=c.measureText(stT).width+21, stH=27, stX=W-PADX-stW;
    if(GLOW){ c.save(); c.shadowColor=C_ACC; c.shadowBlur=12; }
    c.strokeStyle=C_ACC; c.lineWidth=1.5; rr(c,stX,y,stW,stH,3); c.stroke();
    if(GLOW)c.restore();
    c.fillStyle=C_ACC; mid(stT,stX+13,y+stH/2); ls('0px');
    y+=54;
    /* ---- 球員名＋背號牌 (badge digits sit on the name baseline) ---- */
    const nameBase=y+35;
    c.font='900 44px '+F_HEAD; c.fillStyle=C_ACC;
    const wN=c.measureText(S.name).width;
    c.fillText(S.name,PADX,nameBase);
    c.font='700 31px '+F_MONO;
    const jT='#'+S.jersey, jW=c.measureText(jT).width+18, bCy=nameBase-11;
    c.fillStyle=C_ACC; rr(c,PADX+wN+12,bCy-19,jW,38,5); c.fill();
    c.fillStyle=C_BG; mid(jT,PADX+wN+21,bCy);
    y+=52;
    /* ---- 副標 ---- */
    c.font='15px '+F_SANS; c.fillStyle=C_TX; mid(rpTagline(),PADX,y+11); y+=27;
    /* ---- 特質標籤＋家庭＋總薪資 ---- */
    const salW=210, leftW=CW-salW-20;
    if(keepTr.length||remTr.length){
      let tx=PADX; c.font='700 13px '+F_SANS;
      keepTr.concat(remTr).forEach(o=>{ const col=tagColor(o), w=c.measureText(o.label).width+20;
        if(tx>PADX&&tx+w>PADX+leftW){ tx=PADX; y+=32; }
        c.fillStyle=col.bg; rr(c,tx,y,w,24,3); c.fill();
        c.strokeStyle=col.bd; c.lineWidth=1; rr(c,tx,y,w,24,3); c.stroke();
        c.fillStyle=col.fg; mid(o.label,tx+10,y+12);
        if(o.rem){ c.strokeStyle='#8a8a8a'; c.beginPath(); c.moveTo(tx+6,y+12); c.lineTo(tx+w-6,y+12); c.stroke(); }
        tx+=w+8; });
      y+=34;
    }
    const famLines=wrap(c,rpFamily(),'12.5px '+F_SANS,leftW);
    c.font='12.5px '+F_SANS; c.fillStyle=C_DIM;
    famLines.forEach(l=>{ mid(l,PADX,y+9); y+=19; });
    { /* 生涯總薪資(右下,金額與「台幣」共用基線,與家庭行底對齊) */
      const salBase=y-6;
      c.textAlign='right';
      c.font='12px '+F_SANS; c.fillStyle=C_DIM;
      const uW=c.measureText('台幣').width;
      c.fillText('台幣',W-PADX,salBase);
      c.fillText('生涯總薪資',W-PADX,salBase-30);
      c.font='700 24px '+F_MONO; c.fillStyle=C_ACC;
      if(GLOW){ c.save(); c.shadowColor=C_ACC; c.shadowBlur=10; }
      c.fillText(fmtMoney(Math.round(S.salary)),W-PADX-uW-6,salBase);
      if(GLOW)c.restore();
      c.textAlign='left';
    }
    /* ---- 生涯評價 ---- */
    if(tiers.length){
      y+=18; c.strokeStyle=C_EDGE; c.lineWidth=1;
      c.beginPath(); c.moveTo(PADX,y+.5); c.lineTo(W-PADX,y+.5); c.stroke();
      y+=16;
    }
    const sec=(t,inline)=>{ if(!inline)y+=24;
      drawBall(c,PADX+6,y+6,12);
      c.font='700 12px '+F_SANS; c.fillStyle=C_DIM; ls('3px');
      const tw=c.measureText(t).width;
      mid(t,PADX+20,y+6); ls('0px');
      c.strokeStyle=C_EDGE; c.lineWidth=1; c.beginPath();
      c.moveTo(PADX+20+tw+8,y+6.5); c.lineTo(W-PADX,y+6.5); c.stroke();
      y+=22; };
    if(tiers.length){
      sec('生涯評價',true);
      tiers.forEach(t=>{ drawBall(c,PADX+8.5,y+11,17);
        c.font='700 16px '+F_SANS; c.fillStyle=C_ACC; mid(t,PADX+26,y+11); y+=24; });
    }
    /* ---- 表格繪製共用 ---- */
    function tcols(defs){ const tot=defs.reduce((a,d)=>a+d.w,0); let x=PADX;
      return defs.map(d=>{ const w=d.w/tot*CW, o={t:d.t,a:d.a,zh:d.zh,x,w}; x+=w; return o; }); }
    function thRow(cols){
      cols.forEach(cc=>{ c.font='500 12px '+(cc.zh?F_SANS:F_MONO); c.fillStyle=C_DIM;
        c.textAlign=cc.a==='l'?'left':'right';
        mid(cc.t,cc.a==='l'?cc.x+7:cc.x+cc.w-7,y+9); });
      c.textAlign='left'; y+=22;
      c.strokeStyle=C_EDGE; c.lineWidth=1; c.beginPath(); c.moveTo(PADX,y-.5); c.lineTo(W-PADX,y-.5); c.stroke(); }
    function tdRow(cols,cells,opt){
      opt=opt||{}; const rh=opt.rh||25, fs=opt.fs||12.5;
      if(opt.bg){ c.fillStyle=opt.bg; c.fillRect(PADX,y,CW,rh); }
      if(opt.topline){ c.strokeStyle=C_EDGE; c.lineWidth=1; c.beginPath(); c.moveTo(PADX,y+.5); c.lineTo(W-PADX,y+.5); c.stroke(); }
      if(opt.bar){ c.fillStyle=opt.bar; c.fillRect(PADX,y,3,rh); }
      const cyR=y+rh/2;
      cells.forEach((cell,i)=>{ if(cell==null)return; const cc=cols[i];
        const o=(cell&&typeof cell==='object')?cell:{t:cell};
        if(o.badge!==undefined){ /* 國際賽結果膠囊 badge */
          c.font='700 11.5px '+F_SANS;
          const bw=c.measureText(String(o.t)).width+16, bx=cc.x+7, bh=19, byy=y+(rh-bh)/2;
          let fg=C_DIM, bd=C_BTNEDGE;
          if(o.badge==='gold'){ fg=C_GOLD; bd=C_GOLD;
            c.save(); c.globalAlpha=.12; c.fillStyle=C_GOLD; rr(c,bx,byy,bw,bh,3); c.fill(); c.restore(); }
          else if(o.badge==='silver'){ fg='#e8eef7'; bd='#c8d0e0';
            c.fillStyle='#232733'; rr(c,bx,byy,bw,bh,3); c.fill(); }
          c.strokeStyle=bd; c.lineWidth=1; rr(c,bx,byy,bw,bh,3); c.stroke();
          c.fillStyle=fg; mid(String(o.t),bx+8,cyR); return; }
        c.font=(o.best||o.bold||opt.bold?'700 ':'')+fs+'px '+((cc.zh||o.zh)?F_SANS:F_MONO);
        c.fillStyle=o.best?C_ACC:(o.color||opt.color||C_TX);
        c.textAlign=cc.a==='l'?'left':'right';
        let t=String(o.t); const maxw=cc.w-12;
        while(c.measureText(t).width>maxw&&t.length>1)t=t.slice(0,-1);
        mid(t,cc.a==='l'?cc.x+7:cc.x+cc.w-7,cyR); });
      c.textAlign='left'; y+=rh; }
    /* ---- 生涯累積數據 ---- */
    sec('生涯累積數據');
    if(cum.rows.length){
      const wide={IP:1,ERA:1,WHIP:1,AVG:1,OBP:1,SLG:1,OPS:1};
      const cols=tcols([{t:'League',w:84,a:'l'}].concat(cum.hd.map(t=>({t,w:wide[t]?58:46,a:'r'}))));
      thRow(cols);
      cum.rows.forEach((r,i)=>{ tdRow(cols,
        [{t:LG_N[r.b],zh:true,bold:true}].concat(r.txt.map((t,j)=>({t,best:r.best[j]}))),
        {bg:i%2?C_ROW:null,bar:LGC[r.b]}); });
    } else { c.font='13px '+F_SANS; c.fillStyle=C_DIM; mid('（無職業層級出賽紀錄）',PADX,y+9); y+=22; }
    /* ---- 國際賽逐屆成績 ---- */
    if(intl){
      sec('國際賽逐屆成績（中華隊 '+S.intlCount+' 屆）');
      const cols=tcols([{t:'年度',w:56,a:'l'},{t:'賽事',w:140,a:'l',zh:true},{t:'結果',w:96,a:'l',zh:true}]
        .concat(intl.hd.map(t=>({t,w:56,a:'r'}))));
      thRow(cols);
      intl.rows.forEach((r,i)=>{ tdRow(cols,
        [r.year,{t:r.name,zh:true},{t:r.rank,badge:/冠軍/.test(r.rank)?'gold':/亞軍/.test(r.rank)?'silver':''}]
          .concat(r.txt),{bg:i%2?C_ROW:null,rh:28}); });
      tdRow(cols,[{t:'通算',zh:true,bold:true,color:C_GOOD},null,null].concat(intl.tot.map(t=>({t,bold:true}))),
        {bg:C_PANEL,topline:true,rh:28});
    }
    /* ---- 生涯榮譽(雙欄條列,直向優先) ---- */
    sec('生涯榮譽（'+honors.length+' 項）');
    if(honors.length){
      const colW=(CW-28)/2, rows2=Math.ceil(honors.length/2), lh=22, fs=13.5;
      const drawItem=(parts,x,yy)=>{ let cx=x;
        const put=(txt,acc)=>{ c.font=(acc?'700 ':'')+fs+'px '+F_SANS; c.fillStyle=acc?C_ACC:C_GOOD;
          for(const ch of txt){ const w=c.measureText(ch).width;
            if(cx+w>x+colW&&cx>x){ yy+=lh; cx=x+12; }
            c.fillText(ch,cx,yy+16); cx+=w; } };
        parts.forEach((p,i)=>put((i?'':'· ')+p[0],p[1]));
        return yy+lh; };
      let yl=y, yr=y;
      honors.forEach((p,i)=>{ if(i<rows2)yl=drawItem(p,PADX,yl); else yr=drawItem(p,PADX+colW+28,yr); });
      y=Math.max(yl,yr);
    } else { c.font='13px '+F_SANS; c.fillStyle=C_DIM; mid('（生涯未獲得任何獎項或里程碑）',PADX,y+9); y+=22; }
    /* ---- 生涯年表(業餘) ---- */
    if(amaLogs.length){
      sec('生涯年表（業餘成績）');
      const cols=tcols([{t:'年',w:50,a:'l'},{t:'齡',w:38,a:'r'},{t:'球隊',w:110,a:'l',zh:true},{t:'成績',w:550,a:'l',zh:true}]);
      thRow(cols);
      amaLogs.forEach((r,i)=>{ tdRow(cols,
        [r.y,r.age,{t:r.tm,zh:true},{t:r.line,zh:true,color:r.inj?null:C_DIM}],
        {bg:i%2?C_ROW:null,rh:21,fs:12,color:r.inj?C_BAD:null,bold:r.inj}); });
    }
    /* ---- 生涯年表(職業,按球隊分段) ---- */
    if(pro){
      sec('生涯年表（職業成績）');
      const defs=isP
        ?[{t:'年',w:48,a:'l'},{t:'齡',w:34,a:'r'},{t:'球隊',w:96,a:'l',zh:true},{t:'G',w:40,a:'r'},{t:'IP',w:54,a:'r'},{t:'W-L',w:50,a:'r'},{t:'SV',w:42,a:'r'},{t:'HLD',w:46,a:'r'},{t:'SO',w:44,a:'r'},{t:'BB',w:42,a:'r'},{t:'ERA',w:52,a:'r'},{t:'WHIP',w:54,a:'r'}]
        :[{t:'年',w:48,a:'l'},{t:'齡',w:34,a:'r'},{t:'球隊',w:84,a:'l',zh:true},{t:'G',w:38,a:'r'},{t:'PA',w:44,a:'r'},{t:'AVG',w:50,a:'r'},{t:'OBP',w:50,a:'r'},{t:'SLG',w:50,a:'r'},{t:'OPS',w:50,a:'r'},{t:'H',w:38,a:'r'},{t:'HR',w:38,a:'r'},{t:'RBI',w:42,a:'r'},{t:'SB',w:36,a:'r'},{t:'DEF',w:42,a:'r'}];
      const cols=tcols(defs); thRow(cols);
      pro.blocks.forEach(b=>{
        y+=6; c.font='700 11px '+F_SANS; c.fillStyle=LGC[b.lg]||C_DIM; ls('2.2px');
        mid((LG_N[b.lg]||'')+' · '+b.team,PADX+7,y+6); ls('0px'); y+=19;
        b.rows.forEach((r,i)=>{ tdRow(cols,
          [r.y,r.age,{t:r.lvl,zh:true,color:r.inj?null:(r.minor?C_DIM:null)}]
            .concat(r.txt.map((t,j)=>({t,best:r.best[j]}))),
          {bg:i%2?C_ROW:null,rh:21,fs:12,color:r.inj?C_BAD:null,bold:r.inj}); });
      });
    }
    /* ---- 球迷看板・引退串 ---- */
    if(fans.length){
      sec('球迷看板 · 引退串');
      fans.forEach(t=>{ const lines=wrap(c,t,'13px '+F_SANS,CW-14), top=y;
        c.font='13px '+F_SANS; c.fillStyle=C_TX;
        lines.forEach(l=>{ c.fillText(l,PADX+14,y+15); y+=21; });
        c.fillStyle=C_EDGE; c.fillRect(PADX,top+2,2,y-top-6);
        y+=8; });
    }
    return y;
  }
  /* measure pass on a throwaway canvas, then paint for real */
  const mc=document.createElement('canvas'); mc.width=8; mc.height=8;
  const yEnd=render(mc.getContext('2d'));
  const H=yEnd+26+44;
  const cv=document.createElement('canvas');
  cv.width=W*scale; cv.height=H*scale;
  const c=cv.getContext('2d'); c.scale(scale,scale);
  c.fillStyle=C_BG; c.fillRect(0,0,W,H);
  if(glowC){ /* 頂部 radial 光暈(以主題 --bgfx 的顏色近似橢圓) */
    c.save(); c.translate(W/2,-30); c.scale(1,.35);
    const g=c.createRadialGradient(0,0,0,0,0,W*.72);
    g.addColorStop(0,glowC); g.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=g; c.fillRect(-W/2,0,W,W); c.restore(); }
  c.strokeStyle=C_EDGE; c.lineWidth=1; rr(c,.5,.5,W-1,H-1,10); c.stroke();
  const fy=render(c)+26;
  /* ---- 三欄頁尾 ---- */
  c.strokeStyle=C_EDGE; c.lineWidth=1; c.beginPath(); c.moveTo(PADX,fy+.5); c.lineTo(W-PADX,fy+.5); c.stroke();
  c.font='12px '+F_MONO; c.textBaseline='alphabetic';
  c.fillStyle=C_DIM; c.textAlign='left'; c.fillText('seed: '+SEED,PADX,fy+23.5);
  c.textAlign='right'; c.fillText(APP_VER,W-PADX,fy+23.5);
  c.fillStyle=C_ACC; c.textAlign='center'; c.fillText(OFFICIAL_HOST,W/2,fy+23.5);
  c.textAlign='left';
  const url=cv.toDataURL('image/png');
  const fileName='棒球生涯結算_'+S.name+'.png';
  out.innerHTML=`<img src="${url}" style="width:100%;border-radius:8px" alt="結算圖">
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn main" id="sh-save" style="flex:1">💾 儲存 / 分享圖片</button>
      <button class="btn" id="sh-dl" style="flex:1">下載到裝置</button>
    </div>
    <div class="statline" style="margin-top:6px">若按鈕無效，長按上方圖片也可儲存</div>`;
  /* 下載連結(桌機/備援) */
  out.querySelector('#sh-dl').onclick=()=>{ const a=document.createElement('a'); a.href=url; a.download=fileName;
    document.body.appendChild(a); a.click(); a.remove(); };
  /* 分享:優先 Web Share(可存相簿),不支援則退回下載 */
  out.querySelector('#sh-save').onclick=async ()=>{
    try{
      const blob=await (await fetch(url)).blob();
      const file=new File([blob],fileName,{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:'棒球生涯結算',text:S.name+' 的棒球人生'});
        return;
      }
    }catch(e){ if(e&&e.name==='AbortError')return; /* 使用者取消,不用退回 */ }
    /* 不支援 Web Share → 退回下載 */
    const a=document.createElement('a'); a.href=url; a.download=fileName;
    document.body.appendChild(a); a.click(); a.remove();
  };
}
/* ================= 開場設定 ================= */
/* iOS Safari zoom guards. Pinch: Safari ignores maximum-scale/user-scalable, so the
   WebKit-only gesture events are cancelled (other browsers honor the viewport meta).
   Double-tap: touch-action:manipulation should cover it, but iOS still zooms on fast
   taps in places (observed on device during point allocation), so a tap landing
   within 350ms of the previous one is swallowed and replayed as a synthetic click:
   tapping keeps working at any speed while the zoom gesture never forms. Drags are
   exempt (finger travel over 12px), so scrolling and flicks are unaffected. */
['gesturestart','gesturechange'].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));
(function(){
  let last=0,sx=0,sy=0,drag=false;
  document.addEventListener('touchstart',e=>{ const t=e.touches[0];
    if(e.touches.length===1&&t){ sx=t.clientX; sy=t.clientY; drag=false; } else drag=true;
  },{passive:true});
  document.addEventListener('touchmove',e=>{ const t=e.touches[0];
    if(t&&(Math.abs(t.clientX-sx)>12||Math.abs(t.clientY-sy)>12))drag=true;
  },{passive:true});
  document.addEventListener('touchend',e=>{
    const now=Date.now(), fast=now-last<350; last=now;
    if(!fast||drag||e.changedTouches.length!==1||!e.cancelable)return;
    const t=e.changedTouches[0], el=document.elementFromPoint(t.clientX,t.clientY);
    /* form fields keep native behavior (focus/caret need the default action) */
    if(el&&/^(INPUT|TEXTAREA|SELECT|LABEL)$/.test(el.tagName))return;
    e.preventDefault();
    if(el)el.click();
  },{passive:false});
})();
(function(){ const t=document.getElementById('act-toggle');
  if(t)t.onclick=()=>{ document.getElementById('act').classList.toggle('collapsed');
    t.textContent=document.getElementById('act').classList.contains('collapsed')?'⌃ 展開選項':'⌄ 收合選項'; };
})();
(function(){ /* theme init + timeline click delegation */
  try{ applyMobileUI(localStorage.getItem('yakyu-mobile-ui')==='1'); }catch(e){}
  document.querySelectorAll('#seg-ui button').forEach(b=>b.onclick=()=>applyMobileUI(b.dataset.u==='1'));
  try{ applyBigText(localStorage.getItem(BIG_KEY)==='1'); }catch(e){}
  document.querySelectorAll('#seg-big button').forEach(b=>b.onclick=()=>applyBigText(b.dataset.b==='1'));
  const afc=$('af-close'); if(afc)afc.onclick=allocFullClose;
  /* the layout entry appears and disappears at the breakpoint, so the summary re-syncs on resize */
  window.addEventListener('resize',updDispSum);
  /* Slide the panel open and shut. ::details-content only interpolates with
     interpolate-size, which is Chromium-only, so Firefox and Safari saw it snap; the Web
     Animations API works everywhere. While collapsing, `open` has to stay set until the
     animation ends or the content would vanish on the first frame. Reduced motion is
     checked here because the global *{transition:none} rule cannot match a pseudo-element. */
  (function(){ const det=document.getElementById('fld-display'); if(!det)return;
    const body=document.getElementById('disp-body'), sum=det.querySelector('summary');
    if(!body||!sum)return; let anim=null;
    sum.addEventListener('click',ev=>{
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      ev.preventDefault();
      if(anim){ anim.cancel(); anim=null; }
      const opening=!det.open;
      if(opening)det.open=true;
      const h=body.getBoundingClientRect().height;
      body.style.overflow='hidden';
      anim=body.animate({height:opening?['0px',h+'px']:[h+'px','0px'],
        opacity:opening?[0,1]:[1,0]},{duration:280,easing:'ease'});
      anim.onfinish=()=>{ body.style.overflow=''; anim=null; if(!opening)det.open=false; };
    }); })();
  let t='a'; try{t=localStorage.getItem(THEME_KEY)||'a';}catch(e){}
  document.querySelectorAll('#seg-theme button').forEach(b=>b.onclick=()=>applyTheme(b.dataset.t));
  applyTheme(t);
  ['tl-list','tl-strip'].forEach(id=>{ const el=$(id);
    if(el)el.onclick=ev=>{ const n=ev.target.closest('[data-i]'); if(n)tlScrollTo(TL[+n.dataset.i]); }; });
  const md=$('modal'); if(md)md.onclick=ev=>{ if(ev.target===md)modalClose(); };
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape'){ modalClose(); allocFullClose(); } });
})();
let selPos='P';
const DEFAULT_PLAYERS={P:{name:'有有子',jersey:11},IF:{name:'抹茶多',jersey:13}};
const DEFAULT_PLAYER_PAIRS=[
  DEFAULT_PLAYERS.P,DEFAULT_PLAYERS.IF,{name:'藥帝士',jersey:23},{name:'黃鎖頭',jersey:22}
];
function defaultPlayer(pos){
  if(DEFAULT_PLAYERS[pos])return DEFAULT_PLAYERS[pos];
  return DEFAULT_PLAYER_PAIRS[2+Math.floor(Math.random()*2)];
}
const PLAYER_NAME_KEY='yakyu-player-name';
const PLAYER_JERSEY_KEY='yakyu-player-jersey';
/* 第一次進入保持空白；玩家開始過生涯後，重新整理或重新開始時帶回上次輸入。 */
try{
  $('in-name').value=(localStorage.getItem(PLAYER_NAME_KEY)||'').slice(0,10);
  $('in-number').value=(localStorage.getItem(PLAYER_JERSEY_KEY)||'').slice(0,2);
}catch(e){}
$('seed-show').value=SEED;
$('seed-re').onclick=e=>{e.preventDefault();setSeed(Math.random().toString(36).slice(2,10));$('seed-show').value=SEED;};
document.querySelectorAll('#seg-pos button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#seg-pos button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); selPos=b.dataset.v;
});
$('btn-start').onclick=()=>{
  const sv=$('seed-show').value.trim(); if(sv)setSeed(sv); /* 玩家可直接輸入流水碼 */
  history.replaceState(null,'','?seed='+encodeURIComponent(SEED));
  seedInit(SEED);
  const enteredName=$('in-name').value.trim();
  const rawNo=$('in-number').value.trim();
  const useDefault=!enteredName&&!rawNo;
  let nm=enteredName,jersey=Number(rawNo);
  if(useDefault){
    const def=defaultPlayer(selPos);
    nm=def.name; jersey=def.jersey;
  }else{
    /* 只填其中一欄仍視為資料不完整，避免自訂姓名配到系統背號或反過來。 */
    if(!nm){
      $('in-name').setCustomValidity('請輸入球員姓名，或將姓名與背號都留空使用預設球員。');
      $('in-name').reportValidity(); return;
    }
    $('in-name').setCustomValidity('');
    if(rawNo===''||!Number.isInteger(jersey)||jersey<0||jersey>99){
      $('in-number').setCustomValidity('背號請輸入 0～99 的整數，或將姓名與背號都留空使用預設球員。');
      $('in-number').reportValidity(); return;
    }
  }
  $('in-name').setCustomValidity('');
  $('in-number').setCustomValidity('');
  if(!useDefault){
    try{
      localStorage.setItem(PLAYER_NAME_KEY,nm);
      localStorage.setItem(PLAYER_JERSEY_KEY,String(jersey));
    }catch(e){}
  }
  setS(newState(nm,jersey,selPos,null));
  S.teamName=function(){
    if(!this.orgTeam)return '';
    if(this.lv==='MLB')return this.orgTeam;
    if(LV[this.lv].org==='MiLB')return this.orgTeam+({R:'新人聯盟',A1:'1A',A2:'2A',A3:'3A'}[this.lv]);
    if(this.lv==='CPBL1'||this.lv==='NPB1')return this.orgTeam;
    return this.orgTeam+'二軍';
  };
  $('start').style.display='none';
  $('board').style.display=''; $('act').style.display='';
  resetTL(); renderTimeline();
  const ts=$('tl-seed'); if(ts)ts.textContent=SEED;
  card('info','球員誕生',`${S.year} 年春天，${POSN[S.pos]} <b class="hl">${S.name}</b> 加入 <b class="hl">${S.team}</b> 棒球隊。三年後的路，要自己選。<br><span style="color:var(--dim);font-size:12px">提示：22 歲前累積擲出 5 次「6」可覺醒隱藏素質。</span>`);
  startYear();
};
/* ================= PWA installability: manifest built at runtime as a Blob; icons are
   assets/ files (the logo system ships file assets, so the single-file constraint is gone) ================= */
(function(){
  if(!/^https?:$/.test(location.protocol))return; /* keep file:// double-click usage untouched */
  try{
    const dir=location.origin+location.pathname.replace(/[^/]*$/,'');
    const mf={id:dir,name:document.title||'YaKyoLife - 棒球人生模擬器',short_name:'YaKyoLife',
      description:'從高中三大賽到名人堂，一場種子化的台灣棒球員生涯模擬。',
      lang:'zh-Hant',start_url:dir,scope:dir,display:'standalone',
      background_color:'#081510',theme_color:'#081510',
      icons:[{src:dir+'assets/app-icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
        {src:dir+'assets/app-icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
        {src:dir+'assets/app-icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
    const l=document.createElement('link'); l.rel='manifest';
    l.href=URL.createObjectURL(new Blob([JSON.stringify(mf)],{type:'application/manifest+json'}));
    document.head.appendChild(l);
  }catch(e){}
})();
(function(){ const vb=document.getElementById('ver-badge'); if(vb)vb.textContent=APP_VER;
  const tv=document.getElementById('tl-ver'); if(tv)tv.textContent=APP_VER; })();
/* touch has no hover: tap the salary cell to reveal the full amount, tap again to close.
   Never dismisses on a timer — the user decides when it goes away. */
(function(){ const cell=document.getElementById('bd-sal-cell'); if(!cell)return;
  cell.addEventListener('click',()=>cell.classList.toggle('show'));
  /* on pointer devices :hover already governs the tip; make sure a stray click cannot
     leave it pinned open after the cursor has left the cell */
  if(window.matchMedia('(hover:hover)').matches)
    cell.addEventListener('mouseleave',()=>cell.classList.remove('show')); })();

/* temporary scaffold: consumed by ui/dom.js board() until engine modules exist */
export {removeTrait, traitCard, advance, finishContractYear, endGame};
