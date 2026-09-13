const { getIconData, iconToSVG, iconToHTML } = require('@iconify/utils');
const tabler = require('@iconify-json/tabler/icons.json');
const flags = require('@iconify-json/circle-flags/icons.json');
const registry = require('../data/icons.json');
const taxonomy = require('../data/taxonomy.json');

/** Sestaví pouze vybrané SVG a popisky; neprovádí síťové požadavky ani zápis. */
function createIconAssets() {
  const sets = { tabler, 'circle-flags': flags };
  const icons = { ...registry.icons };
  const labels = { ...registry.labels };
  for (const [type, label] of Object.entries(taxonomy.types)) labels[label] = icons[type] ? type : 'food';
  for (const label of Object.values(taxonomy.continents)) labels[label] = 'world';
  for (const country of Object.values(taxonomy.countries)) {
    labels[country.title] = country.flag ? `flag-${country.flag}` : 'world';
    if (country.flag) icons[`flag-${country.flag}`] = `circle-flags:${country.flag}`;
  }
  const rules = ['/* Generováno z data/icons.json a připnutých sad Iconify. Neupravujte ručně. */'];
  for (const [name, identifier] of Object.entries(icons)) {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Neplatný název ikony: ${name}`);
    const [prefix, iconName] = identifier.split(':');
    const data = sets[prefix] && getIconData(sets[prefix], iconName);
    if (!data) throw new Error(`Ikona neexistuje v připnuté knihovně: ${identifier}`);
    const rendered = iconToSVG(data);
    const svg = iconToHTML(rendered.body, rendered.attributes);
    const uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    rules.push(`.ui-icon--${name} { --ui-icon: ${uri}; }`);
  }
  for (const [label, name] of Object.entries(labels)) {
    if (!icons[name]) throw new Error(`Popisek '${label}' odkazuje na neznámou ikonu '${name}'.`);
  }
  return new Map([
    ['public/icons.css', rules.join('\n') + '\n'],
    ['public/icon-labels.mjs', `/** Odvozené popisky ikon z ručního registru a taxonomie. */\nexport default ${JSON.stringify(labels, null, 2)};\n`],
  ]);
}

module.exports = { createIconAssets };
