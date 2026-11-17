// Audio references stay small in scenario JSON and player progress.
export const MAX_AUDIO_BYTES = 10_000_000;
export const audioId = ref => typeof ref === 'string' && /^audio:[a-f0-9]{64}$/.test(ref) ? ref.slice(6) : null;
export const safeAudio = ref => typeof ref === 'string' && (Boolean(audioId(ref)) || (/^media\/[a-zA-Z0-9_./-]+$/.test(ref) && !ref.includes('..')));
export function audioSource(ref, base, endpoint = '') {
  if (!safeAudio(ref)) return '';
  const id = audioId(ref);
  return id ? (endpoint ? `${endpoint}/audio/${id}.mp3` : new URL(`media/${id}.mp3`, base).href) : new URL(ref, base).href;
}

function frame(bytes, at) {
  if (at + 4 > bytes.length || bytes[at] !== 255 || (bytes[at + 1] & 224) !== 224) return null;
  const version = (bytes[at + 1] >> 3) & 3, layer = (bytes[at + 1] >> 1) & 3;
  const rateIndex = (bytes[at + 2] >> 2) & 3, bitrateIndex = bytes[at + 2] >> 4;
  if (version === 1 || layer !== 1 || rateIndex === 3 || bitrateIndex === 0 || bitrateIndex === 15) return null;
  const rates = version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
  const sampleRate = [44100,48000,32000][rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
  return {version, sampleRate, length: Math.floor((version === 3 ? 144000 : 72000) * rates[bitrateIndex] / sampleRate) + ((bytes[at + 2] >> 1) & 1)};
}

// Check consecutive MPEG Layer III frames, including files with ID3 artwork/tags.
export function isMp3(bytes) {
  let start = 0;
  if (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) {
    if (bytes.length < 10 || ![2,3,4].includes(bytes[3]) || bytes.slice(6,10).some(b => b > 127)) return false;
    start = 10 + bytes.slice(6,10).reduce((n,b) => n * 128 + b, 0) + (bytes[3] === 4 && (bytes[5] & 16) ? 10 : 0);
  }
  for (let at = start; at < Math.min(start + 1024, bytes.length - 4); at++) {
    const first = frame(bytes, at);
    if (!first) continue;
    const second = frame(bytes, at + first.length);
    if (second && first.version === second.version && first.sampleRate === second.sampleRate && at + first.length + second.length <= bytes.length) return true;
  }
  return false;
}
