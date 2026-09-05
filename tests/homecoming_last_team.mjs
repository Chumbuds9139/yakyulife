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
  await page.goto(`${url}?seed=homecoming-last-team`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.29');
    const contract=await import('./src/engine/contract.js?v=1.5.29');

    const teamName=function(){
      if(!this.orgTeam)return '';
      if(this.lv==='MLB'||this.lv==='CPBL1'||this.lv==='NPB1')return this.orgTeam;
      return this.orgTeam+'二軍';
    };

    /* 巨人待得最久、也是較早的隊；出國當下效力九州鷹，母隊必須是鷹。 */
    const tracked=state.newState('母隊測試',7,'IF',null);
    tracked.stage='PRO'; tracked.org='NPB'; tracked.lv='NPB1'; tracked.orgTeam='九州鷹';
    tracked.teamName=teamName; tracked.lastLeagueTeam.NPB='東京巨人';
    tracked.teamTally.NPB={'東京巨人':10,'九州鷹':2};
    Object.keys(tracked.ab).forEach(k=>tracked.ab[k]=60);
    state.setS(tracked);
    contract.signTo('MiLB','MLB','紐約帝國',2,1,3000,true);
    const npbAfterDeparture=contract.homeTeamOf('NPB');
    contract.signTo('CPBL','CPBL1','台中猛獁',2,1,800,true);
    const mlbAfterDeparture=contract.homeTeamOf('MLB');

    /* 更新前已在海外的狀態沒有 lastLeagueTeam，改由逐年紀錄倒序找最後一隊。 */
    const legacy=state.newState('舊資料測試',8,'IF',null);
    legacy.stage='PRO'; legacy.org='MiLB'; legacy.lv='MLB'; legacy.orgTeam='紐約帝國'; legacy.teamName=teamName;
    delete legacy.lastLeagueTeam;
    legacy.teamTally.NPB={'東京巨人':8,'九州鷹':1};
    legacy.log=[
      {y:2029,lv:'NPB1',tm:'東京巨人'},
      {y:2030,lv:'NPB1',tm:'九州鷹'},
      {y:2031,lv:'MLB',tm:'紐約帝國'},
    ];
    state.setS(legacy);
    const legacyNpb=contract.homeTeamOf('NPB');

    return {npbAfterDeparture,mlbAfterDeparture,legacyNpb};
  });

  assert.equal(result.npbAfterDeparture,'九州鷹');
  assert.equal(result.mlbAfterDeparture,'紐約帝國');
  assert.equal(result.legacyNpb,'九州鷹');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify(result,null,2));
}finally{
  await browser.close();
}
