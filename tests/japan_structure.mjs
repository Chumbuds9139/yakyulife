import assert from 'node:assert/strict';
import {LV, PATHS, NPB_TEAMS, INDEP_TEAMS, CORPORATE_TEAMS, CPBL_TEAMS} from '../src/data/teams.js';
import {newState, setS, stageLabel, S, bucketOf} from '../src/core/state.js';

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
assert.equal(S.org, 'NPB');
assert.equal(stageLabel(), 'NPB育成');
S.lv = 'NPB2';
assert.equal(S.org, 'NPB');
assert.equal(stageLabel(), 'NPB二軍');
S.lv = 'NPB1';
assert.equal(S.org, 'NPB');
assert.equal(stageLabel(), 'NPB一軍');
S.lv = 'CPBL2';
assert.equal(S.org, 'CPBL');
assert.equal(stageLabel(), '中職二軍／培養型');
S.lv = 'CPBL1';
assert.equal(S.org, 'CPBL');
assert.equal(stageLabel(), '中職一軍／洋將');

assert.equal(bucketOf('NPB_TRAIN'), 'NPB');
assert.equal(bucketOf('NPB2'), 'NPB');
assert.equal(bucketOf('NPB1'), 'NPB');
assert.equal(bucketOf('CPBL2'), 'CPBL');
assert.equal(bucketOf('CPBL1'), 'CPBL');
assert.equal(bucketOf('MLB'), 'MLB');

S.lv = 'CORP';
assert.equal(S.org, 'CORP');
S.lv = 'NPB2';
assert.equal(S.org, 'NPB');
S.lv = 'INDEP';
assert.equal(S.org, 'INDEP');
S.lv = 'NPB1';
assert.equal(S.org, 'NPB');

console.log('Japan structure smoke test: PASS');
