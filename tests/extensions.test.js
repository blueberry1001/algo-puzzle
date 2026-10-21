import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWorld,chatSend,tickWorld,socialSend,visible,validateConfig,normalizeHandles} from '../assets/world.js';
import {membershipNumber,prefectures,validBirth} from '../assets/membership.js';
const c=JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
const now=Date.parse('2026-10-18T15:00:00Z');
const rule=(id,mode,keys,from,to,text)=>({id,contact:'haru',matchMode:mode,keywords:keys,fromStep:from,toStep:to,replies:[{text}]});
test('stage-specific fallback repeats without advancing or resetting stage clock',()=>{
 const cfg=structuredClone(c);cfg.rules=[rule('ok','exact',['正解'],0,1,'正解です'),rule('wrong','fallback',[],0,0,'もう一度'),rule('wrong2','fallback',[],1,1,'次の問題です')];
 assert.deepEqual(validateConfig(cfg),[]);let w=chatSend(initialWorld(cfg,now),cfg,'haru','間違い',now);w=tickWorld(w,cfg,now+3000);w=chatSend(w,cfg,'haru','違う答え',now+4000);w=tickWorld(w,cfg,now+7000);
 assert.equal(w.step,0);assert.equal(w.steps[0],now);assert.equal(w.messages.filter(m=>m.text==='もう一度').length,2);assert.equal(new Set(w.scheduled.map(t=>t.id)).size,2);
 w=chatSend(w,cfg,'haru','正解',now+8000);w=tickWorld(w,cfg,now+11000);w=chatSend(w,cfg,'haru','間違い',now+12000);w=tickWorld(w,cfg,now+15000);assert.equal(w.messages.at(-1).text,'次の問題です');
});
test('answer branches select distinct following keywords and replies',()=>{
 const cfg=structuredClone(c);cfg.rules=[rule('red','exact',['赤'],0,10,'赤へ'),rule('blue','exact',['青'],0,20,'青へ'),rule('next-red','exact',['火'],10,30,'赤の結末'),rule('next-blue','exact',['水'],20,30,'青の結末')];assert.deepEqual(validateConfig(cfg),[]);
 for(const [answer,wrong,right,step,end] of [['赤','水','火',10,'赤の結末'],['青','火','水',20,'青の結末']]){let w=chatSend(initialWorld(cfg,now),cfg,'haru',answer,now);w=tickWorld(w,cfg,now+3000);w=chatSend(w,cfg,'haru',wrong,now+4000);assert.equal(w.step,step);w=chatSend(w,cfg,'haru',right,now+5000);w=tickWorld(w,cfg,now+8000);assert.equal(w.messages.at(-1).text,end);}
});
test('negative contains excludes all aliases, exact takes priority, blank stays silent',()=>{
 const cfg=structuredClone(c);cfg.rules=[rule('wrong','notContains',['りんご','林檎'],0,0,'違います'),rule('ok','exact',['りんご'],0,1,'正解')];
 assert.equal(chatSend(initialWorld(cfg,now),cfg,'haru','りんご',now).step,1);
 assert.equal(chatSend(initialWorld(cfg,now),cfg,'haru','林檎です',now).scheduled.length,0);
 assert.equal(chatSend(initialWorld(cfg,now),cfg,'haru','なし',now).scheduled.length,1);
 assert.equal(chatSend(initialWorld(cfg,now),cfg,'haru',' ',now).scheduled.length,0);
});
test('second-based schedule is persisted and obeys reply spacing',()=>{
 const cfg=structuredClone(c);cfg.rules=[{...rule('seconds','any',[],0,0,'了解'),schedule:{type:'delay',seconds:7,text:'予約'}}];assert.deepEqual(validateConfig(cfg),[]);
 let w=chatSend(initialWorld(cfg,now),cfg,'haru','はい',now);w=tickWorld(w,cfg,now+3000);w=JSON.parse(JSON.stringify(w));assert.equal(w.scheduled[1].at,now+10000);assert.equal(tickWorld(w,cfg,now+9999).messages.at(-1).text,'了解');assert.equal(tickWorld(w,cfg,now+10000).messages.at(-1).text,'予約');
});
test('reply rule is scoped to a specific visible post and progress',()=>{
 let w=initialWorld(c,now);w.step=2;w.steps[2]=now;w=socialSend(w,c,'reply','星座','p-welcome',now);assert.equal(w.replies.length,1);w=socialSend(w,c,'reply','星座','p-orange',now+1);assert.equal(w.replies.length,3);assert.equal(w.replies.at(-1).account,'staff');
});
test('time-only posts ignore progress and retain persisted start on reload',()=>{
 const w=initialWorld(c,now),p={id:'timed',minStep:99,publishMode:'time',delayMinutes:0.5};assert.equal(visible(p,w,now+29999),false);assert.equal(visible(p,JSON.parse(JSON.stringify(w)),now+30000),true);assert.equal(visible({...p,publishMode:'progress'},w,now+60000),false);
});
test('IDs are stable alphanumeric and accounts validate collisions and image URLs',()=>{
 const w=initialWorld(c,now);assert.match(w.playerHandle,/^[A-Za-z0-9]{6,16}$/);assert.equal(JSON.parse(JSON.stringify(w)).playerHandle,w.playerHandle);
 const old=structuredClone(c);old.accounts[0].handle='old_name';normalizeHandles(old);assert.deepEqual(validateConfig(old),[]);
 for(const mutate of [x=>x.accounts[0].icon='https://example.com/x.png',x=>x.accounts[0].header='javascript:alert(1)',x=>x.accounts[1].handle=x.accounts[0].handle.toUpperCase(),x=>x.socialRules[2].targetPost='missing']){const bad=structuredClone(c);mutate(bad);assert.ok(validateConfig(bad).length);}
});
test('membership number uses registration JST date and official prefecture codes',()=>{
 assert.equal(prefectures.length,48);assert.equal(prefectures[12].name,'東京都');assert.equal(membershipNumber('13',now),'F26101913');assert.equal(membershipNumber('48',now),'F26101948');assert.equal(membershipNumber('01',now-1),'F26101801');assert.throws(()=>membershipNumber('49',now));assert.ok(validBirth('2000-02-29',now));assert.equal(validBirth('2001-02-29',now),false);assert.equal(validBirth('2027-01-01',now),false);
});
