import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSearchIndex,
  normalizeSearchText,
  searchIndex,
} from '../templates/kitchen/public/search-core.mjs';

const data = {
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

const index = createSearchIndex(data);

test('normalizuje českou diakritiku a oddělovače', () => {
  assert.equal(normalizeSearchText('  Rajská—omáčka (ČR)  '), 'rajska omacka cr');
});

test('najde český název s diakritikou i bez ní', () => {
  for (const query of ['Rajská', 'rajska', 'rajska omacka', '+Rajská', '+rajska +omacka']) {
    assert.equal(searchIndex(index, query)[0]?.href, data.rajska.href);
  }
});

test('zachová existující hledání pizzy', () => {
  assert.equal(searchIndex(index, 'PIZZA')[0]?.href, data.pizza.href);
});

test('najde každý indexovaný český i anglický termín', () => {
  for (const hit of Object.values(data)) {
    const indexedTerms = new Set(
      normalizeSearchText([hit.title, hit.keywords, hit.summary, hit.href].filter(Boolean).join(' '))
        .split(' ')
        .filter(Boolean)
    );

    for (const term of indexedTerms) {
      assert.ok(
        searchIndex(index, term).some((result) => result.href === hit.href),
        `${term} musí najít ${hit.href}`
      );
    }
  }
});

test('najde český termín z obsahu i anglický termín z cesty', () => {
  assert.equal(searchIndex(index, 'smetanovým')[0]?.href, data.pizza.href);
  assert.equal(searchIndex(index, 'coffee')[0]?.href, data.frenchPress.href);
});

test('vrátí prázdný výsledek pro dotaz bez shody', () => {
  assert.deepEqual(searchIndex(index, 'bez-vysledku-xyz'), []);
});

test('kratší prefix přijme až od tří znaků', () => {
  assert.equal(searchIndex(index, 'raj')[0]?.href, data.rajska.href);
  assert.deepEqual(searchIndex(index, 'ra'), []);
});
