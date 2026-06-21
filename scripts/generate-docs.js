const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const collator = new Intl.Collator('cs', { sensitivity: 'base' });

const generatedNotice =
  '<!-- Tento soubor generuje npm run docs:generate. Neupravujte seznamy odkazů ručně. -->';

const sections = {
  food: {
    title: 'Jídlo',
    uid: 'docs-lifetime.food',
    singular: 'recept',
    few: 'recepty',
    many: 'receptů',
    intro:
      'Jídlo je uspořádané podle původu a typu. Přehledy se skládají automaticky z receptů, takže odkazy není potřeba udržovat ručně.',
  },
  drink: {
    title: 'Nápoje',
    uid: 'docs-lifetime.drink',
    singular: 'nápoj',
    few: 'nápoje',
    many: 'nápojů',
    intro:
      'Nápoje jsou uspořádané podle původu a způsobu přípravy. Přehledy vycházejí přímo ze souborů v této části.',
  },
};

const continentNames = {
  europe: 'Evropa',
  asia: 'Asie',
  'north-america': 'Severní Amerika',
  universal: 'Univerzální recepty',
};

const countryNames = {
  czech: 'Česko',
  france: 'Francie',
  general: 'Obecně asijská kuchyně',
  greece: 'Řecko',
  india: 'Indie',
  italy: 'Itálie',
  japan: 'Japonsko',
  mexico: 'Mexiko',
  portugal: 'Portugalsko',
  spain: 'Španělsko',
  usa: 'USA',
  vietnam: 'Vietnam',
};

const typeNames = {
  soups: 'Polévky',
  'main-dishes': 'Hlavní jídla',
  desserts: 'Dezerty',
  dips: 'Dipy',
  coffee: 'Káva',
};

const order = {
  sections: ['food', 'drink'],
  continents: ['europe', 'asia', 'north-america', 'universal'],
  types: ['soups', 'main-dishes', 'desserts', 'dips', 'coffee'],
};

const emojiPattern = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\uFE0F|\u200D)/gu;
const hasEmojiPattern = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}])/u;

const generatedFiles = new Set();
const pendingChanges = [];
const errors = [];
const normalizedRecipes = new Map();

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
  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  const fullPath = absolute(relPath);
  const current = fs.existsSync(fullPath)
    ? fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n')
    : null;

  if (current === normalized) {
    return;
  }

  pendingChanges.push(relPath);

  if (!checkOnly) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, normalized, 'utf8');
  }
}

function walkMarkdown(dirRel) {
  const files = [];
  const start = absolute(dirRel);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(toPosix(path.relative(root, fullPath)));
      }
    }
  }

  walk(start);
  return files.sort((a, b) => collator.compare(a, b));
}

