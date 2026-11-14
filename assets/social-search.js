export const searchWords=q=>q.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
export function searchAllowed(item,q){const words=searchWords(q);return !item.searchKeywords?.length||item.searchKeywords.some(k=>words.includes(k.normalize('NFKC').toLocaleLowerCase()));}
export function matchesSearch(text,q){const normalized=text.normalize('NFKC').toLocaleLowerCase();return searchWords(q).every(word=>normalized.includes(word.replace(/^@/,'')));}
export function sampleTimeline(posts,rank){return [...posts].sort((a,b)=>rank(a.id)-rank(b.id)).slice(0,10);}
