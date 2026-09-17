export const STORAGE_KEY = 'algo-puzzle:haru:v1';
export const initialState = () => ({ version: 1, step: 0, messages: [], unlockedAt: [] });

export function sendMessage(state, input, now = Date.now()) {
  const text = input.trim().slice(0, 500);
  if (!text) return state;
  const advances = text === ['りんご', 'みかん'][state.step];
  const messages = [...state.messages, { role: 'sent', text, at: now }];
  if (advances) messages.push({ role: 'received', text: state.step === 0
    ? '受け取ったよ。記録を更新した。'
    : 'ありがとう。これで、全部つながった。もう一度、僕の記録を見て。', at: now });
  return { ...state, step: state.step + (advances ? 1 : 0), messages: messages.slice(-200),
    unlockedAt: advances ? [...state.unlockedAt, now] : state.unlockedAt };
}

export function readState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return initialState();
  try {
    const s = JSON.parse(raw);
    if (s?.version !== 1 || !Number.isInteger(s.step) || s.step < 0 || s.step > 2 ||
      !Array.isArray(s.messages) || s.messages.length > 200 ||
      !s.messages.every(m => m && ['sent', 'received'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 500 && Number.isFinite(m.at)) ||
      !Array.isArray(s.unlockedAt) || s.unlockedAt.length !== s.step || !s.unlockedAt.every(Number.isFinite)) return initialState();
    return s;
  } catch { return initialState(); }
}

export function saveState(storage, state) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
