import { onTestFinished } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const repositoryRoot = path.resolve(import.meta.dir, '../..');

/** Založí dočasný adresář, který se po testu odstraní i při neúspěchu. */
export function temporaryDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-lifetime-'));
  onTestFinished(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

/** Zapíše soubor včetně chybějících nadřazených adresářů. */
export function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
