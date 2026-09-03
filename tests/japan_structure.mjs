import assert from 'node:assert/strict';

globalThis.location={search:''};
const state=await import('../src/core/state.js');
const {LV, PATHS, NPB_TEAMS, INDEP_TEAMS, CORPORATE_TEAMS, CPBL_TEAMS, isAmateurClub, teamDisplayName}=await import('../src/data/teams.js');
const {OFFICIAL_URL}=await import('../src/config.js');

assert.deepEqual(PATHS.NPB, ['NPB_TRAIN','NPB2','NPB1']);
assert.deepEqual(PATHS.CPBL, ['CPBL2','CPBL1']);
assert.deepEqual(PATHS.CORP, ['CORP']);
assert.deepEqual(PATHS.INDEP, ['INDEP']);
assert.equal(PATHS.CORP.some(lv=>String(lv).startsWith('NPB')), false);
assert.equal(PATHS.INDEP.some(lv=>String(lv).startsWith('NPB')), false);
assert.equal(isAmateurClub('豐田戰鷹'), true);
assert.equal(isAmateurClub('群馬星雲'), true);
assert.equal(isAmateurClub('東京巨人'), false);
assert.equal(teamDisplayName({org:'CORP',lv:'CORP',orgTeam:'豐田戰鷹'}), '豐田戰鷹');
assert.equal(teamDisplayName({org:'INDEP',lv:'INDEP',orgTeam:'群馬星雲'}), '群馬星雲');
assert.ok(!teamDisplayName({org:'CORP',lv:'CORP',orgTeam:'豐田戰鷹'}).includes('二軍'));
assert.equal(teamDisplayName({org:'NPB',lv:'NPB2',orgTeam:'東京巨人'}), '東京巨人二軍');
assert.equal(teamDisplayName({org:'NPB',lv:'NPB1',orgTeam:'東京巨人'}), '東京巨人');
assert.equal(PATHS.NPB.includes('MLB'), false);
assert.equal(PATHS.NPB.includes('CPBL1'), false);
assert.equal(PATHS.NPB.includes('CPBL2'), false);
/* 每個層級都必須能在 PATHS[org] 找到自己。漏登時 movement() 會對 undefined.indexOf 拋錯，
   行動面板已被上一顆按鈕清掉，中職洋將季末就卡死。 */
for(const [lv,meta] of Object.entries(LV)){
  assert.ok(PATHS[meta.org], `PATHS missing org ${meta.org} (lv ${lv})`);
  assert.ok(PATHS[meta.org].includes(lv), `${lv} missing from PATHS.${meta.org}`);
}
assert.equal(LV.NPB_TRAIN.org, 'NPB');
assert.equal(LV.NPB2.org, 'NPB');
assert.equal(LV.NPB1.org, 'NPB');
assert.equal(LV.CPBL2.org, 'CPBL');
assert.equal(LV.CPBL1.org, 'CPBL');
assert.ok(NPB_TEAMS.length >= 12);
assert.ok(INDEP_TEAMS.length >= 3);
assert.ok(CORPORATE_TEAMS.length >= 3);
assert.ok(CPBL_TEAMS.length >= 6);
assert.equal(OFFICIAL_URL, 'https://chumbuds9139.github.io/yakyulife/');

state.setS(state.newState('test', 1, 'C', null));
assert.equal(state.stageLabel(), '高一');
assert.deepEqual(Object.keys(state.S.stats).sort(), ['CORP','CPBL','INDEP','MINOR','MLB','NPB']);
assert.deepEqual(Object.keys(state.S.teamTally).sort(), ['CORP','CPBL','INDEP','MLB','NPB']);
state.S.stage = 'PRO';
state.S.lv = 'NPB_TRAIN';
assert.equal(state.S.org, 'NPB');
assert.equal(state.stageLabel(), 'NPB育成');
state.S.lv = 'NPB2';
assert.equal(state.S.org, 'NPB');
assert.equal(state.stageLabel(), 'NPB二軍');
state.S.lv = 'NPB1';
assert.equal(state.S.org, 'NPB');
assert.equal(state.stageLabel(), 'NPB一軍');
state.S.lv = 'CPBL2';
assert.equal(state.S.org, 'CPBL');
assert.equal(state.stageLabel(), '中職二軍／培養型');
state.S.lv = 'CPBL1';
assert.equal(state.S.org, 'CPBL');
assert.equal(state.stageLabel(), '中職一軍／洋將');

assert.equal(state.bucketOf('NPB_TRAIN'), 'NPB');
assert.equal(state.bucketOf('NPB2'), 'NPB');
assert.equal(state.bucketOf('NPB1'), 'NPB');
assert.equal(state.bucketOf('CPBL2'), 'CPBL');
assert.equal(state.bucketOf('CPBL1'), 'CPBL');
assert.equal(state.bucketOf('MLB'), 'MLB');

state.S.lv = 'CORP';
assert.equal(state.S.org, 'CORP');
state.S.lv = 'INDEP';
assert.equal(state.S.org, 'INDEP');
state.S.lv = 'NPB2';
assert.equal(state.S.org, 'NPB');

state.setS({lv:'NPB2',org:'CORP'});
assert.equal(state.S.org, 'NPB');
state.setS({lv:'CPBL2',org:'NPB'});
assert.equal(state.S.org, 'CPBL');

console.log('Japan structure smoke test: PASS');
