import {cloudEndpoint,cloudRequest,editorKey} from './client.js';
import {esc,modal,onForm,action,toast,confirmAction} from '../ui.js';
const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./editor.css',import.meta.url).href;document.head.append(style);
let editingRevision=null;
const historyDate=value=>{const date=new Date(value.replace(' ','T')+'Z');return Number.isNaN(date.valueOf())?'':new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date);};
export function cloudActions(){return '<button id="cloud-panel" class="button studio-publish-button" type="button">変更を反映する</button>';}
export function bindCloud({getDraft,loadDraft,saveForm,applyPreview}){document.querySelector('#cloud-panel')?.addEventListener('click',()=>action(async()=>{
 const endpoint=await cloudEndpoint();
 if(!endpoint){modal('変更を反映する','<p>共通保存先はまだ接続されていません。</p>');return;}
 const {publicEditing}=await cloudRequest('/access');if(publicEditing)editorKey('');
 const dlg=modal('変更を反映する',`${publicEditing?'':`<form id="cloud-login" class="editor-form"><label class="field full"><span>編集キー</span><input type="password" name="key" autocomplete="current-password" required value="${esc(editorKey())}"></label><button type="submit" class="button secondary">接続</button></form>`}<div id="cloud-controls" hidden><p id="cloud-status" role="status"></p><div class="actions"><button id="cloud-open" class="button secondary">共有下書きを開く</button><button id="cloud-save" class="button secondary">共有下書きに保存</button><button id="cloud-publish" class="button">全員に公開</button>${publicEditing?'':'<button id="cloud-logout" class="text-button">接続を解除</button>'}</div><section class="cloud-history-section" aria-labelledby="cloud-history-heading"><h3 id="cloud-history-heading">公開履歴</h3><ul id="cloud-history" class="cloud-history"></ul></section></div>`);
 dlg.classList.add('cloud-dialog');
 const base=()=>editingRevision;
 const remember=revision=>{editingRevision=revision;};
 const status=async()=>{const remote=await cloudRequest('/draft');dlg.querySelector('#cloud-controls').hidden=false;dlg.querySelector('#cloud-status').textContent=`共有下書き：版 ${remote.revision}　公開中：版 ${remote.published_revision}`;const history=await cloudRequest('/history');dlg.querySelector('#cloud-history').innerHTML=history.map(h=>`<li class="cloud-history-row"><div class="cloud-history-info"><div class="cloud-history-title"><strong>${esc(h.title||`版 ${h.revision}`)}</strong>${h.revision===remote.published_revision?'<span class="cloud-current">公開中</span>':''}</div><p class="cloud-history-meta">${h.title?`<span>版 ${h.revision}</span>`:''}<time datetime="${esc(h.published_at.replace(' ','T')+'Z')}">${esc(historyDate(h.published_at))}</time></p></div><button class="button secondary small cloud-restore" data-version="${h.revision}" aria-label="${esc(h.title||`版 ${h.revision}`)}を下書きに戻す">下書きに戻す</button></li>`).join('')||'<li class="cloud-history-empty">まだ公開履歴はありません。</li>';dlg.querySelectorAll('[data-version]').forEach(b=>b.onclick=()=>confirmAction('履歴を下書きに戻す','現在の編集内容をこの版で置き換えます。公開内容はまだ変わりません。',async()=>{const latest=await cloudRequest('/draft');const previous=await cloudRequest('/history/'+b.dataset.version);await loadDraft(previous.config);remember(latest.revision);dlg.close();toast('下書きに戻しました。確認してから公開してください。');}));return remote;};
 onForm('cloud-login',async d=>{editorKey(d.key.trim());await status();});
 dlg.querySelector('#cloud-logout')?.addEventListener('click',()=>{editorKey('');dlg.close();});
 dlg.querySelector('#cloud-open').onclick=()=>confirmAction('共有下書きを開く','今の編集内容を共有下書きで置き換えます。',async()=>{const remote=await cloudRequest('/draft');if(remote.config)await loadDraft(remote.config);remember(remote.revision);dlg.close();toast(remote.config?'共有下書きを開きました。':'まだ下書きがありません。現在の内容を保存できます。');});
 async function save(){if(base()===null)throw Error('先に「共有下書きを開く」を押してください。');if(!saveForm())throw Error('入力内容を確認してください。');const config=structuredClone(getDraft());const result=await cloudRequest('/draft','PUT',{revision:base(),config});remember(result.revision);await applyPreview(config);return result.revision;}
 dlg.querySelector('#cloud-save').onclick=()=>action(async()=>{await save();await status();toast('共有下書きに保存しました。');});
 dlg.querySelector('#cloud-publish').onclick=()=>{
  const confirmation=modal('全員に公開する',`<form id="cloud-publish-form"><label class="cloud-change-name" for="cloud-change-title">変更名（任意）<input id="cloud-change-title" name="title" maxlength="80" placeholder="例：第3章の会話を追加"></label><p class="cloud-publish-warning">このサイトを使用する全員の環境に反映されます。よろしいですか？</p><div class="actions"><button type="button" class="button secondary" data-cancel>キャンセル</button><button type="submit" class="button">公開する</button></div></form>`);
  confirmation.querySelector('[data-cancel]').onclick=()=>confirmation.close();
  onForm('cloud-publish-form',async d=>{const revision=await save();await cloudRequest('/publish','POST',{revision,confirmPublish:true,title:d.title.trim()});await status();confirmation.close();toast('公開しました。');});
 };

 if(publicEditing||editorKey())await status();
}));}
