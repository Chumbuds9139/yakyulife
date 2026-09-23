import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

globalThis.location={search:''};
const state=await import('../src/core/state.js');
const tenure=await import('../src/engine/tenure.js');

assert.equal(tenure.CPBL_DOMESTIC_YEARS,9);

const mk=(extra)=>{
  const s=state.newState('羅力',17,'P',null);
  Object.assign(s,{stage:'PRO',lv:'CPBL1',org:'CPBL',seasonFactor:1,skipMid:false,cpbl1Years:0,cpblDomestic:false},extra||{});
  return s;
};

{
  const s=mk();
  assert.equal(tenure.cpbl1YearQualifies(s),true);
  assert.equal(tenure.accrueCpbl1Service(s),false);
  assert.equal(s.cpbl1Years,1);
  assert.equal(s.cpblDomestic,false);
}

{
  const s=mk({lv:'CPBL2'});
  assert.equal(tenure.cpbl1YearQualifies(s),false);
  assert.equal(tenure.accrueCpbl1Service(s),false);
  assert.equal(s.cpbl1Years,0);
}

{
  const s=mk({skipMid:true,seasonFactor:1});
  assert.equal(tenure.accrueCpbl1Service(s),false);
  assert.equal(s.cpbl1Years,0);
}

{
  const s=mk({seasonFactor:0.4});
  assert.equal(tenure.accrueCpbl1Service(s),false);
  assert.equal(s.cpbl1Years,0);
}

{
  const s=mk({seasonFactor:0.5,cpbl1Years:7});
  assert.equal(tenure.accrueCpbl1Service(s),false);
  assert.equal(s.cpbl1Years,8);
  assert.equal(s.cpblDomestic,false);
  assert.equal(tenure.accrueCpbl1Service(s),true);
  assert.equal(s.cpbl1Years,9);
  assert.equal(s.cpblDomestic,true);
  assert.equal(tenure.accrueCpbl1Service(s),false);
  assert.equal(s.cpbl1Years,10);
}

{
  const s=mk({cpbl1Years:9,cpblDomestic:true,lv:'NPB1',org:'NPB'});
  assert.equal(tenure.accrueCpbl1Service(s),false);
  assert.equal(s.cpbl1Years,9);
  assert.equal(s.cpblDomestic,true);
}

state.setS(mk());
assert.equal(state.stageLabel(),'中職一軍／洋將');
state.S.cpblDomestic=true;
assert.equal(state.stageLabel(),'中職一軍');
assert.equal(state.levelName('CPBL1'),'中職一軍');
assert.equal(state.levelName('CPBL2'),'中職二軍');
state.S.lv='CPBL2';
assert.equal(state.stageLabel(),'中職二軍');
state.S.lv='CPBL1';
state.S.cpblDomestic=false;
assert.equal(state.levelName('CPBL2'),'中職二軍／培養型');

const phaseSrc=readFileSync(new URL('../src/flow/phases.js', import.meta.url),'utf8');
assert.ok(phaseSrc.includes('accrueCpbl1Service'));
assert.ok(phaseSrc.includes('視同本土'));
assert.ok(phaseSrc.includes("S.lv==='CPBL1'&&S.cpblDomestic"));

const contractSrc=readFileSync(new URL('../src/engine/contract.js', import.meta.url),'utf8');
assert.ok(contractSrc.includes('export function cpblEntryFlavor'));
assert.ok(contractSrc.includes('回歸中職母隊'));
assert.ok(contractSrc.includes('重返中職'));
assert.ok(contractSrc.includes("returnHomeSign(S.org||'NPB','CPBL','CPBL1')"));
assert.ok(contractSrc.includes("returnHomeSign('NPB','CPBL',spec.lv)"));
assert.ok(contractSrc.includes('接受中職回歸合約'));
assert.ok(contractSrc.includes('接受中職洋將合約'));
const draftSrc=readFileSync(new URL('../src/engine/draft.js', import.meta.url),'utf8');
assert.ok(draftSrc.includes('cpblEntryFlavor'));
assert.ok(draftSrc.includes('returnHomeSign'));
assert.ok(draftSrc.includes('flavor.amateurT'));

console.log('cpbl_domestic ok');
