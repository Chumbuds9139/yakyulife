import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args:['--disable-gpu'],
});

try{
  const page=await browser.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}?seed=level-sync`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.30');
    const timeline=await import('./src/ui/timeline.js?v=1.5.30');
    const phases=await import('./src/flow/phases.js?v=1.5.30');
    const contract=await import('./src/engine/contract.js?v=1.5.30');
    const ability=await import('./src/engine/ability.js?v=1.5.30');
    const events=await import('./src/flow/events.js?v=1.5.30');
    const data=await import('./src/data/events.js?v=1.5.30');
    const {board}=await import('./src/ui/dom.js?v=1.5.30');

    const teamName=function(){ return this.orgTeam||''; };

    const s=state.newState('層級同步',11,'OF',null);
    s.stage='PRO'; s.org='CPBL'; s.lv='CPBL2'; s.orgTeam='台中猛獁';
    s.year=2041; s.age=24; s.teamName=teamName;
    s.ct={yrs:3,annual:84,mult:1};
    Object.keys(s.ab).forEach(k=>s.ab[k]=60);
    state.setS(s);
    timeline.resetTL();
    phases.startYear();
    const beforeLab=timeline.TL[timeline.TL.length-1].lab;
    const beforeHead=document.querySelector('.yr-head')?.textContent||'';
    s.lv='CPBL1';
    timeline.tlRestage();
    board(2);
    const afterLab=timeline.TL[timeline.TL.length-1].lab;
    const afterHead=document.querySelector('.yr-head')?.textContent||'';
    const hud=document.getElementById('bd-team')?.innerText||'';

    contract.queueSalaryFloor('CPBL1',84);
    contract.signTo('NPB','NPB1','九州鷹',2,1,320,true);
    const logAfterSign=document.getElementById('log')?.innerText||'';
    contract.flushSalaryFloor();
    const logAfterFlush=document.getElementById('log')?.innerText||'';

    const stay=state.newState('留隊保障',12,'OF',null);
    stay.stage='PRO'; stay.org='CPBL'; stay.lv='CPBL1'; stay.orgTeam='台中猛獁';
    stay.teamName=teamName; stay.ct={yrs:2,annual:84,mult:1};
    state.setS(stay);
    const beforeStay=document.getElementById('log')?.innerText||'';
    contract.queueSalaryFloor('CPBL1',84);
    contract.flushSalaryFloor();
    const stayText=(document.getElementById('log')?.innerText||'').slice(beforeStay.length);

    const train=state.newState('育成',7,'P',null);
    train.stage='PRO'; train.org='NPB'; train.lv='NPB_TRAIN';
    const farm=Object.assign({},train,{lv:'NPB2'});
    const ikusei=data.EVENTS.find(e=>e.n==='育成背號的期限');

    return {
      beforeLab,afterLab,beforeHead,afterHead,hud,
      signedToNpb:stay.lv, /* placeholder overwritten below */
      npbTeam:s.orgTeam, npbLv:s.lv,
      floorAfterCross:logAfterFlush.includes('中職一軍')&&logAfterFlush.slice(logAfterSign.length).includes('升級薪資保障'),
      stayHasFloor:stayText.includes('中職一軍／洋將')&&stayText.includes('升級薪資保障'),
      stayAmount:stayText.includes('100萬'),
      dhToLf:ability.posMoveVerb('DH','LF'),
      dhToLfLabel:ability.posAdjDeltaLabel('DH','LF'),
      cfToLf:ability.posMoveVerb('CF','LF'),
      trainOk:events.eventEligible(ikusei,train),
      farmOk:events.eventEligible(ikusei,farm),
      ikuseiLv:ikusei&&ikusei.lv
    };
  });

  assert.equal(errors.length,0,errors.join('\n'));
  assert.ok(result.beforeLab.includes('二軍')||result.beforeLab.includes('培養型'),result.beforeLab);
  assert.ok(result.afterLab.includes('一軍'),result.afterLab);
  assert.equal(result.afterLab.includes('二軍'),false,result.afterLab);
  assert.ok(result.afterHead.includes('一軍'),result.afterHead);
  assert.ok(result.hud.includes('一軍')||result.hud.includes('洋將'),result.hud);
  assert.equal(result.floorAfterCross,false);
  assert.equal(result.stayHasFloor,true);
  assert.equal(result.stayAmount,true);
  assert.equal(result.dhToLf,'升防');
  assert.ok(result.dhToLfLabel.includes('+7'),result.dhToLfLabel);
  assert.equal(result.cfToLf,'改守');
  assert.equal(result.trainOk,true);
  assert.equal(result.farmOk,false);
  assert.equal(result.ikuseiLv,'NPB_TRAIN');
  console.log(JSON.stringify(result,null,2));
}finally{
  await browser.close();
}
