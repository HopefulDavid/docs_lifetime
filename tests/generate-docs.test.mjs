import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

function createFixture(context) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'docs-lifetime-generator-'));
  context.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  mkdirSync(path.join(fixtureRoot, 'scripts'));
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
