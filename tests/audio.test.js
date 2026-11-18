import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../cloud/worker.js';
import {AUDIO_CHUNK_BYTES,AUDIO_STORAGE_BYTES} from '../cloud/audio.js';
import {MAX_AUDIO_BYTES,safeAudio,audioSource,isMp3} from '../assets/audio-assets.js';
import {initialWorld,chatSend,tickWorld,validateConfig,validateWorld} from '../assets/world.js';

const config = JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
// Two MPEG-1 Layer III frames, used to exercise storage/validation without a binary fixture.
function mp3(size=834) {const b=new Uint8Array(size);b.set([255,251,144,0]);b.set([255,251,144,0],417);return b;}
function setup() {
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of ['0001_content','0002_history_title','0003_audio']) db.exec(readFileSync(new URL(`../cloud/migrations/${name}.sql`,import.meta.url),'utf8'));
  const rows = result => result.map(row => Object.fromEntries(Object.entries(row).map(([k,v]) => [k,v instanceof Uint8Array?Array.from(v):v])));
  const DB={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return rows(db.prepare(sql).all(...this.args))[0]??null;},sql};},async batch(stmts){db.exec('BEGIN');try{const result=stmts.map(s=>({results:rows(db.prepare(s.sql).all(...s.args))}));db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const env={DB,PUBLIC_EDITING:'true',ALLOWED_ORIGINS:'https://player.test',EDITOR_KEY:'local-key-for-testing-123456789'};
  const call=(path,opts={})=>worker.fetch(new Request('https://local.test'+path,opts),env);
  const upload=(bytes=mp3(),name='台詞.mp3',extra={})=>call('/audio',{method:'POST',headers:{'X-Audio-Name':encodeURIComponent(name),'Content-Type':'audio/mpeg',...extra},body:bytes});
  return {db,env,call,upload};
}

test('MP3 validation accepts MPEG/ID3 and rejects renamed text, truncated tags and other formats',() => {
  assert.ok(isMp3(mp3()));
  const tagged=new Uint8Array(844);tagged.set([73,68,51,4,0,0,0,0,0,0]);tagged.set(mp3(),10);assert.ok(isMp3(tagged));
  for (const bytes of [new TextEncoder().encode('<html>not audio</html>'),mp3().slice(0,500),new Uint8Array([73,68,51,4,0,0,127,127,127,127])]) assert.equal(isMp3(bytes),false);
});

test('uploaded references and legacy paths survive scheduled delivery/reload without permitting arbitrary URLs',() => {
  const ref='audio:'+'a'.repeat(64),base='https://example.test/game/';
  assert.ok(safeAudio(ref));assert.ok(safeAudio('media/old.wav'));
  assert.equal(audioSource(ref,base,'https://content.test'),`https://content.test/audio/${'a'.repeat(64)}.mp3`);
  assert.equal(audioSource(ref,base),`${base}media/${'a'.repeat(64)}.mp3`);
  assert.equal(audioSource('media/old.wav',base),base+'media/old.wav');
  const c=structuredClone(config);
  c.rules=[{id:'audio-test',name:'音声',contact:'haru',fromStep:0,toStep:1,keywords:['音声'],replies:[{text:'',audios:[ref,'media/old.mp3']}],schedules:[{type:'delay',seconds:5,text:'',audios:[ref],contact:'haru',advanceStep:true}]}];
  assert.deepEqual(validateConfig(c),[]);
  let w=chatSend(initialWorld(c,1000),c,'haru','音声',1000);
  w=tickWorld(JSON.parse(JSON.stringify(w)),c,10000);
  w=tickWorld(w,c,11000);
  assert.ok(validateWorld(w));assert.equal(w.step,2);
  assert.deepEqual(w.messages.filter(m=>m.role==='received').map(m=>m.audios),[[ref,'media/old.mp3'],[ref]]);
  for (const unsafe of ['https://evil.test/a.mp3','data:audio/mpeg;base64,AAAA','media/../private.mp3','audio:bad','javascript:alert(1)']) {
    assert.equal(safeAudio(unsafe),false);
    c.rules[0].replies[0].audios=[unsafe];assert.ok(validateConfig(c).length);
    w.messages[1].audios=[unsafe];assert.equal(validateWorld(w),false);
  }
});

test('audio upload deduplicates, preserves names only in editor metadata, and does not publish a scenario',async() => {
  const {call,upload,db}=setup();
  const first=await upload();assert.equal(first.status,201);
  const saved=await first.json(),id=saved.ref.slice(6);
  assert.equal(saved.name,'台詞.mp3');assert.equal(saved.size,834);
  assert.equal((await upload(mp3(),'別名.mp3')).status,200);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audio_files').get().n,1);
  assert.equal((await call('/public')).status,404);
  assert.equal((await (await call(`/audio/${id}/info`)).json()).name,'台詞.mp3');
  const response=await call(`/audio/${id}.mp3`);
  assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'audio/mpeg');
  assert.equal(response.headers.get('Content-Disposition'),'inline; filename="audio.mp3"');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),mp3());
});

