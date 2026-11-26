import { formatQuantity, parseQuantity, scaleQuantity } from './quantity.js';

const collator = new Intl.Collator('cs');

/** Nabízené násobky dávky. */
export const batchFactors = [0.5, 1, 1.5, 2, 3, 4];

/** Převede text do podoby pro hledání bez ohledu na diakritiku a velikost písmen. */
export const foldText = (text) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('cs');

/** Vrátí bezpečnou lokální konfiguraci receptu; hodnoty mimo nabízený rozsah se nepoužijí. */
export function recipeSettings(recipe, saved = {}) {
  const value = saved && typeof saved === 'object' ? saved : {};
  return {
    factor: batchFactors.includes(value.factor) ? value.factor : 1,
    choices: Object.fromEntries(
      recipe.ingredients.map((item) => [
        item.id,
        Number.isInteger(value.choices?.[item.id]) && item.options[value.choices[item.id]]
          ? value.choices[item.id]
          : 0,
      ]),
    ),
    enabled: Object.fromEntries(
      [...recipe.groups, ...recipe.ingredients]
        .filter((item) => item.optional)
        .map((item) => [
          item.id,
          typeof value.enabled?.[item.id] === 'boolean' ? value.enabled[item.id] : false,
        ]),
    ),
  };
}

/** Vybere z receptu skutečně zahrnuté suroviny podle zvolených alternativ a částí. */
export function selectedIngredients(recipe, saved) {
  const settings = recipeSettings(recipe, saved);
  return recipe.ingredients
    .filter((item) => settings.enabled[item.id] !== false && settings.enabled[item.group] !== false)
    .map((item) => ({
      ...item,
      ...item.options[settings.choices[item.id]],
      factor: settings.factor,
    }));
}

/** Sestaví společný nákup se zdroji množství; odlišné jednotky a neznámé údaje zůstávají oddělené. */
export function buildShoppingList(recipes, selections, departments) {
  const items = new Map();
  for (const recipe of recipes) {
    if (!Object.hasOwn(selections, recipe.id)) continue;
    for (const ingredient of selectedIngredients(recipe, selections[recipe.id])) {
      const parsed = parseQuantity(ingredient.quantity);
      const identity = JSON.stringify([ingredient.name, parsed?.unit || ingredient.quantity]);
      if (!items.has(identity))
        items.set(identity, {
          key: identity,
          name: ingredient.name,
          category: ingredient.category,
          quantity: parsed ? { min: 0, max: 0, unit: parsed.unit } : null,
          text: ingredient.quantity,
          sources: [],
        });
      const item = items.get(identity);
      if (parsed) {
        item.quantity.min += parsed.min * ingredient.factor;
        item.quantity.max += parsed.max * ingredient.factor;
      }
      item.sources.push({
        recipe: recipe.title,
        id: recipe.id,
        group: recipe.groups.find((group) => group.id === ingredient.group).title,
        note: ingredient.note,
        quantity: parsed
          ? formatQuantity(scaleQuantity(parsed, ingredient.factor))
          : ingredient.quantity,
        factor: ingredient.factor,
      });
    }
  }
  return [...items.values()]
    .map((item) => ({
      ...item,
      amount: item.quantity ? formatQuantity(item.quantity) : item.text,
      signature: JSON.stringify(item.sources),
    }))
    .sort(
      (a, b) =>
        departments.indexOf(a.category) - departments.indexOf(b.category) ||
        collator.compare(a.name, b.name) ||
        collator.compare(a.amount, b.amount),
    );
}

