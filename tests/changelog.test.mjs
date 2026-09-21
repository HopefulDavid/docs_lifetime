import assert from 'node:assert/strict';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
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
  assert.match(utc, /Každodenní život/u);
  assert.match(utc, /Co je nového v návodech, receptech a na webu/u);
  assert.match(utc, /change-hero-icon"><span class="ui-icon ui-icon--book"><\/span>/u);
  assert.doesNotMatch(utc, /change-hero-icon"><span class="ui-icon ui-icon--kitchen"><\/span>/u);
  assert.ok(utc.includes(`Zdrojový stav: \`${head.slice(0, 7)}\``));
  assert.match(utc, /Celkem 6 změn\./u);
  assert.match(
    utc,
    /<a id="obdobi-2026"><\/a>\r?\n## Nejnovější změny · 2026 <small>\(počet změn: 3\)<\/small>/u,
  );
  assert.match(utc, /Starší roky jsou sbalené a roky bez změn se nezobrazují\./u);
  assert.doesNotMatch(utc, /<summary><strong>Rok 2026<\/strong>/u);
  assert.match(
    utc,
    /<a id="nove-funkce"><\/a><a id="nove-funkce-2026"><\/a><span class="change-kind change-kind--nove-funkce">/u,
  );
  assert.match(
    utc,
    /<a id="technicke-zmeny"><\/a><a id="technicke-zmeny-2026"><\/a><span class="change-kind change-kind--technicke-zmeny">/u,
  );
  // Starší období mají vlastní kotvy a zůstávají sbalená.
  assert.match(utc, /<a id="opravy"><\/a><a id="opravy-2025"><\/a>/u);
  assert.match(
    utc,
    /<a id="obdobi-2025"><\/a>\s*<details class="change-year">\s*<summary><strong>Rok 2025<\/strong> · počet změn: 2<\/summary>[\s\S]*?<a id="dokumentace-2025"><\/a>[\s\S]*?Doplň starší návod[\s\S]*?<a id="opravy-2025"><\/a>[\s\S]*?Oprav starší změnu[\s\S]*?<\/details>/u,
  );
  assert.match(
    utc,
    /<a id="obdobi-2024"><\/a>\s*<details class="change-year">\s*<summary><strong>Rok 2024<\/strong> · počet změn: 1<\/summary>[\s\S]*?<a id="nove-funkce-2024"><\/a>[\s\S]*?Přidej první změnu[\s\S]*?<\/details>/u,
  );
  assert.match(utc, /Zákulisí webu[\s\S]*?Ověř aktuální změnu/u);
  assert.ok(utc.indexOf('Historický záznam') < utc.indexOf('Změň veřejný kontrakt'));
  assert.ok(utc.indexOf('Změň veřejný kontrakt') < utc.indexOf('Ověř aktuální změnu'));
  assert.ok(utc.indexOf('Ověř aktuální změnu') < utc.indexOf('Doplň starší návod'));
  assert.ok(utc.indexOf('Doplň starší návod') < utc.indexOf('Oprav starší změnu'));
  assert.ok(utc.indexOf('<strong>Rok 2025</strong>') < utc.indexOf('<strong>Rok 2024</strong>'));
  assert.doesNotMatch(utc, /## 🏗️ Sestavení a CI/);
  assert.match(utc, /<span class="change-breaking">Důležitá nekompatibilní změna<\/span>/u);
  assert.match(
    utc,
    /<small class="change-meta">[^<]+ · core · [0-9a-f]{7}<\/small>[^\n]+\*\*Změň veřejný kontrakt\*\*/u,
  );
  assert.match(utc, /Přidej první změnu/);
  assert.match(utc, /Oprav starší změnu/);
  assert.match(utc, /Doplň starší návod/);
  assert.match(utc, /Ověř aktuální změnu/);
  assert.match(utc, /Historický záznam/);
  assert.match(utc, /27\. 08\. 2024/);
  assert.match(utc, /10\. 05\. 2025/);
  assert.match(utc, /11\. 06\. 2025/);
  assert.match(utc, /01\. 01\. 2026/);
  assert.match(utc, /28\. 08\. 2026/);
  assert.match(utc, /· [0-9a-f]{7}<\/small>/);
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

test('odkazuje na aktuální články změněné commitem a neodkazuje na odstraněný článek', (context) => {
  const root = createChangelogFixture(context);
  runGit(root, ['init', '--quiet']);
  runGit(root, ['config', 'user.name', 'Test']);
  runGit(root, ['config', 'user.email', 'test@example.invalid']);
  mkdirSync(path.join(root, 'food'));
  writeFileSync(path.join(root, 'food/prvni.md'), '# První návod\n');
  runGit(root, ['add', 'food/prvni.md']);
  runGit(root, ['commit', '--quiet', '-m', 'docs: přidává první návod']);

  const single = generateChangelogInTimezone(root, 'Europe/Prague');
  assert.match(single, /\[Otevřít článek: První návod\]\(food\/prvni\.md\)/u);

  writeFileSync(path.join(root, 'food/prvni.md'), '# První návod\n\nÚprava.\n');
  writeFileSync(path.join(root, 'food/druhy.md'), '# Druhý návod\n');
  runGit(root, ['add', 'food/prvni.md', 'food/druhy.md']);
  runGit(root, ['commit', '--quiet', '-m', 'docs: upravuje návody']);

  const multiple = generateChangelogInTimezone(root, 'Europe/Prague');
  assert.match(multiple, /<summary>Otevřít 2 upravené články<\/summary>/u);
  assert.match(multiple, /href="food\/prvni\.md">První návod<\/a>/u);
  assert.match(multiple, /href="food\/druhy\.md">Druhý návod<\/a>/u);

  unlinkSync(path.join(root, 'food/prvni.md'));
  runGit(root, ['add', '-u']);
  runGit(root, ['commit', '--quiet', '-m', 'docs: odstraňuje první návod']);

  const deleted = generateChangelogInTimezone(root, 'Europe/Prague');
  assert.doesNotMatch(deleted, /food\/prvni\.md/u);
  assert.match(deleted, /\[Otevřít článek: Druhý návod\]\(food\/druhy\.md\)/u);
});
