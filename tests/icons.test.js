import { expect, test } from 'bun:test';
import { renderIcons } from '../scripts/docset/icons.js';
import { readTaxonomy } from '../scripts/docset/taxonomy.js';
import { repositoryRoot } from './fixtures/directories.js';

const taxonomy = readTaxonomy(repositoryRoot);

test('ikony jsou vložené SVG bez skriptů a vzdálených zdrojů', () => {
  const css = renderIcons(repositoryRoot, taxonomy).get('public/icons.css');
  const icons = [...css.matchAll(/url\("data:image\/svg\+xml,([^"]+)"\)/g)];

  expect(icons.length).toBeGreaterThan(0);
  for (const [, encoded] of icons) {
    const svg = decodeURIComponent(encoded);
    expect(svg).toMatch(/^<svg[^>]+viewBox=/);
    expect(svg).not.toMatch(/<(?:script|foreignObject|image)\b|(?:href|src)=["']https?:/);
  }
});

test('popisky taxonomie dostanou ikonu typu, vlajku nebo obecnou náhradu', () => {
  const labels = renderIcons(repositoryRoot, {
    continents: { mars: 'Mars' },
    countries: {
      czech: { title: 'Česko', continent: 'mars', flag: 'cz' },
      any: { title: 'Bez vlajky', continent: 'mars' },
    },
    types: { soups: 'Polévky', novy: 'Nový typ' },
  }).get('public/icon-labels.js');

  expect(labels).toContain('"Mars": "world"');
  expect(labels).toContain('"Česko": "flag-cz"');
  expect(labels).toContain('"Bez vlajky": "world"');
  expect(labels).toContain('"Polévky": "soups"');
  expect(labels).toContain('"Nový typ": "food"');
});

test('neznámá vlajka je chyba', () => {
  const countries = { mars: { title: 'Mars', continent: 'mars', flag: 'neexistuje' } };

  expect(() => renderIcons(repositoryRoot, { ...taxonomy, countries })).toThrow(
    'circle-flags:neexistuje',
  );
});
