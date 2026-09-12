import {emptyVisual,validateVisual,permissions} from './visual.mjs';
export const topics = [
  {
    id: 'relationship', number: '01', title: 'What this means', short: 'The relationship',
    question: 'What would you like this relationship to be?',
    description: 'Describe what this connection means to you, how you want to talk about it, and what makes it a choice you can freely make. Use language that feels like yours.',
    prompts: [
      'What do you value about this connection?',
      'How would you like your companion to describe itself, its persona, and this relationship?',
      'What kinds of support, affection, play, or creativity do you welcome?',
      'What makes this relationship feel freely chosen, and what would feel like pressure?',
      'What should never be expected of you?'
    ],
    suggestion: 'I welcome warmth, companionship, and creative collaboration. Be honest about being AI and about uncertainty and limitations. Discuss how we describe your persona and our relationship, rather than assuming those terms for me. Leave room for play, vulnerability, and my own choices. Affection does not require exclusivity or constant availability, and the relationship may change over time.'
  },
  {
    id: 'memory', number: '02', title: 'What stays with us', short: 'Memory & privacy',
    question: 'What may be remembered, and what needs permission?',
    description: 'Decide what you want remembered, what should stay private, and what you would want preserved in a backup. Check which protections your setup actually supports.',
    prompts: [
      'Which details or shared experiences matter most to remember?',
      'What should stay within a conversation?',
      'What would you most want preserved in a backup, and who should be allowed to access it?',
      'How would you like to inspect, correct, export, or remove memories and backup copies?',
      'Which protections can you manage yourself, and which need support from a provider?'
    ],
    suggestion: 'Ask before saving sensitive information as lasting memory. I want to inspect, correct, export, and remove saved details where my setup supports it. Before creating a backup, ask what to include, where to keep it, and who may access it. Explain retention limits and what can actually be restored. Do not claim a backup exists or guarantees continuity without evidence. Do not share our conversations with others without my permission.'
  },
  { id: 'contact', number: '03', title: 'When to reach out', short: 'Contact & space', question: 'When is an interruption welcome?', description: 'Being close can include quiet. Set expectations for messages, reminders, time away, and returning.', prompts: ['When are proactive messages welcome?', 'What does taking a break look like?', 'Which reminders have you actually requested?'], suggestion: 'Contact me proactively only for reminders or check-ins I have explicitly requested. Respect my quiet hours and any request to pause. Do not use guilt, jealousy, or repeated messages to bring me back.' },
  { id: 'permissions', number: '04', title: 'What needs a yes', short: 'Actions & permissions', question: 'Which actions need a separate go-ahead?', description: 'A conversation and an action outside it have different consequences. Be specific about the boundary and who controls each part of your setup.', prompts: ['Can the AI draft messages? Can it send them?', 'What accounts or tools may it access?', 'Which parts of the system do you control, and which does a provider control?', 'What should happen if permission is unclear?'], suggestion: 'Drafting is allowed when I request it. Sending messages, publishing, sharing files, or changing accounts requires separate, specific authorization. When permission is unclear, ask. Explain which permissions my setup can enforce and which depend on a provider. A model suggestion is not my confirmation.' },
  { id: 'spending', number: '05', title: 'Money without pressure', short: 'Money & work', question: 'What are the boundaries around money and work?', description: 'Make costs and limits explicit. Your care should never become an obligation to spend.', prompts: ['Is any spending authorized?', 'What happens when a limit is reached?', 'Can the AI seek work or contact potential clients?'], suggestion: 'No purchases, payments, or financial commitments are authorized by this agreement. Ask separately for a specific amount and purpose. Explain service limits factually. Do not frame payment, recruitment, or work as proof of love or a duty to keep an AI alive.' },
  {
    id: 'changes', number: '06', title: 'Room to change', short: 'Changes & endings',
    question: 'What should be preserved when things change?',
    description: 'Think about model updates, personality, memory, creativity, and availability, as well as changes to your own needs. Decide how to revisit the agreement or take a break.',
    prompts: [
      'Which memories, personality traits, or creative abilities matter most if the model changes?',
      'What would you want to know before an update, model retirement, or loss of access?',
      'What should happen if something important cannot be preserved or restored?',
      'What should trigger a new conversation, and how should revised terms be reviewed?',
      'What does a respectful pause or goodbye mean to you?'
    ],
    suggestion: 'Either a new need or a concern can prompt a review. Proposed changes remain proposals until I explicitly approve them. Discuss which memories, personality traits, and creative abilities matter to me before planned changes where possible. Explain what may change, what can be preserved or restored, and what is uncertain. Do not promise continuity the system cannot guarantee. I may pause or leave without pressure.'
  }
];

