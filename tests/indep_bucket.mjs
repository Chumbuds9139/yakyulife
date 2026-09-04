import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url=process.env.YAKYOLIFE_URL||'http://127.0.0.1:8124/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--disable-gpu']});
try{
  const page=await browser.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${url}?seed=indep-bucket&pos=OF`,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const state=await import('./src/core/state.js?v=1.5.27');
    const season=await import('./src/engine/season.js?v=1.5.27');
    const career=await import('./src/engine/career.js?v=1.5.27');
    const retire=await import('./src/ui/retire.js?v=1.5.27');
    const teams=await import('./src/data/teams.js?v=1.5.27');
    const share=await import('./src/ui/share-image.js?v=1.5.27');

    const blank=()=>({G:80,PA:300,AB:270,H:80,HR:8,RBI:40,SB:10,BB:20,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,DEF:2});

    const indep=state.newState('獨立分桶',12,'OF',null);
    indep.stage='PRO'; indep.org='INDEP'; indep.lv='INDEP'; indep.orgTeam='群馬星雲';
    indep.dpos='CF';
    state.setS(indep);
    season.accStat(state.bucketOf(indep.lv),blank());
    const indepCum=retire.rpCumData();
    const indepTable=career.statTable('INDEP');

    const corp=state.newState('社會人分桶',13,'OF',null);
    corp.stage='PRO'; corp.org='CORP'; corp.lv='CORP'; corp.orgTeam='豐田戰鷹';
    corp.dpos='CF';
    state.setS(corp);
    season.accStat(state.bucketOf(corp.lv),blank());
    const corpCum=retire.rpCumData();

    const milb=state.newState('小聯盟分桶',14,'OF',null);
    milb.stage='PRO'; milb.org='MiLB'; milb.lv='A1'; milb.orgTeam='聖港修士';
    milb.dpos='CF';
    state.setS(milb);
    season.accStat(state.bucketOf(milb.lv),blank());

    const mixed=state.newState('混合分桶',15,'OF',null);
    mixed.stage='PRO'; mixed.org='INDEP'; mixed.lv='INDEP'; mixed.orgTeam='栃木勇者';
    mixed.dpos='CF';
    mixed.stats.INDEP={yr:3,G:240,PA:900,AB:810,H:240,HR:24,RBI:120,SB:30,BB:60,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,AS:0,DEF:6,DPG:{}};
    mixed.stats.CPBL={yr:2,G:200,PA:700,AB:630,H:180,HR:20,RBI:90,SB:12,BB:50,W:0,L:0,SV:0,HLD:0,IP:0,SO:0,ER:0,AS:1,DEF:4,DPG:{}};
    state.setS(mixed);
    const mixedCum=retire.rpCumData();
    const drawn=[];
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(value,...args){ drawn.push(String(value)); return original.call(this,value,...args); };
    try{ share.renderShareImage([],[],{mode:'stats',fans:false}); }
    finally{ CanvasRenderingContext2D.prototype.fillText=original; }

    return {
      indepBucket:state.bucketOf('INDEP'),
      corpBucket:state.bucketOf('CORP'),
      milbBucket:state.bucketOf('A1'),
      npb2Bucket:state.bucketOf('NPB2'),
      indepHasMinor:!!indep.stats.MINOR,
      indepYears:indep.stats.INDEP&&indep.stats.INDEP.yr,
      corpHasMinor:!!corp.stats.MINOR,
      corpYears:corp.stats.CORP&&corp.stats.CORP.yr,
      milbMinorYears:milb.stats.MINOR&&milb.stats.MINOR.yr,
      indepLabels:indepCum.rows.map(r=>teams.LG_N[r.b]),
      corpLabels:corpCum.rows.map(r=>teams.LG_N[r.b]),
      mixedLabels:mixedCum.rows.map(r=>teams.LG_N[r.b]),
      indepTable,drawn,
      evalBuckets:state.CAREER_EVAL_BUCKETS
    };
  });
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(result.indepBucket,'INDEP');
  assert.equal(result.corpBucket,'CORP');
  assert.equal(result.milbBucket,'MINOR');
  assert.equal(result.npb2Bucket,'NPB');
  assert.equal(result.indepHasMinor,false);
  assert.equal(result.indepYears,1);
  assert.equal(result.corpHasMinor,false);
  assert.equal(result.corpYears,1);
  assert.equal(result.milbMinorYears,1);
  assert.deepEqual(result.indepLabels,['獨立聯盟']);
  assert.deepEqual(result.corpLabels,['社會人']);
  assert.deepEqual(result.mixedLabels,['中職','獨立聯盟']);
  assert.ok(result.indepTable.includes('獨立聯盟'));
  assert.ok(!result.indepTable.includes('小聯盟'));
  assert.ok(result.drawn.includes('獨立聯盟'));
  assert.ok(!result.drawn.includes('小聯盟'));
  assert.deepEqual(result.evalBuckets,['MLB','NPB','CPBL']);
  console.log(JSON.stringify({indep:result.indepLabels,corp:result.corpLabels,mixed:result.mixedLabels},null,2));
}finally{ await browser.close(); }
