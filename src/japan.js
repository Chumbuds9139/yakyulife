import {S} from './core/state.js?v=1.5.25';
import {board, card} from './ui/dom.js?v=1.5.25';

const SECRET=['P','C','IF','OF','OF','IF','C','P'];
let seq=[]; let armed=false; let lockInstalled=false; let mlbJapanFarewellShown=false;

function installAbilityLock(){
  if(!S||lockInstalled)return;
  lockInstalled=true;
  S.invincible=true;
  Object.defineProperty(S,'perfectLock',{configurable:true,enumerable:false,get(){return !!S.invincible;},set(){}});
  Object.keys(S.ab||{}).forEach(k=>S.ab[k]=80);
  Object.keys(S.pot||{}).forEach(k=>S.pot[k]=80);
  S.carry={};

  const guard=target=>new Proxy(target,{set(t,k,v){if(S.invincible&&Object.prototype.hasOwnProperty.call(t,k)){t[k]=80;return true;}t[k]=v;return true;}});
  let abRef=guard(S.ab), potRef=guard(S.pot);
  Object.defineProperty(S,'ab',{configurable:true,enumerable:true,get(){return abRef;},set(v){abRef=guard(v);}});
  Object.defineProperty(S,'pot',{configurable:true,enumerable:true,get(){return potRef;},set(v){potRef=guard(v);}});

  /* TJ = Tommy John 風險量表，不是兵役。無敵模式固定為 0，代表投手不會因手肘尺側副韌帶傷勢觸發 Tommy John 手術、整季報銷與能力下降。 */
  let tj=0;
  Object.defineProperty(S,'tj',{configurable:true,enumerable:true,get(){return tj;},set(v){tj=S.invincible?0:Math.max(0,Number(v)||0);}});
  S.tj=0;

  let tradeHeat=-100;
  Object.defineProperty(S,'tradeHeat',{configurable:true,enumerable:true,get(){return tradeHeat;},set(v){tradeHeat=S.invincible?-100:Number(v)||0;}});

  let ctRef=S.ct;
  const normalizeCt=ct=>{
    if(!ct||typeof ct!=='object')return ct;
    const out=ct;
    if(S.invincible){
      if(Number.isFinite(out.annual))out.annual=Math.max(0,Math.round(out.annual*2));
      if(Array.isArray(out.annualSchedule))out.annualSchedule=out.annualSchedule.map(v=>Number.isFinite(v)?Math.round(v*2):v);
    }
    return out;
  };
  Object.defineProperty(S,'ct',{configurable:true,enumerable:true,get(){return ctRef;},set(v){ctRef=normalizeCt(v);}});
  if(ctRef)ctRef=normalizeCt(ctRef);

  card('gold','隱藏屬性解鎖：無敵','你在角色創建時輸入了傳說中的守位密碼。<b class="hl">無敵</b> 已啟用：能力與潛力永久鎖定 80、受傷率 0%、TJ 量表鎖定 0、代言收入 +100%、事件卡成功率 100%、國家隊與職業隊奪冠率 100%、交易保護、招牌溢價 +100%。');
  board(0);
}

document.querySelectorAll('#seg-pos button').forEach(btn=>btn.addEventListener('click',()=>{
  seq.push(btn.dataset.v); if(seq.length>SECRET.length)seq.shift();
  if(seq.length===SECRET.length&&seq.every((v,i)=>v===SECRET[i])){seq=[];armed=true;window.alert('侍魂已覺醒：特殊屬性「無敵」已解鎖。開始這段生涯後生效。');}
}));
const start=document.getElementById('btn-start');
if(start)start.addEventListener('click',()=>{if(!armed)return;setTimeout(()=>{if(S)installAbilityLock();},0);});

function localizeJapanText(root){
  if(!root||S?.org==='CPBL')return;
  const r=[
    ['中華隊徵召','日本代表邀請'],['日本代表徵召','日本代表邀請'],['婉拒本次代表隊徵召','考量身體狀況婉拒'],['披上日本代表戰袍','披上國家隊戰袍'],['中華隊','日本代表']
  ];
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[]; while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){let t=n.nodeValue;for(const [a,b] of r)t=t.split(a).join(b);if(t!==n.nodeValue)n.nodeValue=t;}
}

function normalizeJapanContract(){
  if(!S||S.org!=='NPB'||S.lv!=='NPB_TRAIN'||!S.ct)return;
  if(!Number.isFinite(S.ct.annual)||S.ct.annual<240)S.ct.annual=240;
}

function maybeJapanMlbFarewell(){
  if(mlbJapanFarewellShown||!S||!S.done)return;
  const mlb=S.stats?.MLB,npb=S.stats?.NPB,cpbl=S.stats?.CPBL;
  if(!(mlb&&mlb.yr>0)||((npb&&npb.yr>0)||(cpbl&&cpbl.yr>0)))return;
  mlbJapanFarewellShown=true;
  card('gold','日本球界的邀請','現役大半歲月在美國度過的你，接到日本球界的邀請。東京巨蛋邀你以一日 NPB 選手的身分擔任開球——滿場看台前，你投出的不是勝負，而是對日本野球的感謝。');
  board(1);
}

const observer=new MutationObserver(ms=>{
  normalizeJapanContract();
  ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)localizeJapanText(n);}));
  maybeJapanMlbFarewell();
});
observer.observe(document.body,{childList:true,subtree:true});
localizeJapanText(document.body);
normalizeJapanContract();
maybeJapanMlbFarewell();
