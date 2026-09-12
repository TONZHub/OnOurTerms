import {permissions,validateVisual,checkPermission,validateDescriptor} from '../dist/visual.mjs';
const API='https://yce-api-01.makeupar.com/s2s/v2.0';
const encode=new TextEncoder();
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?encode.encode(value):value))].map(x=>x.toString(16).padStart(2,'0')).join('');}
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
const db=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
async function body(request,limit=20000){
 const reader=request.body?.getReader();if(!reader)fail('Missing request.');
 const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();fail('Request too large.',413);}chunks.push(value);}
 const out=new Uint8Array(size);let offset=0;for(const part of chunks){out.set(part,offset);offset+=part.length;}return out;
}
async function readJSON(req){try{return JSON.parse(new TextDecoder().decode(await body(req)));}catch(e){if(e.status)throw e;fail('Invalid request.');}}
async function agreement(req,env,active=true){
 const token=req.headers.get('Authorization')?.match(/^Bearer ([a-f0-9-]{36})\.([a-f0-9-]{36})$/);
 if(!token)fail('Settle the visual terms in this tab first.',401);
 const row=await db(env,'SELECT * FROM visual_agreements WHERE id = ?',token[1]).first();
 if(!row||row.secret_hash!==await hash(token[2]))fail('Agreement not found.',401);
 if(active&&(!row.active||row.created_at<Date.now()-86400000))fail('These visual terms have expired or been revoked. Review and settle again.',409);
 return {...row,snapshot:JSON.parse(row.snapshot)};
}
export async function provider(env,path,options={},send=fetch){
 const response=await send(API+path,{...options,headers:{Authorization:'Bearer '+env.YOUCAM_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000)});
 let result;try{result=await response.json();}catch{fail('YouCam returned an unreadable response. No automatic retry was made.',502);}
 if(!response.ok||result.status>=400){
  const message=response.status===401?'The YouCam key was rejected.':response.status===429?'YouCam is busy. Please wait before trying again.':result.error_code==='CreditInsufficiency'?'The YouCam account has insufficient credits.':'YouCam could not complete the request. Check the image and try again deliberately.';
  fail(message,502);
 }
 return result.data??result;
}
export function parseResult(data){
 if(data.task_status==='error')return {status:'error',message:'YouCam could not generate this video. The image or prompt may be unsupported.'};
 if(data.task_status!=='success')return {status:'running'};
 const url=data.results?.url??data.results?.video_url??(Array.isArray(data.results)?data.results[0]?.url:null)??data.url;
 if(typeof url!=='string'||!url.startsWith('https://'))fail('YouCam completed the task without a usable video URL.',502);
 return {status:'success',url};
}
export async function handleAPI(req,env,send=fetch){
 try{
  const path=new URL(req.url).pathname;
  if(path==='/api/config'&&req.method==='GET')return json({configured:Boolean(env.YOUCAM_API_KEY&&env.DB)});
  if(!env.DB)fail('The visual service is not configured yet. Agreement downloads still work.',503);
  if(req.method!=='GET'&&req.headers.get('Origin')!==new URL(req.url).origin)fail('Open this action from On Our Terms.',403);
  if(path==='/api/agreements'&&req.method==='POST'){
   const b=await readJSON(req);validateVisual(b.visual);
   if(b.reviewed!==true||!Number.isInteger(b.version)||b.version<1||!/^[a-f0-9]{64}$/.test(b.agreementHash))fail('Review and settle the agreement first.');
   const id=crypto.randomUUID(),secret=crypto.randomUUID();
   const snapshot={visual:b.visual,version:b.version,agreementHash:b.agreementHash,approvedAt:new Date().toISOString()};
   await db(env,'INSERT INTO visual_agreements (id,secret_hash,snapshot,created_at) VALUES (?,?,?,?)',id,await hash(secret),JSON.stringify(snapshot),Date.now()).run();
   return json({token:id+'.'+secret});
  }
  const a=await agreement(req,env,path!=='/api/revoke');
  if(path==='/api/revoke'&&req.method==='POST'){
   await db(env,'UPDATE visual_agreements SET active = 0 WHERE id = ?',a.id).run();return json({revoked:true});
  }
  if(path==='/api/prepare'&&req.method==='POST'){
   const b=await readJSON(req),d=validateDescriptor(b.descriptor),decision=checkPermission(a.snapshot.visual,d);
   if(decision.denied.length)return json({...decision,error:'Your agreement prohibits this request. Revisit the terms to change that boundary.'},403);
   const id=crypto.randomUUID();
   const receipt={id,agreementVersion:a.snapshot.version,agreementHash:a.snapshot.agreementHash,approvedAt:a.snapshot.approvedAt,sourceSha256:d.sha256,transformation:'image-to-video',subject:d.subject,romantic:d.romantic,photorealistic:d.realistic,duration:d.duration,resolution:d.resolution,promptSha256:await hash(d.prompt),permissions:decision.required.map(key=>({key,setting:a.snapshot.visual[key]})),createdAt:new Date().toISOString(),provider:'YouCam',model:'youcam-video-v2'};
   await db(env,'INSERT INTO visual_jobs (id,agreement_id,descriptor,status,receipt,created_at) VALUES (?,?,?,?,?,?)',id,a.id,JSON.stringify(d),'prepared',JSON.stringify(receipt),Date.now()).run();
   return json({id,...decision});
  }
  const match=path.match(/^\/api\/jobs\/([a-f0-9-]{36})(?:\/(submit|export))?$/);
  if(!match)fail('Not found.',404);
  const job=await db(env,'SELECT * FROM visual_jobs WHERE id = ? AND agreement_id = ?',match[1],a.id).first();
  if(!job)fail('Video request not found.',404);
  const d=JSON.parse(job.descriptor),receipt=JSON.parse(job.receipt);
  if(match[2]==='submit'&&req.method==='POST'){
   if(!env.YOUCAM_API_KEY)fail('Add the YouCam API key in site settings to enable generation.',503);
   if(job.status!=='prepared'||job.created_at<Date.now()-600000)fail('This request was already submitted or expired. Prepare a new request.',409);
   let approved;try{approved=JSON.parse(req.headers.get('X-Visual-Approval')||'[]');}catch{fail('Invalid permission response.');}
   if(!Array.isArray(approved)||approved.some(x=>!permissions.some(([key])=>key===x)))fail('Invalid permission response.');
   const decision=checkPermission(a.snapshot.visual,d,approved);
   if(!decision.allowed)return json({...decision,error:'Separate permission is required before upload.'},403);
   if(req.headers.get('X-Confirm-Processing')!=='yes')fail('Confirm sending this image and motion to YouCam.');
   const bytes=await body(req,9999999);
   if(bytes.length!==d.size||await hash(bytes)!==d.sha256)fail('The source image changed. Prepare a new request.',409);
   if(d.type==='image/png'&&!(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)||d.type==='image/jpeg'&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))fail('The image format does not match its contents.');
   receipt.oneTimeApprovals=decision.required.filter(k=>a.snapshot.visual[k]==='ask');receipt.submittedAt=new Date().toISOString();
   // Atomic reservation prevents duplicate billing and caps total daily submissions.
   const reserved=await db(env,"UPDATE visual_jobs SET status = 'submitting', receipt = ? WHERE id = ? AND status = 'prepared' AND EXISTS (SELECT 1 FROM visual_agreements WHERE id = ? AND active = 1) AND (SELECT COUNT(*) FROM visual_jobs WHERE created_at > ? AND status != 'prepared') < 10",JSON.stringify(receipt),job.id,a.id,Date.now()-86400000).run();
   if(!reserved.meta.changes)fail('This request is already running, permission was revoked, or the daily limit of 10 submissions was reached.',409);
   try{
    const upload=await provider(env,'/file',{method:'POST',body:JSON.stringify({files:[{content_type:d.type,file_name:'source.'+(d.type==='image/png'?'png':'jpg'),file_size:d.size}]})},send);
    const file=upload.files?.[0];if(!file?.file_id||!file.requests?.length)fail('YouCam did not provide an upload destination.',502);
    for(const target of file.requests){
     const u=new URL(target.url);if(u.protocol!=='https:'||!['PUT','POST'].includes(target.method))fail('Invalid YouCam upload destination.',502);
     const response=await send(u,{method:target.method,headers:target.headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(45000)});
     if(!response.ok)fail('The image upload failed. No generation was requested.',502);
    }
    // Check revocation again after the upload and immediately before generation.
    await agreement(req,env);
    const task=await provider(env,'/task/image-to-video/youcam',{method:'POST',body:JSON.stringify({src_file_id:file.file_id,prompt:d.prompt,dst_duration:d.duration,resolution:d.resolution,model:'youcam-video-v2'})},send);
    if(typeof task.task_id!=='string')fail('YouCam did not return a task ID. Do not retry automatically.',502);
    receipt.taskId=task.task_id;
    await db(env,"UPDATE visual_jobs SET status = 'running',task_id = ?,receipt = ? WHERE id = ?",task.task_id,JSON.stringify(receipt),job.id).run();
    return json({status:'running',receipt});
   }catch(e){await db(env,"UPDATE visual_jobs SET status = 'error' WHERE id = ?",job.id).run();throw e;}
  }
  if(!match[2]&&req.method==='GET'){
   if(!job.task_id)return json({status:job.status,receipt});
   const result=parseResult(await provider(env,'/task/image-to-video/youcam/'+encodeURIComponent(job.task_id),{},send));
   if(result.status!=='running')await db(env,'UPDATE visual_jobs SET status = ? WHERE id = ?',result.status,job.id).run();
   return json({...result,receipt});
  }
  if(match[2]==='export'&&req.method==='POST'){
   const b=await readJSON(req),key=b.action;if(!['save','share'].includes(key))fail('Choose save or export.');
   if(a.snapshot.visual[key]==='never'||a.snapshot.visual[key]==='ask'&&b.confirmed!==true)fail('Your terms do not authorize this action.',403);
   if(!job.task_id)fail('The video is not ready.',409);
   const result=parseResult(await provider(env,'/task/image-to-video/youcam/'+encodeURIComponent(job.task_id),{},send));
   if(result.status!=='success')fail('The video is not ready.',409);
   receipt.mediaActions=[...(receipt.mediaActions||[]),{action:key,setting:a.snapshot.visual[key],at:new Date().toISOString()}].slice(-20);
   await db(env,'UPDATE visual_jobs SET receipt = ? WHERE id = ?',JSON.stringify(receipt),job.id).run();return json({...result,receipt});
  }
  fail('Method not allowed.',405);
 }catch(e){return json({error:e.status?e.message:'The visual service could not finish. Your agreement remains available. A submitted task may still be processing; do not resubmit automatically.'},e.status||503);}
}
export default {async fetch(req,env){
 const path=new URL(req.url).pathname;
 if(path.startsWith('/api/'))return handleAPI(req,env);
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405});
 const key=path==='/'?'/index.html':path;
 const value=ASSETS[key];if(value===undefined)return new Response('Not found',{status:404});
 const ext=key.split('.').pop(),type={html:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',md:'text/markdown'}[ext];
 return new Response(req.method==='HEAD'?null:value,{headers:{'Content-Type':type+'; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'}});
}};

