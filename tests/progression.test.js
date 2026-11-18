import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWorld,chatSend,tickWorld,validateWorld} from '../assets/world.js';

const config=JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
config.rules=[{id:'sequence',contact:'haru',fromStep:0,toStep:0,keywords:['go'],replies:[{text:'OK'}],schedules:[
  {contact:'haru',type:'delay',seconds:60,text:'一通目'},
  {contact:'haru',type:'delay',seconds:60,text:'二通目',afterPrevious:true,afterDelivery:true},
  {contact:'haru',type:'delay',seconds:150,text:'別の予約'}
]}];

test('keyword reservation following an unresolved chain survives reopening',()=>{
  const start=1000,world=chatSend(initialWorld(config,start),config,'haru','go',start);
  const independent=world.scheduled.at(-1);
  assert.equal(independent.at,start+150000);
  independent.at=Number.MAX_SAFE_INTEGER; // Previously saved broken reservation.
  const loaded=tickWorld(JSON.parse(JSON.stringify(world)),config,start+5000);
  assert.equal(loaded.scheduled.at(-1).at,start+150000);
  let w=loaded;
  for(const elapsed of [60000,120000,150000,160000])w=tickWorld(w,config,start+elapsed);
  assert.deepEqual(w.messages.filter(m=>m.role==='received').map(m=>m.text),['OK','一通目','二通目','別の予約']);
});
test('long-running legacy save can keep playing without exhausting the fired limit',()=>{
  let w=initialWorld(config,1000);
  w.fired=Array.from({length:4990},(_,i)=>'typing:reply:old:'+i);
  w.fired.push('shop:redeemed','rule:sequence');
  w=chatSend(w,config,'haru','go',1001);
  assert.ok(validateWorld(w));assert.ok(w.fired.length<100);
  assert.ok(w.fired.includes('shop:redeemed'));assert.ok(w.fired.includes('rule:sequence'));
});
test('replies still arrive when the browser has no Intl.Segmenter',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(Intl,'Segmenter');
  try{
    Object.defineProperty(Intl,'Segmenter',{configurable:true,value:undefined});
    const engine=await import('../assets/world.js?fallback');
    assert.equal(engine.replyDelay('🍋！'),1200);
    const w=engine.chatSend(initialWorld(config,0),config,'haru','go',0);
    assert.equal(engine.tickWorld(w,config,2000).messages.at(-1).text,'OK');
  }finally{Object.defineProperty(Intl,'Segmenter',descriptor);}
});
