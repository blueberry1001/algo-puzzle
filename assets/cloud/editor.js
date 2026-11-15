import {cloudEndpoint,cloudRequest,editorKey} from './client.js';
import {esc,modal,onForm,action,toast,confirmAction} from '../ui.js';
let editingRevision=null;
export function cloudActions(){return '<button id="cloud-panel" class="button secondary" type="button">共有・公開</button>';}
export function bindCloud({getDraft,loadDraft,saveForm,applyPreview}){document.querySelector('#cloud-panel')?.addEventListener('click',()=>action(async()=>{
 const endpoint=await cloudEndpoint();
 if(!endpoint){modal('共有・公開','<p>共通保存先はまだ接続されていません。</p>');return;}
 const dlg=modal('共有・公開',`<form id="cloud-login" class="editor-form"><label class="field full"><span>編集キー</span><input type="password" name="key" autocomplete="current-password" required value="${esc(editorKey())}"></label><button type="submit" class="button secondary">接続</button></form><div id="cloud-controls" hidden><p id="cloud-status" role="status"></p><div class="actions"><button id="cloud-open" class="button secondary">共有下書きを開く</button><button id="cloud-save" class="button secondary">共有下書きに保存</button><button id="cloud-publish" class="button">全員に公開</button><button id="cloud-logout" class="text-button">接続を解除</button></div><h3>公開履歴</h3><div id="cloud-history"></div></div>`);
 const base=()=>editingRevision;
 const remember=revision=>{editingRevision=revision;};
 const status=async()=>{const remote=await cloudRequest('/draft');dlg.querySelector('#cloud-controls').hidden=false;dlg.querySelector('#cloud-status').textContent=`共有下書き：版 ${remote.revision}　公開中：版 ${remote.published_revision}`;const history=await cloudRequest('/history');dlg.querySelector('#cloud-history').innerHTML=history.map(h=>`<button class="text-button" data-version="${h.revision}">版 ${h.revision} を下書きに戻す</button>`).join('')||'<p>まだ公開履歴はありません。</p>';dlg.querySelectorAll('[data-version]').forEach(b=>b.onclick=()=>confirmAction('履歴を下書きに戻す','現在の編集内容をこの版で置き換えます。公開内容はまだ変わりません。',async()=>{const latest=await cloudRequest('/draft');const previous=await cloudRequest('/history/'+b.dataset.version);await loadDraft(previous.config);remember(latest.revision);dlg.close();toast('下書きに戻しました。確認してから公開してください。');}));return remote;};
 onForm('cloud-login',async d=>{editorKey(d.key.trim());await status();});
 dlg.querySelector('#cloud-logout').onclick=()=>{editorKey('');dlg.close();};
 dlg.querySelector('#cloud-open').onclick=()=>confirmAction('共有下書きを開く','今の編集内容を共有下書きで置き換えます。',async()=>{const remote=await cloudRequest('/draft');if(remote.config)await loadDraft(remote.config);remember(remote.revision);dlg.close();toast(remote.config?'共有下書きを開きました。':'まだ下書きがありません。現在の内容を保存できます。');});
 async function save(){if(base()===null)throw Error('先に「共有下書きを開く」を押してください。');if(!saveForm())throw Error('入力内容を確認してください。');const config=structuredClone(getDraft());const result=await cloudRequest('/draft','PUT',{revision:base(),config});remember(result.revision);await applyPreview(config);return result.revision;}
 dlg.querySelector('#cloud-save').onclick=()=>action(async()=>{await save();await status();toast('共有下書きに保存しました。');});
 dlg.querySelector('#cloud-publish').onclick=()=>confirmAction('全員に公開する','編集中の内容を保存して公開します。プレイヤーには次にページを開いたときに反映されます。',async()=>{const revision=await save();await cloudRequest('/publish','POST',{revision});await status();toast('公開しました。');});
 if(editorKey())await status();
}));}
