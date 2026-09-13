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
const identity={person:'',companion:''};
let requestSerial=0;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
  return `<aside class="${classes.join(' ')}" data-seymour-panel="${escape(key)}" aria-live="polite"><img class="seymour-mark" src="seymour.svg" alt=""><div class="seymour-copy"><p class="seymour-label">Seymour · officiant</p><p class="seymour-text">${body}</p><p class="seymour-note">Ceremonial reflection only — this is not part of the agreement wording you save.</p>${entry.status==='error'?'<button class="seymour-retry" type="button">Try Seymour again</button>':''}</div></aside>`;
}

function mount(){
  const key=destinationKey(),entry=key&&bridges.get(key);
  if(!key||!entry)return;
  const existing=document.querySelector(`[data-seymour-panel="${key}"]`);
  if(existing){existing.outerHTML=panelHTML(entry,key);return;}
  const wrapper=document.createElement('div');wrapper.innerHTML=panelHTML(entry,key);const panel=wrapper.firstElementChild;
  if(key==='review'){
    const documentCard=document.querySelector('.review-layout .document');
    if(documentCard)documentCard.insertBefore(panel,documentCard.firstChild);
  }else{
    const card=document.querySelector('.workspace > section .card');
    if(card)card.parentElement.insertBefore(panel,card);
  }
}

async function askSeymour(payload,key,serial){
  try{
    const response=await fetch('/api/seymour',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    let result={};try{result=await response.json();}catch{}
    if(!response.ok)throw new Error(result.error||'Seymour could not join this transition.');
    if(serial!==requestSerial)return;
    bridges.set(key,{status:'ready',text:result.text,payload});
  }catch(error){
    if(serial!==requestSerial)return;
    bridges.set(key,{status:'error',message:error.message,payload});
  }
  mount();
}

function beginTransition(fromIndex){
  if(fromIndex<0||fromIndex>5)return;
  const terms=document.querySelector('#terms')?.value.trim()||'';
  if(!terms)return;
  const toIndex=Math.min(fromIndex+1,6),from=TOPICS[fromIndex],to=TOPICS[toIndex];
  const payload={person:identity.person,companion:identity.companion,from:{id:from.id,label:from.label,terms},to:{id:to.id,label:to.label,question:to.question}};
  const serial=++requestSerial;
  bridges.set(to.id,{status:'loading',payload});
  setTimeout(mount,0);
  void askSeymour(payload,to.id,serial);
}

function retry(key){
  const entry=bridges.get(key);if(!entry?.payload)return;
  const serial=++requestSerial;
  bridges.set(key,{status:'loading',payload:entry.payload});mount();
  void askSeymour(entry.payload,key,serial);
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
