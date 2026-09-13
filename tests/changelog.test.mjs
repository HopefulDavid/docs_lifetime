import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  createChangelogFixture,
  generateChangelogInTimezone,
  commit,
  runGit,
} from './fixtures/changelog.mjs';

test('generuje úplnou čtenářskou historii po ročních obdobích nezávisle na tagu a prostředí', (context) => {
  const fixtureRoot = createChangelogFixture(context);

  runGit(fixtureRoot, ['init', '--quiet']);
  runGit(fixtureRoot, ['config', 'user.name', 'Test']);
  runGit(fixtureRoot, ['config', 'user.email', 'test@example.invalid']);
  runGit(fixtureRoot, [
    'remote',
    'add',
    'origin',
    'https://github.com/example/changelog-fixture.git',
  ]);

  commit(fixtureRoot, 'feat: přidej první změnu', 'první', '2024-08-27T12:00:00+02:00');
  runGit(fixtureRoot, ['tag', 'v1.0.0']);
  commit(fixtureRoot, 'fix: oprav starší změnu', 'druhá', '2025-05-10T12:00:00+02:00');
  commit(fixtureRoot, 'docs: doplň starší návod', 'třetí', '2025-06-11T12:00:00+02:00');
  commit(fixtureRoot, 'ci: ověř aktuální změnu', 'čtvrtá', '2025-12-31T23:30:00+00:00');
  commit(fixtureRoot, 'feat(core)!: změň veřejný kontrakt', 'pátá', '2026-08-28T13:00:00+02:00');
  commit(fixtureRoot, 'historický záznam', 'šestá', '2026-08-28T14:00:00+02:00');

  const utc = generateChangelogInTimezone(fixtureRoot, 'UTC');
  const prague = generateChangelogInTimezone(fixtureRoot, 'Europe/Prague');
  const head = runGit(fixtureRoot, ['rev-parse', 'HEAD']).output.trim();

  // Přelom roku se má řídit Prahou bez ohledu na časovou zónu procesu.
  assert.equal(prague, utc);
  assert.match(utc, /^# Změny/m);
  assert.match(utc, /automaticky generuje z úplné Git historie/);
  assert.ok(utc.includes(`> Zdrojový stav: \`${head.slice(0, 7)}\`.`));
  assert.match(utc, /Zahrnuté commity: \*\*6\*\*\./);
  assert.match(utc, /<a id="obdobi-2026"><\/a>\r?\n## Nejnovější období · 2026/u);
  assert.match(utc, /Počet změn v období: \*\*3\*\*\./u);
  assert.match(
    utc,
    /Zobrazují se pouze roky, ve kterých vznikla změna; prázdné roky se vynechávají\./u,
  );
  assert.doesNotMatch(utc, /<summary><strong>2026<\/strong>/u);
  assert.match(
    utc,
    /<a id="nove-funkce"><\/a>\r?\n<a id="nove-funkce-2026"><\/a>\r?\n### ✨ Nové funkce/u,
  );
  assert.match(
    utc,
    /<a id="technicke-zmeny"><\/a>\r?\n<a id="technicke-zmeny-2026"><\/a>\r?\n### 🔩 Technické změny/u,
  );
  // Starší období mají vlastní kotvy a zůstávají sbalená.
  assert.match(utc, /<a id="opravy"><\/a>\r?\n<a id="opravy-2025"><\/a>/u);
  assert.match(
    utc,
    /<a id="obdobi-2025"><\/a>\s*<details>\s*<summary><strong>2025<\/strong> · počet změn: 2<\/summary>[\s\S]*?<a id="opravy-2025"><\/a>\s*### 🐛 Opravy[\s\S]*?Oprav starší změnu[\s\S]*?<a id="dokumentace-2025"><\/a>\s*### 📚 Dokumentace[\s\S]*?Doplň starší návod[\s\S]*?<\/details>/u,
  );
  assert.match(
    utc,
    /<a id="obdobi-2024"><\/a>\s*<details>\s*<summary><strong>2024<\/strong> · počet změn: 1<\/summary>[\s\S]*?<a id="nove-funkce-2024"><\/a>\s*### ✨ Nové funkce[\s\S]*?Přidej první změnu[\s\S]*?<\/details>/u,
  );
  assert.match(
    utc,
    /<details>\s*<summary>Zobrazit technické záznamy \(1\)<\/summary>[\s\S]*Ověř aktuální změnu[\s\S]*<\/details>/u,
  );
  assert.ok(utc.indexOf('### ✨ Nové funkce') < utc.indexOf('### 🔩 Technické změny'));
  assert.ok(utc.indexOf('<strong>2025</strong>') < utc.indexOf('<strong>2024</strong>'));
  assert.doesNotMatch(utc, /## 🏗️ Sestavení a CI/);
  assert.match(utc, /⚠️ \*\*Nekompatibilní změna:\*\*/u);
  assert.match(utc, /\*\*core:\*\* Změň veřejný kontrakt/);
  assert.match(utc, /Přidej první změnu/);
  assert.match(utc, /Oprav starší změnu/);
  assert.match(utc, /Doplň starší návod/);
  assert.match(utc, /Ověř aktuální změnu/);
  assert.match(utc, /Historický záznam/);
  assert.match(utc, /2024-08-27/);
  assert.match(utc, /2025-05-10/);
  assert.match(utc, /2025-06-11/);
  assert.match(utc, /2026-01-01/);
  assert.match(utc, /2026-08-28/);
  assert.match(utc, /· `[0-9a-f]{7}`/);
  assert.doesNotMatch(utc, /https:\/\/github\.com\/.+\/commit\//);
  assert.doesNotMatch(utc, /## 1\.0\.0/);
});

test('changelog odmítne mělkou a chybějící historii', async (context) => {
  const { createChangelog } = await import('../scripts/generate-changelog.cjs');
  const root = createChangelogFixture(context);
  await assert.rejects(createChangelog(root), /skutečný Git repozitář/);
  runGit(root, ['init', '--quiet']);
  runGit(root, ['config', 'user.name', 'Test']);
  runGit(root, ['config', 'user.email', 'test@example.invalid']);
  commit(root, 'feat: první', 'obsah', '2026-09-13T12:00:00Z');
  const head = runGit(root, ['rev-parse', 'HEAD']).output.trim();
  writeFileSync(path.join(root, '.git/shallow'), head + '\n');
  await assert.rejects(createChangelog(root), /mělký checkout/);
});
