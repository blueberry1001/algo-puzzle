export const assetRef = v => typeof v==='string' && /^asset:[a-f0-9]{64}\.(webp|png|jpg|mp4|webm)$/.test(v);
export function mediaType(bytes) {
 const s=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 if(s(0,4)==='RIFF'&&s(8,12)==='WEBP')return 'webp';
 if(bytes[0]===137&&s(1,4)==='PNG')return 'png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpg';
 if(s(4,8)==='ftyp'&&s(8,12)!=='qt  ')return 'mp4';
 if(bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163)return 'webm';
 return null;
}
export const mediaMime={webp:'image/webp',png:'image/png',jpg:'image/jpeg',mp4:'video/mp4',webm:'video/webm'};
