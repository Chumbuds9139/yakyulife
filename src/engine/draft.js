import {S} from '../core/state.js?v=1.5.16';
import {ri, pick, chance} from '../core/rng.js?v=1.5.16';
import {NPB_TEAMS, CORPORATE_TEAMS, INDEP_TEAMS} from '../data/teams.js?v=1.5.16';
import {card, choose, board, menuModal} from '../ui/dom.js?v=1.5.16';
import {tlNote} from '../ui/timeline.js?v=1.5.16';
import {ovr, playerType} from './ability.js?v=1.5.16';
import {primaryPos} from './career.js?v=1.5.16';
import {fmtMoney, makeOffers, pickOfferUI, signTo, makeContract, rollCpblImport} from './contract.js?v=1.5.16';
import {startYear} from '../flow/phases.js?v=1.5.16';
import {endGame} from '../ui/retire.js?v=1.5.16';

/* ---------- 日本版：選秀與生涯路口 ---------- */
const JP_UNI=['早稻田大學','慶應義塾大學','明治大學','東洋大學','中央大學'];

export function enteredNpbDraft(){ return !!(S&&S.npbDraftEntered); }

function enterJapaneseAmateur(org,team){
  const lv=org==='CORP'?'CORP':'INDEP';
  const annual=org==='CORP'?48:36;
  S.stage='PRO'; S.stageYr=0; S.org=org; S.lv=lv; S.orgTeam=team; S.team=team; S.svc=0; S.faElig=false;
  S.ct=makeContract(1,1,lv,0,annual,null,'業餘球團合約');
  tlNote(3,org==='CORP'?'加盟社會人':'加盟獨立聯盟');
}

/* 社會人／獨立聯盟的職棒去向不是升降級。
   打完一季後若尚未參加過日職選秀，可投入一次；表現夠好時十二球團可能買斷，
   中華職棒也可能開出洋將合約。轉入職業聯盟都寫入該聯盟球隊，不帶業餘隊名。 */
function amateurOffseasonDecision(){
  if(S.org!=='CORP'&&S.org!=='INDEP')return false;
  const corp=S.org==='CORP';
  const o=ovr();
  const buyoutChance=clampChance((o-(corp?47:44))*5+25);
  const opts=[];

  if(!enteredNpbDraft()){
    opts.push({t:'投入日本職棒選秀',main:true,s:`綜合 ${o}｜${corp?'社會人':'獨立聯盟'}投入日職選秀（生涯僅一次）`,f:()=>runDraft(false,r=>{
      if(r==='fail'){
        card('info','今年未獲 NPB 指名',`${corp?'社會人':'獨立聯盟'}生涯繼續。日職選秀每人一生只有一次，之後要等十二球團主動接觸。`);
        startYear();
      }else startYear();
    })});
  }

  if(chance(buyoutChance)){
    const lv=o>=56?'NPB2':'NPB_TRAIN';
    const n=ri(1,3);
    const bonusBase=lv==='NPB2'?280:160;
    opts.push({t:'接受十二球團合約／買斷',s:`有球團主動接觸｜${lv==='NPB2'?'二軍':'育成'}起步`,f:()=>{
      const oldTeam=S.orgTeam;
      S.svc=0; S.faElig=false; S.team='';
      const offers=makeOffers('NPB',n,bonusBase,1,2,lv,null);
      pickOfferUI('日本職棒十二球團 · 合約／買斷','NPB',offers,()=>{
        card('gold','NPB 球團正式合約',`${S.orgTeam} 看上你在${corp?'社會人':'獨立聯盟'}的表現，與原球團 <b class="hl">${oldTeam}</b> 完成合約協商後正式簽入。業餘隊名不會帶到日職；現在所屬為 <b class="hl">${S.orgTeam}</b>，從 ${lv==='NPB2'?'二軍':'育成'} 出發。`);
        tlNote(4,`NPB球團簽約：${S.orgTeam}`); board(0); startYear();
      });
    }});
  }

  const cpbl=rollCpblImport(o, corp?'CORP':'INDEP');
  if(cpbl){
    opts.push({t:'接受中職洋將合約',s:`台灣球團主動接觸｜${cpbl.lv==='CPBL1'?'一軍洋將':'二軍／培養型'}起步`,f:()=>{
      const oldTeam=S.orgTeam;
      S.svc=0; S.faElig=false; S.team='';
      const n=ri(1,2);
      const bonusBase=cpbl.lv==='CPBL1'?220:120;
      const offers=makeOffers('CPBL',n,bonusBase,1,2,cpbl.lv,null);
      pickOfferUI('中華職棒 · 洋將合約','CPBL',offers,()=>{
        card('gold','跨海洋將合約',`中華職棒看上你在${corp?'社會人':'獨立聯盟'}的表現，向原球團 <b class="hl">${oldTeam}</b> 遞出合約。業餘隊名不會帶走；現在所屬為 <b class="hl">${S.orgTeam}</b>，從${cpbl.lv==='CPBL1'?'一軍洋將':'培養型'}出發。`);
        tlNote(4,`中職簽約：${S.orgTeam}`); board(0); startYear();
      });
    }});
  }

  opts.push({t:corp?'留在社會人再磨一年':'留在獨立聯盟再拚一年',main:opts.length===0,f:()=>startYear()});
  choose(`${corp?'社會人':'獨立聯盟'}球季結束 · 下一站？`,opts);
  return true;
}

