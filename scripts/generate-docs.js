const fs = require('fs');
const path = require('path');
const { createHash } = require('node:crypto');
const { parseRecipeContent, departments } = require('./recipe-content.cjs');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const collator = new Intl.Collator('cs', { sensitivity: 'base' });

const generatedNotice =
  '<!-- Generováno z food/**/*.md, drink/**/*.md a data/*.json pomocí scripts/generate-docs.js. Obnova: npm run docs:generate. Neupravujte ručně. -->';

const kitchen = { title: 'Kuchyně', path: 'kuchyne/index.md', intro: 'Od nápadu na jídlo až k hotovému talíři. Vyberte recepty a nápoje, připravte společný nákup a pusťte se do vaření.' };

const sections = {
  food: {
    title: 'Jídlo',
    uid: 'docs-lifetime.food',
    singular: 'recept',
    few: 'recepty',
    many: 'receptů',
    intro:
      'Vyberte si jídlo podle chuti, přidejte ho do nákupu a otevřete postup při vaření.',
  },
  drink: {
    title: 'Nápoje',
    uid: 'docs-lifetime.drink',
    singular: 'nápoj',
    few: 'nápoje',
    many: 'nápojů',
    intro:
      'Káva a další nápoje na jednom místě, od surovin až po poslední krok přípravy.',
  },
};

const taxonomy = require('../data/taxonomy.json');
const { continents: continentNames = {}, countries = {}, types: typeNames = {} } = taxonomy;
const order = {
  sections: Object.keys(sections),
  continents: Object.keys(continentNames),
  types: Object.keys(typeNames),
};

const emojiPattern = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\uFE0F|\u200D)/gu;

const generatedFiles = new Map();
const pendingChanges = [];
const errors = [];
const warnings = [];

function absolute(relPath) {
  return path.join(root, relPath);
}

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function readFile(relPath) {
  return fs.readFileSync(absolute(relPath), 'utf8').replace(/\r\n/g, '\n');
}

function writeFile(relPath, content) {
  generatedFiles.set(relPath, content.endsWith('\n') ? content : content + '\n');
}

function walkMarkdown(dirRel) {
  const files = [];
  const start = absolute(dirRel);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(toPosix(path.relative(root, fullPath)) + ': symbolické odkazy nejsou povolené');
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        files.push(toPosix(path.relative(root, fullPath)));
      }
    }
  }

  if (fs.existsSync(start)) {
    if (fs.lstatSync(start).isSymbolicLink()) throw new Error(dirRel + ': symbolické odkazy nejsou povolené');
    walk(start);
  }
  return files.sort((a, b) => collator.compare(a, b));
}

