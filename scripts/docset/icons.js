import fs from 'node:fs';
import path from 'node:path';
import flags from '@iconify-json/circle-flags/icons.json';
import tabler from '@iconify-json/tabler/icons.json';
import { getIconData, iconToHTML, iconToSVG } from '@iconify/utils';

const iconSets = { tabler, 'circle-flags': flags };

function dataUri(identifier) {
  const [prefix, name] = identifier.split(':');
  const data = iconSets[prefix] && getIconData(iconSets[prefix], name);
  if (!data) throw new Error(`Ikona neexistuje v připnuté sadě: ${identifier}`);
  const { attributes, body } = iconToSVG(data);
  return `data:image/svg+xml,${encodeURIComponent(iconToHTML(body, attributes))}`;
}

/** Vloží vybrané ikony do CSS a přiřadí je popiskům. Web tak nenačítá písmo ani vzdálenou službu. */
export function renderIcons(root, { continents, countries, types }, areas = []) {
  const { icons, labels } = JSON.parse(fs.readFileSync(path.join(root, 'data/icons.json'), 'utf8'));
  // Oblast nese ikonu z data/areas.json, popisek je její název v navigaci a nadpisu.
  for (const { title, icon } of areas) labels[title] = icon;
  for (const [type, label] of Object.entries(types)) labels[label] = icons[type] ? type : 'food';
  for (const label of Object.values(continents)) labels[label] = 'world';
  for (const { title, flag } of Object.values(countries)) {
    labels[title] = flag ? `flag-${flag}` : 'world';
    if (flag) icons[`flag-${flag}`] = `circle-flags:${flag}`;
  }
  for (const [label, name] of Object.entries(labels))
    if (!icons[name]) throw new Error(`Popisek '${label}' odkazuje na neznámou ikonu '${name}'.`);

  const rules = Object.entries(icons).map(
    ([name, identifier]) => `.ui-icon--${name} { --ui-icon: url("${dataUri(identifier)}"); }\n`,
  );
  return new Map([
    ['public/icons.css', rules.join('')],
    ['public/icon-labels.js', `export default ${JSON.stringify(labels, null, 2)};\n`],
  ]);
}
