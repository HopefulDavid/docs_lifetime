import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..');
const site = path.join(root, '_site');
const ownAssets = path.join(root, 'templates/life/public');
const mediaLimit = 4 * 1024 * 1024;

const read = (file) => fs.readFileSync(path.join(site, file), 'utf8');

const list = (directory) =>
  fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(directory, path.join(entry.parentPath, entry.name)).replace(/\\/g, '/'),
    );

/** Najde místní cíl odkazu vůči publikovanému souboru a ověří, že na webu existuje. */
function assertPublished(file, target) {
  const { pathname } = new URL(target, `https://web.invalid/${file}`);
  const local = path.join(
    site,
    decodeURIComponent(pathname),
    pathname.endsWith('/') ? 'index.html' : '',
  );
  assert(fs.existsSync(local), `${file}: chybí cíl odkazu ${target}`);
}

function verifyPages(sources, search) {
  const htmlOf = (file) => file.replace(/\.(?:md|yml)$/, '.html');
  const pages = sources.filter((file) => file.endsWith('.md')).map(htmlOf);
  assert.deepEqual(
    list(site)
      .filter((file) => file.endsWith('.html'))
      .sort(),
    sources
      .filter((file) => /\.(?:md|yml)$/.test(file))
      .map(htmlOf)
      .sort(),
    'Stránky webu neodpovídají zdrojům.',
  );
  assert.deepEqual(
    Object.keys(search).sort(),
    [...pages].sort(),
    'Hledání nepokrývá právě všechny stránky.',
  );
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<h1\b/, `${page}: chybí hlavní nadpis`);
    for (const [, target] of html.matchAll(/\b(?:href|src)="([^"#]+)"/g))
      if (!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target))
        assertPublished(page, target.replace(/&amp;/g, '&'));
  }
  return pages.length;
}

/** Recept musí být čitelný bez JavaScriptu a shodovat se s katalogem. */
function verifyRecipes(recipes) {
  for (const { id, steps, sourceVideo } of recipes) {
    const page = `${id}.html`;
    const html = read(page);
    assert.match(html, /<table\b/, `${page}: chybí tabulka surovin`);
    assert.equal(
      html.match(/<h3\b[^>]*>\d+\. /g)?.length,
      steps.length,
      `${page}: počet kroků neodpovídá katalogu`,
    );
    if (!sourceVideo) continue;
    assert.match(html, /<h2 id="video-postup">/, `${page}: chybí sekce videa`);
    // Přehrávač načítá úvodní snímek stejného názvu až v prohlížeči.
    assertPublished(page, sourceVideo.file.replace(/\.mp4$/, '.jpg'));
  }
}

/** Soubory načítané až v prohlížeči neodhalí odkazy v HTML. */
function verifyAssets() {
  const transpiler = new Bun.Transpiler({ loader: 'js' });
  for (const file of list(ownAssets)) {
    const source = fs.readFileSync(path.join(ownAssets, file), 'utf8');
    if (file.endsWith('.js'))
      for (const { path: target } of transpiler.scanImports(source))
        assertPublished(`public/${file}`, target);
    if (file.endsWith('.css'))
      for (const [, target] of source.matchAll(/@import (?:url\()?["']([^"']+)["']/g))
        assertPublished(`public/${file}`, target);
  }
  for (const file of ['pdfmake.min.js', 'vfs_fonts.js', 'licenses/pdfmake/LICENSE'])
    assertPublished('public/', file);
}

function verifyMedia(files) {
  const media = files.filter((file) => file.startsWith('media/'));
  for (const file of media)
    assert(
      fs.statSync(path.join(site, file)).size <= mediaLimit,
      `${file}: soubor překračuje limit ${mediaLimit / 1024 / 1024} MB`,
    );
  return media.length;
}

function verifyPrivacy(files) {
  const internal = files.filter(
    (file) => /^private\//.test(file) || (/^data\//.test(file) && file !== 'data/recipes.json'),
  );
  assert.deepEqual(internal, [], 'Web obsahuje interní soubory.');
}

try {
  const files = list(site);
  const { recipes } = JSON.parse(read('data/recipes.json'));
  const pages = verifyPages(list(path.join(root, '_generated')), JSON.parse(read('index.json')));
  verifyRecipes(recipes);
  verifyAssets();
  const media = verifyMedia(files);
  verifyPrivacy(files);
  console.log(`Web je ověřený. Stránky: ${pages}, recepty: ${recipes.length}, média: ${media}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
