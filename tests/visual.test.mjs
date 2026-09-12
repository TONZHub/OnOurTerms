import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {emptyVisual,checkPermission} from '../dist/visual.mjs';
import {initialState,topics,updateDraft,settle,toMarkdown} from '../dist/agreement.mjs';
import {handleAPI,hash,parseResult} from '../server/worker.mjs';
const image=new Uint8Array([137,80,78,71,13,10,26,10]);
const descriptor={sha256:await hash(image),size:image.length,type:'image/png',prompt:'Gentle camera movement',subject:'us',romantic:true,realistic:true,duration:5,resolution:'480',rights:true};
function env(){
 const sqlite=new DatabaseSync(':memory:');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')))sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
 return {YOUCAM_API_KEY:'test-only-key',DB:{prepare(sql){return {bind(...args){return {
  async first(){return sqlite.prepare(sql).get(...args);},
  async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:r.changes}};}
 };}};}}};
}
function request(path,data,token,method='POST',headers={}){return new Request('https://test.example/api/'+path,{method,headers:{Origin:'https://test.example',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:data===undefined?undefined:data instanceof Uint8Array?data:JSON.stringify(data)});}
async function setup(visual=emptyVisual()){const e=env();const response=await handleAPI(request('agreements',{visual,version:1,agreementHash:'a'.repeat(64),reviewed:true}),e);return {e,token:(await response.json()).token};}
async function prepare(e,token,d=descriptor){const r=await handleAPI(request('prepare',{descriptor:d},token),e);return {...await r.json(),http:r.status};}
const submit=(e,token,id,approved,send,bytes=image)=>handleAPI(request('jobs/'+id+'/submit',bytes,token,'POST',{'X-Visual-Approval':JSON.stringify(approved),'X-Confirm-Processing':'yes'}),e,send);
test('still image permission never implies animation, intimacy, or likeness permission',()=>{
 const v={...emptyVisual(),aiImage:'allow'};assert.equal(checkPermission(v,descriptor).allowed,false);
 for(const key of ['animate','animateLikeness','intimacy','likeness'])assert.ok(checkPermission(v,descriptor).ask.includes(key));
 assert.deepEqual(checkPermission({...v,animate:'never'},descriptor,['animate']).denied,['animate']);
});
test('visual edits invalidate approval and exports include exact choices',()=>{
 const draft=updateDraft(initialState(),{person:'Demo',companion:'AI',terms:Object.fromEntries(topics.map(t=>[t.id,t.suggestion]))});
 const approved=settle(draft,true);assert.match(toMarkdown(approved),/Animate an image: Ask first/);
 assert.equal(updateDraft(approved,{visual:{...approved.visual,animate:'never'}}).settled,null);
 approved.visual.animate='allow';assert.throws(()=>toMarkdown(approved),/Settle/);
});
test('Never and Ask first prevent every external call before upload',async()=>{
 let calls=0;const send=()=>{calls++;throw Error('Must not send');};
 const denied=await setup({...emptyVisual(),animate:'never'});assert.equal((await prepare(denied.e,denied.token)).http,403);
 const {e,token}=await setup();const p=await prepare(e,token);assert.equal(p.http,200);
 assert.equal((await submit(e,token,p.id,[],send)).status,403);assert.equal(calls,0);
});
test('a changed source image, expired request, revoked terms, or another session cannot submit',async()=>{
 const {e,token}=await setup();const p=await prepare(e,token);const send=()=>{throw Error('Must not send');};
 assert.equal((await submit(e,token,p.id,p.ask,send,new Uint8Array([1,2]))).status,409);
 const other=await handleAPI(request('agreements',{visual:emptyVisual(),version:1,agreementHash:'b'.repeat(64),reviewed:true}),e);const otherToken=(await other.json()).token;
 assert.equal((await submit(e,otherToken,p.id,p.ask,send)).status,404);
 await handleAPI(request('revoke',{},token),e);assert.equal((await submit(e,token,p.id,p.ask,send)).status,409);
});
test('approved request uses documented upload and generation shapes; replay cannot bill twice',async()=>{
 const {e,token}=await setup();const p=await prepare(e,token);const calls=[];
 const send=async(url,options)=>{calls.push({url:String(url),options});if(String(url).endsWith('/file'))return Response.json({status:200,data:{files:[{file_id:'source-id',requests:[{url:'https://uploads.example/image',method:'PUT',headers:{'Content-Type':'image/png'}}]}]}});if(String(url).includes('uploads.example'))return new Response('');return Response.json({status:200,data:{task_id:'task-id'}});};
 const r=await submit(e,token,p.id,p.ask,send);assert.equal(r.status,200);const data=await r.json();assert.equal(data.receipt.sourceSha256,descriptor.sha256);assert.equal(calls.length,3);
 assert.equal(calls[0].options.headers.Authorization,'Bearer test-only-key');assert.equal(calls[1].options.headers.Authorization,undefined);
 assert.deepEqual(JSON.parse(calls[2].options.body),{src_file_id:'source-id',prompt:descriptor.prompt,dst_duration:5,resolution:'480',model:'youcam-video-v2'});
 assert.equal((await submit(e,token,p.id,p.ask,send)).status,409);assert.equal(calls.length,3);
 const poll=await handleAPI(request('jobs/'+p.id,undefined,token,'GET'),e,async()=>Response.json({status:200,data:{task_status:'success',results:{url:'https://video.example/test.mp4'}}}));assert.equal((await poll.json()).url,'https://video.example/test.mp4');
 assert.equal((await handleAPI(request('jobs/'+p.id+'/export',{action:'save'},token),e)).status,403);
});
test('revocation during upload prevents generation',async()=>{
 const {e,token}=await setup();const p=await prepare(e,token);let calls=0;
 const send=async(url)=>{calls++;if(String(url).endsWith('/file'))return Response.json({data:{files:[{file_id:'source-id',requests:[{url:'https://uploads.example/image',method:'PUT'}]}]}});await handleAPI(request('revoke',{},token),e);return new Response('');};
 assert.equal((await submit(e,token,p.id,p.ask,send)).status,409);assert.equal(calls,2);
});
test('missing key and cross-origin mutations fail closed',async()=>{
 const {e,token}=await setup();e.YOUCAM_API_KEY='';const p=await prepare(e,token);assert.equal((await submit(e,token,p.id,p.ask,()=>{throw Error('Must not send');})).status,503);
 const r=request('revoke',{},token);r.headers.set('Origin','https://other.example');assert.equal((await handleAPI(r,e)).status,403);
 assert.equal((await handleAPI(request('prepare',{descriptor}),e)).status,401);
});
test('failed provider calls are not automatically retried',async()=>{
 const {e,token}=await setup();const p=await prepare(e,token);let calls=0;
 const send=async()=>{calls++;return Response.json({error_code:'CreditInsufficiency',status:400},{status:400});};
 const r=await submit(e,token,p.id,p.ask,send);assert.equal(r.status,502);assert.match((await r.json()).error,/credits/);
 assert.equal((await submit(e,token,p.id,p.ask,send)).status,409);assert.equal(calls,1);
});
test('status parsing rejects unsafe or missing output URLs',()=>{
 assert.deepEqual(parseResult({task_status:'running'}),{status:'running'});
 assert.equal(parseResult({task_status:'error'}).status,'error');
 assert.throws(()=>parseResult({task_status:'success',results:{url:'javascript:alert(1)'}}));
});

