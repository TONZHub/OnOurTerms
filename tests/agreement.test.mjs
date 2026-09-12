import test from 'node:test';
import assert from 'node:assert/strict';
import {topics,initialState,updateDraft,settle,toMarkdown,validateDraft} from '../dist/agreement.mjs';
const complete=()=>updateDraft(initialState(),{person:'Zoe',companion:'Companion',terms:Object.fromEntries(topics.map(t=>[t.id,t.suggestion]))});
test('export requires explicit approval of a complete agreement',()=>{
  assert.throws(()=>toMarkdown(initialState()),/Settle/);
  assert.throws(()=>settle(initialState(),true),/Add/);
  assert.throws(()=>settle(complete(),false),/Review/);
  assert.equal(validateDraft(complete()).length,0);
});
test('export preserves exact reviewed wording, including newlines and Markdown',()=>{
  const wording='Ask me first.\n\n# A heading I wrote\nDo not rewrite *this*.';
  const approved=settle(updateDraft(complete(),{terms:{memory:wording}}),true,'2026-09-11T14:00:00.000Z');
  const md=toMarkdown(approved);
  assert.ok(md.includes(wording.split('\n').map(l=>'> '+l).join('\n')));
  assert.ok(md.includes('Version: 1'));
  assert.ok(md.includes('2026-09-11T14:00:00.000Z'));
});
test('any changed term or identity invalidates approval and a reapproval increments the version',()=>{
  const approved=settle(complete(),true);
  for(const patch of [{person:'Someone else'},{companion:'Different companion'},{terms:{contact:'Only when I ask.'}}]){
    const revised=updateDraft(approved,patch);assert.equal(revised.settled,null);assert.throws(()=>toMarkdown(revised),/Settle/);assert.equal(settle(revised,true).version,2);
  }
  assert.equal(updateDraft(approved,{terms:{memory:approved.terms.memory}}).settled,approved.settled);
});
test('invalid staged patches cannot change the original state or bypass approval',()=>{
  const state=complete();const before=JSON.stringify(state);
  for(const patch of [{settled:{}},{terms:{unknown:'yes'}},{terms:{memory:1}},{person:'one\ntwo'},{terms:[]}])assert.throws(()=>updateDraft(state,patch));
  assert.equal(JSON.stringify(state),before);
  const approved=settle(state,true);approved.terms.memory='tampered';assert.throws(()=>toMarkdown(approved),/Settle/);
});

