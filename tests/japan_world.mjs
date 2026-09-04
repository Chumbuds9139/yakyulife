import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--disable-gpu']});
try{
  const page=await browser.newPage();
  page.on('dialog',d=>d.accept());
  await page.goto(`${url}?seed=japan-world`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.21');
    const traits=await import('./src/data/traits.js?v=1.5.21');
    const economy=await import('./src/data/economy.js?v=1.5.21');
    const intl=await import('./src/engine/intl.js?v=1.5.21');
    const events=await import('./src/flow/events.js?v=1.5.21');
    const championship=await import('./src/engine/championship.js?v=1.5.21');
    const s=state.newState('侍魂測試',18,'P',null);
    s.traits.taiwan=true; state.setS(s);
    const migrated=!!s.traits.samurai&&!('taiwan' in s.traits);
    for(const v of ['P','C','IF','OF','OF','IF','C','P'])document.querySelector(`#seg-pos button[data-v="${v}"]`).click();
    document.querySelector('#btn-start').click();
    await new Promise(r=>setTimeout(r,50));
    const now=(await import('./src/core/state.js?v=1.5.21')).S;
    const odds=events.evOdds();
    return {
      migrated,samuraiLabel:traits.TRAIT_N.samurai,devSalary:economy.LEVEL_MIN_ANNUAL.NPB_TRAIN,
      wbc2009:intl.japanIntlStrength(2009,true),wbc2017:intl.japanIntlStrength(2017,true),wbc2026:intl.japanIntlStrength(2026,true),
      invincible:!!now.invincible,perfectAlias:!!now.perfectLock,tj:now.tj,tradeHeat:now.tradeHeat,
      all80:Object.values(now.ab).every(v=>v===80),allPot80:Object.values(now.pot).every(v=>v===80),
      eventOdds:[odds.safe,odds.norm,odds.bold],champChance:championship.championshipChance(10,false),intlFinish:championship.intlFinishIndex(0,0,false)
    };
  });
  assert.equal(result.migrated,true); assert.equal(result.samuraiLabel,'武士精神'); assert.equal(result.devSalary,240);
  assert.equal(result.wbc2009,10); assert.equal(result.wbc2017,7); assert.equal(result.wbc2026,8);
  assert.equal(result.invincible,true); assert.equal(result.perfectAlias,true); assert.equal(result.tj,0); assert.equal(result.tradeHeat,-100);
  assert.equal(result.all80,true); assert.equal(result.allPot80,true); assert.deepEqual(result.eventOdds,[100,100,100]); assert.equal(result.champChance,100); assert.equal(result.intlFinish,0);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
