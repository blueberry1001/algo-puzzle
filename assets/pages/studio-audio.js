import {esc,icon,toast,modal} from '../ui.js';
import {audioPlayer,keepAudioPlayers} from '../audio-player.js';
import {audioName,uploadAudio} from '../cloud/audio-client.js';
import {MAX_AUDIO_BYTES} from '../audio-assets.js';

const lines = value => value.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
export function audioField(name,refs) {
  return `<div class="field audio-field" data-audio-field><span id="${name}-label">音声</span><div class="audio-attachments" aria-labelledby="${name}-label"></div><div><button type="button" class="button secondary" data-attach-audio>${icon('headphones',18)} MP3を添付</button><input type="file" accept=".mp3,audio/mpeg" multiple hidden data-audio-file aria-label="添付するMP3"></div><details class="audio-paths"><summary>音声パスを指定</summary><label class="field"><span>音声パス（1行に1つ）</span><textarea name="${name}" rows="2" placeholder="media/voice.mp3">${esc(refs.join('\n'))}</textarea></label></details></div>`;
}

export function bindAudioFields(root) {
  root.querySelectorAll('[data-audio-field]').forEach(field => {
    const input = field.querySelector('textarea'),picker = field.querySelector('[data-audio-file]'),list = field.querySelector('.audio-attachments');
    const set = refs => {input.value=refs.join('\n');input.dispatchEvent(new Event('input',{bubbles:true}));};
    function render() {
      const restore = keepAudioPlayers(list),refs = lines(input.value);
      list.innerHTML = refs.map((ref,i) => `<div class="audio-attachment">${audioPlayer(ref,`${input.name}:${i}`)}<span class="audio-attachment-name">${esc(ref.startsWith('media/')?ref.split('/').pop():'添付した音声')}</span><button type="button" class="icon-button" data-remove-audio="${i}" aria-label="音声 ${i+1} を外す">${icon('close',18)}</button></div>`).join('');
      restore();
      list.querySelectorAll('.audio-attachment-name').forEach((el,i) => {audioName(refs[i]).then(name => {el.textContent=name;});});
      list.querySelectorAll('[data-remove-audio]').forEach(button => button.onclick=() => set(refs.filter((_,i) => i!==Number(button.dataset.removeAudio))));
    }
    input.addEventListener('input',render);
    field.querySelector('[data-attach-audio]').onclick=() => picker.click();
    picker.addEventListener('change',async() => {
      const files = [...picker.files]; picker.value='';
      if (!files.length) return;
      if (files.length + lines(input.value).length > 20) {toast('1つの返信に添付できる音声は20件までです。');return;}
      if (files.some(file => !/\.mp3$/i.test(file.name))) {toast('MP3ファイルを選んでください。');return;}
      if (files.some(file => file.size > MAX_AUDIO_BYTES)) {toast('音声は1つ10MBまでです。');return;}
      const controller = new AbortController();
      const dialog = modal('音声を添付',`<p role="status" class="audio-upload-status"></p><progress max="${files.length}" value="0" aria-label="音声のアップロード"></progress><div class="actions"><button type="button" class="button secondary" data-cancel>中止する</button></div>`);
      dialog.addEventListener('close',() => controller.abort());
      dialog.addEventListener('cancel',() => controller.abort());
      dialog.querySelectorAll('[data-cancel],[data-close]').forEach(button => button.onclick=() => {controller.abort();dialog.close();});
      let timeout,timedOut=false;
      try {
        for (let i=0;i<files.length;i++) {
          if (controller.signal.aborted) break;
          dialog.querySelector('[role=status]').textContent=`${i+1} / ${files.length}　${files[i].name}`;
          timeout=setTimeout(() => {timedOut=true;controller.abort();},120000);
          const ref=await uploadAudio(files[i],controller.signal);
          clearTimeout(timeout);
          if (controller.signal.aborted) break;
          const refs=lines(input.value);
          if (!refs.includes(ref)) set([...refs,ref]);
          dialog.querySelector('progress').value=i+1;
        }
      } catch(error) {
        if (timedOut) toast('音声の保存に時間がかかっています。接続を確認してもう一度お試しください。');
        else if (!controller.signal.aborted) toast(error.message || '音声を保存できませんでした。');
      } finally {clearTimeout(timeout);dialog.close();}
    });
    render();
  });
}
