import {readFile,mkdir,writeFile,cp} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const assets={};
for(const name of ['index.html','styles.css','app.js','agreement.mjs','visual.mjs','media.js','principles.md']) assets['/'+name]=await readFile('dist/'+name,'utf8');
let source=await readFile('server/worker.mjs','utf8');
const policy=await readFile('dist/visual.mjs','utf8');
source=source.replace("import {permissions,validateVisual,checkPermission,validateDescriptor} from '../dist/visual.mjs';",policy.replaceAll('export ',''));
await writeFile('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+source);
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Built Worker with existing site assets and consent migrations.');

