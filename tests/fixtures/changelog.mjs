import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { repositoryRoot, temporaryDirectory } from './repository.mjs';

/** Založí izolovanou konfiguraci historie; repozitář vytváří konkrétní scénář. */
export function createChangelogFixture(context) {
  const fixtureRoot = temporaryDirectory(context, 'docs-changelog-');

  const fixtureConfig = readFileSync(path.join(repositoryRoot, 'cliff.toml'), 'utf8');
  writeFileSync(path.join(fixtureRoot, 'cliff.toml'), fixtureConfig, 'utf8');

  return fixtureRoot;
}

/** Spustí skutečný changelog v procesu s vlastní časovou zónou. */
export function generateChangelogInTimezone(fixtureRoot, timeZone) {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `const { createChangelog } = require(process.argv[1]);
       createChangelog(process.cwd())
         .then(text => process.stdout.write(text))
         .catch(error => {
           console.error(error.message);
           process.exitCode = 1;
         });`,
      path.join(repositoryRoot, 'scripts/generate-changelog.cjs'),
    ],
    {
      cwd: fixtureRoot,
      encoding: 'utf8',
      windowsHide: true,
      env: { ...process.env, TZ: timeZone },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

/** Zapíše testovací obsah a vytvoří commit s pevně určenými daty. */
export function commit(fixtureRoot, message, content, date) {
  writeFileSync(path.join(fixtureRoot, 'obsah.txt'), `${content}\n`, 'utf8');
  run(fixtureRoot, 'git', ['add', 'obsah.txt']);
  run(fixtureRoot, 'git', ['commit', '--quiet', '-m', message], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
}

/** Spustí příkaz fixture a selže s jeho úplnou diagnostikou. */
function run(cwd, command, args, extraEnvironment = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, ...extraEnvironment },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  assert.equal(result.error, undefined, output || result.error?.message);
  assert.equal(result.status, 0, output);
  return { ...result, output };
}

/** Provede Git příkaz pouze v předané dočasné historii. */
export function runGit(root, args) {
  return run(root, 'git', args);
}