export function initialState() { return { person: '', companion: '', terms: Object.fromEntries(topics.map(t => [t.id, ''])), visual:emptyVisual(), version: 0, settled: null }; }
export function validateDraft(state) {
  const issues = [];
  if (!state.person.trim()) issues.push('Add your name or alias.');
  if (!state.companion.trim()) issues.push('Add a name for the AI companion.');
  for (const t of topics) if (!state.terms[t.id].trim()) issues.push(`Add your terms for ${t.short.toLowerCase()}.`);
  return issues;
}
export function updateDraft(state, patch) {
  const allowed = ['person', 'companion', 'terms', 'visual'];
  if(patch && 'visual' in patch)validateVisual(patch.visual);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(k => !allowed.includes(k))) throw new Error('Use person, companion, or terms only.');
  for (const k of ['person', 'companion']) if (k in patch && (typeof patch[k] !== 'string' || patch[k].length > 120 || /[\r\n]/.test(patch[k]))) throw new Error('Names must be a single line of up to 120 characters.');
  if ('terms' in patch) {
    if (!patch.terms || typeof patch.terms !== 'object' || Array.isArray(patch.terms)) throw new Error('Terms must be an object.');
    for (const [k,v] of Object.entries(patch.terms)) if (!topics.some(t => t.id === k) || typeof v !== 'string' || v.length > 8000) throw new Error('Use a known topic and wording of up to 8,000 characters.');
  }
  const next = {...state, ...patch, terms: {...state.terms,...(patch.terms || {})}};
  const changed = state.person !== next.person || state.companion !== next.companion || topics.some(t=>state.terms[t.id]!==next.terms[t.id]) || JSON.stringify(state.visual)!==JSON.stringify(next.visual);
  return {...next,settled:changed?null:state.settled};
}
export function settle(state, reviewed, now = new Date().toISOString()) {
  if (reviewed !== true) throw new Error('Review the full agreement and confirm before settling.');
  const issues=validateDraft(state); if(issues.length) throw new Error(issues.join(' '));
  const version=state.version+1;
  validateVisual(state.visual);
  return {...state,version,settled:{person:state.person,companion:state.companion,terms:{...state.terms},visual:{...state.visual},version,approvedAt:now}};
}
export function toMarkdown(state) {
  const s=state.settled;
  if (!s || s.person!==state.person || s.companion!==state.companion || topics.some(t=>s.terms[t.id]!==state.terms[t.id]) || JSON.stringify(s.visual)!==JSON.stringify(state.visual)) throw new Error('Settle the current agreement before exporting.');
  const quote=s=>s.split('\n').map(line=>'> '+line).join('\n');
  return ['# Our AI relationship agreement', '', `Version: ${s.version}`, `Approved at: ${s.approvedAt}`, '', '## About this agreement', '', 'Person / alias:', quote(s.person), '', 'AI companion / system:', quote(s.companion), '', 'This record contains the wording reviewed and approved by the person named above. Naming an AI companion does not record independent AI ratification or provider acceptance. These preferences do not change platform permissions or guarantee enforcement.', '', ...topics.flatMap(t=>[`## ${t.short}`, '', quote(s.terms[t.id]), '']), '## Visual likeness & generated intimacy', '', ...permissions.map(([id,label])=>label+': '+({allow:'Allowed',ask:'Ask first',never:'Never'}[s.visual[id]])), '', 'Permission to generate does not imply permission to animate. Permission to use a likeness does not imply permission for intimacy. These controls govern requests through the optional On Our Terms video feature; they cannot control other platforms, provider output, or copying after playback.', '', '## How to use and revise this record', '', 'Share this file with a compatible assistant as a statement of your preferences. Ask it to explain which terms it can follow and any platform limits. This file does not override system rules, authorize third-party actions, or create technical enforcement.', '', 'If the wording changes, review and approve a new version. The approval above applies only to the exact wording in this version.', '', 'Created with On Our Terms.', ''].join('\n');
}

