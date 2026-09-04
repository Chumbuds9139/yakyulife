import {S} from '../core/state.js?v=1.5.21';
import {$, teamChip} from './dom.js?v=1.5.21';
import {TRAIT_KEYS, TRAIT_N, TRAIT_FX, legendTraitNames, rainbowTraitNames, pitcherTCNames, hitterTCNames} from '../data/traits.js?v=1.5.21';
import {TEAM_COLOR, teamNick} from '../data/teams.js?v=1.5.21';

export function traitNames(k){
  if(k==='legend'){
    return legendTraitNames(S.legendLeagues,S.legendLeague);
  }
  if(k==='rainbow'){
    const names=rainbowTraitNames(S.rainbowLeagues,S.rainbowLg);
    return names.length?names:[TRAIT_N.rainbow];
  }
  if(k==='pitcherTC')return pitcherTCNames(S.pitcherTCLeagues);
  if(k==='hitterTC')return hitterTCNames(S.hitterTCLeagues);
  return [traitName(k)];
}
export function traitName(k){
  if(k==='mrteam')return (teamNick(S.mrTeamName||'')||'')+'先生';
  if(k==='legend'||k==='rainbow'||k==='pitcherTC'||k==='hitterTC')return traitNames(k)[0]||TRAIT_N[k]||k;
  return TRAIT_N[k]||k;
}
export function traitTagStyle(k){
  if(TRAIT_KEYS.neg.includes(k))return 'background:#2a0f0f;border-color:#c0392b;color:#ff8b7a';
  if(k==='legend'||k==='samurai'||k==='intlace'||k==='pitcherTC'||k==='hitterTC')return 'background:#3a2c05;border-color:#ffc95c;color:#ffe08a';
  if(k==='goldcloth')return 'background:#3a3505;border-color:#e8d43a;color:#fff35a';
  if(k==='mrteam'){ const c=teamChip(TEAM_COLOR[S.mrTeamName]||'#ffc95c'); return 'background:'+c.bg+';border-color:'+c.bd+';color:'+c.fg; }
  if(k==='genius'||k==='disc'||k==='clutch'||k==='favorite')return 'background:#232733;border-color:#c8d0e0;color:#e8eef7';
  return '';
}
export function traitColorRank(k){
  if(k==='legend'||k==='samurai'||k==='intlace'||k==='pitcherTC'||k==='hitterTC')return 0;
  if(k==='mrteam')return 1;
  if(k==='genius'||k==='disc'||k==='clutch'||k==='favorite')return 2;
  if(k==='goldcloth')return 4;
  if(TRAIT_KEYS.neg.includes(k))return 5;
  return 3;
}
export function renderTraits(){
  const el=$('trait-tags'),box=$('trait-side'); if(!el||!box)return;
  let h='';
  if(S&&S.invincible){
    h+=`<div class="trow special-attribute" title="特殊屬性：能力與潛力鎖定 80、受傷率 0%、TJ 0、事件成功率 100%、國家隊與職業隊奪冠率 100%、交易保護、招牌溢價 +100%"><span class="tag">無敵</span><span class="td">特殊屬性</span></div>`;
  }
  if(S&&S.traits){
    const row=(style,name,fx)=>`<div class="trow" title="${fx}"><span class="tag" style="${style}" title="${fx}">${name}</span><span class="td">${fx}</span></div>`;
    [...TRAIT_KEYS.pos,...TRAIT_KEYS.neg].forEach(k=>{ if(S.traits[k])traitNames(k).forEach(name=>{ h+=row(traitTagStyle(k),name,TRAIT_FX[k]||''); }); });
    (S.removed||[]).forEach(l=>h+=`<div class="trow"><span class="tag" style="text-decoration:line-through;opacity:.4;color:#8a8a8a;border-color:#4a4a4a">${l}</span><span class="td" style="opacity:.4">已解除</span></div>`);
  }
  el.innerHTML=h;
  box.classList.toggle('empty',!h);
}
