import {boot,showError} from './runtime.js';
const page=document.body.dataset.page;
const pages={talk:'talk',sns:'sns',board:'board',club:'club',management:'management',recorder:'recorder',venue:'venue',studio:'studio'};
try{await boot();await import(`./pages/${pages[page]||'talk'}.js`);}catch(error){showError(error.message);document.querySelector('#app').innerHTML='<main class="error-page"><h1>ページを開けませんでした</h1><p>ネットワークとブラウザのストレージ設定をご確認のうえ、再読み込みしてください。</p><button onclick="location.reload()">再読み込み</button></main>';console.error(error);}
