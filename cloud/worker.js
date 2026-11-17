import {validateConfig} from '../assets/world.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
async function authenticated(request,env){if(!env.EDITOR_KEY||env.EDITOR_KEY.length<24)return false;const supplied=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';if(supplied.length>256)return false;const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [a,b]=await Promise.all([hash(supplied),hash(env.EDITOR_KEY)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;}
async function body(request){if(Number(request.headers.get('Content-Length'))>1800000)throw Error('内容が大きすぎます。画像を小さくしてください。');const reader=request.body?.getReader();if(!reader)throw Error('送信内容がありません。');let size=0;const chunks=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1800000){await reader.cancel();throw Error('内容が大きすぎます。画像を小さくしてください。');}chunks.push(value);}const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(all));}
export default {async fetch(request,env){const origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',');if(origin&&!allowed.includes(origin))return json({error:'このサイトからは接続できません。'},403);let response;try{response=await handle(request,env);}catch(error){response=json({error:'処理できませんでした。入力内容と接続を確認してください。'},500);}const headers=new Headers(response.headers);if(origin)headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Methods','GET, PUT, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('X-Content-Type-Options','nosniff');return new Response(response.body,{status:response.status,headers});}};
async function handle(request,env){const path=new URL(request.url).pathname;
 if(path==='/access'&&request.method==='GET')return json({publicEditing:env.PUBLIC_EDITING==='true'});
 if(request.method==='OPTIONS')return new Response(null,{status:204});
 if(path==='/public'&&request.method==='GET'){const row=await env.DB.prepare('SELECT published,published_revision FROM content WHERE id=1').first();return row?.published?json({config:JSON.parse(row.published),revision:row.published_revision}):json({error:'公開内容がありません。'},404);}
 if(env.PUBLIC_EDITING!=='true'&&!await authenticated(request,env))return json({error:'編集キーが違うか、接続の設定が完了していません。'},401);
 if(path==='/publication'&&request.method==='GET'){const row=await env.DB.prepare('SELECT revision,published_revision FROM content WHERE id=1').first();return json(row);}
 if(path==='/draft'&&request.method==='GET'){const row=await env.DB.prepare('SELECT draft,revision,published_revision,updated_at FROM content WHERE id=1').first();return json({...row,config:row.draft?JSON.parse(row.draft):null,draft:undefined});}
 if(path==='/history'&&request.method==='GET'){const {results}=await env.DB.prepare('SELECT revision,published_at,title FROM history ORDER BY revision DESC LIMIT 20').all();return json(results);}
 if(/^\/history\/\d+$/.test(path)&&request.method==='GET'){const row=await env.DB.prepare('SELECT content FROM history WHERE revision=?').bind(Number(path.split('/').pop())).first();return row?json({config:JSON.parse(row.content)}):json({error:'履歴がありません。'},404);}
 if((path==='/draft'&&request.method==='PUT')||(path==='/publish'&&request.method==='POST')){
  let data;try{data=await body(request);}catch(e){return json({error:e.message},400);}if(!Number.isInteger(data.revision)||data.revision<0)return json({error:'公開画面を開き直してください。'},400);
  if(path==='/draft'){let errors;try{errors=validateConfig(data.config);}catch{errors=['設定の形式が不正です。'];}if(errors.length)return json({error:errors.join('\n')},400);const row=await env.DB.prepare("UPDATE content SET draft=?,revision=revision+1,updated_at=datetime('now') WHERE id=1 AND revision=? RETURNING revision").bind(JSON.stringify(data.config),data.revision).first();return row?json(row):json({error:'他の人が更新しました。あなたの下書きを残したまま保存を中止しました。最新の下書きを開いて変更を確認してください。'},409);}
  if(data.confirmPublish!==true)return json({error:'公開前の確認が必要です。'},400);
  if(data.title!==undefined&&(typeof data.title!=='string'||data.title.trim().length>80))return json({error:'変更名は80文字以内で入力してください。'},400);
  const title=(data.title||'').trim();
  if(data.config!==undefined){
   let errors;try{errors=validateConfig(data.config);}catch{errors=['設定の形式が不正です。'];}if(errors.length)return json({error:errors.join('\n')},400);
   const content=JSON.stringify(data.config);
   // The conditional update and history insert commit together; competing publishers cannot overwrite each other.
   const result=await env.DB.batch([
    env.DB.prepare("UPDATE content SET draft=?,published=?,revision=revision+1,published_revision=revision+1,updated_at=datetime('now') WHERE id=1 AND revision=? RETURNING revision").bind(content,content,data.revision),
    env.DB.prepare("INSERT OR IGNORE INTO history(revision,content,published_at,title) SELECT revision,published,datetime('now'),? FROM content WHERE id=1 AND revision=? AND published=?").bind(title,data.revision+1,content),
    env.DB.prepare('DELETE FROM history WHERE revision NOT IN (SELECT revision FROM history ORDER BY revision DESC LIMIT 20)')
   ]);
   return result[0].results.length?json(result[0].results[0]):json({error:'他の人が更新しました。手元の編集は残っています。公開履歴を確認し、この画面を開き直してから公開してください。'},409);
  }
  const result=await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO history(revision,content,published_at,title) SELECT revision,draft,datetime('now'),? FROM content WHERE id=1 AND revision=? AND draft IS NOT NULL").bind(title,data.revision),env.DB.prepare('UPDATE content SET published=draft,published_revision=revision WHERE id=1 AND revision=? AND draft IS NOT NULL RETURNING revision').bind(data.revision),env.DB.prepare('DELETE FROM history WHERE revision NOT IN (SELECT revision FROM history ORDER BY revision DESC LIMIT 20)')]);return result[1].results.length?json(result[1].results[0]):json({error:'下書きが更新されています。最新の内容を確認してから公開してください。'},409);
 }
 return json({error:'見つかりません。'},404);
}
