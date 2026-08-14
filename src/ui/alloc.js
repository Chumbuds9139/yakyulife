import {$} from './dom.js';
import {isMobileLayout} from './prefs.js';

export function allocFullOpen(){ const f=$('alloc-full'); if(f)f.classList.add('show'); }
export function allocFullClose(){ const f=$('alloc-full'); if(f)f.classList.remove('show'); }
/* The live allocation, so its nodes can be re-homed when a setting changes mid-way.
   render() only ever writes into these same three nodes, which is what makes moving
   them between the panel and the overlay safe. */
export let ALLOC=null;
export function setAlloc(v){ ALLOC=v; }
export function clearAlloc(){ ALLOC=null; }
export function allocPlace(){
  if(!ALLOC)return;
  const a=$('act'), full=document.body.classList.contains('big-text')&&isMobileLayout();
  const s=$('act-side'); if(s)s.classList.toggle('alloc',!full);
  if(full){
    /* move the nodes out of #act before rewriting it, or the rewrite would destroy them */
    const fb=$('af-body');
    fb.appendChild(ALLOC.top); fb.appendChild(ALLOC.rows); fb.appendChild(ALLOC.btm);
    const ft=$('af-title'); if(ft)ft.textContent=ALLOC.label;
    a.innerHTML=`<div class="title">${ALLOC.label}</div><div class="pool" id="al-cue"></div>`;
    /* both entry points already sit behind an explicit 分配 button, so the overlay opens
       straight away; this one is only the way back after the player dismisses it */
    const ob=document.createElement('button'); ob.className='btn main'; ob.id='al-open';
    ob.style.textAlign='center'; ob.textContent='繼續分配 ▸'; ob.onclick=allocFullOpen;
    a.appendChild(ob);
    allocFullOpen();
  }else{
    const frag=document.createDocumentFragment();
    frag.appendChild(ALLOC.top); frag.appendChild(ALLOC.rows); frag.appendChild(ALLOC.btm);
    a.innerHTML=`<div class="title">${ALLOC.label}</div>`;
    a.appendChild(frag);
    allocFullClose();
  }
  ALLOC.render();
}
