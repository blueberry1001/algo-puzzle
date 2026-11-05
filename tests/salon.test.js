import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWorld,validateWorld,validateConfig,allItems,visible,tickWorld} from '../assets/world.js';
const c=JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
test('salon membership is separate, persists, and resets with game progress',()=>{
 const w=initialWorld(c,1000);w.salonMember={name:'読者',joined:1000};assert.ok(validateWorld(JSON.parse(JSON.stringify(w))));assert.equal(w.member,null);assert.equal(initialWorld(c,1000).salonMember,undefined);
 for(const member of [{name:'',joined:1},{name:'読者',joined:'bad'},true])assert.equal(validateWorld({...w,salonMember:member}),false);
});
test('salon collections validate and old scenarios still load',()=>{
 const old=structuredClone(c);delete old.salonArticles;delete old.salonQuestions;assert.deepEqual(validateConfig(old),[]);
 for(const value of [null,{},[null],[{id:'a',title:42,text:'本文'}]]){const bad=structuredClone(c);bad.salonArticles=value;assert.ok(validateConfig(bad).length);}
 const dup=structuredClone(c);dup.salonQuestions[0].id=dup.salonArticles[0].id;assert.ok(validateConfig(dup).length);
});
test('salon publication follows configured progress and seconds',()=>{
 const cfg=structuredClone(c),a=cfg.salonArticles[0];a.minStep=1;a.delaySeconds=5;const w=initialWorld(cfg,1000);assert.ok(allItems(cfg).includes(a));assert.equal(visible(a,w,99999),false);w.step=1;w.steps[1]=2000;assert.equal(visible(a,w,6999),false);assert.equal(visible(a,w,7000),true);assert.ok(tickWorld(w,cfg,7000).fired.includes('published:'+a.id));
});
