import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isCharmSearch} from '../assets/shop-model.js';
test('shop keyword requires both complete words and accepts Japanese spaces',()=>{for(const q of ['お守り　レモン','お守り レモン',' レモン  お守り '])assert.ok(isCharmSearch(q));for(const q of ['お守り','レモン','お守りレモン','お守り レモン 追加','<script>'])assert.equal(isCharmSearch(q),false);});
