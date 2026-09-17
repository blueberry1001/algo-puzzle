import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, sendMessage, readState, saveState, STORAGE_KEY } from '../assets/state.js';

test('only apple then orange advances; early orange is not queued', () => {
  let s = initialState();
  s = sendMessage(s, 'みかん', 1); assert.equal(s.step, 0);
  s = sendMessage(s, 'りんご', 2); assert.equal(s.step, 1);
  s = sendMessage(s, 'りんご', 3); assert.equal(s.step, 1);
  s = sendMessage(s, '無関係', 4); assert.equal(s.step, 1);
  s = sendMessage(s, 'みかん', 5); assert.equal(s.step, 2);
  s = sendMessage(s, 'みかん', 6); assert.equal(s.step, 2);
  assert.deepEqual(s.unlockedAt, [2, 5]);
});
test('blank does nothing, surrounding spaces accepted, other strings are exact', () => {
  const s = initialState();
  assert.deepEqual(sendMessage(s, '  '), s);
  assert.equal(sendMessage(s, 'りんごです').step, 0);
  assert.equal(sendMessage(s, ' りんご ').step, 1);
});
test('state and history survive serialization and can reset without deleting unrelated keys', () => {
  const data = new Map([['other', 'keep']]);
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const s = sendMessage(sendMessage(initialState(), 'りんご', 1), 'みかん', 2);
  saveState(storage, s); assert.deepEqual(readState(storage), s);
  saveState(storage, initialState()); assert.equal(readState(storage).step, 0);
  assert.equal(data.get('other'), 'keep'); assert.ok(data.has(STORAGE_KEY));
});
test('malformed or incompatible stored data recovers safely', () => {
  for (const value of ['broken', 'null', '{"version":1,"step":99}', '{"version":1,"step":2,"messages":[],"unlockedAt":[]}']) {
    assert.deepEqual(readState({ getItem: () => value }), initialState());
  }
});
test('storage failure is explicit to caller; no false saved success', () => {
  assert.throws(() => saveState({ setItem() { throw new Error('quota'); } }, initialState()), /quota/);
});
