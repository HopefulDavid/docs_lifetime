import path from 'node:path';
import { sections } from './sections.js';

const notice = 'Generováno příkazem bun run build ze zdrojů receptů a data/*.json.';

const shopping = { title: 'Můj nákup', file: 'nakup.md' };

const unique = (values) => [...new Set(values)];

const fileOf = (recipe) => `${recipe.id}.md`;

/** Seskupí recepty podle pole, skupiny zachovají pořadí receptů. */
const groupBy = (recipes, field) => [...Map.groupBy(recipes, (recipe) => recipe[field])];

function countLabel(count, section) {
  const [one, few, many] = sections[section].forms;
  return `${count} ${count === 1 ? one : count >= 2 && count <= 4 ? few : many}`;
}

function link(fromFile, text, targetFile) {
  const target = path.posix.relative(path.posix.dirname(fromFile), targetFile);
  return `[${text}](${target})`;
}

/** Seznam odkazů s podrobnostmi pod sebou, který se na telefonu nerozpadne jako tabulka. */
export function overview(rows, { cards = false } = {}) {
  const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const items = rows.map(([target, ...details]) =>
    [
      `- ${target}`,
      ...details.filter(Boolean).map((text) => `  <span>${escape(text)}</span>`),
    ].join('\n'),
  );
  return `<div class="content-overview${cards ? ' overview-cards' : ''}">\n\n${items.join('\n\n')}\n\n</div>\n`;
}

function page(title, body, uid) {
  const frontMatter = uid ? `---\nuid: ${uid}\n---\n\n` : '';
  return `${frontMatter}<!-- ${notice} -->\n\n# ${title}\n\n${body.trim()}\n`;
}

/** JSON je platný YAML, obsah navigace proto nepotřebuje vlastní zápis. */
function toc(items) {
  return `# ${notice}\n${JSON.stringify(items, null, 2)}\n`;
}

function homePage(tiles) {
  const file = 'index.md';
  return page(
    'Dokumentace ze života',
    `<div class="home-hero">

Praktické návody pro každý den: co uvařit, co nakoupit a jak na další běžné věci.

<button type="button" class="home-search" data-home-search>Hledat recept nebo návod<kbd>/</kbd></button>

</div>

## Oblasti

${overview(
  tiles.map(([target, intro, count]) => [link(file, ...target), intro, count]),
  { cards: true },
)}
## Jak začít

Oblast se vybírá výše nebo v horní liště, hledání prohledá celý web.

[Jak dokumentaci používat](pruvodce.md)

[Co se změnilo](changelog.md)`,
    'docs-lifetime.home',
  );
}

function shoppingPage(kitchenFile) {
  return page(
    shopping.title,
    `Všechna vybraná jídla a jejich suroviny na jednom místě.

<div id="kitchen-planner">

Pro společný nákup je potřeba povolený JavaScript.

${link(shopping.file, 'Prohlédnout všechny recepty', kitchenFile)}

</div>`,
  );
}

/**
 * Sestaví přehledy, navigaci a katalog. Vrací obsah podle cesty a nepřistupuje k disku.
 * Oblasti a jejich pořadí určuje data/areas.json, `guideCounts` jsou počty návodů v oblastech.
 */
