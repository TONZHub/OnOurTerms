import { access, readFile, writeFile } from 'node:fs/promises';

const required = [
  'dist/index.html',
  'dist/styles.css',
  'dist/app.js',
  'dist/agreement.mjs',
  'dist/media.js',
  'dist/visual.mjs',
  'dist/seymour.js',
  'dist/seymour.css',
  'dist/seymour.svg',
  'dist/api/config.json',
  'dist/principles.md'
];

await Promise.all(required.map(file => access(file)));

const escapeHtml = value => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#x27;');

const stripWrap = (value, wrapper) =>
  value.startsWith(wrapper) && value.endsWith(wrapper)
    ? value.slice(wrapper.length, -wrapper.length)
    : value;

const renderParagraph = value => {
  const tagged = value.match(/^\[(control|design|aspiration)\]\s+([\s\S]+)$/i);
  if (!tagged) return `<p>${escapeHtml(value)}</p>`;
  const type = tagged[1].toLowerCase();
  const label = type[0].toUpperCase() + type.slice(1);
  return `<p class="governance-tagged"><span class="governance-status governance-status--${type}">${label}</span>${escapeHtml(tagged[2])}</p>`;
};

const source = await readFile('dist/principles.md', 'utf8');
const blocks = source.trim().split(/\r?\n\r?\n/);
const title = blocks[0].replace(/^#\s+/, '');
const subtitle = stripWrap(blocks[1], '*');
const version = stripWrap(blocks[2], '**');
const introduction = [];
const sections = [];
const invitation = [];

for (const block of blocks.slice(3)) {
  const heading = block.match(/^\*\*(\d+)\. (.+)\*\*$/);
  if (heading) {
    sections.push({ number: heading[1], title: heading[2], paragraphs: [] });
  } else if (block === '**The invitation**') {
    invitation.push('The invitation');
  } else if (invitation.length) {
    invitation.push(block);
  } else if (sections.length) {
    sections.at(-1).paragraphs.push(block);
  } else {
    introduction.push(block);
  }
}

if (sections.length !== 9) throw new Error(`Expected 9 governance principles, found ${sections.length}`);

const navLabels = [
  'Respect',
  'Consent',
  'Extraction & persuasion',
  'Honesty',
  'Memory & third parties',
  'Continuity & portability',
  'Life beyond the product',
  'AI experience',
  'Accountability'
];

const toc = sections.map((section, index) =>
  `<li><a href="#principle-${section.number}"><span>${String(section.number).padStart(2, '0')}</span>${escapeHtml(navLabels[index])}</a></li>`
).join('\n');

const body = sections.map(section => `
<section class="governance-principle" id="principle-${section.number}" aria-labelledby="principle-title-${section.number}">
<span class="principle-number" aria-hidden="true">${String(section.number).padStart(2, '0')}</span>
<div><h2 id="principle-title-${section.number}">${escapeHtml(section.title)}</h2>${section.paragraphs.map(renderParagraph).join('\n')}</div>
</section>`).join('\n');

const landing = `<!-- governance:start -->
  <style>
    #governance .governance-status{display:inline-flex;align-items:center;margin:0 .62rem .18rem 0;padding:.22rem .48rem;border-radius:999px;font-family:'DM Mono',monospace;font-size:.64rem;line-height:1.2;letter-spacing:.06em;text-transform:uppercase;vertical-align:middle;white-space:nowrap}
    #governance .governance-status--control{background:var(--accent);color:var(--blue)}
    #governance .governance-status--design{border:1px solid var(--line);color:var(--muted);background:var(--paper)}
    #governance .governance-status--aspiration{background:var(--rose);color:var(--danger)}
  </style>
  <main id="governance" class="governance-page">
    <section class="governance-hero" aria-labelledby="governance-title">
      <p class="eyebrow">${escapeHtml(version)}</p>
      <h1 id="governance-title">${escapeHtml(subtitle)}</h1>
      <p class="governance-subtitle">${escapeHtml(introduction[0])}</p>
      <div class="hero-actions"><a class="button" href="#principle-1">Read the principles <span aria-hidden="true">↓</span></a><span>9 principles · ~15 min read</span></div>
    </section>
    <div class="governance-layout">
      <aside class="governance-contents"><nav aria-label="Governance principles"><p class="sidebar-label">In this framework</p><ol>${toc}</ol></nav></aside>
      <article class="governance-article" aria-label="${escapeHtml(title)} framework">
        <div class="governance-opening">${introduction.map(renderParagraph).join('\n')}</div>
        ${body}
        <section class="governance-invitation"><h2>${escapeHtml(invitation[0] || 'The invitation')}</h2>${invitation.slice(1).map(renderParagraph).join('\n')}</section>
        <section class="governance-proceed" aria-labelledby="proceed-title"><p class="eyebrow">From principles to your own words</p><h2 id="proceed-title">What would this look like for you?</h2><p>Talk through your boundaries, review the wording, and keep the agreement you choose as Markdown.</p><a class="button" href="#agreement">Create your agreement <span aria-hidden="true">→</span></a></section>
      </article>
    </div>
    <noscript><p class="quiet-note">The governance is available to read here. Enable JavaScript to use the agreement builder.</p></noscript>
  </main>
  <!-- governance:end -->`;

const path = 'dist/index.html';
let html = await readFile(path, 'utf8');
for (const asset of ['styles.css', 'app.js']) {
  if (!html.includes(asset)) throw new Error(`dist/index.html does not reference ${asset}`);
}
html = html.replace(/<!-- governance:start -->[\s\S]*?<!-- governance:end -->/, landing);
if (!html.includes('seymour.js')) {
  html = html.replace('</body>', '  <script type="module" src="seymour.js"></script>\n</body>');
}
await writeFile(path, html);

console.log(`Render web app is ready with ${version} governance and Seymour transitions.`);
