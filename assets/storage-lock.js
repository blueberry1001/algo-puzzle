export class StorageLockTimeout extends Error {
  constructor() {super('別のタブの処理を待っています。作品のほかのタブを閉じて、もう一度お試しください。');this.name='StorageLockTimeout';}
}

// Bound the browser round-trip as well as the lock wait. A late callback must not write.
export function withStorageLock(locks,name,change,{idle=false,timeoutMs=idle?1500:4000}={}) {
  if (!locks) return Promise.resolve().then(change);
  return new Promise((resolve,reject) => {
    const controller=new AbortController(),deadline=Date.now()+timeoutMs;
    let finished=false,outcome;
    const finish=(error,value) => {
      if (finished) return;
      finished=true;clearTimeout(timer);
      if (error) reject(error);else resolve(value);
    };
    const timer=setTimeout(() => {
      // The callback may have committed while the browser's release promise is stuck.
      if (outcome) finish(outcome.error,outcome.value);
      else finish(new StorageLockTimeout());
      controller.abort();
    },timeoutMs);
    const callback=lock => {
      if (finished) return null;
      if (Date.now()>=deadline) throw new StorageLockTimeout();
      try {const value=lock?change():null;outcome={value};return value;}
      catch(error) {outcome={error};throw error;}
    };
    try {
      // The platform forbids combining ifAvailable and signal.
      const request=locks.request(name,idle?{ifAvailable:true}:{signal:controller.signal},callback);
      Promise.resolve(request).then(value=>finish(null,value),error=>finish(error?.name==='AbortError'?new StorageLockTimeout():error));
    } catch(error) {finish(error);}
  });
}