function clampChance(v){return Math.max(8,Math.min(78,v));}

function draftAssignLevel(rd,o){
  if(rd<=2)return 'NPB2';
  if(o>=56)return 'NPB2';
  return 'NPB_TRAIN';
}

export function runDraft(fromSchool,cb){
  S.npbDraftEntered=true;
  const o=ovr();
  const score=o+Math.max(0,22-S.age)*2+ri(-4,4);
  const rd=score>=56?1:score>=49?2:score>=43?ri(3,4):score>=37?ri(5,7):score>=30?ri(8,10):0;
  if(rd===0){
    card('bad','日職選秀落榜',`唱名一輪又一輪，始終沒有你的名字。（綜合 ${o}｜年齡加權後評價 ${score}）`);
    if(fromSchool){ card('info','','可以回到校隊繼續磨練。日職選秀每人一生只有一次。'); cb(); }
    else cb('fail');
    return;
  }
  const bonus=[0,1800,1000,600,500,350,300,250,150,120,100][rd]||100;
  const team=pick(NPB_TEAMS);
  const lv=draftAssignLevel(rd,o);
  const accept=()=>{
    S.stage='PRO'; S.team=''; S.salary+=bonus; S.svc=0; S.faElig=false;
    signTo('NPB',lv,team,ri(2,3),1);
    card('gold','日本職棒選秀會',`第 <b class="hl">${rd}</b> 輪獲 <b class="hl">${team}</b> 指名！簽約金約 <b class="hl">${fmtMoney(bonus)}</b>。${lv==='NPB2'?'進入二軍支配下':'進入育成契約'}出發。`);
    tlNote(4,'日職選秀第'+rd+'輪'); board(0); cb();
  };
  if(rd>=3 && S.age<20){
    choose(`日本職棒選秀會 · 第 ${rd} 輪獲 ${team} 指名`,[
      {t:'接受指名，加盟球隊',main:true,s:`簽約金 ${fmtMoney(bonus)}｜${lv==='NPB2'?'二軍支配下':'育成契約'}出發`,f:accept},
      {t:(S.stage==='HS'||(S.stage==='U'&&S.stageYr<4))?'重返校園，再拚一年':'重返業餘，再拚一年',warn:true,s:'放棄本次指名｜日職選秀不再重來',f:()=>{
        const fromHS=S.stage==='HS';
        const fromU=S.stage==='U'&&S.stageYr<4;
        const fromAmateur=S.org==='CORP'||S.org==='INDEP';
        if(fromHS){
          S.stage='U'; S.stageYr=0; S.team=pick(JP_UNI);
          card('info','重返校園',`你對選秀順位不滿意，決定進入 <b class="hl">${S.team}</b> 繼續深造。日職選秀每人一生只有一次，之後要等球團合約或其他出路。`);
        }else if(fromU){
          card('info','重返校園',`你對選秀順位不滿意，留在 <b class="hl">${S.team}</b> 繼續磨練。日職選秀每人一生只有一次。`);
        }else if(fromAmateur){
          card('info','重返業餘',`你對選秀順位不滿意，繼續留在${S.org==='CORP'?'社會人':'獨立聯盟'}。日職選秀每人一生只有一次，之後要等球團合約或其他出路。`);
        }else{
          card('info','重返業餘','你對選秀順位不滿意。選擇投身社會人球界或獨立聯盟。日職選秀每人一生只有一次，之後要等球團合約或其他出路。');
          if(S.age<=25) enterJapaneseAmateur(pick(['CORP','INDEP']),pick(CORPORATE_TEAMS.concat(INDEP_TEAMS)));
        }
        if(fromSchool) cb();
        else if(fromAmateur) startYear();
        else advance();
      }}]);
    return;
  }
  accept();
}

