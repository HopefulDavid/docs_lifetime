const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runGitCliff } = require('git-cliff');

function changedArticles(root, commitId) {
  const paths = execFileSync(
    'git',
    ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-z', commitId],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return paths
    .split('\0')
    .filter((file) => /^(?:food|drink)\/.+\.md$/.test(file) || file === 'pruvodce.md')
    .filter((file) => fs.existsSync(path.join(root, file)))
    .sort();
}

function articleTitle(root, file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  return source.match(/^#\s+(.+)$/m)?.[1].trim() || path.basename(file, '.md');
}

function articleUrl(file, extension) {
  return file.replace(/\.md$/, extension).split('/').map(encodeURIComponent).join('/');
}

function articleLinks(root, commitId) {
  const articles = changedArticles(root, commitId);
  if (articles.length === 0) return '';
  if (articles.length === 1) {
    const file = articles[0];
    const title = articleTitle(root, file).replace(/([\\\[\]])/g, '\\$1');
    return ` [Otevřít článek: ${title}](${articleUrl(file, '.md')})`;
  }
  const links = articles
    .map((file) => {
      const title = articleTitle(root, file)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      return `<li><a href="${articleUrl(file, '.md')}">${title}</a></li>`;
    })
    .join('');
  const countLabel = articles.length < 5 ? 'upravené články' : 'upravených článků';
  return ` <details class="change-articles"><summary>Otevřít ${articles.length} ${countLabel}</summary><ul>${links}</ul></details>`;
}

/** Odvodí changelog z úplné historie daného repozitáře bez zápisu souborů a odmítne mělký checkout. */
async function createChangelog(root) {
  let shallow;
  try {
    shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error('Changelog vyžaduje skutečný Git repozitář s úplnou historií.');
  }
  if (shallow !== 'false')
    throw new Error(
      'Changelog vyžaduje úplnou historii; mělký checkout není podporovaný (v CI použijte fetch-depth: 0).',
    );
  const result = await runGitCliff(['--config', 'cliff.toml'], { cwd: root, stdio: 'pipe' });
  const seenAnchors = new Set();
  return (
    result.stdout
      .replace(/\r\n/g, '\n')
      .replace(/<!-- category:([a-z-]+):(\d{4}) -->/g, (_, category, year) => {
        const anchors = [];
        for (const id of [category, `${category}-${year}`]) {
          if (!seenAnchors.has(id)) {
            seenAnchors.add(id);
            anchors.push(`<a id="${id}"></a>`);
          }
        }
        return anchors.join('');
      })
      .replace(/<!-- article:([0-9a-f]{40}) -->/g, (_, commitId) => articleLinks(root, commitId))
      .trimEnd() + '\n'
  );
}

module.exports = { createChangelog };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  createChangelog(root)
    .then((content) => {
      const output = path.join(root, '_generated');
      if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink())
        throw new Error('_generated nesmí být symbolický odkaz');
      fs.mkdirSync(output, { recursive: true });
      const file = path.join(output, 'changelog.md');
      if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink())
        throw new Error('changelog.md nesmí být symbolický odkaz');
      fs.writeFileSync(file, content, 'utf8');
      console.log('Vygenerováno: _generated/changelog.md');
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
