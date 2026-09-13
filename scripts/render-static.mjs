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
  'dist/api/config.json'
];

await Promise.all(required.map(file => access(file)));

const path='dist/index.html';
let html = await readFile(path, 'utf8');
for (const asset of ['styles.css', 'app.js']) {
  if (!html.includes(asset)) throw new Error(`dist/index.html does not reference ${asset}`);
}
if(!html.includes('seymour.js')){
  html=html.replace('</body>','  <script type="module" src="seymour.js"></script>\n</body>');
  await writeFile(path,html);
}

console.log('Render web app is ready in dist/ with Seymour transitions.');
