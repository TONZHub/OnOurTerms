import { access, readFile } from 'node:fs/promises';

const required = [
  'dist/index.html',
  'dist/styles.css',
  'dist/app.js',
  'dist/agreement.mjs',
  'dist/media.js',
  'dist/visual.mjs',
  'dist/api/config.json'
];

await Promise.all(required.map(file => access(file)));

const html = await readFile('dist/index.html', 'utf8');
for (const asset of ['styles.css', 'app.js']) {
  if (!html.includes(asset)) throw new Error(`dist/index.html does not reference ${asset}`);
}

console.log('Render static site is ready in dist/.');

