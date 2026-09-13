import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {callSeymour} from './seymour.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||3000);
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',svg:'image/svg+xml',md:'text/markdown; charset=utf-8',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};

function json(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
  res.end(JSON.stringify(body));
}

async function readJSON(req,limit=12000){
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(new Error('Request too large.'),{status:413});chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400});}
}

async function serveStatic(req,res,pathname){
  let rel=pathname==='/'?'index.html':decodeURIComponent(pathname).replace(/^\/+/, '');
  if(rel==='api/config')rel='api/config.json';
  const target=path.resolve(root,rel);
  if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);res.end('Forbidden');return;}
  let file=target;
  try{const info=await stat(file);if(info.isDirectory())file=path.join(file,'index.html');await stat(file);}catch{
    if(req.method==='GET'||req.method==='HEAD')file=path.join(root,'index.html');else{res.writeHead(404);res.end('Not found');return;}
  }
  const ext=path.extname(file).slice(1).toLowerCase();
  const data=req.method==='HEAD'?null:await readFile(file);
  res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':ext==='html'?'no-cache':'public, max-age=300'});
  res.end(data);
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/seymour'){
      if(req.method!=='POST'){json(res,405,{error:'Method not allowed.'});return;}
      const origin=req.headers.origin;
      const host=req.headers.host;
      if(origin&&new URL(origin).host!==host){json(res,403,{error:'Open Seymour from On Our Terms.'});return;}
      const input=await readJSON(req);
      const result=await callSeymour(input);
      json(res,200,result);return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
    await serveStatic(req,res,url.pathname);
  }catch(error){
    console.error('[server]',error?.message||error);
    json(res,error?.status||503,{error:error?.status?error.message:'The service could not finish this request.'});
  }
});

server.listen(port,'0.0.0.0',()=>console.log(`[on-our-terms] listening on ${port}`));
