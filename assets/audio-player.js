import {base} from './runtime.js';
import {esc,toast} from './ui.js';
import {cloudEndpoint} from './cloud/client.js';
import {audioSource} from './audio-assets.js';

const endpoint = await cloudEndpoint().catch(() => '');
const playIcon = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M8 4.8a1 1 0 0 1 1.5-.86l11 7.2a1 1 0 0 1 0 1.72l-11 7.2A1 1 0 0 1 8 19.2Z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
let active;
const bound = new WeakSet();

export function audioPlayer(ref,key) {
  const src = audioSource(ref,base,endpoint);
  if (!src) return '';
  return `<span class="audio-message" data-audio-key="${esc(key)}"><button type="button" class="audio-play" aria-label="音声を再生" aria-pressed="false">${playIcon}</button><audio hidden preload="none" src="${esc(src)}"></audio></span>`;
}

// Reuse media elements across chat updates instead of restarting their downloads/playback.
export function keepAudioPlayers(root) {
  const old = new Map([...root.querySelectorAll('[data-audio-key]')].map(el => [el.dataset.audioKey,el]));
  return () => {
    root.querySelectorAll('[data-audio-key]').forEach(el => {
      const previous = old.get(el.dataset.audioKey);
      if (previous && previous.querySelector('audio').src === el.querySelector('audio').src) {
        el.replaceWith(previous); old.delete(el.dataset.audioKey);
      }
    });
    old.forEach(el => el.querySelector('audio').pause());
    bindAudioPlayers(root);
  };
}

export function bindAudioPlayers(root) {
  root.querySelectorAll('[data-audio-key]').forEach(el => {
    if (bound.has(el)) return;
    bound.add(el);
    const audio = el.querySelector('audio'),button = el.querySelector('button');
    let errorShown=false;
    const update = () => {
      const playing = !audio.paused && !audio.ended && !audio.error;
      if (!playing && active === audio) active=null;
      button.innerHTML = playing ? pauseIcon : playIcon;
      button.setAttribute('aria-label',playing ? '音声を一時停止' : '音声を再生');
      button.setAttribute('aria-pressed',String(playing));
    };
    const reportError = () => {
      update();
      if (!errorShown) {errorShown=true;toast('音声を再生できません。接続を確認してもう一度お試しください。');}
    };
    for (const event of ['play','pause','ended','emptied']) audio.addEventListener(event,update);
    audio.addEventListener('error',reportError);
    button.addEventListener('click',() => {
      if (!audio.paused) {audio.pause();return;}
      if (active && active !== audio) active.pause();
      errorShown=false;
      if (audio.error) audio.load();
      active = audio;
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(error => {
        if (error.name !== 'AbortError') reportError();
        else update();
      });
    });
  });
}

export function stopAudioPlayers(root) {
  root.querySelectorAll('[data-audio-key] audio').forEach(audio => audio.pause());
}