/** Obnoví jen známá ID a platný stav, aby poškozené úložiště nevyřadilo nákup ani recepty. */
export function restoreState(raw, recipes) {
  const empty = { version: 1, selections: {}, checked: {}, cooking: {}, amounts: {} };
  if (!raw || raw.version !== 1 || typeof raw !== 'object') return empty;
  for (const recipe of recipes) {
    if (raw.selections && Object.hasOwn(raw.selections, recipe.id))
      empty.selections[recipe.id] = recipeSettings(recipe, raw.selections[recipe.id]);
    const cooking = raw.cooking?.[recipe.id];
    if (
      cooking &&
      typeof recipe.revision === 'string' &&
      cooking.revision === recipe.revision &&
      Number.isInteger(cooking.step)
    )
      empty.cooking[recipe.id] = {
        revision: recipe.revision,
        step: Math.max(0, Math.min(recipe.steps.length - 1, cooking.step)),
        done: Array.isArray(cooking.done)
          ? [
              ...new Set(
                cooking.done.filter(
                  (n) => Number.isInteger(n) && n >= 0 && n < recipe.steps.length,
                ),
              ),
            ]
          : [],
      };
  }
  if (raw.checked && typeof raw.checked === 'object')
    for (const [key, value] of Object.entries(raw.checked))
      if (typeof value === 'string') empty.checked[key] = value;
  if (raw.amounts && typeof raw.amounts === 'object')
    for (const [key, value] of Object.entries(raw.amounts))
      if (typeof value?.text === 'string' && typeof value?.signature === 'string')
        empty.amounts[key] = { text: value.text.slice(0, 120), signature: value.signature };
  return empty;
}

/** Odstraní potvrzení a vlastní množství po změně požadavku, aby je návrat ke staré dávce neoživil. */
export function pruneShoppingState(state, items) {
  const signatures = new Map(items.map((item) => [item.key, item.signature]));
  for (const [key, signature] of Object.entries(state.checked)) {
    if (signatures.get(key) !== signature) delete state.checked[key];
  }
  for (const [key, value] of Object.entries(state.amounts)) {
    if (signatures.get(key) !== value.signature) delete state.amounts[key];
  }
}

/** Zachová dříve uložené vlastní množství pouze pro nezměněný výběr a dávku. */
export function shoppingAmount(item, amounts = {}) {
  const custom = amounts[item.key];
  return custom?.signature === item.signature && custom.text.trim()
    ? `${custom.text.trim()} (vlastní)`
    : item.amount;
}

/** Vyfiltruje nákup podle oddělení, názvu a hotových položek bez změny celkového seznamu. */
export function filterShoppingItems(items, filters = {}, checked = {}) {
  const words = foldText(filters.search || '')
    .split(/\s+/)
    .filter(Boolean);
  return items.filter(
    (item) =>
      (!filters.category || item.category === filters.category) &&
      (!filters.hideDone || checked[item.key] !== item.signature) &&
      words.every((word) => foldText(item.name).includes(word)),
  );
}

/** Počítá průběh pouze ze zahrnutých kroků; vynechaná příloha nemůže bránit dokončení. */
export function cookingProgress(recipe, saved, cooking) {
  const config = recipeSettings(recipe, saved);
  const active = recipe.steps.flatMap((step, index) =>
    !step.optionalGroup || config.enabled[step.optionalGroup] ? [index] : [],
  );
  const done = active.filter((index) => cooking.done.includes(index));
  return { active, done, complete: active.length > 0 && done.length === active.length };
}

/** Popíše, kolik suroviny který recept potřebuje. */
export function sourceNote({ recipe, group, quantity, note }) {
  return `${recipe}${group !== 'Základ' ? ` (${group})` : ''}: ${quantity}${note ? ` (${note})` : ''}`;
}

/** Exportuje celý nákup včetně poznámek a nejistých množství do textu použitelného bez připojení. */
export function shoppingText(items, checked, amounts = {}) {
  let category = '';
  return [
    'NÁKUPNÍ SEZNAM',
    '',
    ...items.flatMap((item) => {
      const heading = item.category === category ? [] : ['', item.category.toLocaleUpperCase('cs')];
      category = item.category;
      return [
        ...heading,
        `${checked[item.key] === item.signature ? '[x]' : '[ ]'} ${item.name} — ${shoppingAmount(item, amounts)}`,
        ...item.sources.map((source) => `    ${sourceNote(source)}`),
      ];
    }),
  ].join('\n');
}