function recipeFiles() {
  return [...walkMarkdown('food'), ...walkMarkdown('drink')].filter(
    (relPath) => {
      if (path.posix.basename(relPath) === 'index.md') {
        errors.push(relPath + ': index.md je vyhrazený generovanému přehledu v _generated/');
        return false;
      }
      return true;
    }
  );
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
  try { recipe = parseRecipeContent(content, relPath, { onWarning: warning => warnings.push(warning) }); }
  catch (error) { errors.push(error.message); return null; }

  writeFile(relPath, content);
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

function parseRecipePath(relPath) {
  const parts = relPath.split('/');
  const section = parts[0];

  if (!Object.hasOwn(sections, section) || parts.some(part => !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.md)?$/.test(part))) {
    return null;
  }

  if (section === 'food' && parts[1] === 'universal' && parts.length === 4) {
    if (!Object.hasOwn(continentNames, 'universal') || !Object.hasOwn(typeNames, parts[2])) return null;
    return {
      section,
      continent: 'universal',
      country: null,
      type: parts[2],
    };
  }

  if (parts.length === 5 && Object.hasOwn(continentNames, parts[1]) && parts[1] !== 'universal' &&
      Object.hasOwn(countries, parts[2]) && countries[parts[2]].continent === parts[1] && Object.hasOwn(typeNames, parts[3])) {
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

function buildCatalog() {
  return recipeFiles()
    .map(readRecipe)
    .filter(Boolean)
    .sort(compareEntries);
}

function compareEntries(a, b) {
  return (
    orderedCompare(a.section, b.section, order.sections) ||
    orderedCompare(a.continent, b.continent, order.continents) ||
    collator.compare(labelCountry(a.country), labelCountry(b.country)) ||
    orderedCompare(a.type, b.type, order.types) ||
    collator.compare(a.title, b.title) || a.relPath.localeCompare(b.relPath, 'en')
  );
}

function orderedCompare(a, b, values) {
  const aIndex = values.indexOf(a);
  const bIndex = values.indexOf(b);
  if (aIndex === bIndex) {
    return collator.compare(a, b);
  }
  if (aIndex === -1) {
    return 1;
  }
  if (bIndex === -1) {
    return -1;
  }
  return aIndex - bIndex;
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }
  return groups;
}

function sortedKeys(groups, values, label) {
  return [...groups.keys()].sort(
    (a, b) => (values ? orderedCompare(a, b, values) : 0) || collator.compare(label(a), label(b))
  );
}

function labelContinent(value) {
  return continentNames[value] || value;
}

function labelCountry(value) {
  return value ? countries[value].title : '';
}

function labelType(value) {
  return typeNames[value] || value;
}

function countLabel(count, section) {
  const info = sections[section];
  if (count === 1) {
    return `1 ${info.singular}`;
  }
  if (count >= 2 && count <= 4) {
    return `${count} ${info.few}`;
  }
  return `${count} ${info.many}`;
}

function origin(entry) {
  if (entry.continent === 'universal') {
    return labelContinent(entry.continent);
  }
  return [labelContinent(entry.continent), labelCountry(entry.country)].filter(Boolean).join(', ');
}

function link(fromFile, text, targetFile) {
  const fromDir = path.posix.dirname(fromFile);
  const base = fromDir === '.' ? '' : fromDir;
  const rel = path.posix.relative(base, targetFile);
  return `[${text}](${rel || path.posix.basename(targetFile)})`;
}

function overviewList(rows, cards = false) {
  const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div class="content-overview${cards ? ' overview-cards' : ''}">\n\n${rows.map(([target, ...details]) =>
    `- ${target}\n  ${details.filter(Boolean).map(text => `<span>${escape(text)}</span>`).join('\n  ')}`
  ).join('\n\n')}\n\n</div>\n`;
}

function page(file, title, body, uid = null) {
  const frontMatter = uid ? `---\nuid: ${uid}\n---\n\n` : '';
  return `${frontMatter}${generatedNotice}\n\n# ${title}\n\n${body.trim()}\n`;
}

function recipeList(fromFile, entries) {
  return overviewList(
    entries.map((entry) => [
      link(fromFile, entry.title, entry.relPath),
      origin(entry),
      entry.description || 'Bez popisu',
    ])
  );
}

function typeBlocks(fromFile, entries, section, headingLevel = 2) {
  const byType = groupBy(entries, (entry) => entry.type);
  return sortedKeys(byType, order.types, labelType)
    .map((type) => {
      const heading = `${'#'.repeat(headingLevel)} ${labelType(type)}`;
      return `${heading}\n\n${recipeList(fromFile, byType.get(type))}`;
    })
    .join('\n');
}

function renderHome(catalog) {
  const file = 'index.md';
  const body = `Praktické návody pro každodenní život, ke kterým se můžete kdykoli vrátit.\n\nNajděte si téma, které právě potřebujete, a postupujte vlastním tempem.\n\n## Prozkoumejte oblasti\n\n${overviewList([[link(file, kitchen.title, kitchen.path), kitchen.intro]], true)}\n## Jak začít\n\nVyberte oblast výše nebo použijte hledání v nabídce pro prohledání celého webu.\n\n[Jak dokumentaci používat](pruvodce.md)\n\n[Co se změnilo](changelog.md)`;
  writeFile(file, page(file, 'Dokumentace ze života', body, 'docs-lifetime.home'));
}

function renderKitchen(catalog) {
  const file = kitchen.path;
  const bySection = groupBy(catalog, (entry) => entry.section);
  const sectionRows = order.sections.map((section) => {
    const entries = bySection.get(section) || [];
    const types = sortedKeys(groupBy(entries, (entry) => entry.type), order.types, labelType)
      .map(labelType)
      .join(', ');
    return [link(file, sections[section].title, `${section}/index.md`), countLabel(entries.length, section), types];
  });
  const allRows = catalog.map((entry) => [
    link(file, entry.title, entry.relPath),
    sections[entry.section].title,
    labelType(entry.type),
    origin(entry),
  ]);

  const body = `${kitchen.intro}\n\n<div class="home-actions">\n\n[Vybrat recept](#recepty)\n\n${link(file, 'Můj nákup', 'nakup.md')}\n\n</div>\n\n## Jídlo a nápoje\n\n${overviewList(sectionRows, true)}\n<div id="recepty"></div>\n\n## Recepty a nápoje\n\nVyberte si z aktuální sbírky, připravte společný nákup a pokračujte přípravou krok za krokem.\n\n<div id="kitchen-catalog"></div>\n\n<div class="catalog-fallback">\n\n${overviewList(allRows)}\n</div>`;

  writeFile(file, page(file, kitchen.title, body, 'docs-lifetime.kitchen'));
}

function renderSection(section, entries) {
  const file = `${section}/index.md`;
  const byContinent = groupBy(entries, (entry) => entry.continent);
  const rows = sortedKeys(byContinent, order.continents, labelContinent).map((continent) => {
    const continentEntries = byContinent.get(continent);
    const countries = sortedKeys(groupBy(continentEntries, (entry) => entry.country || continent), null, (value) =>
      value === continent ? labelContinent(continent) : labelCountry(value)
    )
      .map((value) => (value === continent ? labelContinent(continent) : labelCountry(value)))
      .join(', ');
    const types = sortedKeys(groupBy(continentEntries, (entry) => entry.type), order.types, labelType)
      .map(labelType)
      .join(', ');
    return [
      link(file, labelContinent(continent), `${section}/${continent}/index.md`),
      countLabel(continentEntries.length, section),
      countries,
      types,
    ];
  });

  const body = `${sections[section].intro}\n\n## Přehled oblastí\n\n${overviewList(rows, true)}\n${typeBlocks(file, entries, section)}`;

  writeFile(file, page(file, sections[section].title, body, sections[section].uid));
}

function renderContinent(section, continent, entries) {
  const file = `${section}/${continent}/index.md`;
  const byCountry = groupBy(entries, (entry) => entry.country || 'none');
  const rows = sortedKeys(byCountry, null, labelCountry).map((country) => {
    const countryEntries = byCountry.get(country);
    const countryName = country === 'none' ? labelContinent(continent) : labelCountry(country);
    const target = country === 'none' ? file : `${section}/${continent}/${country}/index.md`;
    const types = sortedKeys(groupBy(countryEntries, (entry) => entry.type), order.types, labelType)
      .map(labelType)
      .join(', ');
    return [link(file, countryName, target), countLabel(countryEntries.length, section), types];
  });

  const intro =
    continent === 'universal'
      ? `Tato část obsahuje ${countLabel(entries.length, section)} bez vazby na konkrétní zemi.`
      : `${labelContinent(continent)} obsahuje ${countLabel(entries.length, section)} podle zemí a typu.`;

  const countryBlocks = sortedKeys(byCountry, null, labelCountry)
    .map((country) => {
      const countryName = country === 'none' ? labelContinent(continent) : labelCountry(country);
      return `## ${countryName}\n\n${typeBlocks(file, byCountry.get(country), section, 3)}`;
    })
    .join('\n');

  const body = `${intro}\n\n${continent === 'universal' ? typeBlocks(file, entries, section) : `## Přehled\n\n${overviewList(rows, true)}\n${countryBlocks}`}`;

  writeFile(file, page(file, labelContinent(continent), body));
}

function renderCountry(section, continent, country, entries) {
  if (!country) {
    return;
  }

  const file = `${section}/${continent}/${country}/index.md`;
  const body = `${labelCountry(country)} obsahuje ${countLabel(entries.length, section)}.\n\n${typeBlocks(
    file,
    entries,
    section
  )}`;

  writeFile(file, page(file, labelCountry(country), body));
}

function renderPages(catalog) {
  renderHome(catalog);
  renderKitchen(catalog);
  const plannerFile = 'nakup.md';
  writeFile(plannerFile, page(plannerFile, 'Můj nákup', `Všechna vybraná jídla a jejich suroviny na jednom místě.\n\n<div id="kitchen-planner">\n\nPro společný nákup je potřeba povolený JavaScript.\n\n${link(plannerFile, 'Prohlédnout všechny recepty', kitchen.path)}\n\n</div>`));
  writeFile('data/recipes.json', JSON.stringify({ version: 1, generatedFrom: 'food/**/*.md, drink/**/*.md, data/ingredients.json, data/taxonomy.json; npm run docs:generate', departments: Object.keys(departments), recipes: catalog.map(entry => ({ ...entry, typeLabel: labelType(entry.type), origin: origin(entry) })) }, null, 2));

  for (const section of order.sections) {
    const sectionEntries = catalog.filter((entry) => entry.section === section);
    renderSection(section, sectionEntries);

    const byContinent = groupBy(sectionEntries, (entry) => entry.continent);
    for (const continent of sortedKeys(byContinent, order.continents, labelContinent)) {
      const continentEntries = byContinent.get(continent);
      renderContinent(section, continent, continentEntries);

      const byCountry = groupBy(continentEntries, (entry) => entry.country);
      for (const [country, countryEntries] of byCountry) {
        renderCountry(section, continent, country, countryEntries);
      }
    }
  }
}

function yamlString(value) {
  return JSON.stringify(value);
}

function yaml(items, indent = 0) {
  const pad = ' '.repeat(indent);
  const lines = [];

  for (const item of items) {
    lines.push(`${pad}- name: ${yamlString(item.name)}`);
    if (item.href) {
      lines.push(`${pad}  href: ${yamlString(item.href)}`);
    }
    if (item.topicHref) lines.push(`${pad}  topicHref: ${yamlString(item.topicHref)}`);
    if (item.items?.length) {
      lines.push(`${pad}  items:`);
      lines.push(yaml(item.items, indent + 4));
    }
  }

  return lines.join('\n');
}

function renderRootToc() {
  writeFile(
    'toc.yml',
    `# Generováno ze zdrojového obsahu a scripts/generate-docs.js; obnova: npm run docs:generate. Neupravujte ručně.
${yaml([
      { name: 'Úvod', href: 'index.md' },
      { name: kitchen.title, href: 'kuchyne/' },
      { name: 'Průvodce', href: 'pruvodce.md' },
      { name: 'Změny', href: 'changelog.md' },
    ])}\n`
  );
}

function renderSectionToc(section, entries) {
  const items = [{ name: 'Přehled', href: 'index.md' }];
  const byContinent = groupBy(entries, (entry) => entry.continent);

  for (const continent of sortedKeys(byContinent, order.continents, labelContinent)) {
    const continentEntries = byContinent.get(continent);
    const continentItem = {
      name: labelContinent(continent),
      href: `${continent}/index.md`,
      items: [],
    };
    const byCountry = groupBy(continentEntries, (entry) => entry.country || 'none');

    for (const country of sortedKeys(byCountry, null, labelCountry)) {
      const countryEntries = byCountry.get(country);
      const target =
        country === 'none'
          ? continentItem
          : {
              name: labelCountry(country),
              href: `${continent}/${country}/index.md`,
              items: [],
            };
      const byType = groupBy(countryEntries, (entry) => entry.type);

      for (const type of sortedKeys(byType, order.types, labelType)) {
        target.items.push({
          name: labelType(type),
          items: byType.get(type).map((entry) => ({
            name: entry.title,
            href: entry.relPath.replace(`${section}/`, ''),
          })),
        });
      }

      if (country !== 'none') {
        continentItem.items.push(target);
      }
    }

    items.push(continentItem);
  }

  writeFile(`${section}/toc.yml`, `# Generováno ze zdrojového obsahu a scripts/generate-docs.js; obnova: npm run docs:generate. Neupravujte ručně.\n${yaml(items)}\n`);
}

function renderTocs(catalog) {
  renderRootToc();
  writeFile('kuchyne/toc.yml', `# Generováno pomocí scripts/generate-docs.js; obnova: npm run docs:generate. Neupravujte ručně.\n${yaml([
    { name: kitchen.title, href: 'index.md' },
    ...order.sections.map(section => ({ name: sections[section].title, href: `../${section}/toc.yml`, topicHref: `../${section}/index.md` })),
    { name: 'Můj nákup', href: '../nakup.md' },
  ])}\n`);
  for (const section of order.sections) {
    renderSectionToc(
      section,
      catalog.filter((entry) => entry.section === section)
    );
  }
}

function validateTaxonomy() {
  const validLabel = value => typeof value === 'string' && value.trim() === value && value.length && !/[\r\n|<>]/.test(value);
  for (const name of ['continents', 'countries', 'types']) {
    const labels = taxonomy[name];
    if (!labels || Array.isArray(labels) || typeof labels !== 'object' || !Object.keys(labels).length) throw new Error('data/taxonomy.json: neplatná skupina ' + name);
    for (const [key, value] of Object.entries(labels)) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) || !validLabel(name === 'countries' ? value?.title : value)) throw new Error('data/taxonomy.json: neplatný štítek ' + key);
      if (name === 'countries' && (!Object.hasOwn(continentNames, value.continent) || value.continent === 'universal')) throw new Error('data/taxonomy.json: neplatná oblast země ' + key);
    }
  }
}

