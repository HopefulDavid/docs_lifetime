import path from 'node:path';
import { createDocset, writeDocset } from './docset/docset.js';

/** Vypíše varování a v GitHub Actions je připojí k řádku zdroje. */
function report({ file, line, code, message }) {
  console.warn(`WARNING ${file}:${line} [${code}] ${message}`);
  if (process.env.GITHUB_ACTIONS === 'true')
    console.log(`::warning file=${file},line=${line},title=${code}::${message}`);
}

const root = path.resolve(import.meta.dir, '..');

try {
  const { files, warnings } = await createDocset(root);
  warnings.forEach(report);
  writeDocset(path.join(root, '_generated'), files);
  console.log(`Připravené soubory: ${files.size}, obsahová varování: ${warnings.length}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
