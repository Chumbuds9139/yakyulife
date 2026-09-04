import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const retireSrc=readFileSync(new URL('../src/ui/retire.js', import.meta.url),'utf8');
const fanSrc=readFileSync(new URL('../src/data/economy.js', import.meta.url),'utf8');
assert.equal(fanSrc.includes('台灣棒球'),false);
assert.equal(retireSrc.includes('機車行'),false);
assert.equal(retireSrc.includes('蛋餅'),false);
assert.equal(retireSrc.includes('嗨賴'),false);
assert.ok(retireSrc.includes('都市對抗')||retireSrc.includes('居酒屋'));
assert.ok(retireSrc.includes('解説'));
assert.ok(fanSrc.includes('日本野球'));

const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args:['--disable-gpu'],
});

try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}?seed=retirement-ending`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.26');
    const retire=await import('./src/ui/retire.js?v=1.5.26');
    const pitcher=retire.nextBaseEnding('P');
    const hitter=retire.nextBaseEnding('SS');
    const pitcherCoach=retire.jerseyWeightEnding('P');
    const hitterCoach=retire.jerseyWeightEnding('CF');
    const tiers={CPBL:{i:0,sc:9000}};
    const currentFamily=state.newState('親子測試',0,'P',null);
    currentFamily.love.kids=1;
    state.setS(currentFamily);
    const withCurrentChild=retire.postCareerEndingKeys(tiers);
    const selected=retire.postCareerEnding(tiers,.999);
    const formerFamily=state.newState('前段婚姻測試',0,'IF',null);
    formerFamily.love.exes=[{name:'測試前妻',kids:2}];
    state.setS(formerFamily);
    const withFormerChild=retire.postCareerEndingKeys(tiers);
    const nationalPlayer=state.newState('國家隊測試',0,'P',null);
    nationalPlayer.intlCount=1;
    state.setS(nationalPlayer);
    const withInternational=retire.postCareerEndingKeys(tiers);
    const nationalSelected=retire.postCareerEnding(tiers,.999);

    const log=document.getElementById('log')||document.body;
    const mlb=state.newState('大聯盟退役',1,'IF',null);
    mlb.org='MLB'; mlb.lv='MLB'; mlb.orgTeam='紐約帝國';
    mlb.stats.CPBL={yr:12,G:1,PA:1,AB:1,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,AS:0,DEF:0,DPG:{}};
    mlb.stats.MLB={yr:3,G:1,PA:1,AB:1,H:0,HR:0,RBI:0,SB:0,BB:0,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,AS:0,DEF:0,DPG:{}};
    state.setS(mlb);
    const mlbLeague=retire.retirementCeremonyLeague();
    const beforeMlb=log.innerText;
    retire.retireScene({CPBL:{i:0,sc:9000},MLB:{i:3,sc:400}});
    const mlbText=log.innerText.slice(beforeMlb.length);

    const npb=state.newState('日職退役',2,'IF',null);
    npb.org='NPB'; npb.lv='NPB1'; npb.orgTeam='關西虎';
    state.setS(npb);
    const npbLeague=retire.retirementCeremonyLeague();
    const beforeNpb=log.innerText;
    retire.retireScene({NPB:{i:0,sc:9000}});
    const npbText=log.innerText.slice(beforeNpb.length);

    return {
      pitcher,hitter,pitcherCoach,hitterCoach,
      withCurrentChild,withFormerChild,selected,
      withInternational,nationalSelected,
      withoutConditions:retire.postCareerEndingKeys(tiers,0,0),
      age24:retire.usesSecondCareerEnding(24),
      age25:retire.usesSecondCareerEnding(25),
      mlbLeague,mlbText,npbLeague,npbText,
      nextGame:retire.nextGameEnding('IF').body
    };
  });

  assert.equal(result.pitcher.title,'下一個壘包');
  assert(result.pitcher.body.includes('蹲在投手丘上'));
  assert(!result.pitcher.body.includes('最後一個打席'));
  assert(result.hitter.body.includes('最後一個打席'));
  assert(!result.hitter.body.includes('蹲在投手丘上'));
  assert(result.pitcherCoach.body.includes('被一發全壘打超前'));
  assert(!result.pitcherCoach.body.includes('漏接一顆平飛球'));
  assert(result.hitterCoach.body.includes('漏接一顆平飛球'));
  assert(!result.hitterCoach.body.includes('被一發全壘打超前'));
  assert(result.withCurrentChild.includes('nextBase'));
  assert(result.withFormerChild.includes('nextBase'));
  assert(result.withCurrentChild.includes('coach'));
  assert(result.withCurrentChild.includes('scout'));
  assert.equal(result.withCurrentChild.length,result.withoutConditions.length+1);
  assert.equal(result.withFormerChild.length,result.withoutConditions.length+1);
  assert.equal(result.selected.title,'下一個壘包');
  assert(result.withInternational.includes('jerseyWeight'));
  assert(!result.withInternational.includes('nextBase'));
  assert.equal(result.withInternational.length,result.withoutConditions.length+1);
  assert.equal(result.nationalSelected.title,'球衣的重量');
  assert(!result.withoutConditions.includes('nextBase'));
  assert(!result.withoutConditions.includes('jerseyWeight'));
  assert.equal(result.age24,true);
  assert.equal(result.age25,false);
  assert.equal(result.mlbLeague,'MLB');
  assert.equal(result.mlbText.includes('臺北大巨蛋'),false,result.mlbText);
  assert.equal(result.mlbText.includes('中職史上'),false,result.mlbText);
  assert.equal(result.npbLeague,'NPB');
  assert.ok(result.npbText.includes('甲子園'),result.npbText);
  assert.equal(result.npbText.includes('臺北大巨蛋'),false,result.npbText);
  assert.equal(result.nextGame.includes('機車行'),false);
  assert.ok(result.nextGame.includes('居酒屋')||result.nextGame.includes('甲子園'),result.nextGame);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify(result,null,2));
}finally{
  await browser.close();
}