function recipeFiles() {
  return [...walkMarkdown('food'), ...walkMarkdown('drink')].filter(
    (relPath) => path.posix.basename(relPath) !== 'index.md'
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

function cleanLine(value) {
  const indent = value.match(/^\s*/)[0];
  const body = value.slice(indent.length);
  return `${indent}${cleanInline(body)}`;
}

function alertLabel(type) {
  const labels = {
    IMPORTANT: 'Důležité',
    NOTE: 'Poznámka',
    TIP: 'Tip',
    WARNING: 'Varování',
  };
  return labels[type.toUpperCase()] || 'Poznámka';
}

function splitLeadingIcon(title) {
  const match = title.trim().match(/^([^\p{L}\p{N}]+)\s*(.+)$/u);
  if (!match || !hasEmojiPattern.test(match[1])) {
    return { icon: '', text: cleanInline(title) };
  }

  return {
    icon: match[1].replace(/\s+/g, ' ').trim(),
    text: cleanInline(match[2]),
  };
}

function formatPrimaryTitle(rawTitle) {
  const { icon, text } = splitLeadingIcon(rawTitle);
  return icon ? `${icon} ${text}` : text;
}

function plainTitle(rawTitle) {
  return cleanInline(rawTitle);
}

function normalizeRecipeMarkdown(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const primaryHeading = lines.findIndex((line) => /^#{1,6}\s+/.test(line));
  const primaryLevel =
    primaryHeading === -1 ? 1 : lines[primaryHeading].match(/^(#{1,6})\s+/)[1].length;
  const headingShift = Math.max(0, primaryLevel - 1);
  const output = [];
  let beforeRecipeSections = true;
  let pendingAlert = null;
  let insideIngredients = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\s*-{3,}\s*$/.test(line)) {
      pendingAlert = null;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      pendingAlert = null;
      if (index === primaryHeading) {
        output.push(`# ${formatPrimaryTitle(heading[2])}`);
      } else {
        beforeRecipeSections = false;
        const title = cleanInline(heading[2]).replace(/\s&\s/g, ' a ');
        const isIngredients = /^ingredience$/i.test(title);
        const isNumberedStep = /^\d+\.\s+/.test(title);
        let level = Math.max(2, heading[1].length - headingShift);

        if (isIngredients || isNumberedStep) {
          level = 2;
        } else if (insideIngredients) {
          level = 3;
        }

        output.push(`${'#'.repeat(level)} ${title}`);
        insideIngredients = isIngredients || (insideIngredients && !isNumberedStep);
      }
      continue;
    }

    const existingAlert = line.match(/^(\s*)>\s*\[!(TIP|NOTE|WARNING|IMPORTANT)\]\s*$/i);
    if (existingAlert) {
      pendingAlert = {
        indent: existingAlert[1],
        label: alertLabel(existingAlert[2]),
      };
      continue;
    }

    const quote = line.match(/^(\s*)>\s*(.+)$/);
    if (quote) {
      const text = removeEmoji(quote[2]).replace(/\*\*/g, '').trim();
      const alert = text.match(/^(Tip|Varování|Poznámka|Důležité):\s*(.+)$/i);

      if (alert) {
        const normalizedLabel = alert[1].toLowerCase();
        const compactLabels = {
          důležité: 'Důležité',
          poznámka: 'Poznámka',
          tip: 'Tip',
          varování: 'Varování',
        };
        const label = compactLabels[normalizedLabel] || 'Tip';
        output.push(`${quote[1]}> **${label}:** ${cleanInline(alert[2])}`);
        pendingAlert = null;
        continue;
      }

      if (pendingAlert) {
        output.push(`${pendingAlert.indent}> **${pendingAlert.label}:** ${cleanInline(quote[2])}`);
        pendingAlert = null;
        continue;
      }

      if (beforeRecipeSections && !text.startsWith('[!')) {
        pendingAlert = null;
        output.push(cleanInline(text));
        continue;
      }

      output.push(`${quote[1]}> ${cleanInline(quote[2])}`);
      continue;
    }

    if (line.trim() === '') {
      pendingAlert = null;
      output.push('');
      continue;
    }

    const cleaned = cleanLine(line).replace(/\s&\s/g, ' a ');

    output.push(cleaned);
  }

  return `${collapseBlankLines(output).join('\n').trim()}\n`;
}

function collapseBlankLines(lines) {
  const result = [];
  for (const line of lines) {
    if (line === '' && result[result.length - 1] === '') {
      continue;
    }
    result.push(line);
  }
  return result;
}

function normalizeRecipes() {
  for (const relPath of recipeFiles()) {
    const normalized = normalizeRecipeMarkdown(readFile(relPath));
    normalizedRecipes.set(relPath, normalized);
    writeFile(relPath, normalized);
  }
}

function readRecipe(relPath) {
  const content = normalizedRecipes.get(relPath) || readFile(relPath);
  const heading = content.match(/^#\s+(.+)$/m);
  if (!heading) {
    errors.push(`${relPath}: chybí hlavní nadpis`);
    return null;
  }

  const pathInfo = parseRecipePath(relPath);
  if (!pathInfo) {
    errors.push(`${relPath}: cesta neodpovídá očekávané struktuře`);
    return null;
  }

  return {
    ...pathInfo,
    relPath,
    title: plainTitle(heading[1]),
    pageTitle: heading[1].trim(),
    description: descriptionFromMarkdown(content),
  };
}

function parseRecipePath(relPath) {
  const parts = relPath.split('/');
  const section = parts[0];

  if (!sections[section]) {
    return null;
  }

  if (section === 'food' && parts[1] === 'universal' && parts.length === 4) {
    return {
      section,
      continent: 'universal',
      country: null,
      type: parts[2],
    };
  }

  if (parts.length === 5) {
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
    collator.compare(a.title, b.title)
  );
}

function orderedCompare(a, b, values) {
  const aIndex = values.indexOf(a);
  const bIndex = values.indexOf(b);
  if (aIndex === bIndex) {
    return 0;
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
  return value ? countryNames[value] || value : '';
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
    return 'Univerzální';
  }
  return [labelContinent(entry.continent), labelCountry(entry.country)].filter(Boolean).join(', ');
}

function link(fromFile, text, targetFile) {
  const fromDir = path.posix.dirname(fromFile);
  const base = fromDir === '.' ? '' : fromDir;
  const rel = path.posix.relative(base, targetFile);
  return `[${text}](${rel || path.posix.basename(targetFile)})`;
}

function table(headers, rows) {
  const divider = headers.map(() => '---');
  return `${[headers, divider, ...rows].map((row) => `| ${row.join(' | ')} |`).join('\n')}\n`;
}

function page(file, title, body, uid = null) {
  generatedFiles.add(file);
  const frontMatter = uid ? `---\nuid: ${uid}\n---\n\n` : '';
  return `${frontMatter}${generatedNotice}\n\n# ${title}\n\n${body.trim()}\n`;
}

function recipeTable(fromFile, entries, section) {
  const noun = sections[section].singular;
  const headers = [noun[0].toUpperCase() + noun.slice(1), 'Původ', 'Popis'];
  return table(
    headers,
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
      return `${heading}\n\n${recipeTable(fromFile, byType.get(type), section)}`;
    })
    .join('\n');
}

function renderHome(catalog) {
  const file = 'index.md';
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

  const body = `Přehledná osobní kuchařka a sbírka postupů pro rychlé dohledání při vaření.\n\n## Hlavní sekce\n\n${table(
    ['Sekce', 'Počet', 'Typy'],
    sectionRows
  )}\n## Kompletní přehled\n\n${table(['Název', 'Sekce', 'Typ', 'Původ'], allRows)}`;

  writeFile(file, page(file, 'Dokumentace ze života', body, 'docs-lifetime.home'));
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

  const body = `${sections[section].intro}\n\n## Přehled oblastí\n\n${table(
    ['Oblast', 'Počet', 'Země / styl', 'Typy'],
    rows
  )}\n${typeBlocks(file, entries, section)}`;

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

  const body = `${intro}\n\n## Přehled\n\n${table(['Země / styl', 'Počet', 'Typy'], rows)}\n${countryBlocks}`;

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
    `${yaml([
      { name: 'Jídlo', href: 'food/' },
      { name: 'Nápoje', href: 'drink/' },
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

  writeFile(`${section}/toc.yml`, `${yaml(items)}\n`);
}

function renderTocs(catalog) {
  renderRootToc();
  for (const section of order.sections) {
    renderSectionToc(
      section,
      catalog.filter((entry) => entry.section === section)
    );
  }
}

function removeObsoleteGeneratedPages() {
  for (const relPath of [...walkMarkdown('food'), ...walkMarkdown('drink')]) {
    if (!relPath.endsWith('/index.md') || generatedFiles.has(relPath)) {
      continue;
    }

    const content = readFile(relPath);
    if (!content.includes(generatedNotice)) {
      continue;
    }

    pendingChanges.push(relPath);
    if (!checkOnly) {
      fs.unlinkSync(absolute(relPath));
    }
  }
}

function main() {
  normalizeRecipes();
  const catalog = buildCatalog();
  renderPages(catalog);
  renderTocs(catalog);
  removeObsoleteGeneratedPages();

  if (errors.length) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  if (!pendingChanges.length) {
    console.log('Dokumentace je aktuální.');
    return;
  }

  console.log(checkOnly ? 'Dokumentace není aktuální:' : 'Aktualizováno:');
  for (const relPath of pendingChanges) {
    console.log(`- ${relPath}`);
  }

  if (checkOnly) {
    process.exit(1);
  }
}

main();
