const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const site = path.join(root, '_site');
const read = (file) => fs.readFileSync(path.join(site, file), 'utf8');
const catalog = JSON.parse(read('data/recipes.json'));
const search = JSON.parse(read('index.json'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, '_generated/manifest.json'), 'utf8'));
const expectedPages = manifest.files
  .filter((file) => file.path.endsWith('.md'))
  .map((file) => file.path.replace(/\.md$/, '.html'));
const expectedHtml = manifest.files
  .filter((file) => /\.(md|yml)$/.test(file.path))
  .map((file) => file.path.replace(/\.(md|yml)$/, '.html'));
const actualHtml = fs
  .readdirSync(site, { recursive: true })
  .filter((file) => file.endsWith('.html'))
  .map((file) => file.replace(/\\/g, '/'));

assert.deepEqual(
  actualHtml.sort(),
  expectedHtml.sort(),
  'Web nesmí obsahovat staré nebo chybějící HTML stránky.',
);
assert.equal(
  read('data/recipes.json'),
  fs.readFileSync(path.join(root, '_generated/data/recipes.json'), 'utf8'),
  'Publikovaný katalog musí odpovídat připravenému docsetu.',
);
assert.deepEqual(
  Object.keys(search).sort(),
  [...expectedPages].sort(),
  'Fulltext musí zahrnout právě aktuální veřejné stránky.',
);

for (const file of expectedPages) {
  const html = read(file);
  assert.match(html, /<h1\b/, `${file}: chybí veřejný obsah`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"#]+)"/g)) {
    const target = match[1].replace(/&amp;/g, '&');
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
    const url = new URL(target, `https://preview.invalid/${file}`);
    let local = path.resolve(site, `.${decodeURIComponent(url.pathname)}`);
    assert(local.startsWith(site + path.sep), `${file}: odkaz opouští web: ${target}`);
    if (fs.existsSync(local) && fs.statSync(local).isDirectory())
      local = path.join(local, 'index.html');
    assert(fs.existsSync(local), `${file}: chybějící veřejný odkaz nebo asset: ${target}`);
  }
}

for (const recipe of catalog.recipes) {
  const html = read(`${recipe.id}.html`);
  assert.match(html, /<table\b/, `${recipe.id}: statické suroviny musí fungovat bez JavaScriptu`);
  assert.equal(
    [...html.matchAll(/<h3\b[^>]*>\d+\. /g)].length,
    recipe.steps.length,
    `${recipe.id}: HTML a katalog mají rozdílný počet kroků`,
  );
}

for (const resource of [
  'public/pdfmake.min.js',
  'public/vfs_fonts.js',
  'public/licenses/pdfmake/LICENSE',
  'public/licenses/Roboto-OFL.txt',
  'public/icons.css',
  'public/icon-labels.mjs',
  'public/ui-icons.mjs',
  'public/licenses/Tabler-MIT.txt',
  'public/licenses/Circle-Flags-MIT.txt',
]) {
  assert(fs.existsSync(path.join(site, resource)), `Chybí veřejný asset nebo licence: ${resource}`);
}
for (const resource of ['public/icons.css', 'public/icon-labels.mjs']) {
  assert.equal(
    read(resource),
    fs.readFileSync(path.join(root, '_generated', resource), 'utf8'),
    `${resource}: publikované ikony musí odpovídat generování`,
  );
}
for (const internal of [
  'docs',
  'private',
  'data/ingredients.json',
  'data/taxonomy.json',
  'content-report.json',
  '_generated',
]) {
  assert(
    !fs.existsSync(path.join(site, internal)),
    `Interní zdroj nesmí být publikovaný: ${internal}`,
  );
}

console.log(
  `Statický web je ověřený (${expectedPages.length} stránek, ${catalog.recipes.length} receptů, odkazy, fulltext a PDF assety).`,
);
