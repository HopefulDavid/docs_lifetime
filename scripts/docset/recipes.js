import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseRecipe } from './recipe.js';
import { sections } from './sections.js';

const emojiPattern = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\uFE0F|\u200D)/gu;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const collator = new Intl.Collator('cs', { sensitivity: 'base' });

function plainText(value) {
  return value
    .replace(emojiPattern, '')
    .replace(/\*\*/g, '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Odvodí zařazení receptu z cesty. Pro neznámou cestu vrátí null. */
function classify(id, { continents, countries, types }) {
  const parts = id.split('/');
  if (!parts.every((part) => slugPattern.test(part))) return null;
  const [section, continent] = parts;
  const type = parts.at(-2);
  const country = parts.length === 5 ? parts[2] : null;
  const valid =
    Object.hasOwn(sections, section) &&
    Object.hasOwn(continents, continent) &&
    Object.hasOwn(types, type) &&
    (country
      ? Object.hasOwn(countries, country) && countries[country].continent === continent
      : parts.length === 4 && section === 'food' && continent === 'universal');
  return valid ? { section, continent, country, type } : null;
}

/** Vrátí první odstavec pod hlavním nadpisem. */
function descriptionOf(content) {
  const lines = content.split('\n').map((line) => line.trim());
  const title = lines.findIndex((line) => line.startsWith('# '));
  for (const line of lines.slice(title + 1)) {
    if (!line || line.startsWith('<!--') || line.startsWith('> [!')) continue;
    if (line.startsWith('#') || line.startsWith('- ')) break;
    return plainText(line.replace(/^>\s*/, ''));
  }
  return '';
}

function markdownFiles(root, directory) {
  const start = path.join(root, directory);
  if (!fs.existsSync(start)) return [];
  return fs
    .readdirSync(start, { recursive: true })
    .filter((file) => file.endsWith('.md'))
    .map((file) => `${directory}/${file.replace(/\\/g, '/')}`);
}

/** Seřadí recepty podle částí, oblastí, zemí, typů a názvů. */
function sortRecipes(recipes, { continents, types }) {
  const order = [sections, continents, types].map((group) => Object.keys(group));
  const rank = (index, key) => order[index].indexOf(key);
  return recipes.sort(
    (a, b) =>
      rank(0, a.section) - rank(0, b.section) ||
      rank(1, a.continent) - rank(1, b.continent) ||
      collator.compare(a.countryLabel, b.countryLabel) ||
      rank(2, a.type) - rank(2, b.type) ||
      collator.compare(a.title, b.title) ||
      a.id.localeCompare(b.id, 'en'),
  );
}

/** Načte, ověří a seřadí všechny recepty. Chyby všech receptů hlásí najednou. */
export function readRecipes(root, taxonomy, categories) {
  const sources = new Map();
  const errors = [];
  const warnings = [];

  function readRecipe(file) {
    if (path.posix.basename(file) === 'index.md')
      throw new Error(`${file}: index.md je vyhrazený generovanému přehledu`);
    const id = file.replace(/\.md$/, '');
    const place = classify(id, taxonomy);
    if (!place)
      throw new Error(`${file}: cesta neodpovídá očekávané struktuře nebo data/taxonomy.json`);
    const content = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
    const recipe = parseRecipe(content, file, categories, (warning) => warnings.push(warning));
    const continentLabel = taxonomy.continents[place.continent];
    const countryLabel = place.country ? taxonomy.countries[place.country].title : '';
    sources.set(file, content);
    return {
      ...place,
      ...recipe,
      id,
      title: plainText(content.match(/^# (.+)$/m)[1]),
      description: descriptionOf(content),
      // Otisk po změně receptu zneplatní rozvařený postup a sdílené odkazy.
      revision: createHash('sha256').update(content.trim()).digest('hex'),
      preparation: plainText(content.match(/^## Před přípravou\n+([^#][^\n]*)/m)?.[1] ?? ''),
      continentLabel,
      countryLabel,
      typeLabel: taxonomy.types[place.type],
      origin: [continentLabel, countryLabel].filter(Boolean).join(', '),
    };
  }

  const recipes = Object.keys(sections)
    .flatMap((section) => markdownFiles(root, section))
    .flatMap((file) => {
      try {
        return readRecipe(file);
      } catch (error) {
        errors.push(error.message);
        return [];
      }
    });
  if (errors.length) throw new Error(errors.join('\n'));
  return { recipes: sortRecipes(recipes, taxonomy), sources, warnings };
}
