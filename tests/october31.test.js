import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWorld,chatSend,shareAccount,tickWorld,chatBusy,matchesRule,normalizeHandles,validateConfig,tomorrowJstHour,replyDelay} from '../assets/world.js';
const base=JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
const now=Date.parse('2026-10-31T01:00:00Z');
test('groups require one word from each and preserve exclusions',()=>{
 const r={matchMode:'groups',keywords:['赤','紅'],keywordsB:['花','華'],excludeKeywords:['青']};
 for(const text of ['赤い花','紅い華','花は紅'])assert.ok(matchesRule(r,text));
 for(const text of ['赤と紅','花と華','赤い花と青'])assert.ok(!matchesRule(r,text));
 const c=structuredClone(base);Object.assign(c.rules[0],r);assert.deepEqual(validateConfig(c),[]);c.rules[0].keywordsB=[];assert.ok(validateConfig(c).length);
});
test('share trigger uses account identity and rejects typed handles and busy shares',()=>{
 const c=structuredClone(base);Object.assign(c.rules[0],{matchMode:'sharedAccount',keywords:[],sharedAccount:'mio',replies:[{text:'確認したよ'}],schedule:null});
 let w=initialWorld(c,now);assert.equal(chatSend(w,c,'haru','@'+c.accounts.find(a=>a.id==='mio').handle,now).step,0);
 assert.equal(shareAccount(w,c,'haru','aoi',now).step,0);
 w=shareAccount(w,c,'haru','mio',now);assert.equal(w.step,1);assert.equal(w.messages.at(-1).sharedAccount,'mio');
 const count=w.messages.length;w=shareAccount(w,c,'haru','aoi',now+1);assert.equal(w.messages.length,count);assert.equal(w.messages.at(-1).sharedAccount,'mio');
 assert.ok(chatBusy(w,now));w=tickWorld(w,c,now+replyDelay('確認したよ'));assert.ok(!chatBusy(w,now+2000));
});
test('tomorrow means next JST date across month/year and waits without locking all day',()=>{
 assert.equal(tomorrowJstHour(now,19),Date.parse('2026-11-01T10:00:00Z'));
 assert.equal(tomorrowJstHour(Date.parse('2026-12-31T14:00:00Z'),0),Date.parse('2026-12-31T15:00:00Z'));
 const c=structuredClone(base);Object.assign(c.rules[0],{replies:[{text:'了解'}],schedule:{type:'tomorrow',hour:19,text:'翌日'}});
 let w=chatSend(initialWorld(c,now),c,'haru','りんご',now);w=tickWorld(w,c,now+1200);assert.ok(!chatBusy(w,now+2000));
 const at=tomorrowJstHour(now,19);assert.equal(w.scheduled.at(-1).at,at);assert.ok(chatBusy(w,at-1200));
 w=tickWorld(JSON.parse(JSON.stringify(w)),c,at);assert.equal(w.messages.at(-1).text,'翌日');assert.ok(!chatBusy(w,at));
});
test('underscore handles persist and quotes/search-only settings validate',()=>{
 const c=structuredClone(base);c.accounts[0].handle='mio_001';c.accounts[0].searchOnly=true;c.posts[1].quotePost=c.posts[0].id;
 assert.deepEqual(validateConfig(c),[]);assert.equal(normalizeHandles(c).accounts[0].handle,'mio_001');
 c.posts[1].quotePost='missing';assert.ok(validateConfig(c).length);c.posts[1].quotePost=c.posts[1].id;assert.ok(validateConfig(c).length);
});
