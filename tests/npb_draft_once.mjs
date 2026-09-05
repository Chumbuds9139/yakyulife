import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const draftSrc=readFileSync(new URL('../src/engine/draft.js', import.meta.url),'utf8');
assert.ok(draftSrc.includes('S.npbDraftEntered=true'));
assert.ok(draftSrc.includes('enteredNpbDraft()'));
assert.ok(draftSrc.includes('生涯僅一次')||draftSrc.includes('一生只有一次'));

const phasesSrc=readFileSync(new URL('../src/flow/phases.js', import.meta.url),'utf8');
assert.ok(phasesSrc.includes('npbDraftEntered'));
assert.equal(phasesSrc.includes('再次參加日本職棒選秀'),false);

const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--disable-gpu']});
try{
  const page=await browser.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}?seed=npb-draft-once`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.29');
    const teams=await import('./src/data/teams.js?v=1.5.29');
    const phases=await import('./src/flow/phases.js?v=1.5.29');
    const contract=await import('./src/engine/contract.js?v=1.5.29');
    const timeline=await import('./src/ui/timeline.js?v=1.5.29');
    const fresh=state.newState('選秀一次',17,'C',null);
    const s=state.newState('選秀一次',17,'C',null);
    s.stage='PRO'; s.stageYr=1; s.age=22; s.year=2032;
    s.org='CORP'; s.lv='CORP'; s.orgTeam='豐田戰鷹'; s.team='豐田戰鷹';
    s.npbDraftEntered=true;
    s.teamName=function(){ return teams.teamDisplayName(this); };
    state.setS(s);
    s.ct=contract.makeContract(1,1,'CORP',0,48,null,'業餘球團合約');
    timeline.resetTL();
    phases.movement();
    const amateurButtons=[...document.querySelectorAll('#act button')].map(b=>b.textContent);
    const amateurTitle=(document.querySelector('#act .title')||{}).textContent||'';

    const u=state.newState('大學已選秀',13,'C',null);
    u.stage='U'; u.stageYr=3; u.age=21; u.year=2031; u.team='早稻田大學';
    u.npbDraftEntered=true;
    Object.keys(u.ab).forEach(k=>u.ab[k]=40);
    state.setS(u); timeline.resetTL(); phases.startYear();
    const collegeButtons=[...document.querySelectorAll('#act button')].map(b=>b.textContent);
    const collegeTitle=(document.querySelector('#act .title')||{}).textContent||'';
    return {
      freshFlag:fresh.npbDraftEntered,
      amateurButtons,amateurTitle,collegeButtons,collegeTitle
    };
  });
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(result.freshFlag,false);
  const amateur=result.amateurButtons.join('｜');
  assert.equal(amateur.includes('投入日本職棒選秀'),false,JSON.stringify(result));
  assert.ok(amateur.includes('再磨一年')||amateur.includes('再拚一年'),JSON.stringify(result));
  const college=result.collegeButtons.join('｜');
  assert.equal(college.includes('投入日本職棒選秀'),false,JSON.stringify(result));
  assert.equal(college.includes('選秀'),false,JSON.stringify(result));
  console.log(JSON.stringify(result,null,2));
}finally{ await browser.close(); }
