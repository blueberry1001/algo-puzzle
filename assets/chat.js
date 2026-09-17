import { initialState, sendMessage, readState, saveState, STORAGE_KEY } from './state.js';
import { icon, storageFailure, timeLabel } from './common.js';
const conversation = document.querySelector('#conversation');
const input = document.querySelector('#message');
const send = document.querySelector('#send');
let state = initialState();
let storage;
try { storage = window.localStorage; state = readState(storage); } catch { storageFailure(); }

function bubble(text, role, at) {
  const row = document.createElement('div'); row.className = `message-row ${role}`;
  const body = document.createElement('p'); body.className = 'bubble'; body.textContent = text;
  const meta = document.createElement('span'); meta.className = 'message-meta';
  meta.textContent = `${role === 'sent' ? '既読\n' : ''}${at ? timeLabel(at) : '10:14'}`;
  row.append(body, meta); return row;
}
function render() {
  conversation.replaceChildren();
  const date = document.createElement('div'); date.className = 'day-label'; date.textContent = 'ハルとのトーク'; conversation.append(date);
  conversation.append(bubble('やっとつながった。\n連絡ありがとう。', 'received'));
  conversation.append(bubble('見つけた言葉を、ここに送って。\n僕の記録も、何か変わるかもしれない。', 'received'));
  const row = document.createElement('div'); row.className = 'message-row received';
  const link = document.createElement('a'); link.className = 'bubble record-link'; link.href = 'sns/'; link.target = '_blank'; link.rel = 'noopener';
  link.innerHTML = `ハルの記録を見る ${icon('arrow')}<span class="sr-only">（新しいタブで開く）</span>`; row.append(link); conversation.append(row);
  for (const m of state.messages) conversation.append(bubble(m.text, m.role, m.at));
  conversation.scrollTop = conversation.scrollHeight;
}
input.addEventListener('input', () => { send.disabled = !input.value.trim(); });
input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) e.preventDefault(); });
document.querySelector('#message-form').addEventListener('submit', e => {
  e.preventDefault();
  if (!input.value.trim()) return;
  try {
    const next = sendMessage(readState(storage), input.value);
    saveState(storage, next); state = next;
    input.value = ''; send.disabled = true; render(); input.focus();
  } catch { storageFailure(); }
});
const dialog = document.querySelector('#reset-dialog');
document.querySelector('#reset').addEventListener('click', () => dialog.showModal());
dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'reset') return;
  try { const next = initialState(); saveState(storage, next); state = next; input.value = ''; send.disabled = true; render(); input.focus(); }
  catch { storageFailure(); }
});
function sync() { try { state = readState(storage); render(); } catch { storageFailure(); } }
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY || e.key === null) sync(); });
window.addEventListener('pageshow', sync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
render();
