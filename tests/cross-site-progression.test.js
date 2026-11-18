import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWorld,chatSend,socialSend,unlockContact,tickWorld,validateWorld} from '../assets/world.js';

test('DM invitation during an overnight TALK reservation leads to the next playable step',()=>{
 const config=JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
 const contact=config.contacts.find(c=>c.id!=='haru').id, sender=config.accounts[0].id;
 config.rules=[
  {id:'start',contact:'haru',keywords:['開始'],fromStep:0,toStep:1,replies:[{text:'また明日'}],schedules:[{type:'tomorrow',hour:19,contact,text:'準備できたよ',advanceStep:true}]},
  {id:'continue',contact,keywords:['続き'],fromStep:2,toStep:3,replies:[{text:'正解'}]}
 ];
 config.socialRules=[{id:'invitation',channel:'dm',account:sender,minStep:1,keyword:'紹介',invite:contact,reply:'こちらです'}];
 const start=Date.parse('2026-11-19T22:00:00+09:00'),due=Date.parse('2026-11-20T19:00:00+09:00');
 let w=chatSend(initialWorld(config,start),config,'haru','開始',start);
 w=socialSend(w,config,'dm','紹介',sender,start+5000);
 w=tickWorld(w,config,start+15000);
 assert.equal(w.dms.at(-1).invite,contact);
 w=unlockContact(w,config,contact);
 assert.ok(w.contacts.includes(contact));
 const resume=t=>{w=tickWorld(JSON.parse(JSON.stringify(w)),config,t);assert.ok(validateWorld(w));};
 resume(due-1);assert.equal(w.step,1);
 resume(due+60000);assert.equal(w.step,2);assert.equal(w.messages.at(-1).contact,contact);
 w=chatSend(w,config,contact,'続き',due+61000);
 resume(due+66000);resume(due+67000);
 assert.equal(w.step,3);
 assert.deepEqual(w.messages.filter(m=>m.role==='received').map(m=>m.text),['また明日','準備できたよ','正解']);
});
