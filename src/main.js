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
import {CHEER, CHEER_DEFAULT, CHEER_SAFE, datePool, affairPool, loveEvent, divorceRec, loveCaught, proposalAsk, loveCaughtDating, loveGainTxt} from './flow/love.js';
import {traitCard, removeTrait, evOdds, drawEvents, resolveEvent, allocDone, checkTraitsMid} from './flow/events.js';
import {allocUI} from './ui/alloc.js';
import {startYear, phasePre, phaseMid, phaseEnd, finishContractYear, movement} from './flow/phases.js';
import {runDraft, pathChoiceHS, pathChoiceU4, advance} from './engine/draft.js';
import {APP_VER, OFFICIAL_URL, OFFICIAL_HOST} from './config.js';
import {S, setS, stepQ, nextStep, newState, playerName, blankStat, bucketOf} from './core/state.js';
import {ABL, POS_AB, POSN, DPN, DP_TH, DP_BAR, POS_ADJ_RUNS, DP_RANK, GLOVE_TH} from './data/abilities.js';
import {TEAM_COLOR, CPBL_TEAMS, NPB_TEAMS, MLB_TEAMS, LV, PATHS, HS_CUPS, U_CUPS, LG_N} from './data/teams.js';
import {TRAIT_KEYS, TRAIT_N, TRAIT_FX} from './data/traits.js';
import {EVENTS} from './data/events.js';
import {AMA_ANNUAL, LEVEL_MIN_ANNUAL, MLB_SERVICE_MINOR_MIN, TIER_TH, MILESTONE_DEF, FAN, RP_TICKS, RP_LV_SUF} from './data/economy.js';

/* ================= 靜態資料 ================= */
/* 各守位守備分公式:依守位看重不同能力(回傳一個綜合守備分) */
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
export {endGame};
