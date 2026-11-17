import {MAX_AUDIO_BYTES,isMp3} from '../assets/audio-assets.js';
import {Buffer} from 'node:buffer';

// Separate from scenario storage so the upload feature can be removed later.
export const AUDIO_CHUNK_BYTES = 500_000;
export const AUDIO_STORAGE_BYTES = 150_000_000;
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const info = row => ({ref:`audio:${row.id}`,name:row.name,size:row.size});

export async function uploadAudio(request,env) {
  let name;
  try { name = decodeURIComponent(request.headers.get('X-Audio-Name') || '').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g,'').trim(); }
  catch { return json({error:'ファイル名を読み取れません。'},400); }
  if (!name || name.length > 200 || !/\.mp3$/i.test(name)) return json({error:'MP3ファイルを選んでください。'},400);
  if (Number(request.headers.get('Content-Length')) > MAX_AUDIO_BYTES) return json({error:'音声は1つ10MBまでです。'},413);
  const reader = request.body?.getReader();
  if (!reader) return json({error:'ファイルがありません。'},400);
  const chunks = []; let size = 0;
  while (true) {
    const {value,done} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_AUDIO_BYTES) { await reader.cancel(); return json({error:'音声は1つ10MBまでです。'},413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  if (!isMp3(bytes)) return json({error:'MP3として読み取れません。音声をMP3形式で書き出し直してください。'},400);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  const id = Array.from(hash,b => b.toString(16).padStart(2,'0')).join('');
  const existing = await env.DB.prepare('SELECT id,name,size FROM audio_files WHERE id=?').bind(id).first();
  if (existing) return json(info(existing));
  // The quota check and all chunks commit in one transaction, including concurrent uploads.
  const statements = [env.DB.prepare('INSERT INTO audio_files(id,name,size) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM audio_files WHERE id=?) AND (SELECT COALESCE(SUM(size),0) FROM audio_files)+?<=?').bind(id,name,size,id,size,AUDIO_STORAGE_BYTES)];
  for (let at = 0, part = 0; at < size; at += AUDIO_CHUNK_BYTES, part++) {
    const encoded = Buffer.from(bytes.buffer,at,Math.min(AUDIO_CHUNK_BYTES,size-at)).toString('base64');
    statements.push(env.DB.prepare('INSERT OR IGNORE INTO audio_chunks(file_id,part,data) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM audio_files WHERE id=?)').bind(id,part,encoded,id));
  }
  await env.DB.batch(statements);
  const saved = await env.DB.prepare('SELECT id,name,size FROM audio_files WHERE id=?').bind(id).first();
  return saved ? json(info(saved),201) : json({error:'音声の保存容量がいっぱいです。管理者に連絡してください。'},507);
}

export async function audioInfo(id,env) {
  const row = await env.DB.prepare('SELECT id,name,size FROM audio_files WHERE id=?').bind(id).first();
  return row ? json(info(row)) : json({error:'音声が見つかりません。'},404);
}

export function byteRange(value,size) {
  if (!value) return {start:0,end:size-1,partial:false};
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0,size-Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size-1,Number(match[2])) : size-1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size ? {start,end,partial:true} : null;
}

export async function serveAudio(request,id,env) {
  const row = await env.DB.prepare('SELECT size FROM audio_files WHERE id=?').bind(id).first();
  if (!row) return json({error:'音声が見つかりません。'},404);
  const headers = {'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Cache-Control':'public, max-age=31536000, immutable','ETag':`"${id}"`,'Content-Disposition':'inline; filename="audio.mp3"'};
  if (request.headers.get('If-None-Match') === headers.ETag) return new Response(null,{status:304,headers});
  const ifRange = request.headers.get('If-Range');
  const range = byteRange(request.method === 'HEAD' || (ifRange && ifRange !== headers.ETag) ? null : request.headers.get('Range'),row.size);
  if (!range) return new Response(null,{status:416,headers:{...headers,'Cache-Control':'no-store','Content-Range':`bytes */${row.size}`}});
  const {start,end,partial} = range;
  headers['Content-Length'] = String(end-start+1);
  if (partial) headers['Content-Range'] = `bytes ${start}-${end}/${row.size}`;
  let part = Math.floor(start/AUDIO_CHUNK_BYTES);
  // Base64 TEXT avoids D1's large number-array representation of BLOBs, on both writes and reads.
  // Fetch one bounded chunk at a time rather than materializing the whole file.
  const stream = request.method === 'HEAD' ? null : new ReadableStream({async pull(controller) {
    try {
      const chunk = await env.DB.prepare('SELECT data FROM audio_chunks WHERE file_id=? AND part=?').bind(id,part).first();
      if (!chunk) throw Error('Missing audio chunk');
      const bytes = Buffer.from(chunk.data,'base64'),at = part*AUDIO_CHUNK_BYTES;
      controller.enqueue(bytes.subarray(Math.max(0,start-at),Math.min(bytes.length,end-at+1)));
      part++;
      if (part*AUDIO_CHUNK_BYTES > end) controller.close();
    } catch(error) { controller.error(error); }
  }});
  let output=stream;
  // Workers ignores Content-Length on generic streams; a known length is needed by media clients.
  if (stream && typeof FixedLengthStream !== 'undefined') {
    const fixed=new FixedLengthStream(end-start+1);
    stream.pipeTo(fixed.writable).catch(() => {}); // Client cancellation also cancels the source.
    output=fixed.readable;
  }
  return new Response(output,{status:partial?206:200,headers});
}
