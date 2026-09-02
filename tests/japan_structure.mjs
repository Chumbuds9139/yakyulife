import assert from 'node:assert/strict';
import {LV, PATHS, NPB_TEAMS, INDEP_TEAMS, CORPORATE_TEAMS, CPBL_TEAMS} from '../src/data/teams.js';
import {newState, setS, stageLabel, S} from '../src/core/state.js';

assert.deepEqual(PATHS.NPB, ['NPB_TRAIN','NPB2','NPB1','MLB']);
assert.deepEqual(PATHS.CORP, ['CORP','NPB2','NPB1']);
assert.deepEqual(PATHS.INDEP, ['INDEP','NPB2','NPB1']);
assert.equal(PATHS.NPB.includes('CPBL1'), false);
assert.equal(PATHS.NPB.includes('CPBL2'), false);
assert.equal(LV.NPB_TRAIN.org, 'NPB');
assert.equal(LV.NPB2.org, 'NPB');
assert.equal(LV.NPB1.org, 'NPB');
assert.equal(LV.CPBL2.org, 'CPBL');
assert.equal(LV.CPBL1.org, 'CPBL');
assert.ok(NPB_TEAMS.length >= 12);
assert.ok(INDEP_TEAMS.length >= 3);
assert.ok(CORPORATE_TEAMS.length >= 3);
assert.ok(CPBL_TEAMS.length >= 6);

setS(newState('test', 1, 'B', null));
assert.equal(stageLabel(), '高一');
S.stage = 'PRO';
S.lv = 'NPB_TRAIN';
assert.equal(stageLabel(), 'NPB育成');
S.lv = 'NPB2';
assert.equal(stageLabel(), 'NPB二軍');
S.lv = 'NPB1';
assert.equal(stageLabel(), 'NPB一軍');
S.lv = 'CPBL2';
assert.equal(stageLabel(), '中職二軍／培養型');
S.lv = 'CPBL1';
assert.equal(stageLabel(), '中職一軍／洋將');

console.log('Japan structure smoke test: PASS');
