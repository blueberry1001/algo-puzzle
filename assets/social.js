import { readState, initialState, STORAGE_KEY } from './state.js';
import { icon, storageFailure } from './common.js';
const posts = [
  { text: '誰かに届くかわからないけれど、\nここに記録を残しておく。', date: '2026/9/12' },
  { text: '赤い実を見つけた。\n止まっていた時間が、少しだけ動き出した。', detail: '次の手がかりは、オレンジ色の実。' },
  { text: 'ふたつの言葉が、ひとつの道になった。\nやっと、次へ進めそうだ。ありがとう。', detail: 'りんご。そして、みかん。\nこの記録を見つけてくれたあなたへ。' },
];
let state = initialState();
let storage;
try { storage = window.localStorage; state = readState(storage); } catch { storageFailure(); }
const liked = new Set();
const feed = document.querySelector('#feed');
function render() {
  feed.replaceChildren();
  document.querySelector('#post-count').textContent = `${state.step + 1}件の投稿`;
  for (let i = state.step; i >= 0; i--) {
    const post = posts[i]; const article = document.createElement('article'); article.className = 'post'; article.dataset.step = i;
    const avatar = document.createElement('span'); avatar.className = 'post-avatar'; avatar.textContent = 'H'; avatar.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div'); content.className = 'post-content';
    const header = document.createElement('header'); header.className = 'post-header';
    const name = document.createElement('strong'); name.textContent = 'ハル';
    const handle = document.createElement('span'); handle.textContent = '@haru_notes';
    const time = document.createElement('time');
    if (i > 0) { const date = new Date(state.unlockedAt[i - 1]); time.dateTime = date.toISOString(); time.textContent = date.toLocaleDateString('ja-JP'); }
    else { time.dateTime = '2026-09-12'; time.textContent = post.date; }
    header.append(name, handle, time);
    const body = document.createElement('p'); body.className = 'post-text'; body.textContent = post.text;
    content.append(header, body);
    if (post.detail) { const detail = document.createElement('p'); detail.className = 'post-detail'; detail.textContent = post.detail; content.append(detail); }
    const like = document.createElement('button'); like.className = 'like-button'; like.type = 'button';
    const setLike = () => { like.innerHTML = `${icon('heart')}<span>${liked.has(i) ? '1' : ''}</span>`; like.setAttribute('aria-pressed', String(liked.has(i))); like.setAttribute('aria-label', liked.has(i) ? 'いいねを取り消す' : 'いいね'); };
    like.addEventListener('click', () => { liked.has(i) ? liked.delete(i) : liked.add(i); setLike(); }); setLike(); content.append(like);
    article.append(avatar, content); feed.append(article);
  }
}
let timer;
function sync() {
  try {
    const next = readState(storage); const changed = next.step !== state.step;
    const increased = next.step > state.step; state = next;
    if (changed) {
      if (!increased) liked.clear(); render();
      const toast = document.querySelector('#update-toast'); toast.textContent = increased ? '新しい記録が届きました' : '記録が最初の状態に戻りました'; toast.hidden = false;
      clearTimeout(timer); timer = setTimeout(() => { toast.hidden = true; }, 3500);
    }
  } catch { storageFailure(); }
}
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY || e.key === null) sync(); });
window.addEventListener('pageshow', sync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
render();
