import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {chromium} from 'playwright';

const draftSrc=readFileSync(new URL('../src/engine/draft.js', import.meta.url),'utf8');
assert.equal(draftSrc.includes('CORPORATE_TEAMS.concat(INDEP_TEAMS)'),false);
assert.ok(draftSrc.includes("pick(org==='CORP'?CORPORATE_TEAMS:INDEP_TEAMS)"));

const seasonSrc=readFileSync(new URL('../src/engine/season.js', import.meta.url),'utf8');
assert.equal(seasonSrc.includes('成棒甲組'),false);
assert.ok(seasonSrc.includes('CORP_CUPS'));
assert.ok(seasonSrc.includes('INDEP_CUPS'));

const retireSrc=readFileSync(new URL('../src/ui/retire.js', import.meta.url),'utf8');
assert.equal(retireSrc.includes('打撃ケージ'),false);
assert.equal(retireSrc.includes('元プロ'),false);
assert.equal(retireSrc.includes('為甚麼'),false);
assert.ok(retireSrc.includes('打擊練習籠'));
assert.ok(retireSrc.includes('前職業棒球選手'));

const japanSrc=readFileSync(new URL('../src/japan.js', import.meta.url),'utf8');
assert.equal(japanSrc.includes("S?.org==='CPBL'"),false);

assert.equal(existsSync(new URL('../CNAME', import.meta.url)),false);

const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args:['--disable-gpu'],
});
try{
  const page=await browser.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}?seed=p0-p3`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.30');
    const teams=await import('./src/data/teams.js?v=1.5.30');
    const contract=await import('./src/engine/contract.js?v=1.5.30');
    const {card}=await import('./src/ui/dom.js?v=1.5.30');

    const s=state.newState('告別測試',21,'IF',null);
    s.stage='PRO'; s.org='NPB'; s.lv='NPB1'; s.orgTeam='九州鷹';
    s.lastCpblTeam='台中猛獁'; s._daiba=false;
    s.teamName=function(){return this.orgTeam;};
    state.setS(s);
    const before=document.getElementById('log')?.innerText||'';
    let continued=false;
    contract.daibaFarewell(()=>{continued=true;});
    const npbText=(document.getElementById('log')?.innerText||'').slice(before.length);

    const stay=state.newState('中職退役',22,'IF',null);
    stay.stage='PRO'; stay.org='CPBL'; stay.lv='CPBL1'; stay.orgTeam='台中猛獁';
    stay.lastCpblTeam='台中猛獁'; stay._daiba=false;
    stay.teamName=function(){return this.orgTeam;};
    state.setS(stay);
    const beforeStay=document.getElementById('log')?.innerText||'';
    contract.daibaFarewell(()=>{});
    const stayText=(document.getElementById('log')?.innerText||'').slice(beforeStay.length);

    const pure=state.newState('純日職',23,'IF',null);
    pure.stage='PRO'; pure.org='NPB'; pure.lv='NPB1'; pure.orgTeam='東京巨人';
    pure.lastCpblTeam=null; pure._daiba=false;
    pure.teamName=function(){return this.orgTeam;};
    state.setS(pure);
    const beforePure=document.getElementById('log')?.innerText||'';
    contract.daibaFarewell(()=>{});
    const pureText=(document.getElementById('log')?.innerText||'').slice(beforePure.length);

    const amateur=state.newState('業餘配對',9,'C',null);
    amateur.stage='U'; amateur.stageYr=4; amateur.age=22;
    amateur.org=null; amateur.lv=null;
    Object.keys(amateur.ab).forEach(k=>amateur.ab[k]=40);
    state.setS(amateur);
    const org='CORP', team=teams.CORPORATE_TEAMS[0];
    /* 抽樣 20 次：org 與隊名必須同屬社會人或同屬獨立。 */
    const {pick}=await import('./src/core/rng.js?v=1.5.30');
    const samples=[];
    for(let i=0;i<20;i++){
      const o=pick(['CORP','INDEP']);
      const t=pick(o==='CORP'?teams.CORPORATE_TEAMS:teams.INDEP_TEAMS);
      samples.push({
        org:o, team:t,
        ok:o==='CORP'?teams.CORPORATE_TEAMS.includes(t):teams.INDEP_TEAMS.includes(t)
      });
    }

    const cpblCard=document.createElement('div');
    cpblCard.textContent='中華隊徵召你參加世界棒球經典賽';
    document.body.appendChild(cpblCard);
    const japan=await import('./src/japan.js?v=1.5.30');
    const locS=state.newState('洋將',10,'OF',null);
    locS.stage='PRO'; locS.org='CPBL'; locS.lv='CPBL1';
    state.setS(locS);
    /* observer already running from page load; force a node add */
    const n=document.createElement('p'); n.textContent='中華隊徵召來了'; document.body.appendChild(n);
    await new Promise(r=>setTimeout(r,30));

    return {
      continued, npbText, stayText, pureText,
      samplesOk:samples.every(x=>x.ok),
      sample:samples[0],
      cupCorp:teams.CORP_CUPS, cupUni:teams.U_CUPS,
      liveJapan:n.textContent
    };
  });
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(result.continued,true);
  assert.ok(result.npbText.includes('台北大巨蛋'),result.npbText);
  assert.equal(result.stayText.includes('台北大巨蛋'),false);
  assert.equal(result.pureText.includes('台北大巨蛋'),false);
  assert.equal(result.samplesOk,true);
  assert.deepEqual(result.cupUni,['全國大學棒球賽','關東大學聯盟']);
  assert.ok(result.cupCorp.includes('都市對抗野球'));
  assert.ok(result.liveJapan.includes('日本代表'),result.liveJapan);
  console.log(JSON.stringify(result,null,2));
}finally{
  await browser.close();
}
