import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWorld,socialSend,tickWorld,unlockContact,validateWorld,validateConfig,chatSend,matchesRule,visible,itemTime,hashtags,shareAccount} from '../assets/world.js';
const c=JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
const now=Date.parse('2026-10-23T00:00:00Z');
test('DM invitation arrives after ten seconds, survives reload, and unlocks its contact',()=>{
 const cfg=structuredClone(c);cfg.contacts.find(a=>a.id==='mio').unlockStep=10;
 let w=socialSend(initialWorld(cfg,now),cfg,'dm','連絡先','mio',now);
 assert.equal(w.dms.length,1);assert.equal(w.pendingDms.length,1);assert.ok(validateWorld(w));
 assert.ok(!unlockContact(w,cfg,'mio').contacts.includes('mio'));
 w=tickWorld(JSON.parse(JSON.stringify(w)),cfg,now+9999);assert.equal(w.dms.length,1);
 w=tickWorld(w,cfg,now+10000);assert.equal(w.dms.length,2);assert.equal(w.dms[1].invite,'mio');
 assert.ok(unlockContact(w,cfg,'mio').contacts.includes('mio'));
 assert.equal(tickWorld(w,cfg,now+20000).dms.length,2);
 assert.equal(tickWorld(initialWorld(cfg,now),cfg,now+20000).dms.length,0);
});
test('all required words and exclusions combine without matching another step',()=>{
 const cfg=structuredClone(c),r=cfg.rules[0];Object.assign(r,{matchMode:'allContains',keywords:['赤','花'],excludeKeywords:['青']});
 assert.equal(matchesRule(r,'赤い花'),true);assert.equal(matchesRule(r,'赤い空'),false);assert.equal(matchesRule(r,'赤い花と青い花'),false);
 assert.equal(chatSend(initialWorld(cfg,now),cfg,'haru','赤い花',now).step,1);
 const w=initialWorld(cfg,now);w.step=2;assert.equal(chatSend(w,cfg,'haru','赤い花',now).step,2);
 r.matchMode='contains';assert.equal(matchesRule(r,'赤い空'),true);assert.equal(matchesRule(r,'赤と青'),false);
 assert.deepEqual(validateConfig(cfg),[]);
});
test('seconds publication and permanent progress deletion survive branching and reload',()=>{
 const cfg=structuredClone(c),p=cfg.posts[0];Object.assign(p,{minStep:0,ageHours:0,delaySeconds:7,deleteAtStep:2});
 let w=initialWorld(cfg,now);assert.equal(itemTime(p,w),now+7000);assert.equal(visible(p,w,now+6999),false);assert.equal(visible(p,w,now+7000),true);
 w.step=2;w=tickWorld(w,cfg,now+8000);assert.equal(visible(p,w,now+8000),false);
 w=JSON.parse(JSON.stringify(w));w.step=0;assert.equal(visible(p,w,now+9000),false);
 assert.equal(visible(p,initialWorld(cfg,now),now+9000),true);
});
test('NPC reply references and added fields are validated',()=>{
 assert.deepEqual(validateConfig(c),[]);
 for(const mutate of [x=>x.posts.at(-1).replyTo='missing',x=>x.posts[0].replyTo=x.posts[0].id,x=>x.posts[0].delaySeconds=-1,x=>x.posts[0].deleteAtStep=-1,x=>x.rules[0].excludeKeywords=[42],x=>x.socialRules.at(-1).invite='missing']){
  const cfg=structuredClone(c);mutate(cfg);assert.ok(validateConfig(cfg).length);
 }
});
test('hashtags are exact normalized tags and shared accounts become TALK messages',()=>{
 assert.deepEqual(hashtags('見つけた！ #花 #花火 ＃ＡＢＣ #余韻ノート'),['花','花火','abc','余韻ノート']);
 assert.equal(hashtags('#花火').includes('花'),false);
 const w=shareAccount(initialWorld(c,now),c,'haru','mio',now);
 assert.equal(w.messages.at(-1).sharedAccount,'mio');assert.equal(w.messages.at(-1).text,'@'+c.accounts.find(a=>a.id==='mio').handle);
 assert.ok(validateWorld(JSON.parse(JSON.stringify(w))));
 assert.equal(shareAccount(w,c,'manager','mio',now).messages.length,w.messages.length);
});
