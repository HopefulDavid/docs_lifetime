import fs from 'node:fs';
import path from 'node:path';
import { readAreas, renderGuideAreas } from './areas.js';
import { renderChangelog } from './changelog.js';
import { renderIcons } from './icons.js';
import { readIngredients } from './ingredients.js';
import { renderPages } from './pages.js';
import { readRecipes } from './recipes.js';
import { readTaxonomy } from './taxonomy.js';

const guide = 'pruvodce.md';
const mediaFormats = new Set(['.mp4', '.jpg']);

function readMedia(root) {
  const files = new Map();
  const media = path.join(root, 'media');
  if (!fs.existsSync(media)) return files;
  for (const entry of fs.readdirSync(media, { recursive: true, withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    const source = path.join(entry.parentPath, entry.name);
    const file = path.relative(root, source).replace(/\\/g, '/');
    if (!mediaFormats.has(path.extname(file)))
      throw new Error(`${file}: podporované přípony médií jsou ${[...mediaFormats].join(', ')}`);
    files.set(file, fs.readFileSync(source));
  }
  return files;
}

/**
 * Sestaví v paměti obsah webu ze slovníků, receptů, oblastí života, médií a průvodce.
 * Historii změn a ikony doplní až createDocset.
 */
export function createContent(root) {
  const taxonomy = readTaxonomy(root);
  const { departments, categories } = readIngredients(root);
  const { recipes, sources, warnings } = readRecipes(root, taxonomy, categories);
  const areas = readAreas(root);
  const guides = renderGuideAreas(root, areas);
  const files = new Map([
    ...sources,
    ...readMedia(root),
    ...renderPages(recipes, taxonomy, departments, areas, guides.counts),
    ...guides.files,
    [guide, fs.readFileSync(path.join(root, guide), 'utf8')],
  ]);
  return { files, taxonomy, areas, warnings };
}

/** Připraví v paměti úplný vstup DocFX. Vadný zdroj skončí chybou dříve, než se změní výstup. */
export async function createDocset(root) {
  const { files, taxonomy, areas, warnings } = createContent(root);
  files.set('changelog.md', await renderChangelog(root));
  for (const [file, content] of renderIcons(root, taxonomy, areas)) files.set(file, content);
  return { files, warnings };
}

/** Nahradí celý výstupní adresář připravenými soubory. */
export function writeDocset(output, files) {
  fs.rmSync(output, { recursive: true, force: true });
  for (const [file, content] of files) {
    const target = path.join(output, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