test('byte-range playback works across chunks, for suffixes, HEAD and cache validation',async() => {
  const {call,upload}=setup(),bytes=mp3(AUDIO_CHUNK_BYTES+123);
  bytes.fill(17,AUDIO_CHUNK_BYTES-10);
  const {ref}=await (await upload(bytes)).json(),path=`/audio/${ref.slice(6)}.mp3`;
  for (const [range,start,end] of [['bytes=0-1',0,1],[`bytes=${AUDIO_CHUNK_BYTES-5}-${AUDIO_CHUNK_BYTES+5}`,AUDIO_CHUNK_BYTES-5,AUDIO_CHUNK_BYTES+5],['bytes=-20',bytes.length-20,bytes.length-1],[`bytes=${AUDIO_CHUNK_BYTES}-`,AUDIO_CHUNK_BYTES,bytes.length-1]]) {
    const r=await call(path,{headers:{Range:range,Origin:'https://player.test'}});assert.equal(r.status,206);
    assert.equal(r.headers.get('Content-Range'),`bytes ${start}-${end}/${bytes.length}`);
    assert.equal(r.headers.get('Content-Length'),String(end-start+1));
    assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://player.test');
    assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes.slice(start,end+1));
  }
  for (const range of ['bytes=-0','bytes=99999999-','bytes=8-3','bytes=0-1,3-4','bytes=-']) assert.equal((await call(path,{headers:{Range:range}})).status,416);
  const head=await call(path,{method:'HEAD',headers:{Range:'bytes=0-1'}});assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),String(bytes.length));assert.equal(await head.text(),'');
  assert.equal((await call(path,{headers:{'If-None-Match':head.headers.get('ETag')}})).status,304);
  assert.equal((await call(path,{headers:{Range:'bytes=0-1','If-Range':'"old"'}})).status,200);
});

test('upload rejects oversize/invalid input, respects auth, and caps storage without partial files',async() => {
  const {upload,call,env,db}=setup();
  assert.equal((await upload(mp3(),'voice.wav')).status,400);
  assert.equal((await upload(new TextEncoder().encode('not audio'))).status,400);
  assert.equal((await upload(mp3(),'voice.mp3',{'Content-Length':String(MAX_AUDIO_BYTES+1)})).status,413);
  assert.equal((await upload(new Uint8Array(MAX_AUDIO_BYTES+1))).status,413);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audio_files').get().n,0);
  const {ref}=await (await upload()).json();
  env.PUBLIC_EDITING='false';
  assert.equal((await upload()).status,401);
  assert.equal((await call(`/audio/${ref.slice(6)}/info`)).status,401);
  assert.equal((await call(`/audio/${ref.slice(6)}.mp3`)).status,200);
  assert.equal((await upload(mp3(),'voice.mp3',{Authorization:`Bearer ${env.EDITOR_KEY}`})).status,200);
  env.PUBLIC_EDITING='true';
  for(let i=0;i<AUDIO_STORAGE_BYTES/MAX_AUDIO_BYTES;i++) db.prepare('INSERT INTO audio_files(id,name,size) VALUES(?,?,?)').run(`quota${i}`,'quota.mp3',MAX_AUDIO_BYTES);
  assert.equal((await upload()).status,200);
  const different=mp3();different[100]=33;
  assert.equal((await upload(different)).status,507);
  assert.equal(db.prepare('SELECT count(*) AS n FROM audio_chunks').get().n,1);
  assert.equal((await call('/audio',{method:'OPTIONS',headers:{Origin:'https://player.test'}})).headers.get('Access-Control-Allow-Headers').includes('X-Audio-Name'),true);
  assert.equal((await upload(mp3(),'voice.mp3',{Origin:'https://untrusted.test'})).status,403);
});

test('image/video uploads are separate references with cached range delivery',async()=>{
 const {call}=setup();
 const bytes=new Uint8Array([82,73,70,70,12,0,0,0,87,69,66,80,86,80,56,32,0,0,0,0]);
 const uploaded=await call('/media',{method:'POST',headers:{'X-Audio-Name':'test.webp'},body:bytes});assert.equal(uploaded.status,201);
 const {ref}=await uploaded.json();assert.match(ref,/^asset:[a-f0-9]{64}\.webp$/);
 const response=await call('/media/'+ref.slice(6),{headers:{Range:'bytes=0-3'}});assert.equal(response.status,206);assert.equal(response.headers.get('Content-Type'),'image/webp');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes.slice(0,4));
 assert.equal((await call('/media/'+ref.slice(6).replace('.webp','.mp4'))).status,404);
 assert.equal((await call('/media',{method:'POST',headers:{'X-Audio-Name':'bad.webp'},body:'<script>bad</script>'})).status,400);
});
