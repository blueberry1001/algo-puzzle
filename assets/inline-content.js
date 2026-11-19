import {para,link,photo,esc} from './ui.js';
import {assetRef} from './media-assets.js';

export function memberBody(text,contacts){
  return (text||'').split(/(\{\{contact:[\w-]+\}\})/g).map(part=>{
    const id=/^\{\{contact:([\w-]+)\}\}$/.exec(part)?.[1];
    if(!id)return part.trim()?para(part):'';
    const person=contacts.find(c=>c.id===id);
    return person?link('?clubInvite='+encodeURIComponent(id),esc(person.name)+'をTALKに追加','button secondary',true):'';
  }).join('');
}

export function salonBody(text){
  return (text||'').split(/(\{\{image:asset:[a-f0-9]{64}\.(?:webp|jpg|png)\}\})/g).map(part=>{
    const ref=part.startsWith('{{image:')?part.slice(8,-2):'';
    if(assetRef(ref))return photo(ref,'記事の挿図','salon-inline-image');
    return part.trim()?para(part):'';
  }).join('');
}
