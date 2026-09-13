import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolutní kořen projektu, nezávislý na pracovním adresáři testovacího procesu. */
export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Založí izolovaný adresář a zaregistruje úklid i pro neúspěšný test. */
export function temporaryDirectory(context, prefix) {
  const directory = mkdtempSync(path.join(tmpdir(), prefix));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}
