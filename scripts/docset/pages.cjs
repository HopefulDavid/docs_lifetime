const path = require('node:path');
const { departments } = require('../recipe-content.cjs');
const {
  collator,
  kitchen,
  sections,
  order,
  generatedNotice,
  orderedCompare,
  labelContinent,
  labelCountry,
  labelType,
} = require('./taxonomy.cjs');

function writeFile(files, relPath, content) {
  files.set(relPath, content.endsWith('\n') ? content : content + '\n');
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
    (a, b) => (values ? orderedCompare(a, b, values) : 0) || collator.compare(label(a), label(b)),
  );
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
  const escape = (value) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div class="content-overview${cards ? ' overview-cards' : ''}">\n\n${rows
    .map(
      ([target, ...details]) =>
        `- ${target}\n  ${details
          .filter(Boolean)
          .map((text) => `<span>${escape(text)}</span>`)
          .join('\n  ')}`,
    )
    .join('\n\n')}\n\n</div>\n`;
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
    ]),
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

function renderHome(files, catalog) {
  const file = 'index.md';
  const body = `Praktické návody pro každodenní život, ke kterým se můžete kdykoli vrátit.\n\nNajděte si téma, které právě potřebujete, a postupujte vlastním tempem.\n\n## Prozkoumejte oblasti\n\n${overviewList([[link(file, kitchen.title, kitchen.path), kitchen.intro]], true)}\n## Jak začít\n\nVyberte oblast výše nebo použijte hledání v nabídce pro prohledání celého webu.\n\n[Jak dokumentaci používat](pruvodce.md)\n\n[Co se změnilo](changelog.md)`;
  writeFile(files, file, page(file, 'Dokumentace ze života', body, 'docs-lifetime.home'));
}

function renderKitchen(files, catalog) {
  const file = kitchen.path;
  const bySection = groupBy(catalog, (entry) => entry.section);
  const sectionRows = order.sections.map((section) => {
    const entries = bySection.get(section) || [];
    const types = sortedKeys(
      groupBy(entries, (entry) => entry.type),
      order.types,
      labelType,
    )
      .map(labelType)
      .join(', ');
    return [
      link(file, sections[section].title, `${section}/index.md`),
      countLabel(entries.length, section),
      types,
    ];
  });
  const allRows = catalog.map((entry) => [
    link(file, entry.title, entry.relPath),
    sections[entry.section].title,
    labelType(entry.type),
    origin(entry),
  ]);

  const body = `${kitchen.intro}\n\n<div class="home-actions">\n\n[Vybrat recept](#recepty)\n\n${link(file, 'Můj nákup', 'nakup.md')}\n\n</div>\n\n## Jídlo a nápoje\n\n${overviewList(sectionRows, true)}\n<div id="recepty"></div>\n\n## Recepty a nápoje\n\nVyberte si z aktuální sbírky, připravte společný nákup a pokračujte přípravou krok za krokem.\n\n<div id="kitchen-catalog"></div>\n\n<div class="catalog-fallback">\n\n${overviewList(allRows)}\n</div>`;

  writeFile(files, file, page(file, kitchen.title, body, 'docs-lifetime.kitchen'));
}

