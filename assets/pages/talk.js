import {clubSettings} from '../club-content.js';
import {imagesOf} from '../world.js';
import {videosHTML,keepVideos} from './studio-media.js';
import {audioPlayer,keepAudioPlayers} from '../audio-player.js';
import {current,scenario,clock,transact,subscribe,reset,requestNotifications,url} from '../runtime.js';
import {chatSend,unlockContact,chatBusy,pendingTyping,replyAudios} from '../world.js';
import {esc,icon,avatar,link,photo,onForm,action,toast,confirmAction,noticePanel,textLinks} from '../ui.js';
const app=document.querySelector('#app');const params=new URLSearchParams(location.search);let contact=params.get('contact')||'haru';let mobileList=false;let draft='';let renderedSignature='',renderedConfig;
if(params.has('clubInvite')){
 const id=params.get('clubInvite');
 await transact((w,c)=>{
   const pages=clubSettings(c).pages||{};
   const offered=Object.values(pages).some(page=>page.text?.includes('{{contact:'+id+'}}'));
   if(w.signedIn&&w.member&&offered&&c.contacts.some(person=>person.id===id)&&!w.contacts.includes(id))w.contacts.push(id);
   return w;
 });
 if(current().contacts.includes(id))contact=id;
}
if(params.has('add')){await transact((w,c)=>unlockContact(w,c,params.get('add')));contact=params.get('add');}
if(!current().contacts.includes(contact))contact='haru';
let composing=false;
function render(force=true){
 if(!force&&composing)return;
 composing=false;
 if(!current().contacts.includes(contact))contact='haru';
 const w=current(),c=scenario(),person=c.contacts.find(a=>a.id===contact)||c.contacts[0];
 const busy=chatBusy(w,clock()),typing=pendingTyping(w,clock());
 const signature=JSON.stringify({contact,mobileList,messages:w.messages,contacts:w.contacts,read:w.read,typing:typing?.id,busy});
 if(!force&&renderedConfig===c&&renderedSignature===signature)return;

 const restoreAudio=keepAudioPlayers(app),restoreVideo=keepVideos(app);
 const conversation=w.messages.filter(m=>m.contact===contact);
 app.innerHTML=`<div class="talk-layout ${mobileList?'show-contacts':''}"><aside class="talk-sidebar"><a class="talk-logo" href="${url('')}">${icon('chat',30)} TALK</a><div class="sidebar-heading"><h1>トーク</h1><button class="icon-button" id="notifications" aria-label="お知らせ">${icon('bell')}</button></div><nav class="contact-list" aria-label="連絡先">${c.contacts.filter(a=>w.contacts.includes(a.id)).map(a=>{const last=w.messages.filter(m=>m.contact===a.id).at(-1);const unread=w.messages.filter(m=>m.contact===a.id&&m.role==='received'&&m.at>(w.read[a.id]||0)).length;return `<button data-contact="${a.id}" class="contact-item ${a.id===contact?'selected':''}">${avatar(a)}<span><strong>${esc(a.name)}</strong><small>${esc(last?.text||'')}</small></span>${unread?`<b class="unread">${unread}</b>`:''}</button>`;}).join('')}</nav><div class="sidebar-bottom"><button id="notify-opt" class="text-button">ブラウザ通知を設定</button></div></aside><main class="talk-main"><header class="talk-header"><button id="contacts-toggle" class="icon-button" aria-label="連絡先一覧">${icon('back')}</button>${avatar(person)}<div><h2>${esc(person.name)}</h2><small><i></i>オンライン</small></div><span class="contact-tag">${esc(person.tag)}</span></header><div class="talk-messages" id="messages" role="log" aria-label="会話履歴"><div class="day-divider">${esc(person.name)}とのトーク</div>${conversation.map(m=>`<div class="message ${m.role}"><div class="message-content">${m.text?`<p>${textLinks(m.text)}</p>`:''}${m.sharedAccount&&c.accounts.some(a=>a.id===m.sharedAccount)?(()=>{const a=c.accounts.find(a=>a.id===m.sharedAccount);return link(`sns/?view=profile&account=${encodeURIComponent(a.id)}`,`${avatar(a)}<span>${esc(a.name)}<small>@${esc(a.handle)}</small></span>`,'shared-account');})():''}${imagesOf(m).map(path=>`<a href="${esc(url(path))}" target="_blank" rel="noopener">${photo(path,'届いた画像','message-image')}</a>`).join('')}${videosHTML(m.videos,m.id)}${replyAudios(m).map((audio,i)=>audioPlayer(audio,`${m.id}:${i}`)).join('')}${m.invite?`<button class="invite-link" data-invite="${esc(m.invite)}">${icon('user',18)}${esc(c.contacts.find(a=>a.id===m.invite)?.name)}を連絡先に追加 ${icon('arrow',16)}</button>`:''}</div>${m.role==='received'&&m.text?`<button type="button" class="message-copy" data-copy-message="${esc(m.id)}" aria-label="返信をコピー">コピー</button>`:''}<small>${m.role==='sent'?'既読<br>':''}${new Date(m.at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join('')}</div><div class="talk-composer">${busy?`<div class="talk-typing" role="status">${esc(c.contacts.find(a=>a.id===typing?.contact)?.name||person.name)}が入力中<span aria-hidden="true">···</span></div>`:''}<form id="talk-form"><label class="sr-only" for="talk-input">メッセージ</label><input id="talk-input" ${busy?'disabled':''} name="text" autocomplete="off" maxlength="1000" placeholder="メッセージを入力" value="${esc(draft)}" required><button type="submit" ${busy?'disabled':''} class="send-button" aria-label="送信">${icon('send')}</button></form></div></main></div>`;
 app.querySelectorAll('[data-contact]').forEach(b=>b.onclick=()=>{const opened=b.dataset.contact;contact=opened;mobileList=false;draft='';history.replaceState(null,'',`?contact=${opened}`);render();action(async()=>{await transact(w=>{w.read[opened]=clock();return w;});});});
 app.querySelectorAll('[data-invite]').forEach(b=>b.onclick=()=>action(async()=>{await transact((w,c)=>unlockContact(w,c,b.dataset.invite));contact=b.dataset.invite;draft='';history.replaceState(null,'',`?contact=${contact}`);render();toast('連絡先に追加しました。');}));
 app.querySelectorAll('[data-copy-message]').forEach(b=>b.onclick=()=>action(async()=>{const m=current().messages.find(m=>m.id===b.dataset.copyMessage);if(m){await navigator.clipboard.writeText(m.text);toast('コピーしました。');}}));
 document.querySelector('#contacts-toggle').onclick=()=>{mobileList=true;render();};
 document.querySelector('#notifications').onclick=noticePanel;
 document.querySelector('#notify-opt').onclick=()=>action(async()=>toast(await requestNotifications()));
 const input=document.querySelector('#talk-input');input.oninput=()=>draft=input.value;input.addEventListener('compositionstart',()=>{composing=true;});
 input.addEventListener('compositionend',()=>{draft=input.value;composing=false;render(false);});input.onkeydown=e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault();};
 onForm('talk-form',async d=>{if(!d.text.trim())return;
  const recipient=contact;
  draft='';
  try{
    await transact((w,c,n)=>{
      if(chatBusy(w,n))throw Error('返信が届いてからもう一度送ってください。');
      return chatSend(w,c,recipient,d.text,n);
    });
  }catch(error){
    if(contact===recipient){draft=d.text;document.querySelector('#talk-input').value=draft;}
    throw error;
  }
  if(contact===recipient)document.querySelector('#talk-input')?.focus();});
 restoreAudio();restoreVideo();
 const log=document.querySelector('#messages');log.scrollTop=log.scrollHeight;renderedSignature=signature;renderedConfig=c;
}
subscribe(()=>render(false));render();
