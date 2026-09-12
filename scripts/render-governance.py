"""Render the existing governance copy into the static landing page."""
from pathlib import Path
from html import escape
import re

root = Path(__file__).resolve().parents[1]
blocks = (root / 'dist/principles.md').read_text().strip().split('\n\n')
title = blocks[0].removeprefix('# ')
subtitle = blocks[1].strip('*')
version = blocks[2].strip('*')
introduction, sections, invitation = [], [], []
for block in blocks[3:]:
    heading = re.fullmatch(r'\*\*(\d+)\. (.+)\*\*', block)
    if heading:
        sections.append({'number': heading[1], 'title': heading[2], 'paragraphs': []})
    elif block == '**The invitation**':
        invitation.append('The invitation')
    elif invitation:
        invitation.append(block)
    elif sections:
        sections[-1]['paragraphs'].append(block)
    else:
        introduction.append(block)

paragraphs = lambda values: '\n'.join(f'<p>{escape(value)}</p>' for value in values)
nav_labels = ['Respect', 'Consent', 'Financial pressure', 'Honesty', 'Memory & access', 'Continuity & endings', 'Life beyond the product', 'AI experience', 'Accountability']
toc = '\n'.join(f'<li><a href="#principle-{s["number"]}"><span>{int(s["number"]):02d}</span>{escape(label)}</a></li>' for s, label in zip(sections, nav_labels))
body = '\n'.join(f'''<section class="governance-principle" id="principle-{s['number']}" aria-labelledby="principle-title-{s['number']}">
<span class="principle-number" aria-hidden="true">{int(s['number']):02d}</span>
<div><h2 id="principle-title-{s['number']}">{escape(s['title'])}</h2>{paragraphs(s['paragraphs'])}</div>
</section>''' for s in sections)
landing = f'''<!-- governance:start -->
  <main id="governance" class="governance-page">
    <section class="governance-hero" aria-labelledby="governance-title">
      <p class="eyebrow">On Our Terms · The framework</p>
      <h1 id="governance-title">{escape(title)}</h1>
      <p class="governance-subtitle">{escape(subtitle)}</p>
      <p class="governance-version">{escape(version)}</p>
    </section>
    <div class="governance-layout">
      <aside class="governance-contents"><nav aria-label="Governance principles"><p class="sidebar-label">In this framework</p><ol>{toc}</ol></nav></aside>
      <article class="governance-article" aria-label="AI relationship governance framework">
        <div class="governance-opening">{paragraphs(introduction)}</div>
        {body}
        <section class="governance-invitation"><h2>{escape(invitation[0])}</h2>{paragraphs(invitation[1:])}</section>
        <section class="governance-proceed" aria-labelledby="proceed-title"><p class="eyebrow">From principles to your own words</p><h2 id="proceed-title">What would this look like for you?</h2><p>Talk through your boundaries, review the wording, and keep the agreement you choose as Markdown.</p><a class="button" href="#agreement">Create your agreement <span aria-hidden="true">→</span></a></section>
      </article>
    </div>
    <noscript><p class="quiet-note">The governance is available to read here. Enable JavaScript to use the agreement builder.</p></noscript>
  </main>
  <!-- governance:end -->'''
page = root / 'dist/index.html'
source = page.read_text()
source, changed = re.subn(r'<!-- governance:start -->.*?<!-- governance:end -->', lambda _: landing, source, flags=re.S)
assert changed == 1
assert len(sections) == 9
page.write_text(source)

