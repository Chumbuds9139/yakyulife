import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {intlInviteCopy, intlEventName} from '../src/data/intl-copy.js';

const wbc=intlInviteCopy(true);
assert.equal(intlEventName(true),'世界棒球經典賽');
assert.equal(wbc.name,'世界棒球經典賽');
assert.equal(wbc.title,'日本代表邀請你參加世界棒球經典賽，你要參加嗎？');
assert.equal(wbc.accept,'披上國家隊戰袍');
assert.equal(wbc.decline,'考量身體狀況婉拒');
assert.equal(wbc.title.includes('徵召'),false);
assert.equal(wbc.accept.includes('徵召'),false);
assert.equal(wbc.decline.includes('徵召'),false);

const p12=intlInviteCopy(false);
assert.equal(p12.name,'世界12強賽');
assert.equal(p12.title,'日本代表邀請你參加世界12強賽，你要參加嗎？');
assert.equal(p12.accept,'披上國家隊戰袍');
assert.equal(p12.decline,'考量身體狀況婉拒');

const copySrc=readFileSync(new URL('../src/data/intl-copy.js', import.meta.url),'utf8');
assert.ok(copySrc.includes('披上國家隊戰袍'));
assert.ok(copySrc.includes('考量身體狀況婉拒'));
assert.equal(/choose\([^)]*徵召/.test(copySrc),false);

const intlSrc=readFileSync(new URL('../src/engine/intl.js', import.meta.url),'utf8');
assert.equal(/choose\([^)]*徵召/.test(intlSrc),false,'maybeIntl must not use 徵召 in choose()');
assert.ok(intlSrc.includes('intlInviteCopy'),'maybeIntl must use intlInviteCopy');
assert.ok(intlSrc.includes('S.intlLock=null'));
assert.ok(intlSrc.includes('copy.accept'));
assert.ok(intlSrc.includes('copy.decline'));

console.log('International invite copy: PASS');
