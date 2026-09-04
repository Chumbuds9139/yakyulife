import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const contractSrc=readFileSync(new URL('../src/engine/contract.js', import.meta.url),'utf8');
assert.ok(contractSrc.includes('export function cpblImportSpec'));
assert.ok(contractSrc.includes("S.lv==='NPB2'"));
assert.ok(contractSrc.includes('中華職棒遞來洋將合約'));

const draftSrc=readFileSync(new URL('../src/engine/draft.js', import.meta.url),'utf8');
assert.ok(draftSrc.includes('rollCpblImport'));
assert.ok(draftSrc.includes('接受中職洋將合約'));
assert.ok(draftSrc.includes('提出合約買斷'));
assert.equal(draftSrc.includes('業餘隊名'),false);
assert.equal(draftSrc.includes('不會帶走'),false);
assert.equal(contractSrc.includes('業餘隊名'),false);
assert.equal(contractSrc.includes('不會帶走'),false);
assert.ok(contractSrc.includes('提出合約買斷'));
assert.equal(contractSrc.includes('日職球團開出旅外合約'),false);
assert.ok(contractSrc.includes('日職球團開出合約'));
assert.ok(contractSrc.includes('把天賦帶回家鄉'));
assert.equal(contractSrc.includes('亞洲職棒的最高殿堂'),false);

const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--disable-gpu']});
try{
  const page=await browser.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}?seed=cpbl-import`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.20');
    const teams=await import('./src/data/teams.js?v=1.5.20');
    const phases=await import('./src/flow/phases.js?v=1.5.20');
    const contract=await import('./src/engine/contract.js?v=1.5.20');
    const timeline=await import('./src/ui/timeline.js?v=1.5.20');

    const low=contract.cpblImportSpec(40,'CORP');
    const corpMid=contract.cpblImportSpec(50,'CORP');
    const indep=contract.cpblImportSpec(50,'INDEP');
    const npb2=contract.cpblImportSpec(56,'NPB2');
    const npb2Low=contract.cpblImportSpec(44,'NPB2');

    const amateur=state.newState('中職洋將測試',17,'C',null);
    amateur.stage='PRO'; amateur.stageYr=1; amateur.age=23; amateur.year=2033;
    amateur.org='CORP'; amateur.lv='CORP'; amateur.orgTeam='豐田戰鷹'; amateur.team='豐田戰鷹';
    amateur.teamName=function(){ return teams.teamDisplayName(this); };
    Object.keys(amateur.ab).forEach(k=>amateur.ab[k]=80);
    state.setS(amateur);
    amateur.ct=contract.makeContract(1,1,'CORP',0,48,null,'業餘球團合約');
    timeline.resetTL();
    phases.movement();
    const amateurButtons=[...document.querySelectorAll('#act button')].map(b=>b.textContent);
    const amateurTitle=(document.querySelector('#act .title')||{}).textContent||'';

    const farm=state.newState('二軍洋將測試',21,'C',null);
    farm.stage='PRO'; farm.stageYr=3; farm.age=24; farm.year=2034;
    farm.org='NPB'; farm.lv='NPB2'; farm.orgTeam='東京巨人'; farm.team='東京巨人';
    farm.lastD=2; farm.seasonFactor=1; farm.marketInjury='healthy';
    farm.teamName=function(){ return teams.teamDisplayName(this); };
    Object.keys(farm.ab).forEach(k=>farm.ab[k]=80);
    state.setS(farm);
    farm.ct=contract.makeContract(2,1,'NPB2',2,240,null,'測試約');
    timeline.resetTL();
    contract.crossOffers(80);
    const farmButtons=[...document.querySelectorAll('#act button')].map(b=>b.textContent);
    const farmTitle=(document.querySelector('#act .title')||{}).textContent||'';
    return {
      low,corpMid,indep,npb2,npb2Low,
      amateurButtons,amateurTitle,farmButtons,farmTitle,
      cpblTeams:teams.CPBL_TEAMS
    };
  });
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(result.low,null);
  assert.equal(result.corpMid.lv,'CPBL2');
  assert.equal(result.indep.lv,'CPBL2');
  assert.equal(result.npb2.lv,'CPBL1');
  assert.equal(result.npb2Low,null);
  const amateur=result.amateurButtons.join('｜');
  assert.ok(amateur.includes('中職洋將'),JSON.stringify(result));
  assert.ok(amateur.includes('再磨一年')||amateur.includes('再拚一年'),JSON.stringify(result));
  const farm=result.farmButtons.join('｜');
  assert.ok(result.farmTitle.includes('中華職棒')||farm.includes('留在日職二軍'),JSON.stringify(result));
  assert.ok(result.cpblTeams.some(t=>farm.includes(t))||farm.includes('留在日職二軍'),JSON.stringify(result));
  console.log(JSON.stringify({amateur:result.amateurButtons,farm:result.farmButtons,farmTitle:result.farmTitle,spec:{corpMid:result.corpMid,npb2:result.npb2}},null,2));
}finally{ await browser.close(); }
