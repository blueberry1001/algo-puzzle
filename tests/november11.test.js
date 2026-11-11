import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWorld,markSnsOpened,socialText,validateConfig,validateWorld} from '../assets/world.js';
import {recorderLogin,RECORDER_SERIAL,RECORDER_ANSWER,DECODE_ERROR,EXPIRED_ERROR} from '../assets/recorder-model.js';
const c=JSON.parse(readFileSync(new URL('../content/scenario.json',import.meta.url)));
test('SNS dates use first SNS visit rather than game start and stay fixed',()=>{
 const original=initialWorld(c,Date.parse('2026-11-01T00:00:00+09:00'));
 assert.equal(original.snsFirstOpenedAt,undefined);
 const p={text:'今日は{{date}}！ {{date}}',dateDaysAgo:14};
 for(const [day,result] of [['25','11月11日'],['26','11月12日']]){
  let w=markSnsOpened(original,Date.parse(`2026-11-${day}T00:00:00+09:00`));
  w=markSnsOpened(JSON.parse(JSON.stringify(w)),Date.parse('2026-12-25T00:00:00+09:00'));
  assert.equal(socialText(p,w),`今日は${result}！ ${result}`);assert.ok(validateWorld(w));
 }
});
test('SNS relative dates handle Japanese midnight, years and leap days',()=>{
 const cases=[['2026-11-24T15:00:00Z',14,'11月11日'],['2027-01-01T00:00:00+09:00',1,'12月31日'],['2028-03-01T00:00:00+09:00',1,'2月29日']];
 for(const [at,days,date] of cases)assert.equal(socialText({text:'{{date}}',dateDaysAgo:days},{snsFirstOpenedAt:Date.parse(at)}),date);
});
test('invalid date settings and unsafe profile paths are rejected',()=>{
 for(const days of [-1,1.5,36501,'14']){const bad=structuredClone(c);bad.posts[0].dateDaysAgo=days;assert.ok(validateConfig(bad).length);}
 const bad=structuredClone(c);bad.recorder.profileAudio='javascript:alert(1)';assert.ok(validateConfig(bad).length);
 assert.equal(validateWorld({...initialWorld(c,1),snsFirstOpenedAt:'bad'}),false);
});
test('VS-402L requires both correct serial and recovery answer',()=>{
 assert.ok(recorderLogin(RECORDER_SERIAL,RECORDER_ANSWER,'recovery','1900'));
 assert.ok(!recorderLogin('wrong',RECORDER_ANSWER,'recovery','1900'));
 assert.ok(!recorderLogin(RECORDER_SERIAL,'wrong','recovery','1900'));
 assert.ok(recorderLogin(RECORDER_SERIAL,'1900','password','1900'));
 assert.equal(EXPIRED_ERROR,'保存期間が超過しています');assert.ok(DECODE_ERROR.includes('サンプリングレート再構築'));
});
