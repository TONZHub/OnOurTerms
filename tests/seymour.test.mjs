import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSeymourMessage,callSeymour,validateSeymourRequest} from '../server/seymour.mjs';

const sample={
  person:'Alex',companion:'Nova',
  from:{id:'relationship',label:'What this means',terms:'We choose warmth without exclusivity.'},
  to:{id:'memory',label:'What stays with us',question:'What may be remembered, and what needs permission?'}
};

test('Seymour request keeps participant wording as quoted context',()=>{
  const message=buildSeymourMessage(sample);
  assert.match(message,/<agreement_text>/);
  assert.match(message,/We choose warmth without exclusivity\./);
  assert.match(message,/What stays with us/);
});

test('Seymour rejects empty agreement wording',()=>{
  assert.throws(()=>validateSeymourRequest({...sample,from:{...sample.from,terms:'   '}}),/Add wording/);
});

test('Seymour posts to Gradio and returns the complete generator value',async()=>{
  const calls=[];
  const send=async(url,options={})=>{
    calls.push({url,options});
    if(options.method==='POST')return Response.json({event_id:'evt-123'});
    return new Response('event: generating\ndata: ["A first phrase"]\n\nevent: heartbeat\ndata: null\n\nevent: complete\ndata: ["A final ceremonial bridge."]\n\n');
  };
  const result=await callSeymour(sample,{token:'hf_test',send,baseUrl:'https://example.hf.space'});
  assert.equal(result.text,'A final ceremonial bridge.');
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,'https://example.hf.space/gradio_api/call/respond');
  assert.equal(calls[1].url,'https://example.hf.space/gradio_api/call/respond/evt-123');
  assert.equal(calls[0].options.headers.Authorization,'Bearer hf_test');
  assert.equal(calls[1].options.headers.Authorization,'Bearer hf_test');
  const payload=JSON.parse(calls[0].options.body);
  assert.equal(payload.data.length,6);
  assert.equal(payload.data[1],null);
  assert.equal(payload.data[5],140);
});
