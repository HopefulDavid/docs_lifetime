import { expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { renderChangelog } from '../scripts/docset/changelog.js';
import { repositoryRoot, temporaryDirectory, write } from './fixtures/directories.js';

/** Založí historii se skutečnou konfigurací. Commit zapíše soubory a obsah null odstraní. */
function createHistory() {
  const root = temporaryDirectory();
  const git = (args, env = {}) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
  fs.copyFileSync(path.join(repositoryRoot, 'cliff.toml'), path.join(root, 'cliff.toml'));
  git(['init', '--quiet']);
  git(['config', 'user.name', 'Test']);
  git(['config', 'user.email', 'test@example.invalid']);

  function commit(message, date, files = {}) {
    for (const [file, content] of Object.entries(files)) {
      if (content === null) fs.rmSync(path.join(root, file));
      else write(root, file, content);
      git(['add', '--all', '--', file]);
    }
    git(['commit', '--quiet', '--allow-empty', '-m', message], {
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
    });
  }
  return { root, git, commit };
}

test('rozdělí historii podle let v pražském čase a pojmenuje druh změny', async () => {
  const { root, git, commit } = createHistory();
  commit('feat: přidej první změnu', '2024-08-27T12:00:00+02:00');
  git(['tag', 'v1.0.0']);
  commit('fix: oprav starší změnu', '2025-05-10T12:00:00+02:00');
  commit('ci: ověř změnu po půlnoci', '2025-12-31T23:30:00+00:00');
  commit('feat(core)!: změň kontrakt', '2026-08-28T13:00:00+02:00');
  commit('historický záznam', '2026-08-28T14:00:00+02:00');

  const text = await renderChangelog(root);
  let position = -1;
  for (const part of [
    'Celkem 5 změn.',
    '<a id="obdobi-2026"></a>\n## Nejnovější změny · 2026 <small>(počet změn: 3)</small>',
    '**Historický záznam**',
    '· core ·',
    'Důležitá nekompatibilní změna',
    '**Změň kontrakt**',
    '01. 01. 2026',
    '**Ověř změnu po půlnoci**',
    '<a id="obdobi-2025"></a>',
    '<summary><strong>Rok 2025</strong> · počet změn: 1</summary>',
    '**Oprav starší změnu**',
    '</details>',
    '<summary><strong>Rok 2024</strong> · počet změn: 1</summary>',
    '**Přidej první změnu**',
    '</details>',
  ]) {
    const next = text.indexOf(part, position + 1);
    expect(next, part).toBeGreaterThan(position);
    position = next;
  }
  expect(text).toContain(`\`${git(['rev-parse', '--short=7', 'HEAD']).trim()}\``);
  for (const [slug, kind] of [
    ['nove-funkce', 'Novinka'],
    ['opravy', 'Oprava'],
    ['technicke-zmeny', 'Zákulisí webu'],
    ['ostatni-zmeny', 'Další změna'],
  ])
    expect(text).toMatch(new RegExp(`change-kind--${slug}">.+</span>${kind}</span>`));
});

test('kotva druhu změny je na stránce jednou a pro každý rok zvlášť', async () => {
  const { root, commit } = createHistory();
  commit('fix: první', '2025-05-10T12:00:00Z');
  commit('fix: druhá', '2026-05-10T12:00:00Z');
  commit('fix: třetí', '2026-05-11T12:00:00Z');

  const text = await renderChangelog(root);
  const anchors = [...text.matchAll(/<a id="(opravy[^"]*)">/g)].map(([, id]) => id);

  expect(anchors).toEqual(['opravy', 'opravy-2026', 'opravy-2025']);
});

test('odkazuje jen na dosud existující články změněné commitem', async () => {
  const { root, commit } = createHistory();
  commit('docs: přidává dva návody', '2026-01-01T12:00:00Z', {
    'food/prvni.md': '# První <návod>\n',
    'food/druhy.md': '# Druhý návod\n',
    'scripts/skript.js': '\n',
  });
  commit('docs: přidává třetí návod', '2026-01-02T12:00:00Z', { 'drink/treti.md': '# [Třetí]\n' });

  const text = await renderChangelog(root);
  expect(text).toContain('<summary>Otevřít 2 upravené články</summary>');
  expect(text).toContain('<a href="food/prvni.md">První &lt;návod&gt;</a>');
  expect(text).toContain('[Otevřít článek: \\[Třetí\\]](drink/treti.md)');
  expect(text).not.toContain('skript.js');

  commit('docs: odstraňuje návod', '2026-01-03T12:00:00Z', { 'food/prvni.md': null });
  const updated = await renderChangelog(root);
  expect(updated).not.toContain('prvni.md');
  expect(updated).toContain('[Otevřít článek: Druhý návod](food/druhy.md)');
});

test('odmítne chybějící a mělkou historii', async () => {
  const { root, git, commit } = createHistory();
  await expect(renderChangelog(temporaryDirectory())).rejects.toThrow('Git repozitář');
  commit('feat: první', '2026-01-01T12:00:00Z');
  write(root, '.git/shallow', git(['rev-parse', 'HEAD']));

  await expect(renderChangelog(root)).rejects.toThrow('git fetch --unshallow');
});
