const fs = require('node:fs');
const path = require('node:path');
const { readRecipeSources } = require('./docset/catalog.cjs');
const { renderContentPages } = require('./docset/pages.cjs');
const { createManifest, synchronizeDocset } = require('./docset/output.cjs');
const root = path.resolve(__dirname, '..');

const mediaExtensions = new Set(['.mp4', '.jpg']);

/** Vybere vlastní mediální zdroje receptů jako bajtové kopie veřejného docsetu. */
function readMediaFiles(files) {
  const media = path.join(root, 'media');
  if (!fs.existsSync(media)) return;
  const relative = (fullPath) => path.relative(root, fullPath).replace(/\\/g, '/');

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(relative(fullPath) + ': symbolické odkazy nejsou povolené');
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (mediaExtensions.has(path.extname(entry.name).toLowerCase())) {
        files.set(relative(fullPath), fs.readFileSync(fullPath));
      } else {
        throw new Error(
          `${relative(fullPath)}: podporované mediální přípony jsou ${[...mediaExtensions].join(', ')}`,
        );
      }
    }
  }

  walk(media);
}

/** Připraví veřejné zdroje a odvozené přehledy v paměti bez zápisu a Git historie. */
function createContentFiles() {
  const { recipes, files, warnings } = readRecipeSources(root);
  readMediaFiles(files);
  for (const [file, content] of renderContentPages(recipes)) files.set(file, content);
  const guide = fs.readFileSync(path.join(root, 'pruvodce.md'), 'utf8').replace(/\r\n/g, '\n');
  files.set('pruvodce.md', guide.endsWith('\n') ? guide : guide + '\n');
  files.set(
    'content-report.json',
    JSON.stringify({ generatedBy: 'scripts/generate-docs.js', warnings }, null, 2) + '\n',
  );
  return files;
}

function reportWarnings(warnings) {
  for (const warning of warnings) {
    console.warn(`WARNING ${warning.file}:${warning.line} [${warning.code}] ${warning.message}`);
    if (process.env.GITHUB_ACTIONS === 'true') {
      const escape = (text) =>
        text
          .replace(/%/g, '%25')
          .replace(/\r/g, '%0D')
          .replace(/\n/g, '%0A')
          .replace(/:/g, '%3A')
          .replace(/,/g, '%2C');
      console.log(
        `::warning file=${escape(warning.file)},line=${warning.line},title=${warning.code}::${escape(warning.message)}`,
      );
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => !['--check', '--validate-only'].includes(arg))) {
    throw new Error('Podporovaný přepínač: --check nebo --validate-only');
  }
  const files = createContentFiles();
  const { warnings } = JSON.parse(files.get('content-report.json'));
  reportWarnings(warnings);
  if (args.includes('--validate-only')) {
    console.log(`Obsah je platný.\n\nObsahová varování (warnings): ${warnings.length}.`);
    return;
  }
  const { createChangelog } = require('./generate-changelog.cjs');
  const { createIconAssets } = require('./generate-icons.cjs');
  files.set('changelog.md', await createChangelog(root));
  for (const [file, content] of createIconAssets()) files.set(file, content);
  files.set('manifest.json', createManifest(files));
  const checkOnly = args.includes('--check');
  const pendingChanges = synchronizeDocset(root, files, { checkOnly });
  if (!pendingChanges.length) return console.log('Dokumentace je aktuální.');
  console.log(
    checkOnly ? 'Dokumentace není aktuální.\n\nSpusťte pnpm run docs:generate:' : 'Aktualizováno:',
  );
  for (const file of pendingChanges) console.log('- ' + file);
  if (checkOnly) process.exitCode = 1;
}

module.exports = { createContentFiles };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
