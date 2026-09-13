import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {callSeymour} from '../server/seymour.mjs';

const types={html:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',md:'text/markdown',svg:'image/svg+xml'};
const allowed=new Set(['/','/index.html','/styles.css','/app.js','/agreement.mjs','/visual.mjs','/media.js','/principles.md','/seymour.js','/seymour.css','/seymour.svg']);

async function readJSON(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);return JSON.parse(Buffer.concat(chunks).toString('utf8'));}

createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/config'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({configured:false}));}
  if(path==='/api/seymour'){
   if(req.method!=='POST'){res.writeHead(405);return res.end();}
   const result=await callSeymour(await readJSON(req));
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(result));
  }
  if(!allowed.has(path)){res.writeHead(404);return res.end();}
  let file=path==='/'?'index.html':path.slice(1),content=await readFile('dist/'+file);
  if(file==='index.html'){
   let html=content.toString('utf8');
   if(!html.includes('seymour.js'))html=html.replace('</body>','  <script type="module" src="seymour.js"></script>\n</body>');
   content=html;
  }
  res.setHeader('Content-Type',types[file.split('.').pop()]||'application/octet-stream');res.end(content);
 }catch(error){res.writeHead(error?.status||503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error?.message||'Preview failed.'}));}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
