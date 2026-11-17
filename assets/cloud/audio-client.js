import {cloudEndpoint,editorKey,cloudRequest} from './client.js';
import {MAX_AUDIO_BYTES,isMp3,audioId} from '../audio-assets.js';

const names = new Map();
export async function audioName(ref) {
  const id = audioId(ref);
  if (!id) return ref.split('/').pop();
  if (!names.has(ref)) names.set(ref,cloudRequest(`/audio/${id}/info`).then(data => data.name).catch(() => {names.delete(ref);return '添付した音声';}));
  return names.get(ref);
}

export async function uploadAudio(file,signal) {
  if (!/\.mp3$/i.test(file.name)) throw Error('MP3ファイルを選んでください。');
  if (file.size > MAX_AUDIO_BYTES) throw Error('音声は1つ10MBまでです。');
  if (!isMp3(new Uint8Array(await file.arrayBuffer()))) throw Error('MP3として読み取れません。音声をMP3形式で書き出し直してください。');
  if (signal.aborted) throw new DOMException('Aborted','AbortError');
  const endpoint = await cloudEndpoint();
  if (!endpoint) throw Error('音声の添付には共通保存先の接続が必要です。');
  const response = await fetch(`${endpoint}/audio`,{method:'POST',headers:{'Content-Type':'audio/mpeg','X-Audio-Name':encodeURIComponent(file.name),...(editorKey()?{Authorization:`Bearer ${editorKey()}`}:{})},body:file,signal});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || '音声を保存できませんでした。');
  if (!audioId(data.ref)) throw Error('音声の保存結果を読み取れません。');
  names.set(data.ref,Promise.resolve(data.name));
  return data.ref;
}
