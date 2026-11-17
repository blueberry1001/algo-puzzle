import {publicContent} from './cloud/client.js';
import { WORLD_KEY,CONFIG_KEY,initialWorld,validateConfig,validateWorld,tickWorld,migrateLegacy,normalizeHandles,hasDueDelivery } from './world.js';
import {withStorageLock,StorageLockTimeout} from './storage-lock.js';
export const base = new URL('../',import.meta.url);
export const url = path => new URL(path,base).href;
let config, world, defaults, listeners = new Set(), ready, queue=Promise.resolve();
let advancePending=null,advanceTimer=null,advancePaused=false,transactionError='',blockedSince=null,lastAdvanceAt=0;
export const current=()=>world;
export const scenario=()=>config;
export const defaultScenario=()=>structuredClone(defaults);
export const clock=()=>Date.now()+(world?.offset||0);
export function showError(message,{reload=false}={}) {
  let el=document.querySelector('#global-error');
  if(!el){el=document.createElement('div');el.id='global-error';el.className='global-error';el.setAttribute('role','alert');document.body.prepend(el);}
  el.textContent=message;
  if(reload){const button=document.createElement('button');button.type='button';button.className='button secondary small recovery-button';button.textContent='再読み込み';button.onclick=()=>location.reload();el.append(button);}
}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
function emit(){for(const fn of listeners)try{fn();}catch(error){console.error(error);showError('画面を更新できませんでした。ページを再読み込みしてください。');}}
function scheduleAdvance(delay=250){clearTimeout(advanceTimer);if(document.hidden||advancePaused)return;advanceTimer=setTimeout(()=>{advance().catch(()=>{}).finally(()=>scheduleAdvance());},delay);}
function pauseAdvance(){advancePaused=true;clearTimeout(advanceTimer);}
function resumeAdvance(){advancePaused=false;if(document.hidden)return;try{world=read();emit();}catch(error){showError(error.message);}scheduleAdvance(0);}
function wakeAdvance(){if(!document.hidden&&(advancePaused||Date.now()-lastAdvanceAt>2000))resumeAdvance();}
function reportBlockedDelivery(){
  if(document.hidden||advancePaused||!hasDueDelivery(world,clock())){blockedSince=null;return;}
  blockedSince??=Date.now();
  if(Date.now()-blockedSince>=4000){const message='返信の処理が止まっています。作品のほかのタブを閉じて再読み込みしてください。進捗は残ります。';if(transactionError!==message||!document.querySelector('#global-error')){transactionError=message;showError(transactionError,{reload:true});}}
}
function read(){const raw=localStorage.getItem(WORLD_KEY);if(!raw)return world;let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error('保存データが読み取れません。制作スタジオからバックアップを復元してください。');}if(!validateWorld(parsed))throw new Error('保存データの形式が不正です。制作スタジオから復元してください。');return parsed;}
async function notifyNew(before,next){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  for(const n of next.notices.filter(x=>!before.notices.some(b=>b.id===x.id))){
    try{const registration=await navigator.serviceWorker?.getRegistration(base.pathname);if(registration)await registration.showNotification(n.title,{body:n.text.slice(0,140),tag:n.id,icon:url('assets/murmur.svg'),data:{url:url(n.route)}});else new Notification(n.title,{body:n.text.slice(0,140),tag:n.id});}catch{/* In-app notices remain available on unsupported browsers. */}
  }
}
export async function boot(){
  if(ready)return ready;
  ready=(async()=>{
    const response=await fetch(url('content/scenario.json'),{cache:'no-cache'});if(!response.ok)throw new Error('シナリオの読み込みに失敗しました。再読み込みしてください。');
    defaults=await publicContent(await response.json());config=defaults;
    const saved=localStorage.getItem(CONFIG_KEY);if(saved){try{const data=normalizeHandles(withNewContent(JSON.parse(saved)));if(!validateConfig(data).length){config=data;localStorage.setItem(CONFIG_KEY,JSON.stringify(data));}else showError('保存された設定に問題があるため、公開中の設定で起動しました。');}catch{showError('保存された設定を読み取れません。公開中の設定で起動しました。');}}
    const errors=validateConfig(config);if(errors.length)throw new Error(errors.join('\n'));
    const raw=localStorage.getItem(WORLD_KEY);
    if(raw){try{world=read();}catch{localStorage.setItem(WORLD_KEY+':recovery',raw);world=initialWorld(config,Date.now());localStorage.setItem(WORLD_KEY,JSON.stringify(world));showError('保存データの形式に問題があったため初期状態で起動しました。元データは recovery キーに保管しています。バックアップは制作スタジオから復元できます。');}}else{let legacy;try{legacy=JSON.parse(localStorage.getItem('algo-puzzle:haru:v1'));}catch{}world=migrateLegacy(legacy,config,Date.now());localStorage.setItem(WORLD_KEY,JSON.stringify(world));}
    // Make new scheduled content deterministic after a scenario revision.
    const fresh=initialWorld(config,world.startedAt);let changed=false;if(!world.playerHandle){world.playerHandle=fresh.playerHandle;changed=true;}for(const [id,time] of Object.entries(fresh.randomAt))if(!(id in world.randomAt)){world.randomAt[id]=time;changed=true;}
    if(changed)localStorage.setItem(WORLD_KEY,JSON.stringify(world));
    if('serviceWorker' in navigator)navigator.serviceWorker.register(url('sw.js'),{scope:base.pathname}).catch(()=>{});
    window.addEventListener('storage',e=>{if(e.key===CONFIG_KEY){location.reload();return;}if(e.key===WORLD_KEY){try{world=read();if(!document.hidden)emit();}catch(err){showError(err.message);}}});
    window.addEventListener('pageshow',resumeAdvance);
    window.addEventListener('focus',resumeAdvance);
    window.addEventListener('pagehide',pauseAdvance);
    document.addEventListener('visibilitychange',()=>document.hidden?pauseAdvance():resumeAdvance());
    document.addEventListener('freeze',pauseAdvance);
    document.addEventListener('resume',resumeAdvance);
    document.addEventListener('pointerdown',wakeAdvance,{passive:true});
    document.addEventListener('keydown',wakeAdvance);
    await advance();scheduleAdvance();return {config,world};
  })();
  return ready;
}
export function transact(change,{idle=false}={}){
  const perform=()=>{
    if(idle&&(document.hidden||advancePaused))return null;
    const before=read();const next=change(structuredClone(before),config,Date.now()+before.offset);
    if(next&&typeof next.then==='function')throw new Error('進捗の変更中に非同期処理は実行できません。');
    if(!validateWorld(next))throw new Error('変更結果の検証に失敗しました。保存は行っていません。');
    const serialized=JSON.stringify(next),changed=serialized!==JSON.stringify(before);
    if(changed)localStorage.setItem(WORLD_KEY,serialized);
    world=changed?next:before;return {before,next:world,changed};
  };
  const work=async()=>{
    let result;
    try{result=await withStorageLock(navigator.locks,WORLD_KEY,perform,{idle});}
    catch(error){if(!idle||!(error instanceof StorageLockTimeout))throw error;}
    if(idle&&!result)reportBlockedDelivery();else if(result)blockedSince=null;
    // Rendering and media updates must never hold the cross-tab storage lock.
    if(result&&transactionError){const el=document.querySelector('#global-error');if(el?.textContent.startsWith(transactionError))el.remove();transactionError='';}
    if(result?.changed){emit();void notifyNew(result.before,result.next);}
    return world;
  };
  queue=queue.catch(()=>{}).then(work).catch(err=>{transactionError=`保存できませんでした。${err.message}`;showError(transactionError);throw err;});return queue;
}
export function advance(){if(!advancePending)advancePending=transact((w,c,n)=>tickWorld(w,c,n),{idle:true}).finally(()=>{advancePending=null;lastAdvanceAt=Date.now();});return advancePending;}
export async function reset(){return transact((w,c)=>initialWorld(c,Date.now()));}
export function withNewContent(c){if(c.recorder&&!c.recorder.profileAudio&&defaults?.recorder?.profileAudio)c.recorder.profileAudio=defaults.recorder.profileAudio;if(c.recorder?.serial==='EC-0917')c.recorder.serial='8042-991A';for(const key of ['salonArticles','salonQuestions'])if(c[key]===undefined)c[key]=structuredClone(defaults?.[key]||[]);return c;}
export async function setConfig(next){withNewContent(next);if(JSON.stringify(next).length>2000000)throw new Error('設定全体は2MB以内にしてください。画像を小さくしてください。');const errors=validateConfig(next);if(errors.length)throw new Error(errors.join('\n'));localStorage.setItem(CONFIG_KEY,JSON.stringify(next));config=next;await transact((w)=>{const fresh=initialWorld(config,w.startedAt);for(const [id,t] of Object.entries(fresh.randomAt))if(!(id in w.randomAt))w.randomAt[id]=t;return w;});}
export async function restoreConfig(){localStorage.removeItem(CONFIG_KEY);config=structuredClone(defaults);}
export async function requestNotifications(){if(!('Notification' in window))return 'このブラウザは通知に対応していません。サイト内通知をご利用ください。';const result=await Notification.requestPermission();return result==='granted'?'ブラウザ通知を有効にしました。サイトを開いている間の更新をお知らせします。':result==='denied'?'通知は許可されていません。サイト内通知は引き続き利用できます。':'通知の設定は変更されませんでした。';}
export function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
export async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');}
