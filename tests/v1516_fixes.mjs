import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const draftSrc=readFileSync(new URL('../src/engine/draft.js', import.meta.url),'utf8');
assert.ok(draftSrc.includes('加入社會人棒球'));
assert.ok(draftSrc.includes('不消耗日職選秀資格'));
assert.ok(draftSrc.includes('draftAssignLevel'));
assert.ok(draftSrc.includes('fromAmateur) startYear()'));
assert.ok(draftSrc.includes('繼續磨練'));

const eventsSrc=readFileSync(new URL('../src/flow/events.js', import.meta.url),'utf8');
assert.ok(eventsSrc.includes("s.org==='CORP'||s.org==='INDEP'"));

const japanSrc=readFileSync(new URL('../src/japan.js', import.meta.url),'utf8');
assert.equal(japanSrc.includes('recoverEmptyCpblAction'),false);
assert.equal(japanSrc.includes('美国'),false);

const retireSrc=readFileSync(new URL('../src/ui/retire.js', import.meta.url),'utf8');
assert.equal(retireSrc.includes('全台灣都沒睡'),false);
assert.ok(retireSrc.includes('encodeURIComponent(SEED)')||retireSrc.includes('q.set(\'seed\''));
assert.equal(retireSrc.includes('用日語問你'),false);

const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--disable-gpu']});
try{
  const page=await browser.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}?seed=v1516-start&pos=C`,{waitUntil:'domcontentloaded'});
  const startResult=await page.evaluate(async()=>{
    const btn=document.getElementById('btn-start');
    const posOn=document.querySelector('#seg-pos button.on')?.dataset.v;
    btn.click(); btn.click(); btn.click(); btn.click();
    await new Promise(r=>setTimeout(r,50));
    const text=(document.getElementById('log')||document.body).innerText;
    return {posOn, bornCount:text.split('球員誕生').length-1, trainCount:text.split('季初特訓').length-1};
  });
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(startResult.posOn,'C');
  assert.equal(startResult.bornCount,1,JSON.stringify(startResult));
  assert.ok(startResult.trainCount<=1,JSON.stringify(startResult));

  const page2=await browser.newPage();
  page2.on('pageerror',error=>errors.push(error.message));
  await page2.goto(`${url}?seed=v1516-hs`,{waitUntil:'domcontentloaded'});
  const result=await page2.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.21');
    const teams=await import('./src/data/teams.js?v=1.5.21');
    const events=await import('./src/flow/events.js?v=1.5.21');
    const data=await import('./src/data/events.js?v=1.5.21');
    const contract=await import('./src/engine/contract.js?v=1.5.21');
    const draft=await import('./src/engine/draft.js?v=1.5.21');
    const abilities=await import('./src/data/abilities.js?v=1.5.21');
    const s=state.newState('高校出路',8,'C',null);
    s.stage='HS'; s.stageYr=3; s.age=18; s.year=2028;
    Object.keys(s.ab).forEach(k=>s.ab[k]=40);
    state.setS(s);
    draft.pathChoiceHS();
    const hsButtons=[...document.querySelectorAll('#act button')].map(b=>b.textContent);

    const corp=state.newState('社會人事件',9,'C',null);
    corp.stage='PRO'; corp.org='CORP'; corp.lv='CORP'; corp.orgTeam='豐田戰鷹';
    const ama=events.isAmateurEventStage(corp);
    const ev=data.EVENTS.find(e=>e.n==='白天上班晚上練球');
    const eligible=ev?events.eventEligible(ev,corp):false;

    return {
      hsButtons,ama,eligible,
      trainName:teams.teamDisplayName({org:'NPB',lv:'NPB_TRAIN',orgTeam:'東京巨人'}),
      farmName:teams.teamDisplayName({org:'NPB',lv:'NPB2',orgTeam:'東京巨人'}),
      corpName:teams.teamDisplayName({org:'CORP',lv:'CORP',orgTeam:'豐田戰鷹'}),
      conLabel:abilities.ABL.con,
      corpList:contract.teamListOf('CORP'),
      indepList:contract.teamListOf('INDEP'),
      mlbHasCorp:contract.teamListOf('MiLB').includes('豐田戰鷹')
    };
  });
  assert.equal(errors.length,0,errors.join('\n'));
  const hs=result.hsButtons.join('｜');
  assert.ok(hs.includes('加入社會人棒球'),hs);
  assert.ok(hs.includes('加入獨立聯盟'),hs);
  assert.ok(hs.includes('投入日本職棒選秀'),hs);
  assert.equal(result.ama,true);
  assert.equal(result.eligible,true);
  assert.equal(result.trainName,'東京巨人育成');
  assert.equal(result.farmName,'東京巨人二軍');
  assert.equal(result.corpName,'豐田戰鷹');
  assert.equal(result.conLabel,'擊球');
  assert.ok(result.corpList.includes('豐田戰鷹'));
  assert.ok(result.indepList.includes('群馬星雲'));
  assert.equal(result.mlbHasCorp,false);
  console.log(JSON.stringify({startResult,hs:result.hsButtons,trainName:result.trainName},null,2));
}finally{ await browser.close(); }
