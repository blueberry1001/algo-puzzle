const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function richText(text,{hashtag,mention}={}){
 const pattern=/https?:\/\/[^\s<>"'、。！？]+|[#＃]([\p{L}\p{N}\p{M}_]+)|@([A-Za-z0-9_]+)/gu;let result='',last=0;
 for(const match of String(text??'').matchAll(pattern)){
  result+=escape(text.slice(last,match.index));let value=match[0];
  if(/^https?:\/\//i.test(value)){const clean=value.replace(/[.,!?:;）)\]】]+$/u,'');const tail=value.slice(clean.length);try{const parsed=new URL(clean);result+=`<a class="content-url" href="${escape(parsed.href)}" target="_blank" rel="noopener noreferrer">${escape(clean)}</a>${escape(tail)}`;}catch{result+=escape(value);}}
  else result+=match[1]&&hashtag?hashtag(match[1],value):match[2]&&mention?mention(match[2],value):escape(value);
  last=match.index+value.length;
 }
 return (result+escape(String(text??'').slice(last))).replaceAll('\n','<br>');
}
