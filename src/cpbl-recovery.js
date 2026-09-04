/* CPBL recovery guard: a broken/empty action panel must never strand a career. */
import {S, nextStep} from './core/state.js?v=1.5.24';

function recover(){
  if(typeof document==='undefined'||!S||S.done||S.org!=='CPBL'||S.stage!=='PRO'||S.stageYr<1)return;
  const act=document.getElementById('act');
  if(!act)return;
  const hasAction=!!act.querySelector('button,.btn');
  if(hasAction)return;
  /* During a normal phase transition #act is briefly empty. Wait one tick plus a small
     debounce so this only fires when the engine really failed to render the next choice. */
  if(act.dataset.cpblRecoverPending==='1')return;
  act.dataset.cpblRecoverPending='1';
  setTimeout(()=>{
    act.dataset.cpblRecoverPending='0';
    if(!S||S.done||S.org!=='CPBL'||S.stage!=='PRO')return;
    const live=document.getElementById('act');
    if(!live||live.querySelector('button,.btn'))return;
    live.innerHTML='<div class="title">中職生涯</div><button class="btn main" id="cpbl-recover-next">繼續</button>';
    const b=document.getElementById('cpbl-recover-next');
    if(b)b.onclick=()=>{ live.innerHTML=''; try{ nextStep(); }catch(e){ console.error(e); } };
    live.style.display='';
  },350);
}

if(typeof document!=='undefined'){
  const obs=new MutationObserver(recover);
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
  setTimeout(recover,500);
}
