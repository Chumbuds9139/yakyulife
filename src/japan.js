import {S} from './core/state.js?v=1.5.11';
import {TRAIT_KEYS} from './data/traits.js?v=1.5.11';
import {board, card} from './ui/dom.js?v=1.5.11';

const SECRET=['P','C','IF','OF','OF','IF','C','P'];
let seq=[]; let armed=false; let lockInstalled=false;

function installAbilityLock(){
  if(!S||lockInstalled)return;
  lockInstalled=true; S.perfectLock=true;
  Object.keys(S.ab||{}).forEach(k=>S.ab[k]=80);
  Object.keys(S.pot||{}).forEach(k=>S.pot[k]=80);
  S.carry={}; TRAIT_KEYS.pos.forEach(k=>{S.traits[k]=true;});
  const guard=target=>new Proxy(target,{set(t,k,v){if(S.perfectLock&&Object.prototype.hasOwnProperty.call(t,k)){t[k]=80;return true;}t[k]=v;return true;}});
  let abRef=guard(S.ab), potRef=guard(S.pot);
  Object.defineProperty(S,'ab',{configurable:true,enumerable:true,get(){return abRef;},set(v){abRef=guard(v);}});
  Object.defineProperty(S,'pot',{configurable:true,enumerable:true,get(){return potRef;},set(v){potRef=guard(v);}});
  card('gold','隱藏彩蛋：侍魂開啟','你在角色創建時輸入了傳說中的守位密碼。<b class="hl">所有正面附加效果已解鎖，所有能力值與潛力上限永久鎖定 80。</b> 這一局，規則由你寫。');
  board(0);
}

document.querySelectorAll('#seg-pos button').forEach(btn=>btn.addEventListener('click',()=>{
  seq.push(btn.dataset.v); if(seq.length>SECRET.length)seq.shift();
  if(seq.length===SECRET.length&&seq.every((v,i)=>v===SECRET[i])){seq=[];armed=true;window.alert('侍魂已覺醒：所有正面附加效果解鎖，能力永遠鎖定滿級。開始這段生涯後生效。');}
}));
const start=document.getElementById('btn-start');
if(start)start.addEventListener('click',()=>{if(!armed)return;const wait=()=>S?installAbilityLock():setTimeout(wait,0);wait();});

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
const observer=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)localizeJapanText(n);})));
observer.observe(document.body,{childList:true,subtree:true}); localizeJapanText(document.body);
