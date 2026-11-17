export const WORKSPACE_KEY='algo-puzzle:studio:workspace:v1';
export const HISTORY_KEY='algo-puzzle:studio:history:v1';
export function readWorkspace(storage){const raw=storage.getItem(WORKSPACE_KEY);return raw?JSON.parse(raw):null;}
export function saveWorkspace(storage,snapshot){storage.setItem(WORKSPACE_KEY,JSON.stringify(snapshot));}
export function localHistory(storage){return JSON.parse(storage.getItem(HISTORY_KEY)||'[]');}
export function checkpoint(storage,snapshot,reason){
 const history=localHistory(storage);
 history.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),reason,snapshot});
 // Keep at most five copies, bounded to about 3 MB of localStorage's UTF-16 space.
 while(history.length>5||JSON.stringify(history).length>1500000&&history.length>1)history.pop();
 storage.setItem(HISTORY_KEY,JSON.stringify(history));
}
