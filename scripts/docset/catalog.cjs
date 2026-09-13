const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { parseRecipeContent } = require('../recipe-content.cjs');
const {
  collator,
  sections,
  continentNames,
  countries,
  typeNames,
  order,
  labelCountry,
  orderedCompare,
  validateTaxonomy,
} = require('./taxonomy.cjs');

const emojiPattern = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\uFE0F|\u200D)/gu;

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function removeEmoji(value) {
  return value.replace(emojiPattern, '');
}

function cleanInline(value) {
  return removeEmoji(value)
    .replace(/\*\*/g, '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function plainTitle(rawTitle) {
  return cleanInline(rawTitle);
}

function parseRecipePath(relPath) {
  const parts = relPath.split('/');
  const section = parts[0];

  if (
    !Object.hasOwn(sections, section) ||
    parts.some((part) => !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.md)?$/.test(part))
  ) {
    return null;
  }

  if (section === 'food' && parts[1] === 'universal' && parts.length === 4) {
    if (!Object.hasOwn(continentNames, 'universal') || !Object.hasOwn(typeNames, parts[2]))
      return null;
    return {
      section,
      continent: 'universal',
      country: null,
      type: parts[2],
    };
  }

  if (
    parts.length === 5 &&
    Object.hasOwn(continentNames, parts[1]) &&
    parts[1] !== 'universal' &&
    Object.hasOwn(countries, parts[2]) &&
    countries[parts[2]].continent === parts[1] &&
    Object.hasOwn(typeNames, parts[3])
  ) {
    return {
      section,
      continent: parts[1],
      country: parts[2],
      type: parts[3],
    };
  }

  return null;
}

function descriptionFromMarkdown(content) {
  const lines = content.split('\n');
  const headingIndex = lines.findIndex((line) => /^#\s+/.test(line));

  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('<!--')) {
      continue;
    }
    if (line.startsWith('#') || line.startsWith('- ')) {
      break;
    }
    if (line.startsWith('> [!')) {
      continue;
    }
    return cleanInline(line.replace(/^>\s*/, ''));
  }

  return '';
}

function compareEntries(a, b) {
  return (
    orderedCompare(a.section, b.section, order.sections) ||
    orderedCompare(a.continent, b.continent, order.continents) ||
    collator.compare(labelCountry(a.country), labelCountry(b.country)) ||
    orderedCompare(a.type, b.type, order.types) ||
    collator.compare(a.title, b.title) ||
    a.relPath.localeCompare(b.relPath, 'en')
  );
}

/** Načte a ověří zdroje; vrací nové kopie souborů, katalog a diagnostiku bez zápisu. */
function readRecipeSources(root) {
  validateTaxonomy();
  const files = new Map();
  const errors = [];
  const warnings = [];
  const absolute = (relative) => path.join(root, relative);
  function readFile(relPath) {
    return fs.readFileSync(absolute(relPath), 'utf8').replace(/\r\n/g, '\n');
  }

  function walkMarkdown(dirRel) {
    const files = [];
    const start = absolute(dirRel);

    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isSymbolicLink())
          throw new Error(
            toPosix(path.relative(root, fullPath)) + ': symbolické odkazy nejsou povolené',
          );
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
          files.push(toPosix(path.relative(root, fullPath)));
        }
      }
    }

    if (fs.existsSync(start)) {
      if (fs.lstatSync(start).isSymbolicLink())
        throw new Error(dirRel + ': symbolické odkazy nejsou povolené');
      walk(start);
    }
    return files.sort((a, b) => collator.compare(a, b));
  }

  function recipeFiles() {
    return [...walkMarkdown('food'), ...walkMarkdown('drink')].filter((relPath) => {
      if (path.posix.basename(relPath) === 'index.md') {
        errors.push(relPath + ': index.md je vyhrazený generovanému přehledu v _generated/');
        return false;
      }
      return true;
    });
  }

  function readRecipe(relPath) {
    const content = readFile(relPath);
    const heading = content.match(/^#\s+(.+)$/m);
    if (!heading) {
      errors.push(`${relPath}: chybí hlavní nadpis`);
      return null;
    }

    const pathInfo = parseRecipePath(relPath);
    if (!pathInfo) {
      errors.push(`${relPath}: cesta neodpovídá očekávané struktuře nebo data/taxonomy.json`);
      return null;
    }

    let recipe;
    try {
      recipe = parseRecipeContent(content, relPath, {
        onWarning: (warning) => warnings.push(warning),
      });
    } catch (error) {
      errors.push(error.message);
      return null;
    }

    files.set(relPath, content.endsWith('\n') ? content : content + '\n');
    return {
      ...pathInfo,
      ...recipe,
      id: relPath.replace(/\.md$/, ''),
      relPath,
      title: plainTitle(heading[1]),
      pageTitle: heading[1].trim(),
      description: descriptionFromMarkdown(content),
      revision: createHash('sha256').update(content.trim()).digest('hex'),
      preparation: cleanInline(content.match(/^## Než začnete\n+([^#][^\n]*)/m)?.[1] || ''),
    };
  }

  const recipes = recipeFiles().map(readRecipe).filter(Boolean).sort(compareEntries);
  if (errors.length) throw new Error(errors.join('\n'));
  return { recipes, files, warnings };
}
module.exports = { readRecipeSources };
