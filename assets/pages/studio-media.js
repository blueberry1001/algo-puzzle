import {cloudEndpoint,editorKey} from '../cloud/client.js';
import {esc,toast,action} from '../ui.js';
import {url} from '../runtime.js';
export function imageField(name,value='',label='画像') {return `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" data-upload-image><input type="file" accept="image/png,image/jpeg,image/webp" data-media-target="${name}"></label>`;}
export function imagesField(name,item){
 const refs=item.images??(item.image?[item.image]:[]);
 return `<label class="field"><span>画像（複数選択可）</span><textarea name="${name}" rows="2">${esc(refs.join('\n'))}</textarea><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-media-target="${name}"></label>`;
}
export function videoField(name,refs=[]) {return `<label class="field"><span>動画（MP4・WebM）</span><textarea name="${name}" data-upload-video>${esc(refs.join('\n'))}</textarea><input type="file" accept="video/mp4,video/webm" multiple data-media-target="${name}"></label>`;}
export async function uploadMedia(file,icon=false) {
 if(file.size>10000000)throw Error('添付は1ファイル10MBまでです。');
 if(file.type.startsWith('image/')){
  const bitmap=await createImageBitmap(file),limit=icon?256:1600,scale=Math.min(1,limit/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));if(!blob)throw Error('画像を読み込めませんでした。');file=new File([blob],'image.webp',{type:'image/webp'});
 }
 const endpoint=await cloudEndpoint();if(!endpoint)throw Error('共通保存先に接続してください。');
 const response=await fetch(endpoint+'/media',{method:'POST',headers:{'X-Audio-Name':encodeURIComponent(file.name),'Content-Type':file.type,...(editorKey()?{Authorization:'Bearer '+editorKey()}: {})},body:file,signal:AbortSignal.timeout(120000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'添付できませんでした。');return result.ref;
}
export function bindMediaFields(root){
 root.querySelectorAll('[data-media-target]').forEach(picker=>picker.onchange=()=>action(async()=>{
  const target=root.querySelector(`[name="${picker.dataset.mediaTarget}"]`),files=[...picker.files],multiple=target.matches('textarea');picker.value='';picker.disabled=true;
  try{if(multiple&&files.length+target.value.split('\n').filter(Boolean).length>20)throw Error('添付は20件までです。');for(const file of files){const ref=await uploadMedia(file,/icon/i.test(target.name));target.value=multiple?[target.value,ref].filter(Boolean).join('\n'):ref;target.dispatchEvent(new Event('input',{bubbles:true}));}toast('添付しました。');}finally{picker.disabled=false;}
 }));
}
export const videosHTML = (refs,key='') => (refs||[]).map((ref,i)=>`<video data-video-key="${esc(key+':'+i)}" controls playsinline preload="none" src="${esc(url(ref))}" style="width:100%;max-height:420px"></video>`).join('');

export function keepVideos(root){const old=new Map([...root.querySelectorAll('[data-video-key]')].map(v=>[v.dataset.videoKey,v]));return()=>{root.querySelectorAll('[data-video-key]').forEach(v=>{const previous=old.get(v.dataset.videoKey);if(previous&&previous.src===v.src){v.replaceWith(previous);old.delete(v.dataset.videoKey);}});old.forEach(v=>v.pause());};}
