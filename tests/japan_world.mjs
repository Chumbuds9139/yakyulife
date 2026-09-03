import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\chrome.exe',args:['--disable-gpu']});
try{
  const page=await browser.newPage();
  page.on('dialog',d=>d.accept());
  await page.goto(`${url}?seed=japan-world`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.11');
    const traits=await import('./src/data/traits.js?v=1.5.11');
    const economy=await import('./src/data/economy.js?v=1.5.11');
    const intl=await import('./src/engine/intl.js?v=1.5.11');
    const s=state.newState('侍魂測試',18,'P',null);
    s.traits.taiwan=true; state.setS(s);
    const migrated=!!s.traits.samurai&&!('taiwan' in s.traits);
    for(const v of ['P','C','IF','OF','OF','IF','C','P'])document.querySelector(`#seg-pos button[data-v="${v}"]`).click();
    document.querySelector('#btn-start').click();
    await new Promise(r=>setTimeout(r,50));
    const now=(await import('./src/core/state.js?v=1.5.11')).S;
    return {migrated,samuraiLabel:traits.TRAIT_N.samurai,devSalary:economy.LEVEL_MIN_ANNUAL.NPB_TRAIN,wbc2009:intl.japanIntlStrength(2009,true),wbc2017:intl.japanIntlStrength(2017,true),wbc2026:intl.japanIntlStrength(2026,true),perfect:!!now.perfectLock,all80:Object.values(now.ab).every(v=>v===80),allPos:traits.TRAIT_KEYS.pos.every(k=>now.traits[k]===true)};
  });
  assert.equal(result.migrated,true); assert.equal(result.samuraiLabel,'武士精神'); assert.equal(result.devSalary,240);
  assert.equal(result.wbc2009,8); assert.equal(result.wbc2017,5); assert.equal(result.wbc2026,7);
  assert.equal(result.perfect,true); assert.equal(result.all80,true); assert.equal(result.allPos,true);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
