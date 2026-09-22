const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function outputFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  if (fs.lstatSync(directory).isSymbolicLink())
    throw new Error(directory + ': symbolické odkazy nejsou povolené');
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(fullPath + ': symbolické odkazy nejsou povolené');
    return entry.isDirectory() ? outputFiles(fullPath) : [fullPath];
  });
}

/** Odvodí kontrolní součty přesných bajtů a původ všech připravených výstupů. */
function createManifest(files) {
  return (
    JSON.stringify(
      {
        generatedBy: 'scripts/generate-docs.js',
        regenerate: 'pnpm run docs:generate',
        files: [...files].map(([file, content]) => {
          const copied =
            file === 'pruvodce.md' ||
            /^media\//.test(file) ||
            (/^(food|drink)\/.+\.md$/.test(file) && !file.endsWith('/index.md'));
          return {
            path: file,
            source: copied ? file : null,
            kind: copied ? 'copy' : 'derived',
            sha256: createHash('sha256').update(content).digest('hex'),
          };
        }),
      },
      null,
      2,
    ) + '\n'
  );
}
/** Porovná nebo obnoví pouze _generated; nejprve odmítne symbolické odkazy v celém výstupu. */
function synchronizeDocset(root, files, { checkOnly = false } = {}) {
  const pendingChanges = [];
  const output = path.join(root, '_generated');
  const obsolete = outputFiles(output).filter(
    (file) => !files.has(toPosix(path.relative(output, file))),
  );
  // Volající předává kompletní ověřený docset; ruční zdroje zůstávají mimo výstup.
  for (const [file, content] of files) {
    const target = path.join(output, file);
    // Textové výstupy se porovnávají jako řetězec, binární kopie médií po bajtech.
    const unchanged =
      fs.existsSync(target) &&
      (Buffer.isBuffer(content)
        ? fs.readFileSync(target).equals(content)
        : fs.readFileSync(target, 'utf8') === content);
    if (unchanged) continue;
    pendingChanges.push('_generated/' + file);
    if (!checkOnly) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }
  }
  for (const file of obsolete) {
    pendingChanges.push(toPosix(path.relative(root, file)) + ' (odstranit)');
    if (!checkOnly) fs.unlinkSync(file);
  }
  return pendingChanges;
}
module.exports = { createManifest, synchronizeDocset };
