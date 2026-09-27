// Pure, browser-independent scenario engine. All effects are persisted by runtime.js.
export const WORLD_KEY = 'algo-puzzle:world:v2';
export const CONFIG_KEY = 'algo-puzzle:scenario:v2';
const HOUR = 3600000;
const clone = value => structuredClone(value);
export function initialWorld(config, now = Date.now(), random = Math.random) {
  const world = { version:2, startedAt:now, step:0, steps:{0:now}, contacts:['haru'], messages:[], scheduled:[], fired:[], randomAt:{}, posts:[], replies:[], dms:[], likes:[], notices:[], read:{}, member:null, signedIn:false, tickets:[], inquiries:[], reservations:[], offset:0 };
  for (const item of allItems(config)) if (item.randomMinutes) {
    const [min,max] = item.randomMinutes;
    world.randomAt[item.id] = now + (min + random() * (max-min)) * 60000;
  }
  return world;
}
export function allItems(c) { return [...c.posts,...c.blogs,...c.news,...c.diary,...c.threads.flatMap(t=>t.comments)]; }
export function itemTime(item, w) {
  if (item.randomMinutes) return w.randomAt[item.id] ?? Infinity;
  const start = item.minStep > 0 ? w.steps[item.minStep] : w.startedAt;
  if (start === undefined) return Infinity;
  return start + (item.delayMinutes || 0)*60000 - (item.ageHours || 0)*HOUR;
}
export function visible(item,w,now=Date.now()+w.offset) { return w.step >= (item.minStep||0) && itemTime(item,w) <= now; }
export function relativeTime(time, now=Date.now()) {
  const seconds = Math.max(0,Math.floor((now-time)/1000));
  if (seconds < 60) return 'たった今';
  if (seconds < 3600) return `${Math.floor(seconds/60)}分前`;
  if (seconds < 86400) return `${Math.floor(seconds/3600)}時間前`;
  if (seconds < 2592000) return `${Math.floor(seconds/86400)}日前`;
  if (seconds < 31536000) return `${Math.floor(seconds/2592000)}カ月前`;
  return `${Math.floor(seconds/31536000)}年前`;
}
export function nextJstHour(now, hour) {
  const d = new Date(now + 9*HOUR);
  let due = Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),hour)-9*HOUR;
  if (due <= now) due += 24*HOUR;
  return due;
}
function addNotice(w,id,title,text,route,at) {
  if (w.notices.some(n=>n.id===id)) return;
  w.notices.unshift({id,title,text,route,at}); w.notices=w.notices.slice(0,100);
}
export function tickWorld(world,c,now) {
  const w=clone(world);
  for(const task of w.scheduled) if(task.at<=now&&!w.fired.includes(task.id)) {
    w.messages.push({id:task.id,contact:task.contact,role:'received',text:task.text,at:task.at});
    w.fired.push(task.id);
    addNotice(w,task.id,c.contacts.find(x=>x.id===task.contact)?.name||'TALK',task.text,`?contact=${task.contact}`,task.at);
  }
  for(const p of c.posts) if(p.account==='mio'&&visible(p,w,now)&&!w.fired.includes(p.id)) {
    w.fired.push(p.id);
    if(itemTime(p,w)>=w.startedAt) addNotice(w,p.id,'星宮 澪が投稿しました',p.text,'sns/',itemTime(p,w));
  }
  // Persist publication markers for every timed surface, so open tabs rerender once.
  for(const item of allItems(c)) if(visible(item,w,now)&&!w.fired.includes(`published:${item.id}`))w.fired.push(`published:${item.id}`);
  w.messages=w.messages.slice(-500);
  return w;
}
export function chatSend(world,c,contact,text,now) {
  text=text.trim().slice(0,1000);
  if(!text||!world.contacts.includes(contact)) return world;
  const w=tickWorld(world,c,now);
  w.messages.push({id:`sent-${now}-${w.messages.length}`,contact,role:'sent',text,at:now});
  const rule=c.rules.find(r=>r.contact===contact&&r.fromStep===w.step&&r.keyword===text&&!w.fired.includes(`rule:${r.id}`));
  if(!rule) return w;
  w.fired.push(`rule:${rule.id}`); w.step=rule.toStep; w.steps[w.step]=now;
  w.messages.push({id:`reply:${rule.id}`,contact,role:'received',text:rule.reply,image:rule.image,invite:rule.invite,at:now});
  if(rule.schedule){const s=rule.schedule;w.scheduled.push({id:`scheduled:${rule.id}`,contact,text:s.text,at:s.type==='delay'?now+s.minutes*60000:nextJstHour(now,s.hour)});}
  return tickWorld(w,c,now);
}
export function unlockContact(world,c,id) {
  const contact=c.contacts.find(x=>x.id===id);
  if(!contact||world.step<contact.unlockStep) return world;
  const w=clone(world);if(!w.contacts.includes(id))w.contacts.push(id);return w;
}
export function socialSend(world,c,channel,text,target,now) {
  text=text.trim().slice(0,1000); if(!text)return world;
  if(channel==='dm'&&!c.accounts.some(a=>a.id===target))return world;
  if(channel==='reply'&&!c.posts.some(p=>p.id===target&&visible(p,world,now))&&!world.posts.some(p=>p.id===target))return world;
  const w=clone(world),id=`user-${now}-${w.posts.length+w.replies.length+w.dms.length}`;
  const record={id,text,at:now,account:'player',target};
  if(channel==='post')w.posts.unshift(record);
  if(channel==='reply')w.replies.push(record);
  if(channel==='dm')w.dms.push(record);
  const rules=c.socialRules.filter(r=>r.channel===channel&&w.step>=r.minStep&&text.includes(r.keyword)&&(channel!=='dm'||r.account===target));
  for(const r of rules){const response={id:`${id}:${r.id}`,text:r.reply,at:now+1,account:r.account,target:channel==='post'?id:target};if(channel==='dm')w.dms.push(response);else w.replies.push(response);addNotice(w,response.id,c.accounts.find(a=>a.id===r.account).name,r.reply,channel==='dm'?`sns/?view=dm&account=${target}`:`sns/?view=post&id=${channel==='post'?id:target}`,now);}
  w.posts=w.posts.slice(0,200);w.replies=w.replies.slice(-500);w.dms=w.dms.slice(-500);return w;
}
export function migrateLegacy(old,c,now) {
  const w=initialWorld(c,now);
  if(old?.version!==1||![0,1,2].includes(old.step))return w;
  w.step=old.step;
  for(let i=1;i<=w.step;i++)w.steps[i]=Number.isFinite(old.unlockedAt?.[i-1])?old.unlockedAt[i-1]:now;
  w.messages=(old.messages||[]).filter(m=>['sent','received'].includes(m.role)&&typeof m.text==='string'&&Number.isFinite(m.at)).slice(-200).map((m,i)=>({...m,id:`legacy-${i}`,contact:'haru'}));
  for(const r of c.rules)if(r.toStep<=w.step){
    w.fired.push(`rule:${r.id}`);
    if(r.invite)w.messages.push({id:`migration:${r.id}`,contact:r.contact,role:'received',text:r.reply,image:r.image,invite:r.invite,at:w.steps[r.toStep]});
    if(r.schedule){const s=r.schedule,at=w.steps[r.toStep];w.scheduled.push({id:`scheduled:${r.id}`,contact:r.contact,text:s.text,at:s.type==='delay'?at+s.minutes*60000:nextJstHour(at,s.hour)});}
  }
  return w;
}
export function validateConfig(c) {
  const errors=[]; const err=s=>errors.push(s);
  if(!c||c.version!==2)return ['version は 2 にしてください。'];
  for(const key of ['contacts','rules','accounts','posts','socialRules','threads','blogs','news','diary','events','gallery'])if(!Array.isArray(c[key]))err(`${key} は配列が必要です。`);
  if(errors.length)return errors;
  const ids=new Set();
  for(const group of ['contacts','rules','accounts','posts','socialRules','threads','blogs','news','diary','events']){
    const seen=new Set();for(const x of c[group]){if(!x||typeof x.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(x.id)||seen.has(x.id))err(`${group}: IDが不正または重複しています。`);seen.add(x?.id);}
  }
  if(errors.length)return errors;
  if(!c.contacts.some(x=>x.id==='haru'))err('最初の連絡先 haru が必要です。');
  const text=(v,label)=>{if(typeof v!=='string'||v.length>20000)err(`${label}: 文字列が必要です（20,000文字以内）。`);};
  const step=(v,label)=>{if(!Number.isInteger(v)||v<0||v>100)err(`${label}: 段階は0〜100の整数です。`);};
  const asset=(v)=>{if(v!==undefined&&v!==''&&(typeof v!=='string'||!/^media\/[a-zA-Z0-9_./-]+$/.test(v)||v.includes('..')))err('画像・音声は media/ 内の相対パスを指定してください。');};
  if(['rules','posts','blogs','news','diary'].some(key=>c[key].length===0))err('会話・投稿・ブログ・お知らせ・日記には最低1件必要です。');
  for(const r of c.rules){text(r.keyword,'キーワード');text(r.reply,'返信');step(r.fromStep,r.id);step(r.toStep,r.id);if(r.toStep!==r.fromStep+1)err(`${r.id}: 次の段階は現在+1です。`);if((typeof r.keyword!=='string'||!r.keyword.trim()))err('キーワードは空にできません。');if(!c.contacts.some(a=>a.id===r.contact))err(`${r.id}: 連絡先が存在しません。`);if(r.invite&&!c.contacts.some(a=>a.id===r.invite))err(`${r.id}: 招待先が存在しません。`);asset(r.image);if(r.schedule){text(r.schedule.text,'予約返信');if(!['delay','daily'].includes(r.schedule.type))err('予約の種類が不正です。');if(r.schedule.type==='delay'&&(!Number.isFinite(r.schedule.minutes)||r.schedule.minutes<0))err('遅延時間は0以上です。');if(r.schedule.type==='daily'&&(!Number.isInteger(r.schedule.hour)||r.schedule.hour<0||r.schedule.hour>23))err('時刻は0〜23です。');}}
  for(const a of c.contacts){text(a.name,'連絡先名');text(a.initial,'頭文字');step(a.unlockStep,a.id);if(!Array.isArray(a.intro)||!a.intro.every(x=>typeof x==='string'))err('初期メッセージが不正です。');}
  for(const a of c.accounts){text(a.name,'アカウント名');text(a.handle,'ハンドル');text(a.bio,'自己紹介');text(a.initial,'頭文字');}
  for(const t of c.threads){text(t.title,'スレッド名');if(!Array.isArray(t.comments)){err('comments は配列です。');continue;}for(const m of t.comments){if(!m||typeof m!=='object'){err('コメントの形式が不正です。');continue;}text(m.text,'コメント');text(m.uid,'ID');text(m.name,'投稿者');}}
  for(const p of c.posts){text(p.text,'投稿');if(!c.accounts.some(a=>a.id===p.account))err('投稿アカウントが存在しません。');}
  for(const b of c.blogs){text(b.title,'ブログタイトル');text(b.body,'ブログ本文');text(b.excerpt,'ブログ概要');}
  for(const b of [...c.news,...c.diary]){text(b.title,'記事タイトル');text(b.text,'記事本文');}
  for(const r of c.socialRules){if(!['post','reply','dm'].includes(r.channel))err('SNS返信先が不正です。');text(r.keyword,'SNSキーワード');text(r.reply,'SNS返信');if((typeof r.keyword!=='string'||!r.keyword.trim()))err('SNSキーワードは空にできません。');if(!c.accounts.some(a=>a.id===r.account))err('SNS返信アカウントが存在しません。');step(r.minStep,r.id);}
  if(errors.length)return errors;
  for(const item of allItems(c)){if(ids.has(item.id))err(`公開記事IDが重複: ${item.id}`);ids.add(item.id);step(item.minStep,item.id);asset(item.image);if(item.ageHours!==undefined&&(!Number.isFinite(item.ageHours)||item.ageHours<0))err('ageHoursは0以上です。');if(item.delayMinutes!==undefined&&(!Number.isFinite(item.delayMinutes)||item.delayMinutes<0))err('delayMinutesは0以上です。');if(item.randomMinutes&&(!Array.isArray(item.randomMinutes)||item.randomMinutes.length!==2||!item.randomMinutes.every(Number.isFinite)||item.randomMinutes[0]<0||item.randomMinutes[1]<item.randomMinutes[0]))err('randomMinutes は [最短分, 最長分] です。');}
  if(!c.management||typeof c.management.password!=='string'||!c.management.password||!Array.isArray(c.management.members))err('管理画面の設定が不正です。');
  if(!c.recorder||!c.recorder.serial||!c.recorder.password||!Array.isArray(c.recorder.tracks))err('音声サイトの設定が不正です。');else for(const t of c.recorder.tracks)asset(t?.file);
  if(!c.venue||!Array.isArray(c.venue.closedWeekdays)||!Array.isArray(c.venue.reservedDays))err('施設設定が不正です。');
  if(errors.length)return errors;
  for(const e of c.events){for(const k of ['title','place','time','description'])text(e[k],k);step(e.minStep,e.id);if(!Number.isFinite(e.daysFromStart)||!Number.isFinite(e.price)||e.price<0)err('イベント日程・価格が不正です。');}
  for(const g of c.gallery){if(!g){err('写真設定が不正です。');continue;}asset(g.image);text(g.title,'写真タイトル');}
  if(c.management){text(c.management.recovery,'復旧ヒント');for(const m of c.management.members||[]){if(!m){err('会員設定が不正です。');continue;}for(const k of ['number','name','birth','gender','joined','plan'])text(m[k],k);for(const k of ['past','future'])if(!Array.isArray(m[k])||!m[k].every(x=>typeof x==='string'))err('イベント履歴が不正です。');if(!Array.isArray(m.gifts))err('ギフト履歴が不正です。');else for(const g of m.gifts){if(!g||typeof g.name!=='string'||typeof g.date!=='string'||!Number.isFinite(g.price))err('ギフトの形式が不正です。');}}}
  if(c.recorder){text(c.recorder.serial,'シリアル');text(c.recorder.password,'音声パスワード');text(c.recorder.description,'製品説明');for(const t of c.recorder.tracks||[])for(const k of ['id','title','date','transcript'])text(t?.[k],k);}
  if(c.venue){for(const k of ['name','address','description'])text(c.venue[k],k);if(!Number.isFinite(c.venue.hourlyPrice)||c.venue.hourlyPrice<0||!Number.isInteger(c.venue.capacity)||c.venue.capacity<1||c.venue.capacity>20)err('施設料金・定員が不正です。');}
  return errors;
}
export function validateWorld(w) {
  if(!w||w.version!==2||!Number.isFinite(w.startedAt)||Math.abs(w.startedAt)>8e15||!Number.isInteger(w.step)||w.step<0||w.step>100||!Number.isFinite(w.offset)||Math.abs(w.offset)>31536000000)return false;
  for(const k of ['contacts','messages','scheduled','fired','posts','replies','dms','likes','notices','tickets','inquiries','reservations'])if(!Array.isArray(w[k])||w[k].length>5000)return false;
  if(!w.steps||typeof w.steps!=='object'||!Object.values(w.steps).every(Number.isFinite)||!w.randomAt||!Object.values(w.randomAt).every(Number.isFinite)||!w.read||typeof w.read!=='object')return false;
  if(!w.contacts.every(x=>typeof x==='string')||!w.fired.every(x=>typeof x==='string'))return false;
  for(const k of ['messages','posts','replies','dms'])if(!w[k].every(m=>m&&typeof m.text==='string'&&m.text.length<=20000&&Number.isFinite(m.at)&&Math.abs(m.at)<8e15))return false;
  if(!w.scheduled.every(m=>m&&typeof m.id==='string'&&typeof m.contact==='string'&&typeof m.text==='string'&&Number.isFinite(m.at)))return false;
  if(w.member&&(!w.member.username||!w.member.number||typeof w.member.name!=='string'||typeof w.member.hash!=='string'||typeof w.member.salt!=='string'||!Number.isFinite(w.member.joined)))return false;
  if(!w.likes.every(x=>typeof x==='string')||!w.tickets.every(x=>typeof x==='string'))return false;
  if(!w.notices.every(n=>n&&typeof n.id==='string'&&typeof n.title==='string'&&typeof n.text==='string'&&typeof n.route==='string'&&!/^[a-z]+:|^\/\//i.test(n.route)&&Number.isFinite(n.at)))return false;
  if(!w.reservations.every(r=>r&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&typeof r.name==='string'&&Number.isInteger(r.start)&&r.start>=10&&r.start<=19&&[2,3,4].includes(r.hours)&&r.start+r.hours<=21&&Number.isInteger(r.people)&&r.people>=1&&r.people<=20&&Number.isFinite(r.price)))return false;
  if(!w.inquiries.every(r=>r&&typeof r.text==='string'&&typeof r.name==='string'&&Number.isFinite(r.at)))return false;
  if(!w.messages.every(m=>['sent','received'].includes(m.role)&&typeof m.contact==='string'&&(!m.image||(/^media\/[a-zA-Z0-9_./-]+$/.test(m.image)&&!m.image.includes('..')))))return false;
  return true;
}
