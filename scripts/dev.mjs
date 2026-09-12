import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const types={html:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',md:'text/markdown'};
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/config'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({configured:false}));}
 if(!['/','/index.html','/styles.css','/app.js','/agreement.mjs','/visual.mjs','/media.js','/principles.md'].includes(path)){res.writeHead(404);return res.end();}
 try{const file=path==='/'?'index.html':path.slice(1);res.setHeader('Content-Type',types[file.split('.').pop()]);res.end(await readFile('dist/'+file));}catch{res.writeHead(404);res.end();}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));

