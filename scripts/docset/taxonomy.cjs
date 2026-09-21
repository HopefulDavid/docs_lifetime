const collator = new Intl.Collator('cs', { sensitivity: 'base' });

const generatedNotice =
  '<!-- Generováno z food/**/*.md, drink/**/*.md a data/*.json pomocí scripts/generate-docs.js. Obnova: pnpm run docs:generate. Neupravujte ručně. -->';

const kitchen = {
  title: 'Kuchyně',
  path: 'kuchyne/index.md',
  intro: 'Vyberte recepty a nápoje, připravte společný nákup a pusťte se do vaření.',
};

const sections = {
  food: {
    title: 'Jídlo',
    uid: 'docs-lifetime.food',
    singular: 'recept',
    few: 'recepty',
    many: 'receptů',
    intro: 'Vyberte si jídlo podle chuti, přidejte ho do nákupu a otevřete postup při vaření.',
  },
  drink: {
    title: 'Nápoje',
    uid: 'docs-lifetime.drink',
    singular: 'nápoj',
    few: 'nápoje',
    many: 'nápojů',
    intro: 'Káva a další nápoje na jednom místě, od surovin až po poslední krok přípravy.',
  },
};

const taxonomy = require('../../data/taxonomy.json');
const { continents: continentNames = {}, countries = {}, types: typeNames = {} } = taxonomy;
const order = {
  sections: Object.keys(sections),
  continents: Object.keys(continentNames),
  types: Object.keys(typeNames),
};

/** Porovná klíče podle pořadí taxonomie s českým řazením shodné priority. */
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

/** Převede klíč oblasti na čtenářský název. */
function labelContinent(value) {
  return continentNames[value] || value;
}

/** Převede známou zemi na název; pro chybějící původ vrátí prázdný text. */
function labelCountry(value) {
  return value ? countries[value].title : '';
}

/** Převede klíč typu na čtenářský název. */
function labelType(value) {
  return typeNames[value] || value;
}

/** Ověří názvy a vazby oblastí před čtením receptů. */
function validateTaxonomy() {
  const validLabel = (value) =>
    typeof value === 'string' && value.trim() === value && value.length && !/[\r\n|<>]/.test(value);
  for (const name of ['continents', 'countries', 'types']) {
    const labels = taxonomy[name];
    if (
      !labels ||
      Array.isArray(labels) ||
      typeof labels !== 'object' ||
      !Object.keys(labels).length
    )
      throw new Error('data/taxonomy.json: neplatná skupina ' + name);
    for (const [key, value] of Object.entries(labels)) {
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) ||
        !validLabel(name === 'countries' ? value?.title : value)
      )
        throw new Error('data/taxonomy.json: neplatný štítek ' + key);
      if (
        name === 'countries' &&
        (!Object.hasOwn(continentNames, value.continent) || value.continent === 'universal')
      )
        throw new Error('data/taxonomy.json: neplatná oblast země ' + key);
    }
  }
}

module.exports = {
  collator,
  kitchen,
  sections,
  taxonomy,
  continentNames,
  countries,
  typeNames,
  order,
  generatedNotice,
  orderedCompare,
  labelContinent,
  labelCountry,
  labelType,
  validateTaxonomy,
};
