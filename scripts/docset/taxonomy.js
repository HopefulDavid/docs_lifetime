import fs from 'node:fs';
import path from 'node:path';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isGroup = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;

const isLabel = (value) =>
  typeof value === 'string' && value && value === value.trim() && !/[\r\n|<>]/.test(value);

/** Načte a ověří oblasti, země a typy receptů. Pořadí oblastí a typů určuje pořadí na webu. */
export function readTaxonomy(root) {
  const file = 'data/taxonomy.json';
  const fail = (message) => {
    throw new Error(`${file}: ${message}`);
  };
  const { continents, countries, types } = JSON.parse(
    fs.readFileSync(path.join(root, file), 'utf8'),
  );
  for (const [name, group] of Object.entries({ continents, countries, types })) {
    if (!isGroup(group)) fail(`neplatná skupina ${name}`);
    for (const [key, value] of Object.entries(group)) {
      const label = name === 'countries' ? value?.title : value;
      if (!slugPattern.test(key) || !isLabel(label)) fail(`neplatný štítek ${key}`);
    }
  }
  for (const [key, { continent }] of Object.entries(countries))
    if (!Object.hasOwn(continents, continent) || continent === 'universal')
      fail(`neplatná oblast země ${key}`);
  return { continents, countries, types };
}
