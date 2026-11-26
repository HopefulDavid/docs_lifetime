import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runGitCliff } from 'git-cliff';

const git = (root, ...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function requireFullHistory(root) {
  let shallow;
  try {
    shallow = git(root, 'rev-parse', '--is-shallow-repository').trim();
  } catch {
    throw new Error('Changelog vyžaduje Git repozitář s úplnou historií.');
  }
  if (shallow !== 'false')
    throw new Error('Changelog vyžaduje úplnou historii, doplní ji git fetch --unshallow.');
}

/** Vrátí dosud existující články změněné v jednotlivých commitech. */
function changedArticles(root) {
  const isArticle = (file) =>
    (/^(?:food|drink)\/.+\.md$/.test(file) || file === 'pruvodce.md') &&
    fs.existsSync(path.join(root, file));
  const options = ['--no-renames', '--name-only', '--format=commit %H'];
  const commits = git(root, '-c', 'core.quotePath=false', 'log', ...options)
    .split(/^commit (?=[0-9a-f]{40}$)/m)
    .slice(1);
  return new Map(
    commits.map((entry) => {
      const [id, ...files] = entry.trim().split('\n');
      return [id, files.filter(isArticle).sort()];
    }),
  );
}

function articleLinks(root, files) {
  const articles = files.map((file) => ({
    file,
    title: fs
      .readFileSync(path.join(root, file), 'utf8')
      .match(/^# (.+)$/m)[1]
      .trim(),
  }));
  if (!articles.length) return '';
  if (articles.length === 1) {
    const [{ file, title }] = articles;
    return ` [Otevřít článek: ${title.replace(/[\\[\]]/g, '\\$&')}](${file})`;
  }
  const links = articles.map(
    ({ file, title }) => `<li><a href="${file}">${Bun.escapeHTML(title)}</a></li>`,
  );
  const label = articles.length < 5 ? 'upravené články' : 'upravených článků';
  return ` <details class="change-articles"><summary>Otevřít ${articles.length} ${label}</summary><ul>${links.join('')}</ul></details>`;
}

/** Sestaví stránku Změny z úplné historie. Podobu určuje cliff.toml, zde se doplní odkazy na články. */
export async function renderChangelog(root) {
  requireFullHistory(root);
  const { stdout } = await runGitCliff(['--config', 'cliff.toml'], { cwd: root, stdio: 'pipe' });
  const articles = changedArticles(root);
  const content = stdout
    .replace(/\r\n/g, '\n')
    .replace(/<!-- article:([0-9a-f]{40}) -->/g, (_, id) =>
      articleLinks(root, articles.get(id) ?? []),
    );
  return `${content.trimEnd()}\n`;
}