export function renderPages(recipes, taxonomy, departments, areas, guideCounts = new Map()) {
  const files = new Map();
  const kitchenArea = areas.find(({ type }) => type === 'kitchen');
  const kitchen = { ...kitchenArea, file: `${kitchenArea.path}/index.md` };
  const visible = areas.filter(({ type, id }) => type === 'kitchen' || guideCounts.has(id));
  const guideCount = (count) =>
    `${count} ${count === 1 ? 'návod' : count >= 2 && count <= 4 ? 'návody' : 'návodů'}`;
  const tiles = visible.map((area) =>
    area.type === 'kitchen'
      ? [[area.title, kitchen.file], area.intro, `${recipes.length} receptů a nápojů`]
      : [[area.title, `${area.path}/index.md`], area.intro, guideCount(guideCounts.get(area.id))],
  );
  const typeLabels = Object.values(taxonomy.types);
  const typesOf = (entries) =>
    typeLabels.filter((label) => entries.some((recipe) => recipe.typeLabel === label));
  const byType = (entries) =>
    typesOf(entries).map((label) => [
      label,
      entries.filter((recipe) => recipe.typeLabel === label),
    ]);

  function typeBlocks(file, entries, heading) {
    return byType(entries)
      .map(([label, items]) => {
        const rows = items.map((recipe) => [
          link(file, recipe.title, fileOf(recipe)),
          recipe.origin,
          recipe.description || 'Bez popisu',
        ]);
        return `${heading} ${label}\n\n${overview(rows)}`;
      })
      .join('\n');
  }

  function kitchenPage() {
    const { file } = kitchen;
    const sectionRows = Object.entries(sections).map(([section, { title }]) => {
      const entries = recipes.filter((recipe) => recipe.section === section);
      return [
        link(file, title, `${section}/index.md`),
        countLabel(entries.length, section),
        typesOf(entries).join(', '),
      ];
    });
    const recipeRows = recipes.map((recipe) => [
      link(file, recipe.title, fileOf(recipe)),
      sections[recipe.section].title,
      recipe.typeLabel,
      recipe.origin,
    ]);
    return page(
      kitchen.title,
      `${kitchen.intro}

<div class="home-actions">

[Vybrat recept](#recepty)

${link(file, shopping.title, shopping.file)}

</div>

## Jídlo a nápoje

${overview(sectionRows, { cards: true })}
<div id="recepty"></div>

## Recepty a nápoje

Aktuální sbírka receptů, společný nákup a příprava krok za krokem.

<div id="kitchen-catalog"></div>

<div class="catalog-fallback">

${overview(recipeRows)}
</div>`,
      'docs-lifetime.kitchen',
    );
  }

  function sectionPage(section, entries) {
    const file = `${section}/index.md`;
    const rows = groupBy(entries, 'continent').map(([continent, items]) => [
      link(file, items[0].continentLabel, `${section}/${continent}/index.md`),
      countLabel(items.length, section),
      unique(items.map((recipe) => recipe.countryLabel || recipe.continentLabel)).join(', '),
      typesOf(items).join(', '),
    ]);
    const { title, intro, uid } = sections[section];
    return page(
      title,
      `${intro}\n\n## Přehled oblastí\n\n${overview(rows, { cards: true })}\n${typeBlocks(file, entries, '##')}`,
      uid,
    );
  }

  function continentPage(section, continent, entries) {
    const file = `${section}/${continent}/index.md`;
    const title = entries[0].continentLabel;
    const count = countLabel(entries.length, section);
    if (continent === 'universal')
      return page(
        title,
        `Tato část obsahuje ${count} bez vazby na konkrétní zemi.\n\n${typeBlocks(file, entries, '##')}`,
      );
    const countries = groupBy(entries, 'country');
    const rows = countries.map(([country, items]) => [
      link(file, items[0].countryLabel, `${section}/${continent}/${country}/index.md`),
      countLabel(items.length, section),
      typesOf(items).join(', '),
    ]);
    const blocks = countries.map(
      ([, items]) => `## ${items[0].countryLabel}\n\n${typeBlocks(file, items, '###')}`,
    );
    return page(
      title,
      `${title} obsahuje ${count} podle zemí a typu.\n\n## Přehled\n\n${overview(rows, { cards: true })}\n${blocks.join('\n')}`,
    );
  }

  function countryPage(section, continent, country, entries) {
    const file = `${section}/${continent}/${country}/index.md`;
    const title = entries[0].countryLabel;
    return page(
      title,
      `${title} obsahuje ${countLabel(entries.length, section)}.\n\n${typeBlocks(file, entries, '##')}`,
    );
  }

  function sectionToc(section, entries) {
    const typeItems = (items) =>
      byType(items).map(([name, typeEntries]) => ({
        name,
        items: typeEntries.map((recipe) => ({
          name: recipe.title,
          href: path.posix.relative(section, fileOf(recipe)),
        })),
      }));
    const continents = groupBy(entries, 'continent').map(([continent, items]) => ({
      name: items[0].continentLabel,
      href: `${continent}/index.md`,
      items:
        continent === 'universal'
          ? typeItems(items)
          : groupBy(items, 'country').map(([country, countryEntries]) => ({
              name: countryEntries[0].countryLabel,
              href: `${continent}/${country}/index.md`,
              items: typeItems(countryEntries),
            })),
    }));
    return toc([{ name: 'Přehled', href: 'index.md' }, ...continents]);
  }

  files.set('index.md', homePage(tiles));
  files.set(kitchen.file, kitchenPage());
  files.set(shopping.file, shoppingPage(kitchen.file));
  files.set(
    'toc.yml',
    toc([
      { name: 'Úvod', href: 'index.md' },
      ...visible.map(({ title, path: areaPath }) => ({ name: title, href: `${areaPath}/` })),
      { name: 'Průvodce', href: 'pruvodce.md' },
      { name: 'Změny', href: 'changelog.md' },
    ]),
  );
  files.set(
    `${kitchen.path}/toc.yml`,
    toc([
      { name: kitchen.title, href: 'index.md' },
      ...Object.entries(sections).map(([section, { title }]) => ({
        name: title,
        href: `../${section}/toc.yml`,
        topicHref: `../${section}/index.md`,
      })),
      { name: shopping.title, href: `../${shopping.file}` },
    ]),
  );
  for (const section of Object.keys(sections)) {
    const entries = recipes.filter((recipe) => recipe.section === section);
    files.set(`${section}/index.md`, sectionPage(section, entries));
    files.set(`${section}/toc.yml`, sectionToc(section, entries));
    for (const [continent, items] of groupBy(entries, 'continent')) {
      files.set(`${section}/${continent}/index.md`, continentPage(section, continent, items));
      if (continent === 'universal') continue;
      for (const [country, countryEntries] of groupBy(items, 'country'))
        files.set(
          `${section}/${continent}/${country}/index.md`,
          countryPage(section, continent, country, countryEntries),
        );
    }
  }
  files.set(
    'data/recipes.json',
    `${JSON.stringify({ version: 1, departments, recipes }, null, 2)}\n`,
  );
  return files;
}
