export const permissions=[
 ['aiImage','Generate the AI’s visual representation'],
 ['upload','Use uploaded images as references'],
 ['likeness','Create media containing my likeness'],
 ['animate','Animate an image'],
 ['animateLikeness','Animate an image containing my likeness'],
 ['intimacy','Create romantic or intimate media'],
 ['realistic','Create photorealistic media'],
 ['save','Save generated media'],
 ['share','Share or export generated media']
];
export const emptyVisual=()=>Object.fromEntries(permissions.map(([id])=>[id,'ask']));
export function validateVisual(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==permissions.length||permissions.some(([id])=>!['allow','ask','never'].includes(value[id])))throw new Error('Choose Allowed, Ask first, or Never for each visual permission.');
 return value;
}
export function validateDescriptor(d){
 if(!d||typeof d!=='object'||!/^[a-f0-9]{64}$/.test(d.sha256)||typeof d.prompt!=='string'||!d.prompt.trim()||d.prompt.length>1500||!['image/jpeg','image/png'].includes(d.type)||!Number.isInteger(d.size)||d.size<1||d.size>=10000000||!['ai','me','us','other'].includes(d.subject)||typeof d.romantic!=='boolean'||typeof d.realistic!=='boolean'||![5,10].includes(d.duration)||!['480','720','1080'].includes(d.resolution)||d.rights!==true)throw new Error('Check the image, motion, and consent details. Use a JPG or PNG smaller than 10 MB.');
 return {sha256:d.sha256,prompt:d.prompt,type:d.type,size:d.size,subject:d.subject,romantic:d.romantic,realistic:d.realistic,duration:d.duration,resolution:d.resolution,rights:true};
}
export function checkPermission(visual,descriptor,approved=[]){
 validateVisual(visual);const d=validateDescriptor(descriptor);
 const required=['upload','animate'];
 if(['ai','us'].includes(d.subject))required.push('aiImage');
 if(['me','us'].includes(d.subject))required.push('likeness','animateLikeness');
 if(d.romantic)required.push('intimacy');
 if(d.realistic)required.push('realistic');
 const denied=required.filter(k=>visual[k]==='never');
 const ask=required.filter(k=>visual[k]==='ask'&&!approved.includes(k));
 return {required,denied,ask,allowed:denied.length===0&&ask.length===0};
}

