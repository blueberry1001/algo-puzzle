import {esc} from './ui.js';
export const parseTags=text=>[...new Set(text.split(/[,、\n]+/).map(s=>s.trim()).filter(Boolean))];
export const metadataFields=item=>`<label class="field full"><span>管理タグ（カンマ区切り）</span><input name="tags" value="${esc((item.tags||[]).join(', '))}"></label><label class="field"><span>検索限定キーワード1</span><input name="searchKeyword0" maxlength="100" value="${esc(item.searchKeywords?.[0]||'')}"></label><label class="field"><span>検索限定キーワード2</span><input name="searchKeyword1" maxlength="100" value="${esc(item.searchKeywords?.[1]||'')}"></label>`;
export const metadataValues=d=>({tags:parseTags(d.tags||''),searchKeywords:[d.searchKeyword0,d.searchKeyword1].map(v=>(v||'').trim()).filter(Boolean)});
export const tagFilter=(items,value)=>`<label>管理タグ<select id="tag-filter"><option value="">すべて</option>${[...new Set(items.flatMap(a=>a.tags||[]))].sort().map(t=>`<option ${t===value?'selected':''} value="${esc(t)}">${esc(t)}</option>`).join('')}</select></label>`;
