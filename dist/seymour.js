const TOPICS=[
  {id:'relationship',label:'What this means',question:'What would you like this relationship to be?'},
  {id:'memory',label:'What stays with us',question:'What may be remembered, and what needs permission?'},
  {id:'contact',label:'When to reach out',question:'When is an interruption welcome?'},
  {id:'permissions',label:'What needs a yes',question:'Which actions need a separate go-ahead?'},
  {id:'spending',label:'Money without pressure',question:'What are the boundaries around money and work?'},
  {id:'changes',label:'Room to change',question:'What should be preserved when things change?'},
  {id:'review',label:'Review & settle',question:'What deserves to be witnessed before this version is settled?'}
];

const css=document.createElement('link');css.rel='stylesheet';css.href='seymour.css';document.head.append(css);

const bridges=new Map();
const requestIds=new Map();
const identity={person:'',companion:''};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

function currentIndex(){
  const buttons=[...document.querySelectorAll('[data-topic]')];
  return buttons.findIndex(button=>button.classList.contains('current'));
}

function destinationKey(){
  if(document.querySelector('.review-layout'))return 'review';
  const index=currentIndex();
  return index>=0?TOPICS[index].id:null;
}

function panelHTML(entry,key){
  const classes=['seymour-bridge'];
  if(entry.status==='loading')classes.push('seymour-loading');
  if(entry.status==='error')classes.push('seymour-error');
  if(key==='review')classes.push('seymour-review');
  const body=entry.status==='loading'
    ?`Seymour is finding a few words for this threshold<span class="seymour-dot" aria-hidden="true"></span>`
    :entry.status==='error'
      ?escape(entry.message||'Seymour could not join this transition.')
      :escape(entry.text);
  return `<aside class="${classes.join(' ')}" data-seymour-panel="${escape(key)}" data-seymour-status="${escape(entry.status)}" aria-live="polite"><img class="seymour-mark" src="seymour.svg" alt=""><div class="seymour-copy"><p class="seymour-label">Seymour · officiant</p><p class="seymour-text">${body}</p><p class="seymour-note">Ceremonial reflection only — this is not part of the agreement wording you save.</p>${entry.status==='error'?'<button class="seymour-retry" type="button">Try Seymour again</button>':''}</div></aside>`;
}

function mount(){
  const key=destinationKey(),entry=key&&bridges.get(key);
  if(!key||!entry)return;
  const wrapper=document.createElement('div');wrapper.innerHTML=panelHTML(entry,key);const panel=wrapper.firstElementChild;
  const existing=document.querySelector(`[data-seymour-panel="${key}"]`);
  if(existing){if(existing.outerHTML!==panel.outerHTML)existing.replaceWith(panel);return;}
  if(key==='review'){
    const documentCard=document.querySelector('.review-layout .document');
    if(documentCard)documentCard.insertBefore(panel,documentCard.firstChild);
  }else{
    const card=document.querySelector('.workspace > section .card');
    if(card)card.parentElement.insertBefore(panel,card);
  }
}

async function askSeymour(payload,key,requestId){
  try{
    const response=await fetch('/api/seymour',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.includes('application/json'))throw new Error('Seymour’s server route is not active on this deployment yet.');
    let result={};try{result=await response.json();}catch{throw new Error('Seymour returned an unreadable response.');}
    if(!response.ok)throw new Error(result.error||'Seymour could not join this transition.');
    if(typeof result.text!=='string'||!result.text.trim())throw new Error('Seymour returned no ceremony text.');
    if(requestIds.get(key)!==requestId)return;
    bridges.set(key,{status:'ready',text:result.text.trim(),payload});
  }catch(error){
    if(requestIds.get(key)!==requestId)return;
    bridges.set(key,{status:'error',message:error.message,payload});
  }
  mount();
}

function startRequest(key,payload){
  const requestId=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
  requestIds.set(key,requestId);
  bridges.set(key,{status:'loading',payload});
  setTimeout(mount,0);
  void askSeymour(payload,key,requestId);
}

function beginTransition(fromIndex){
  if(fromIndex<0||fromIndex>5)return;
  const terms=document.querySelector('#terms')?.value.trim()||'';
  if(!terms)return;
  const toIndex=Math.min(fromIndex+1,6),from=TOPICS[fromIndex],to=TOPICS[toIndex];
  const payload={person:identity.person,companion:identity.companion,from:{id:from.id,label:from.label,terms},to:{id:to.id,label:to.label,question:to.question}};
  startRequest(to.id,payload);
}

function retry(key){
  const entry=bridges.get(key);if(entry?.payload)startRequest(key,entry.payload);
}

document.addEventListener('input',event=>{
  if(event.target?.id==='person')identity.person=event.target.value;
  if(event.target?.id==='companion')identity.companion=event.target.value;
},true);

document.addEventListener('click',event=>{
  const retryButton=event.target.closest?.('.seymour-retry');
  if(retryButton){const panel=retryButton.closest('[data-seymour-panel]');if(panel)retry(panel.dataset.seymourPanel);return;}
  const next=event.target.closest?.('#next-topic');
  if(next)beginTransition(currentIndex());
},true);

const app=document.querySelector('#app');
if(app)new MutationObserver(()=>queueMicrotask(mount)).observe(app,{childList:true,subtree:true});
window.addEventListener('hashchange',()=>setTimeout(mount,0));