/** Připraví odvozené přehledy, klientský katalog a kopie veřejných zdrojů v paměti bez zápisu a bez Git historie. */
function createContentFiles() {
  generatedFiles.clear();
  errors.length = 0;
  warnings.length = 0;
  validateTaxonomy();
  const catalog = buildCatalog();
  if (errors.length) throw new Error(errors.join('\n'));
  renderPages(catalog);
  renderTocs(catalog);
  writeFile('pruvodce.md', readFile('pruvodce.md'));
  writeFile('content-report.json', JSON.stringify({ generatedBy: 'scripts/generate-docs.js', warnings }, null, 2));
  return new Map(generatedFiles);
}

function outputFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  if (fs.lstatSync(directory).isSymbolicLink()) throw new Error(directory + ': symbolické odkazy nejsou povolené');
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(fullPath + ': symbolické odkazy nejsou povolené');
    return entry.isDirectory() ? outputFiles(fullPath) : [fullPath];
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => !['--check', '--validate-only'].includes(arg))) throw new Error('Podporovaný přepínač: --check nebo --validate-only');
  const files = createContentFiles();
  for (const warning of warnings) {
    console.warn(`WARNING ${warning.file}:${warning.line} [${warning.code}] ${warning.message}`);
    if (process.env.GITHUB_ACTIONS === 'true') {
      const escape = text => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
      console.log(`::warning file=${escape(warning.file)},line=${warning.line},title=${warning.code}::${escape(warning.message)}`);
    }
  }
  if (args.includes('--validate-only')) return console.log(`Obsah je platný; ${warnings.length} neblokujících upozornění na chybějící množství.`);
  const { createChangelog } = require('./generate-changelog.cjs');
  files.set('changelog.md', await createChangelog(root));
  const { createIconAssets } = require('./generate-icons.cjs');
  for (const [file, content] of createIconAssets()) files.set(file, content);
  files.set('manifest.json', JSON.stringify({
    generatedBy: 'scripts/generate-docs.js',
    regenerate: 'npm run docs:generate',
    files: [...files].map(([file, content]) => {
      const copied = file === 'pruvodce.md' || /^(food|drink)\/.+\.md$/.test(file) && !file.endsWith('/index.md');
      return {
        path: file,
        source: copied ? file : null,
        kind: copied ? 'copy' : 'derived',
        sha256: createHash('sha256').update(content).digest('hex'),
      };
    }),
  }, null, 2) + '\n');

  const output = absolute('_generated');
  const obsolete = outputFiles(output).filter(file => !files.has(toPosix(path.relative(output, file))));
  // Ověří celý obsah i historii před první změnou výstupů; nikdy nezapisuje do ručních zdrojů.
  for (const [file, content] of files) {
    const target = path.join(output, file);
    if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === content) continue;
    pendingChanges.push('_generated/' + file);
    if (!checkOnly) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
    }
  }
  for (const file of obsolete) {
    pendingChanges.push(toPosix(path.relative(root, file)) + ' (odstranit)');
    if (!checkOnly) fs.unlinkSync(file);
  }
  if (!pendingChanges.length) return console.log('Dokumentace je aktuální.');
  console.log(checkOnly ? 'Dokumentace není aktuální; spusťte npm run docs:generate:' : 'Aktualizováno:');
  for (const file of pendingChanges) console.log('- ' + file);
  if (checkOnly) process.exitCode = 1;
}

module.exports = { createContentFiles };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
