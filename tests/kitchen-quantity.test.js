import { expect, test } from 'bun:test';
import {
  formatQuantity,
  parseQuantity,
  scaleQuantity,
} from '../templates/life/public/kitchen/quantity.js';

test.each([
  ['2,5–3 l', { min: 2500, max: 3000, unit: 'ml' }],
  ['1 kg', { min: 1000, max: 1000, unit: 'g' }],
  ['0.5 lžičky', { min: 0.5, max: 0.5, unit: 'lžička' }],
  ['5 kelímků', { min: 5, max: 5, unit: 'kelímek' }],
])('rozpozná množství %s', (text, quantity) => {
  expect(parseQuantity(text)).toEqual(quantity);
});

test.each(['neuvedeno', 'dle chuti', '3 hrudky', '0 g', '3–2 ks', 'g'])(
  'neodhaduje množství %s',
  (text) => {
    expect(parseQuantity(text)).toBeNull();
  },
);

test.each([
  ['2,5–3 l', 2, '5–6 l'],
  ['600 g', 2, '1,2 kg'],
  ['2 sáčky', 2, '4 sáčky'],
  ['1–2 snítky', 3, '3–6 snítek'],
  ['1 porce', 3, '3 porce'],
  ['1 svazek', 0.5, '0,5 svazku'],
  ['4 stroužky', 1.5, '6 stroužků'],
  ['2 ks', 0.5, '1 ks'],
])('množství %s v dávce %d je %s', (text, factor, expected) => {
  expect(formatQuantity(scaleQuantity(parseQuantity(text), factor))).toBe(expected);
});
