import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('runtime polling stays bounded and releases the storage lock before rendering',async t=>{
  const config=JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
  const stored=new Map(),elements=new Map(),browser=new EventTarget(),document=new EventTarget();
  document.hidden=false;
  document.querySelector=selector=>elements.get(selector)||null;
  document.createElement=()=>({setAttribute(){},remove(){elements.delete('#'+this.id);}});
  document.body={prepend:el=>elements.set('#'+el.id,el)};
  const concurrent=(await import('../assets/world.js')).initialWorld(config,1000);
  concurrent.playerName='先に開いたタブ';
  const locks={held:false,blocked:false,calls:0,async request(name,options,callback){
    this.calls++;
    if(this.calls===1){
      assert.equal(name,'algo-puzzle:world:v2');
      assert.ok(options.signal,'initial creation uses the same exclusive lock as later writes');
      stored.set(name,JSON.stringify(concurrent));
    }
    if(typeof options==='function'){callback=options;options={};}
    if(this.blocked){assert.equal(options.ifAvailable,true,'background polling must not wait for another tab');return callback(null);}
    this.held=true;try{return await callback({name});}finally{this.held=false;}
  }};
  const globals={window:browser,document,navigator:{locks},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},fetch:async url=>new Response(JSON.stringify(String(url).endsWith('cloud.json')?{endpoint:''}:config))};
  const original=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  for(const [k,value] of Object.entries(globals))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
  t.after(()=>{browser.dispatchEvent(new Event('pagehide'));for(const [k,descriptor] of original){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}});
  const rt=await import('../assets/runtime.js');await rt.boot();assert.equal(rt.current().playerName,concurrent.playerName);
  const calls=locks.calls,a=rt.advance(),b=rt.advance();assert.equal(a,b);await a;assert.equal(locks.calls,calls+1);
  const renderLocks=[];rt.subscribe(()=>renderLocks.push(locks.held));
  await Promise.all(Array.from({length:20},(_,i)=>rt.transact(w=>{w.likes.push('update-'+i);return w;})));
  assert.equal(rt.current().likes.length,20);assert.equal(renderLocks.length,20);assert.ok(renderLocks.every(held=>!held));
  locks.blocked=true;await rt.advance();assert.equal(rt.current().likes.length,20);locks.blocked=false;
  await assert.rejects(rt.transact(()=>{throw Error('failed update');}),/failed update/);
  await rt.transact(w=>{w.likes.push('recovered');return w;});assert.equal(rt.current().likes.length,21);assert.equal(document.querySelector('#global-error'),null);
  const snapshot=JSON.parse(stored.get('algo-puzzle:world:v2'));assert.equal(snapshot.likes.length,21);
  // A background tab commits a delivery without a storage event reaching this tab.
  snapshot.messages.push({id:'other',contact:'haru',role:'received',text:'届いた',at:Date.now(),audios:['media/a.mp3'],images:['media/a.png']});
  stored.set('algo-puzzle:world:v2',JSON.stringify(snapshot));
  const renders=renderLocks.length;await rt.advance();assert.equal(renderLocks.length,renders+1);
  await rt.advance();assert.equal(renderLocks.length,renders+1);
});
