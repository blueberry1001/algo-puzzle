import {current,scenario,transact,subscribe,url} from '../runtime.js';
import {esc,link,para,available,photo,onForm,footer} from '../ui.js';
const app=document.querySelector('#app'),params=new URLSearchParams(location.search);
const view=['articles','questions','join'].includes(params.get('view'))?params.get('view'):'articles',id=params.get('id');
let pendingName='';
function render(){
 const w=current(),member=w.salonMember;let content='';
 if(view==='join'){
  content=member?`<section class="salon-enroll"><h1>入会が完了しています</h1><p>${esc(member.name)}さん、ようこそ。</p>${link('salon/?view=articles','会員限定記事を読む','button')}</section>`:pendingName?`<section class="salon-enroll"><h1>入会内容の確認</h1><dl class="data-list"><div><dt>お名前</dt><dd>${esc(pendingName)}</dd></div></dl><form id="salon-confirm"><button type="submit" class="button wide">入会を完了する</button></form><button id="salon-back" class="text-button">入力に戻る</button></section>`:`<section class="salon-join-layout"><div class="salon-join-intro"><h1>才能を育てる<br>マネジメントを学ぶ。</h1><p>Hotaruと考えるタレントマネジメント。<br>活動のヒントを記事とQ&Aでお届けします。</p><ul><li>会員限定の記事を読む</li><li>質問コーナーで考え方を学ぶ</li></ul></div><section class="salon-enroll"><h2>入会ページ</h2><form id="salon-join"><label class="field"><span>お名前（ニックネーム）</span><input name="name" required maxlength="40" autocomplete="nickname"></label><label class="salon-agreement"><input name="agree" type="checkbox" required><span>会員限定の内容を無断で転載しないことに同意します</span></label><button type="submit" class="button wide">入会内容を確認する</button></form></section></section>`;
 }else if(!member){
  content=`<section class="salon-locked"><span class="salon-monogram" aria-hidden="true">H.</span><h1>${view==='questions'?'質問コーナー':'会員限定記事'}</h1><p>このページは会員限定です。</p>${link('salon/?view=join','入会ページへ','button')}</section>`;
 }else{
  const list=available(scenario()[view==='questions'?'salonQuestions':'salonArticles']||[]),selected=list.find(a=>a.id===id);
  const heading=view==='questions'?'質問コーナー':'会員限定記事';
  content=id?selected?`<article class="salon-reading">${link('salon/?view='+view,'一覧に戻る','back-link')}<h1>${esc(selected.title)}</h1>${selected.image?photo(selected.image,selected.title,'article-photo'):''}<div class="article-body">${para(selected.text)}</div></article>`:`<section class="salon-reading"><h1>この記事はまだ公開されていません</h1>${link('salon/?view='+view,'一覧に戻る','text-link')}</section>`:`<section class="salon-index"><div class="salon-index-heading"><h1>${heading}</h1><p>${esc(member.name)}さんのメンバーズページ</p></div>${list.length?list.map(a=>link(`salon/?view=${view}&id=${encodeURIComponent(a.id)}`,`<div><h2>${esc(a.title)}</h2><p>${esc(a.text.slice(0,90))}</p></div><span aria-hidden="true">→</span>`,'salon-entry')).join(''):'<p>公開中の記事はありません。</p>'}</section>`;
 }
 app.innerHTML=`<div class="salon-shell"><header class="salon-header">${link('salon/','Hotaru’s<span>Talent Management Labo</span>','salon-logo')}<nav aria-label="ページ切替">${[['articles','会員限定記事'],['questions','質問コーナー'],['join','入会ページ']].map(([v,t])=>link('salon/?view='+v,t,view===v?'active':'')).join('')}</nav></header><main>${content}</main>${footer('Hotaru’s Talent Management Labo')}</div>`;
 onForm('salon-join',d=>{if(!d.name.trim())throw new Error('お名前を入力してください。');pendingName=d.name.trim();render();});
 document.querySelector('#salon-back')?.addEventListener('click',()=>{const name=pendingName;pendingName='';render();document.querySelector('[name=name]').value=name;});
 onForm('salon-confirm',async()=>{if(!pendingName)return;await transact(w=>{if(!w.salonMember)w.salonMember={name:pendingName,joined:Date.now()};return w;});pendingName='';location.href=url('salon/?view=articles');});
}
subscribe(()=>{if(!document.querySelector('form:focus-within'))render();});render();
