import fs from 'node:fs';
import path from 'node:path';

/** Převede český název na porovnatelný identifikátor bez diakritiky. */
export const identifier = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const isName = (value) =>
  typeof value === 'string' &&
  identifier(value) &&
  value === value.trim() &&
  !/[|<>\p{Cc}]/u.test(value);

/** Načte slovník surovin. Vrací oddělení v pořadí obchodu a oddělení každé suroviny. */
export function readIngredients(root) {
  const file = 'data/ingredients.json';
  const fail = (message) => {
    throw new Error(`${file}: ${message}`);
  };
  const dictionary = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const categories = new Map();
  const departmentIds = new Set();
  const ingredientIds = new Set();

  for (const [department, names] of Object.entries(dictionary)) {
    if (!isName(department) || !Array.isArray(names) || !names.length)
      fail(`neplatné oddělení '${department}'`);
    if (departmentIds.has(identifier(department))) fail(`duplicitní oddělení '${department}'`);
    departmentIds.add(identifier(department));
    for (const name of names) {
      if (!isName(name) || name.includes(' nebo '))
        fail(`neplatný název suroviny v '${department}'`);
      if (ingredientIds.has(identifier(name))) fail(`duplicitní surovina '${name}'`);
      ingredientIds.add(identifier(name));
      categories.set(name, department);
    }
  }
  if (!categories.size) fail('slovník musí obsahovat nákupní oddělení');
  return { departments: Object.keys(dictionary), categories };
}
