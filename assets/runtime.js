import { WORLD_KEY,CONFIG_KEY,initialWorld,validateConfig,validateWorld,tickWorld,migrateLegacy } from './world.js';
export const base = new URL('../',import.meta.url);
export const url = path => new URL(path,base).href;
let config, world, defaults, listeners = new Set(), ready, queue=Promise.resolve();
export const current=()=>world;
export const scenario=()=>config;
export const defaultScenario=()=>structuredClone(defaults);
export const clock=()=>Date.now()+(world?.offset||0);
export function showError(message) {
  let el=document.querySelector('#global-error');
  if(!el){el=document.createElement('div');el.id='global-error';el.className='global-error';el.setAttribute('role','alert');document.body.prepend(el);}
  el.textContent=message;
}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
function emit(){for(const fn of listeners)fn();}
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
    defaults=await response.json();config=defaults;
    const saved=localStorage.getItem(CONFIG_KEY);if(saved){try{const data=JSON.parse(saved);if(!validateConfig(data).length)config=data;else showError('保存された設定に問題があるため、公開中の設定で起動しました。');}catch{showError('保存された設定を読み取れません。公開中の設定で起動しました。');}}
    const errors=validateConfig(config);if(errors.length)throw new Error(errors.join('\n'));
    const raw=localStorage.getItem(WORLD_KEY);
    if(raw){try{world=read();}catch{localStorage.setItem(WORLD_KEY+':recovery',raw);world=initialWorld(config,Date.now());localStorage.setItem(WORLD_KEY,JSON.stringify(world));showError('保存データの形式に問題があったため初期状態で起動しました。元データは recovery キーに保管しています。バックアップは制作スタジオから復元できます。');}}else{let legacy;try{legacy=JSON.parse(localStorage.getItem('algo-puzzle:haru:v1'));}catch{}world=migrateLegacy(legacy,config,Date.now());localStorage.setItem(WORLD_KEY,JSON.stringify(world));}
    // Make new scheduled content deterministic after a scenario revision.
    const fresh=initialWorld(config,world.startedAt);let changed=false;for(const [id,time] of Object.entries(fresh.randomAt))if(!(id in world.randomAt)){world.randomAt[id]=time;changed=true;}
    if(changed)localStorage.setItem(WORLD_KEY,JSON.stringify(world));
    if('serviceWorker' in navigator)navigator.serviceWorker.register(url('sw.js'),{scope:base.pathname}).catch(()=>{});
    setInterval(()=>advance().catch(()=>{}),1000);
    window.addEventListener('storage',e=>{if(e.key===CONFIG_KEY){location.reload();return;}if(e.key===WORLD_KEY){try{world=read();emit();}catch(err){showError(err.message);}}});
    window.addEventListener('pageshow',()=>advance().catch(()=>{}));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)advance().catch(()=>{});});
    await advance();return {config,world};
  })();
  return ready;
}
export function transact(change){
  const perform=async()=>{
    const before=read();const next=await change(structuredClone(before),config,Date.now()+before.offset);
    if(!validateWorld(next))throw new Error('変更結果の検証に失敗しました。保存は行っていません。');
    if(JSON.stringify(next)!==JSON.stringify(before)){localStorage.setItem(WORLD_KEY,JSON.stringify(next));world=next;emit();void notifyNew(before,next);}else world=before;
    return world;
  };
  const work=()=>navigator.locks?navigator.locks.request(WORLD_KEY,perform):perform();
  queue=queue.catch(()=>{}).then(work).catch(err=>{showError(`保存できませんでした。${err.message}`);throw err;});return queue;
}
export function advance(){return transact((w,c,n)=>tickWorld(w,c,n));}
export async function reset(){return transact((w,c)=>initialWorld(c,Date.now()));}
export async function setConfig(next){const errors=validateConfig(next);if(errors.length)throw new Error(errors.join('\n'));localStorage.setItem(CONFIG_KEY,JSON.stringify(next));config=next;await transact((w)=>{const fresh=initialWorld(config,w.startedAt);for(const [id,t] of Object.entries(fresh.randomAt))if(!(id in w.randomAt))w.randomAt[id]=t;return w;});}
export async function restoreConfig(){localStorage.removeItem(CONFIG_KEY);config=structuredClone(defaults);}
export async function requestNotifications(){if(!('Notification' in window))return 'このブラウザは通知に対応していません。サイト内通知をご利用ください。';const result=await Notification.requestPermission();return result==='granted'?'ブラウザ通知を有効にしました。サイトを開いている間の更新をお知らせします。':result==='denied'?'通知は許可されていません。サイト内通知は引き続き利用できます。':'通知の設定は変更されませんでした。';}
export function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
export async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');}
