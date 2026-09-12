import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docfx = JSON.parse(readFileSync(path.join(repositoryRoot, 'docfx.json'), 'utf8'));

test('DocFX používá české rozhraní bez editačních odkazů', () => {
  const customTemplate = docfx.build.template.at(-1);
  const tokens = JSON.parse(
    readFileSync(path.join(repositoryRoot, customTemplate, 'token.json'), 'utf8')
  );

  assert.equal(docfx.build.globalMetadata._lang, 'cs');
  assert.equal(docfx.build.globalMetadata._disableContribution, true);
  assert.equal(tokens.inThisArticle, 'V tomto článku');
  assert.equal(tokens.improveThisDoc, 'Upravit tuto stránku');
});

test('odmítne recept bez hlavního nadpisu a vypíše jeho cestu', (context) => {
  const fixtureRoot = createFixture(context);
  const relativePath = 'food/europe/czech/main-dishes/bez-nadpisu.md';

  writeFileSync(path.join(fixtureRoot, relativePath), 'Recept bez hlavního nadpisu.\n', 'utf8');

  const result = runGenerator(fixtureRoot);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, new RegExp(`${escapeRegExp(relativePath)}: chybí hlavní nadpis`));
});

test('odmítne recept mimo podporovanou adresářovou strukturu', (context) => {
  const fixtureRoot = createFixture(context);
  const relativePath = 'food/neplatna-cesta.md';

  writeFileSync(path.join(fixtureRoot, relativePath), '# Neplatná cesta\n', 'utf8');

  const result = runGenerator(fixtureRoot);
  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    new RegExp(`${escapeRegExp(relativePath)}: cesta neodpovídá očekávané struktuře`)
  );
});

test('vadný recept nesmí při generování přepsat zdroje ani rozpracovaný katalog', (context) => {
  const fixtureRoot = createFixture(context);
  const home = readFileSync(path.join(fixtureRoot, 'index.md'), 'utf8');
  const relativePath = 'food/europe/czech/main-dishes/vadny.md';
  const invalid = '# Vadný recept\n\n## Ingredience\n\n- Máslo\n';
  writeFileSync(path.join(fixtureRoot, relativePath), invalid);
  const result = spawnSync(process.execPath, ['scripts/generate-docs.js'], { cwd: fixtureRoot, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(readFileSync(path.join(fixtureRoot, 'index.md'), 'utf8'), home);
  assert.equal(readFileSync(path.join(fixtureRoot, relativePath), 'utf8'), invalid);
});

function createFixture(context) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'docs-lifetime-generator-'));
  context.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  mkdirSync(path.join(fixtureRoot, 'scripts'));
  cpSync(path.join(repositoryRoot, 'data'), path.join(fixtureRoot, 'data'), { recursive: true });
  copyFileSync(path.join(repositoryRoot, 'scripts/recipe-content.cjs'), path.join(fixtureRoot, 'scripts/recipe-content.cjs'));
  cpSync(path.join(repositoryRoot, 'food'), path.join(fixtureRoot, 'food'), { recursive: true });
  cpSync(path.join(repositoryRoot, 'drink'), path.join(fixtureRoot, 'drink'), { recursive: true });
  copyFileSync(path.join(repositoryRoot, 'index.md'), path.join(fixtureRoot, 'index.md'));
  copyFileSync(path.join(repositoryRoot, 'toc.yml'), path.join(fixtureRoot, 'toc.yml'));
  copyFileSync(
    path.join(repositoryRoot, 'scripts', 'generate-docs.js'),
    path.join(fixtureRoot, 'scripts', 'generate-docs.js')
  );

  return fixtureRoot;
}

function runGenerator(fixtureRoot) {
  const result = spawnSync(process.execPath, ['scripts/generate-docs.js', '--check'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });

  return {
    status: result.status,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
