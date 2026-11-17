import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withStorageLock,StorageLockTimeout} from '../assets/storage-lock.js';
import {hasDueDelivery} from '../assets/world.js';

test('normal locks finish after release and unavailable idle locks do not write',async()=>{
  let held=false,writes=0;
  const locks={async request(name,opts,callback){held=true;try{return callback({name});}finally{held=false;}}};
  assert.equal(await withStorageLock(locks,'progress',()=>{assert.ok(held);return ++writes;}),1);
  assert.equal(held,false);
  assert.equal(await withStorageLock({request:(name,opts,callback)=>callback(null)},'progress',()=>++writes,{idle:true}),null);
  assert.equal(writes,1);
});

test('unsettled idle request times out, retries, and ignores a late callback',async()=>{
  let callback,writes=0;
  const broken={request(name,opts,fn){assert.equal(opts.ifAvailable,true);assert.equal(opts.signal,undefined);callback=fn;return new Promise(()=>{});}};
  await assert.rejects(withStorageLock(broken,'progress',()=>++writes,{idle:true,timeoutMs:10}),StorageLockTimeout);
  assert.equal(callback({name:'late'}),null);assert.equal(writes,0);
  const working={request:(name,opts,fn)=>Promise.resolve(fn({name}))};
  assert.equal(await withStorageLock(working,'progress',()=>++writes,{idle:true}),1);
});

test('user write times out even if the browser ignores AbortSignal and cannot execute later',async()=>{
  let callback,signal,writes=0;
  const locks={request(name,opts,fn){signal=opts.signal;callback=fn;return new Promise(()=>{});}};
  await assert.rejects(withStorageLock(locks,'progress',()=>++writes,{timeoutMs:10}),StorageLockTimeout);
  assert.ok(signal.aborted);callback({name:'late'});assert.equal(writes,0);
});

test('commit outcome is preserved if the release promise hangs, including validation errors',async()=>{
  let writes=0;
  const locks={request(name,opts,fn){try{fn({name});}catch{}return new Promise(()=>{});}};
  assert.equal(await withStorageLock(locks,'progress',()=>++writes,{timeoutMs:10}),1);
  assert.equal(writes,1);
  await assert.rejects(withStorageLock(locks,'progress',()=>{throw Error('invalid state');},{timeoutMs:10}),/invalid state/);
});

test('a callback arriving after the wall-clock deadline cannot commit before the timer fires',async()=>{
  const actual=Date.now;
  let writes=0;
  const locks={request(name,opts,fn){Date.now=()=>actual()+10000;try{return Promise.resolve(fn({name}));}finally{Date.now=actual;}}};
  try{await assert.rejects(withStorageLock(locks,'progress',()=>++writes,{timeoutMs:1000}),StorageLockTimeout);assert.equal(writes,0);}finally{Date.now=actual;}
});

test('stall detection respects typing delays, scheduled dates, contact queue order, and delivered tasks',()=>{
  const w={fired:[],messages:[{role:'received',contact:'a',at:1000}],scheduled:[{id:'a1',contact:'a',at:1100,text:'あ'.repeat(100)},{id:'a2',contact:'a',at:1200,text:''}]};
  assert.equal(hasDueDelivery(w,10000),false,'shorter later reply must not jump the head of its contact queue');
  assert.equal(hasDueDelivery(w,12000),true);
  w.fired=['a1','a2'];assert.equal(hasDueDelivery(w,12000),false);
  w.scheduled.push({id:'tomorrow',contact:'b',at:86400000,text:'翌日の予約'});assert.equal(hasDueDelivery(w,12000),false);
  w.scheduled.push({id:'other',contact:'b',at:12000,text:'別の相手'});assert.equal(hasDueDelivery(w,12000),true);
  w.fired.push('other');w.pendingDms=[{at:11999}];assert.equal(hasDueDelivery(w,12000),true);
});