function renderSection(files, section, entries) {
  const file = `${section}/index.md`;
  const byContinent = groupBy(entries, (entry) => entry.continent);
  const rows = sortedKeys(byContinent, order.continents, labelContinent).map((continent) => {
    const continentEntries = byContinent.get(continent);
    const countries = sortedKeys(
      groupBy(continentEntries, (entry) => entry.country || continent),
      null,
      (value) => (value === continent ? labelContinent(continent) : labelCountry(value)),
    )
      .map((value) => (value === continent ? labelContinent(continent) : labelCountry(value)))
      .join(', ');
    const types = sortedKeys(
      groupBy(continentEntries, (entry) => entry.type),
      order.types,
      labelType,
    )
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

  writeFile(files, file, page(file, sections[section].title, body, sections[section].uid));
}

function renderContinent(files, section, continent, entries) {
  const file = `${section}/${continent}/index.md`;
  const byCountry = groupBy(entries, (entry) => entry.country || 'none');
  const rows = sortedKeys(byCountry, null, labelCountry).map((country) => {
    const countryEntries = byCountry.get(country);
    const countryName = country === 'none' ? labelContinent(continent) : labelCountry(country);
    const target = country === 'none' ? file : `${section}/${continent}/${country}/index.md`;
    const types = sortedKeys(
      groupBy(countryEntries, (entry) => entry.type),
      order.types,
      labelType,
    )
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

  writeFile(files, file, page(file, labelContinent(continent), body));
}

function renderCountry(files, section, continent, country, entries) {
  if (!country) {
    return;
  }

  const file = `${section}/${continent}/${country}/index.md`;
  const body = `${labelCountry(country)} obsahuje ${countLabel(entries.length, section)}.\n\n${typeBlocks(
    file,
    entries,
    section,
  )}`;

  writeFile(files, file, page(file, labelCountry(country), body));
}

function renderPages(files, catalog) {
  renderHome(files, catalog);
  renderKitchen(files, catalog);
  const plannerFile = 'nakup.md';
  writeFile(
    files,
    plannerFile,
    page(
      plannerFile,
      'Můj nákup',
      `Všechna vybraná jídla a jejich suroviny na jednom místě.\n\n<div id="kitchen-planner">\n\nPro společný nákup je potřeba povolený JavaScript.\n\n${link(plannerFile, 'Prohlédnout všechny recepty', kitchen.path)}\n\n</div>`,
    ),
  );
  writeFile(
    files,
    'data/recipes.json',
    JSON.stringify(
      {
        version: 1,
        generatedFrom:
          'food/**/*.md, drink/**/*.md, data/ingredients.json, data/taxonomy.json; npm run docs:generate',
        departments: Object.keys(departments),
        recipes: catalog.map((entry) => ({
          ...entry,
          typeLabel: labelType(entry.type),
          origin: origin(entry),
        })),
      },
      null,
      2,
    ),
  );

  for (const section of order.sections) {
    const sectionEntries = catalog.filter((entry) => entry.section === section);
    renderSection(files, section, sectionEntries);

    const byContinent = groupBy(sectionEntries, (entry) => entry.continent);
    for (const continent of sortedKeys(byContinent, order.continents, labelContinent)) {
      const continentEntries = byContinent.get(continent);
      renderContinent(files, section, continent, continentEntries);

      const byCountry = groupBy(continentEntries, (entry) => entry.country);
      for (const [country, countryEntries] of byCountry) {
        renderCountry(files, section, continent, country, countryEntries);
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

function renderRootToc(files) {
  writeFile(
    files,
    'toc.yml',
    `# Generováno ze zdrojového obsahu a scripts/generate-docs.js; obnova: npm run docs:generate. Neupravujte ručně.
${yaml([
  { name: 'Úvod', href: 'index.md' },
  { name: kitchen.title, href: 'kuchyne/' },
  { name: 'Průvodce', href: 'pruvodce.md' },
  { name: 'Změny', href: 'changelog.md' },
])}\n`,
  );
}

function renderSectionToc(files, section, entries) {
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

  writeFile(
    files,
    `${section}/toc.yml`,
    `# Generováno ze zdrojového obsahu a scripts/generate-docs.js; obnova: npm run docs:generate. Neupravujte ručně.\n${yaml(items)}\n`,
  );
}

function renderTocs(files, catalog) {
  renderRootToc(files);
  writeFile(
    files,
    'kuchyne/toc.yml',
    `# Generováno pomocí scripts/generate-docs.js; obnova: npm run docs:generate. Neupravujte ručně.\n${yaml(
      [
        { name: kitchen.title, href: 'index.md' },
        ...order.sections.map((section) => ({
          name: sections[section].title,
          href: `../${section}/toc.yml`,
          topicHref: `../${section}/index.md`,
        })),
        { name: 'Můj nákup', href: '../nakup.md' },
      ],
    )}\n`,
  );
  for (const section of order.sections) {
    renderSectionToc(
      files,
      section,
      catalog.filter((entry) => entry.section === section),
    );
  }
}

/** Sestaví přehledy, katalog a navigaci do nové kolekce; nepřistupuje k disku. */
function renderContentPages(catalog) {
  const files = new Map();
  renderPages(files, catalog);
  renderTocs(files, catalog);
  return files;
}
module.exports = { renderContentPages };
