import {S} from '../core/state.js?v=1.5.11';
import {ri, pick} from '../core/rng.js?v=1.5.11';
import {NPB_TEAMS, CORPORATE_TEAMS, INDEP_TEAMS} from '../data/teams.js?v=1.5.11';
import {card, choose, board, menuModal} from '../ui/dom.js?v=1.5.11';
import {tlNote} from '../ui/timeline.js?v=1.5.11';
import {ovr, playerType} from './ability.js?v=1.5.11';
import {primaryPos} from './career.js?v=1.5.11';
import {fmtMoney, makeOffers, pickOfferUI, signTo, makeContract} from './contract.js?v=1.5.11';
import {startYear} from '../flow/phases.js?v=1.5.11';
import {endGame} from '../ui/retire.js?v=1.5.11';

/* ---------- 日本版：選秀與生涯路口 ---------- */
const JP_UNI=['早稻田大學','慶應義塾大學','明治大學','東洋大學','中央大學'];

function enterJapaneseAmateur(org,team){
  const lv=org==='CORP'?'CORP':'INDEP'; 
  const annual=org==='CORP'?48:36;
  S.stage='PRO'; S.stageYr=0; S.org=org; S.lv=lv; S.orgTeam=team; S.team=team; S.svc=0; S.faElig=false;
  S.ct=makeContract(1,1,lv,0,annual,null,'業餘球團合約');
  tlNote(3,org==='CORP'?'加盟社會人':'加盟獨立聯盟');
}

export function runDraft(fromSchool,cb){
  const o=ovr(); 
  const score=o+Math.max(0,22-S.age)*2+ri(-4,4);
  const rd=score>=56?1:score>=49?2:score>=43?ri(3,4):score>=37?ri(5,7):score>=30?ri(8,10):0;
  
  if(rd===0){
    card('bad','日職選秀落榜',`唱名一輪又一輪，始終沒有你的名字。（綜合 ${o}｜年齡加權後評價 ${score}）`);
    if(fromSchool){ 
      card('info','','可以回到校隊，明年再來。'); 
      cb(); 
    }
    else cb('fail');
    return;
  }
  
  const bonus=[0,1800,1000,600,500,350,300,250,150,120,100][rd]||100;
  const team=pick(NPB_TEAMS);
  const lv=o>=56?'NPB2':'NPB_TRAIN';
  
  const accept=()=>{
    S.stage='PRO'; S.team=''; S.salary+=bonus; S.svc=0; S.faElig=false;
    signTo('NPB',lv,team,ri(2,3),1);
    card('gold','日本職棒選秀會',`第 <b class="hl">${rd}</b> 輪獲 <b class="hl">${team}</b> 指名！簽約金約 <b class="hl">${fmtMoney(bonus)}</b>。${lv==='NPB2'?'進入二軍體系':'進入育成體系'}出發。`);
    tlNote(4,'日職選秀第'+rd+'輪');
    board(0); cb();
  };
  
  /* 輪次不滿意（第 3 輪以後）可選擇重返社會人或獨立聯盟再拚一年；年齡太大（20+）則不給這選項 */
  if(rd>=3 && S.age<20){
    choose(`日本職棒選秀會 · 第 ${rd} 輪獲 ${team} 指名`,[
      {t:'接受指名，加盟球隊',main:true,s:`簽約金 ${fmtMoney(bonus)}｜${lv==='NPB2'?'二軍':'育成'}出發`,f:accept},
      {t:(S.stage==='HS'||(S.stage==='U'&&S.stageYr<4))?'重返校園，再拚一年':'重返業餘，再拚一年',warn:true,s:'放棄本次指名，明年重新參加日職選秀',f:()=>{
        const goUni=(S.stage==='HS')||(S.stage==='U'&&S.stageYr<4);
        const fresh=(S.stage==='HS');
        card('info',goUni?'重返校園':'重返業餘',`你對選秀順位不滿意。${goUni?(fresh?'決定進入大學繼續深造':'留在校隊繼續磨練'):'選擇投身社會人球界或獨立聯盟'}，明年重新參加日職選秀。`);
        if(fresh){ S.stage='U'; S.stageYr=0; S.team=pick(JP_UNI); }
        else if(goUni){ S.stage='U'; S.stageYr=0; S.team=pick(JP_UNI); }
        else if(S.age<=25){ 
          const org=pick(['CORP','INDEP']); 
          enterJapaneseAmateur(org,pick(org==='CORP'?CORPORATE_TEAMS:INDEP_TEAMS)); 
        }
        if(fromSchool) cb(); else advance();
      }}]);
    return;
  }
  accept();
}

