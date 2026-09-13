import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { repositoryRoot, temporaryDirectory } from './repository.mjs';

/** Zkopíruje skutečný generátor a obsah; Git historii a assety ověřují samostatné integrace. */
export function createDocsetFixture(context) {
  const fixtureRoot = temporaryDirectory(context, 'docs-lifetime-generator-');

  mkdirSync(path.join(fixtureRoot, 'scripts'));
  cpSync(path.join(repositoryRoot, 'scripts/docset'), path.join(fixtureRoot, 'scripts/docset'), {
    recursive: true,
  });
  // Externí assety a Git historie mají vlastní integrace; obsahový test je nestahuje.
  writeFileSync(
    path.join(fixtureRoot, 'scripts/generate-icons.cjs'),
    'exports.createIconAssets = () => new Map();',
  );
  cpSync(path.join(repositoryRoot, 'data'), path.join(fixtureRoot, 'data'), { recursive: true });
  copyFileSync(
    path.join(repositoryRoot, 'scripts/recipe-content.cjs'),
    path.join(fixtureRoot, 'scripts/recipe-content.cjs'),
  );
  cpSync(path.join(repositoryRoot, 'food'), path.join(fixtureRoot, 'food'), { recursive: true });
  cpSync(path.join(repositoryRoot, 'drink'), path.join(fixtureRoot, 'drink'), { recursive: true });
  copyFileSync(path.join(repositoryRoot, 'pruvodce.md'), path.join(fixtureRoot, 'pruvodce.md'));
  writeFileSync(
    path.join(fixtureRoot, 'scripts/generate-changelog.cjs'),
    "exports.createChangelog = async () => '# Změny\\n';",
  );
  copyFileSync(
    path.join(repositoryRoot, 'scripts', 'generate-docs.js'),
    path.join(fixtureRoot, 'scripts', 'generate-docs.js'),
  );

  return fixtureRoot;
}

/** Spustí CLI v izolované kopii s výslovným režimem a zachová diagnostiku procesu. */
export function runGenerator(root, { check = false, validateOnly = false, environment = {} } = {}) {
  const args = ['scripts/generate-docs.js'];
  if (check) args.push('--check');
  if (validateOnly) args.push('--validate-only');
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, ...environment },
  });
  if (result.error) throw result.error;
  return { ...result, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}
