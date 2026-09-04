import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--disable-gpu']});
try{
  const page=await browser.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}?seed=amateur-npb-entry`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.23');
    const teams=await import('./src/data/teams.js?v=1.5.23');
    const phases=await import('./src/flow/phases.js?v=1.5.23');
    const contract=await import('./src/engine/contract.js?v=1.5.23');
    const timeline=await import('./src/ui/timeline.js?v=1.5.23');
    const s=state.newState('社會人測試',17,'C',null);
    s.stage='PRO'; s.stageYr=1; s.age=22; s.year=2032;
    s.org='CORP'; s.lv='CORP'; s.orgTeam='豐田戰鷹'; s.team='豐田戰鷹';
    s.teamName=function(){ return teams.teamDisplayName(this); };
    state.setS(s);
    s.ct=contract.makeContract(1,1,'CORP',0,48,null,'業餘球團合約');
    timeline.resetTL();
    phases.movement();
    const buttons=[...document.querySelectorAll('#act button')].map(b=>b.textContent);
    const title=(document.querySelector('#act .title')||{}).textContent||'';
    const display=s.teamName();
    const stageLine=timeline.tlStage();

    const beforeTeam=s.orgTeam;
    contract.signTo('NPB','NPB2','豐田戰鷹',1,1,undefined,true);
    const afterTeam=s.orgTeam;
    return {
      buttons,title,display,stageLine,beforeTeam,afterTeam,
      org:s.org,lv:s.lv,
      npbHasAmateur:teams.NPB_TEAMS.includes('豐田戰鷹'),
      afterIsNpb:teams.NPB_TEAMS.includes(afterTeam),
      afterIsAmateur:teams.isAmateurClub(afterTeam)
    };
  });
  assert.equal(errors.length,0,errors.join('\n'));
  const joined=result.buttons.join('｜');
  assert.ok(joined.includes('投入日本職棒選秀'),JSON.stringify(result));
  assert.ok(joined.includes('再磨一年')||joined.includes('再拚一年'),JSON.stringify(result));
  assert.equal(joined.includes('晉升'),false,joined);
  assert.equal(joined.includes('日職二軍（支配下）'),false,joined);
  assert.equal(result.display,'豐田戰鷹');
  assert.equal(result.display.includes('二軍'),false);
  assert.ok(result.stageLine.startsWith('社會人 · '),result.stageLine);
  assert.equal(result.stageLine.includes('職業'),false);
  assert.equal(result.npbHasAmateur,false);
  assert.equal(result.afterIsAmateur,false);
  assert.equal(result.afterIsNpb,true);
  assert.notEqual(result.afterTeam,'豐田戰鷹');
  assert.equal(result.org,'NPB');
  assert.equal(result.lv,'NPB2');
  console.log(JSON.stringify(result,null,2));
}finally{ await browser.close(); }
