import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json':'application/json; charset=utf-8', '.png':'image/png', '.wav':'audio/wav', '.md':'text/plain; charset=utf-8' };
http.createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let body = await readFile(file);
    if (extname(file) === '.html') body = Buffer.from(body.toString().replace('</head>', '<script>if(location.hash.includes("figmacapture=")){const s=document.createElement("script");s.src="https://mcp.figma.com/mcp/html-to-design/capture.js";s.async=true;document.head.append(s);}</script></head>'));
    const headers={'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${body.length}`}).end();return;}res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${body.length}`});res.end(body.subarray(start,end+1));return;}
    res.writeHead(200,{...headers,'Content-Length':body.length});res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
