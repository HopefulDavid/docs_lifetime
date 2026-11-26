import { expect, test } from 'bun:test';

import {
  createSearchIndex,
  normalizeSearchText,
  searchIndex,
} from '../templates/life/public/search-core.js';

const searchDocuments = {
  rajska: {
    href: 'food/europe/czech/main-dishes/rajska-omacka.html',
    title: '🍅 Rajská omáčka s masovými koulemi | Život',
    keywords: 'Tradiční české jídlo s rajčaty a hovězím masem.',
  },
  pizza: {
    href: 'food/europe/italy/main-dishes/pizza-quattro-formaggi.html',
    title: '🍕 Pizza Quattro Formaggi | Život',
    keywords: 'Pizza se smetanovým základem a výraznými sýry.',
  },
  frenchPress: {
    href: 'drink/europe/france/coffee/french-press.html',
    title: '☕ French Press | Život',
    keywords: 'Příprava kávy ponořením ve french pressu.',
  },
  pumpkinSpice: {
    href: 'drink/north-america/usa/coffee/pumpkin-spice.html',
    title: '🎃 Pumpkin Spice | Život',
    keywords: 'Autumn coffee with pumpkin and spices.',
    summary: 'Seasonal drink inspired by an American recipe.',
  },
};

const index = createSearchIndex(searchDocuments);

test('normalizuje českou diakritiku a oddělovače', () => {
  expect(normalizeSearchText('  Rajská—omáčka (ČR)  ')).toBe('rajska omacka cr');
});

test('najde český název s diakritikou i bez ní', () => {
  for (const query of ['Rajská', 'rajska', 'rajska omacka', '+Rajská', '+rajska +omacka']) {
    expect(searchIndex(index, query)[0]?.href, query).toBe(searchDocuments.rajska.href);
  }
});

test('zachová existující hledání pizzy', () => {
  expect(searchIndex(index, 'PIZZA')[0]?.href).toBe(searchDocuments.pizza.href);
});

test('najde každý indexovaný český i anglický termín', () => {
  for (const hit of Object.values(searchDocuments)) {
    const indexedTerms = new Set(
      normalizeSearchText(
        [hit.title, hit.keywords, hit.summary, hit.href].filter(Boolean).join(' '),
      )
        .split(' ')
        .filter(Boolean),
    );

    for (const term of indexedTerms) {
      expect(
        searchIndex(index, term).some((result) => result.href === hit.href),
        `${term} musí najít ${hit.href}`,
      ).toBe(true);
    }
  }
});

test('najde český termín z obsahu i anglický termín z cesty', () => {
  expect(searchIndex(index, 'smetanovým')[0]?.href).toBe(searchDocuments.pizza.href);
  expect(searchIndex(index, 'coffee')[0]?.href).toBe(searchDocuments.frenchPress.href);
});

test('vrátí prázdný výsledek pro dotaz bez shody', () => {
  expect(searchIndex(index, 'bez-vysledku-xyz')).toEqual([]);
});

test('kratší prefix přijme až od tří znaků', () => {
  expect(searchIndex(index, 'raj')[0]?.href).toBe(searchDocuments.rajska.href);
  expect(searchIndex(index, 'ra')).toEqual([]);
});