export function pathChoiceHS(){
  const o=ovr();
  const opts=[
    {t:'就讀大學（延長養成）',s:'一年僅 2 場大賽加點｜大二起可投入日職選秀（僅一次）',f:()=>{ S.stage='U'; S.stageYr=0; S.team=pick(JP_UNI); card('info','升學',`進入 <b class="hl">${S.team}</b> 棒球隊。`); advance(); }},
    {t:'加入社會人棒球',s:'不消耗日職選秀資格｜企業隊業餘合約',f:()=>{enterJapaneseAmateur('CORP',pick(CORPORATE_TEAMS)); card('info','加盟社會人',`高中畢業後加入 <b class="hl">${S.orgTeam}</b>。日職選秀資格仍在，之後季末仍可投入一次。`); advance(); }},
    {t:'加入獨立聯盟',s:'不消耗日職選秀資格｜獨立聯盟舞台',f:()=>{enterJapaneseAmateur('INDEP',pick(INDEP_TEAMS)); card('info','加盟獨立聯盟',`高中畢業後加入 <b class="hl">${S.orgTeam}</b>。日職選秀資格仍在，之後季末仍可投入一次。`); advance(); }}
  ];
  if(!enteredNpbDraft()){
    opts.push({t:'投入日本職棒選秀',s:'目前綜合 '+o+'｜生涯僅一次',f:()=>runDraft(false,r=>{
      if(r==='fail')choose('落榜之後',[
        {t:'改就讀大學',main:true,f:()=>{S.stage='U';S.stageYr=0;S.team=pick(JP_UNI);advance();}},
        {t:'加入社會人棒球',f:()=>{enterJapaneseAmateur('CORP',pick(CORPORATE_TEAMS));advance();}},
        {t:'加入獨立聯盟',f:()=>{enterJapaneseAmateur('INDEP',pick(INDEP_TEAMS));advance();}}
      ]); else advance();
    })});
  }
  if(o>=50)opts.push({t:'洽談旅美合約',main:true,s:`從${o>=54?' 1A ':'新人聯盟'}出發，逐級挑戰大聯盟`,f:()=>{
    S.stage='PRO';
    pickOfferUI('大聯盟球團的國際簽約報價','MiLB',makeOffers('MiLB',ri(2,3),1500,3,4,o>=54?'A1':'R',null),()=>{ card('gold','旅美','美國的紅土，等著你去征服。'); advance(); });
  }});
  choose(`高中畢業 · 綜合能力 ${o} · 人生的第一個路口`,opts);
}

export function pathChoiceU4(){
  const o=ovr();
  const opts=[];
  if(!enteredNpbDraft()){
    opts.push({t:'投入日本職棒選秀',main:true,s:'綜合 '+o+'｜大學畢業年齡加權下降｜生涯僅一次',f:()=>runDraft(false,r=>{
      if(r==='fail')choose('落榜之後',[
        {t:'加入社會人棒球',f:()=>{enterJapaneseAmateur('CORP',pick(CORPORATE_TEAMS));advance();}},
        {t:'加入獨立聯盟',f:()=>{enterJapaneseAmateur('INDEP',pick(INDEP_TEAMS));advance();}},
        {t:'高掛球鞋',warn:true,f:()=>endGame('大學畢業選秀落榜，決定告別球場。')}
      ]); else advance();
    })});
  }else{
    opts.push({t:'加入社會人棒球',main:true,f:()=>{enterJapaneseAmateur('CORP',pick(CORPORATE_TEAMS));advance();}});
    opts.push({t:'加入獨立聯盟',f:()=>{enterJapaneseAmateur('INDEP',pick(INDEP_TEAMS));advance();}});
    opts.push({t:'高掛球鞋',warn:true,f:()=>endGame('大學畢業，決定告別球場。')});
  }
  const agePenalty=Math.max(0,S.age-18),reqMiLB=50+Math.floor(agePenalty/2),bonusMiLB=Math.max(150,1500-agePenalty*350);
  if(o>=reqMiLB)opts.push({t:'洽談旅美合約',s:'大齡底薪簽約（Senior Sign）',f:()=>{S.stage='PRO';pickOfferUI('大聯盟球團報價','MiLB',makeOffers('MiLB',2,bonusMiLB,3,4,o>=55?'A1':'R',null),advance);}});
  choose(`大學畢業 · 綜合能力 ${o}`,opts);
}

if(typeof document!=='undefined'&&document.getElementById('btn-menu')) document.getElementById('btn-menu').onclick=menuModal;

export function advance(){
  S.age++; S.year++; S.stageYr++;
  /* 社會人／獨立聯盟不是 NPB 二軍。每個球季結束後先進入「NPB 機會窗口」，
     由選秀或球團合約／買斷決定是否轉隊；不會再因 PATHS 自動升級。 */
  if((S.org==='CORP'||S.org==='INDEP')&&S.stageYr>=2){
    amateurOffseasonDecision();
    return;
  }
  startYear();
}
