export const icons = {
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  back: '<path d="m14 6-6 6 6 6M8 12h13"/>',
  send: '<path d="m5 4 16 8-16 8 3-8-3-8Zm3 8h13"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z"/><path d="M7 10h10M7 14h6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
export const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;
export function notice(message) {
  const el = document.querySelector('#notice');
  el.textContent = message;
  el.hidden = false;
}
export function storageFailure() { notice('このブラウザでは進捗を保存できません。ストレージを許可して、再読み込みしてください。'); }
export function timeLabel(at) { return new Date(at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }); }
