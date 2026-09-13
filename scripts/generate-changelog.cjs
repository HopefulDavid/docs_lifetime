const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runGitCliff } = require('git-cliff');

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
  return result.stdout.replace(/\r\n/g, '\n').trimEnd() + '\n';
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
