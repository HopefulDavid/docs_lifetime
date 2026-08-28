import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
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
const packageConfig = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));

test('používá uzamčený git-cliff v automatickém build toku', () => {
  const gitignore = readFileSync(path.join(repositoryRoot, '.gitignore'), 'utf8');

  assert.match(packageConfig.devDependencies['git-cliff'], /^\d+\.\d+\.\d+$/);
  assert.equal(
    packageConfig.scripts['changelog:generate'],
    'git-cliff --config cliff.toml --output changelog.md',
  );
  assert.match(packageConfig.scripts['docs:build'], /npm run changelog:generate/);
  assert.match(packageConfig.scripts['docs:check'], /^npm run changelog:generate && /);
  assert.match(gitignore, /^changelog\.md$/m);
});

test('generuje úplnou čtenářskou historii nezávisle na tagu a prostředí', (context) => {
  const fixtureRoot = createFixture(context);

  run(fixtureRoot, 'git', ['init', '--quiet']);
  run(fixtureRoot, 'git', ['config', 'user.name', 'Test']);
  run(fixtureRoot, 'git', ['config', 'user.email', 'test@example.invalid']);
  run(fixtureRoot, 'git', [
    'remote',
    'add',
    'origin',
    'https://github.com/example/changelog-fixture.git',
  ]);

  commit(fixtureRoot, 'feat: přidej první změnu', 'první', '2026-08-27T12:00:00+02:00');
  run(fixtureRoot, 'git', ['tag', 'v1.0.0']);
  commit(fixtureRoot, 'ci: ověř druhou změnu', 'druhá', '2026-08-28T12:00:00+02:00');
  commit(
    fixtureRoot,
    'feat(core)!: změň veřejný kontrakt',
    'třetí',
    '2026-08-28T13:00:00+02:00',
  );
  commit(fixtureRoot, 'historický záznam', 'čtvrtá', '2026-08-28T14:00:00+02:00');

  const utc = generateChangelog(fixtureRoot, 'UTC');
  const prague = generateChangelog(fixtureRoot, 'Europe/Prague');
  const head = run(fixtureRoot, 'git', ['rev-parse', 'HEAD']).output.trim();

  assert.equal(prague, utc);
  assert.match(utc, /^# Změny/m);
  assert.match(utc, /automaticky generuje z úplné Git historie/);
  assert.ok(utc.includes(`> Zdrojový stav: \`${head.slice(0, 7)}\`.`));
  assert.match(utc, /Zahrnuté commity: \*\*4\*\*\./);
  assert.match(utc, /<a id="nove-funkce"><\/a>\r?\n## ✨ Nové funkce/u);
  assert.match(utc, /<a id="technicke-zmeny"><\/a>\r?\n## 🔩 Technické změny/u);
  assert.match(utc, /## ✨ Nové funkce/);
  assert.match(utc, /## 🧾 Ostatní změny/);
  assert.match(
    utc,
    /<details>\s*<summary>Zobrazit technické záznamy \(1\)<\/summary>[\s\S]*Ověř druhou změnu[\s\S]*<\/details>/u,
  );
  assert.ok(utc.indexOf('## ✨ Nové funkce') < utc.indexOf('## 🔩 Technické změny'));
  assert.doesNotMatch(utc, /## 🏗️ Sestavení a CI/);
  assert.match(utc, /⚠️ \*\*Nekompatibilní změna:\*\*/u);
  assert.match(utc, /\*\*core:\*\* Změň veřejný kontrakt/);
  assert.match(utc, /Přidej první změnu/);
  assert.match(utc, /Ověř druhou změnu/);
  assert.match(utc, /Historický záznam/);
  assert.match(utc, /2026-08-27/);
  assert.match(utc, /2026-08-28/);
  assert.match(utc, /· `[0-9a-f]{7}`/);
  assert.doesNotMatch(utc, /https:\/\/github\.com\/.+\/commit\//);
  assert.doesNotMatch(utc, /## 1\.0\.0/);
});

function createFixture(context) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'docs-changelog-'));
  context.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  const fixtureConfig = readFileSync(path.join(repositoryRoot, 'cliff.toml'), 'utf8');
  writeFileSync(path.join(fixtureRoot, 'cliff.toml'), fixtureConfig, 'utf8');
  writeFileSync(
    path.join(fixtureRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'changelog-fixture',
        private: true,
        scripts: { 'changelog:generate': packageConfig.scripts['changelog:generate'] },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return fixtureRoot;
}

function generateChangelog(fixtureRoot, timeZone) {
  const result = runShell(fixtureRoot, packageConfig.scripts['changelog:generate'], {
    PATH: `${path.join(repositoryRoot, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH}`,
    TZ: timeZone,
  });

  assert.equal(result.status, 0, result.output);
  return readFileSync(path.join(fixtureRoot, 'changelog.md'), 'utf8');
}

function commit(fixtureRoot, message, content, date) {
  writeFileSync(path.join(fixtureRoot, 'obsah.txt'), `${content}\n`, 'utf8');
  run(fixtureRoot, 'git', ['add', 'obsah.txt']);
  run(fixtureRoot, 'git', ['commit', '--quiet', '-m', message], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
}

function run(cwd, command, args, extraEnvironment = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnvironment },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  assert.equal(result.error, undefined, output || result.error?.message);
  assert.equal(result.status, 0, output);
  return { ...result, output };
}

function runShell(cwd, command, extraEnvironment = {}) {
  const result = spawnSync(command, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnvironment },
    shell: true,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  assert.equal(result.error, undefined, output || result.error?.message);
  return { ...result, output };
}