export function pathChoiceHS(){
  const o=ovr();
  const opts=[
    {t:'就讀大學（延長養成）',s:'一年僅 2 場大賽加點｜大二起每年可投入日職選秀',f:()=>{
      S.stage='U'; S.stageYr=0; S.team=pick(JP_UNI);
      card('info','升學',`進入 <b class="hl">${S.team}</b> 棒球隊。`); 
      advance();
    }},
    {t:'投入日本職棒選秀',s:'目前綜合 '+o,f:()=>runDraft(false,r=>{
      if(r==='fail')choose('落榜之後',[
        {t:'改就讀大學',main:true,f:()=>{S.stage='U';S.stageYr=0;S.team=pick(JP_UNI);advance();}},
        {t:'加入社會人棒球',f:()=>{enterJapaneseAmateur('CORP',pick(CORPORATE_TEAMS));advance();}},
        {t:'加入獨立聯盟',f:()=>{enterJapaneseAmateur('INDEP',pick(INDEP_TEAMS));advance();}}
      ]);
      else advance(); 
    })}
  ];
  
  /* 高中生進 NPB 統一走選秀；不再另開一條「洽談日職合約」捷徑。 */
  if(o>=50)opts.push({t:'洽談旅美合約',main:true,s:`從${o>=54?' 1A ':'新人聯盟'}出發，逐級挑戰大聯盟`,f:()=>{
    S.stage='PRO';
    pickOfferUI('大聯盟球團的國際簽約報價','MiLB',makeOffers('MiLB',ri(2,3),1500,3,4,o>=54?'A1':'R',null),()=>{
      card('gold','旅美','美國的紅土，等著你去征服。'); 
      advance();
    });
  }});
  
  choose(`高中畢業 · 綜合能力 ${o} · 人生的第一個路口`,opts);
}

export function pathChoiceU4(){
  const o=ovr();
  const opts=[
    {t:'投入日本職棒選秀',main:true,s:'綜合 '+o+'｜大學畢業年齡加權下降',f:()=>runDraft(false,r=>{
      if(r==='fail')choose('落榜之後',[
        {t:'加入社會人棒球',f:()=>{enterJapaneseAmateur('CORP',pick(CORPORATE_TEAMS));advance();}},
        {t:'加入獨立聯盟',f:()=>{enterJapaneseAmateur('INDEP',pick(INDEP_TEAMS));advance();}},
        {t:'高掛球鞋',warn:true,f:()=>endGame('大學畢業選秀落榜，決定告別球場。')}
      ]);
      else advance();
    })}
  ];

  /* 大四畢業仍可依原遊戲邏輯直接洽談旅美合約；日職則統一走日本職棒選秀。 */
  const agePenalty=Math.max(0,S.age-18);
  const reqMiLB=50+Math.floor(agePenalty/2);
  const bonusMiLB=Math.max(150,1500-agePenalty*350);
  
  if(o>=reqMiLB)opts.push({t:'洽談旅美合約',s:'大齡底薪簽約（Senior Sign）',f:()=>{S.stage='PRO';
    pickOfferUI('大聯盟球團報價','MiLB',makeOffers('MiLB',2,bonusMiLB,3,4,o>=55?'A1':'R',null),advance);}});
  
  choose(`大學畢業 · 綜合能力 ${o}`,opts);
}

if(typeof document!=='undefined'&&document.getElementById('btn-menu')){
  document.getElementById('btn-menu').onclick=menuModal;
}

export function advance(){
  S.age++; S.year++; S.stageYr++; startYear();
}