import {S, nextStep} from './core/state.js?v=1.5.11';
import {board, card, actToggleSync} from './ui/dom.js?v=1.5.11';

const SECRET=['P','C','IF','OF','OF','IF','C','P'];
let seq=[]; let armed=false; let lockInstalled=false; let mlbJapanFarewellShown=false;

function installAbilityLock(){
  if(!S||lockInstalled)return;
  lockInstalled=true;
  /* 彩蛋只保存一個真正的特殊狀態；perfectLock 僅作舊版傷病程式的相容別名，不再是第二個能力。 */
  S.invincible=true;
  Object.defineProperty(S,'perfectLock',{configurable:true,enumerable:false,get(){return !!S.invincible;},set(){}});
  Object.keys(S.ab||{}).forEach(k=>S.ab[k]=80);
  Object.keys(S.pot||{}).forEach(k=>S.pot[k]=80);
  S.carry={};

  const guard=target=>new Proxy(target,{set(t,k,v){if(S.invincible&&Object.prototype.hasOwnProperty.call(t,k)){t[k]=80;return true;}t[k]=v;return true;}});
  let abRef=guard(S.ab), potRef=guard(S.pot);
  Object.defineProperty(S,'ab',{configurable:true,enumerable:true,get(){return abRef;},set(v){abRef=guard(v);}});
  Object.defineProperty(S,'pot',{configurable:true,enumerable:true,get(){return potRef;},set(v){potRef=guard(v);}});

  /* TJ 量表永遠歸零；任何原引擎寫入都會被特殊狀態攔截。 */
  S.tj=0;
  Object.defineProperty(S,'tj',{configurable:true,enumerable:true,get(){return 0;},set(){}});

  /* 無敵的交易保護：把交易熱度鎖在遠低於觸發線的位置，不修改原交易演算法。 */
  let tradeHeat=-100;
  Object.defineProperty(S,'tradeHeat',{configurable:true,enumerable:true,get(){return tradeHeat;},set(v){tradeHeat=S.invincible?-100:Number(v)||0;}});

  /* 招牌溢價 100%：新合約建立時直接把實付年薪翻倍；原本市場評價與合約年限仍照舊。 */
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

  card('gold','隱藏屬性解鎖：無敵','你在角色創建時輸入了傳說中的守位密碼。<b class="hl">無敵</b> 已啟用：能力與潛力永久鎖定 80、受傷率 0%、TJ 量表 0、代言收入 +100%、事件卡成功率 100%、國家隊與職業隊奪冠率 100%、交易保護、招牌溢價 +100%。<br><span class="dim">這是一個獨立特殊狀態，不會把任何一般正面特質加入你的球員。</span>');
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
    ['中華隊徵召','日本代表徵召'],['中華隊','日本代表'],['台灣的轉播單位','日本の放送局'],['台灣時間','日本時間'],['台灣棒球','日本野球'],['台灣球迷','日本のファン'],['台灣的力量','日本の力'],
    ['用中文寫的「謝謝」毛巾','「ありがとう」と書かれたタオル'],['用不太標準的中文問你「還會回來嗎」','「また日本に戻ってきますか」と日本語で尋ねられ'],
    ['不動產營業員','不動産営業'],['板模工','建設現場の職人'],['早餐店','喫茶店'],['少棒隊員','少年野球の子どもたち'],['公司壘球隊','会社の草野球チーム'],['消防員','消防士'],['乙組業餘棒球隊','社会人クラブチーム'],['台北大巨蛋','東京ドーム'],['臺北大巨蛋','東京ドーム']
  ];
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), nodes=[]; while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){let t=n.nodeValue;for(const [a,b] of r)t=t.split(a).join(b);if(t!==n.nodeValue)n.nodeValue=t;}
}

function normalizeJapanContract(){
  if(!S||S.org!=='NPB'||S.lv!=='NPB_TRAIN'||!S.ct)return;
  if(!Number.isFinite(S.ct.annual)||S.ct.annual<240)S.ct.annual=240;
}

function maybeJapanMlbFarewell(){
  if(mlbJapanFarewellShown||!S||!S.done)return;
  const mlb=S.stats?.MLB, npb=S.stats?.NPB, cpbl=S.stats?.CPBL;
  if(!(mlb&&mlb.yr>0)||((npb&&npb.yr>0)||(cpbl&&cpbl.yr>0)))return;
  mlbJapanFarewellShown=true;
  card('gold','日本球界からの招待','現役生活の大半を美国で過ごしたあなたに、日本球界から声がかかった。東京ドームで<b class="hl">一日限りのNPB選手</b>として始球式を務めてほしい——そんな特別な招待だった。満員のスタンドを見渡し、あなたは最後の一球を投げる。勝敗ではなく、日本野球への感謝を込めた一球だ。');
  board(1);
}

/* 中職卡死保護：若 CPBL 流程因資料組合意外產生空 action panel，補上一個安全的「繼續」
   按鈕把既有 stepQ 送回引擎。正常有選項時完全不介入。 */
function recoverEmptyCpblAction(){
  if(!S||S.org!=='CPBL'||S.done)return;
  const a=document.getElementById('act');
  if(!a||a.style.display==='none'||a.querySelector('button'))return;
  const title=a.querySelector('.title');
  if(!title)return;
  const b=document.createElement('button');
  b.className='btn main';
  b.textContent='繼續';
  b.onclick=()=>{a.innerHTML=''; nextStep();};
  a.appendChild(b);
  actToggleSync();
}

const observer=new MutationObserver(ms=>{
  normalizeJapanContract();
  ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)localizeJapanText(n);}));
  maybeJapanMlbFarewell();
  recoverEmptyCpblAction();
});
observer.observe(document.body,{childList:true,subtree:true});
localizeJapanText(document.body);
normalizeJapanContract();
maybeJapanMlbFarewell();
recoverEmptyCpblAction();
