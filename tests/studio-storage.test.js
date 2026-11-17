import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readWorkspace,saveWorkspace,localHistory,checkpoint} from '../assets/studio-storage.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('autosave preserves unsubmitted and invalid JSON input across reload',()=>{const s=storage(),snapshot={config:{name:'before'},tab:'json',fields:[{id:'json-editor',value:'{"unfinished":'}]};saveWorkspace(s,snapshot);assert.deepEqual(readWorkspace(s),snapshot);});
test('replacement history retains five independent copies and restoration can back up the displaced work',()=>{const s=storage(),snapshot={config:{name:'original'},fields:[]};checkpoint(s,snapshot,'replace');snapshot.config.name='changed';assert.equal(localHistory(s)[0].snapshot.config.name,'original');for(let i=0;i<6;i++)checkpoint(s,{config:{i}},'restore');assert.equal(localHistory(s).length,5);assert.equal(localHistory(s)[0].snapshot.config.i,5);});
test('backup failures propagate so callers stop the replacement',()=>{assert.throws(()=>checkpoint({getItem:()=>null,setItem:()=>{throw Error('quota');}},{config:{}},'replace'),/quota/);});
