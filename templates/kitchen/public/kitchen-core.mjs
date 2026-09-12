const units = {
  g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], l: ['ml', 1000], ks: ['ks', 1],
  lžíce: ['lžíce', 1], lžic: ['lžíce', 1], lžička: ['lžička', 1], lžičky: ['lžička', 1], lžiček: ['lžička', 1],
  stroužek: ['stroužek', 1], stroužky: ['stroužek', 1], stroužků: ['stroužek', 1],
  hrst: ['hrst', 1], hrsti: ['hrst', 1], hrnek: ['hrnek', 1], hrnku: ['hrnek', 1],
  kelímek: ['kelímek', 1], kelímku: ['kelímek', 1], sáčku: ['sáček', 1], vanička: ['vanička', 1],
  tabulka: ['tabulka', 1], plechovka: ['plechovka', 1], kuliček: ['kulička', 1], svitek: ['svitek', 1], hvězdičky: ['hvězdička', 1],
};
const number = new Intl.NumberFormat('cs', { maximumFractionDigits: 3 });
const collator = new Intl.Collator('cs');

/** Převede pouze podporované číselné množství; neznámé údaje a dochucování ponechá jako text. */
export function parseQuantity(text) {
  const match = text.match(/^(\d+(?:[,.]\d+)?)(?:[–-](\d+(?:[,.]\d+)?))? (.+)$/);
  if (!match || !units[match[3]]) return null;
  const [unit, factor] = units[match[3]];
  const min = Number(match[1].replace(',', '.')) * factor;
  const max = Number((match[2] || match[1]).replace(',', '.')) * factor;
  return min > 0 && max >= min ? { min, max, unit } : null;
}

/** Zobrazí číselné množství česky bez převodů mezi hmotností, objemem a kusy. */
export function formatQuantity(quantity) {
  let { min, max, unit } = quantity;
  if ((unit === 'g' || unit === 'ml') && min >= 1000) { min /= 1000; max /= 1000; unit = unit === 'g' ? 'kg' : 'l'; }
  const plural = {
    lžička: ['lžička', 'lžičky', 'lžiček'], stroužek: ['stroužek', 'stroužky', 'stroužků'],
    hrnek: ['hrnek', 'hrnky', 'hrnků'], hrst: ['hrst', 'hrsti', 'hrstí'],
    kelímek: ['kelímek', 'kelímky', 'kelímků'], sáček: ['sáček', 'sáčky', 'sáčků'],
    vanička: ['vanička', 'vaničky', 'vaniček'], tabulka: ['tabulka', 'tabulky', 'tabulek'],
    plechovka: ['plechovka', 'plechovky', 'plechovek'], kulička: ['kulička', 'kuličky', 'kuliček'],
    svitek: ['svitek', 'svitky', 'svitků'], hvězdička: ['hvězdička', 'hvězdičky', 'hvězdiček'], lžíce: ['lžíce', 'lžíce', 'lžic'],
  }[unit];
  const fraction = { hrnek: 'hrnku', kelímek: 'kelímku', sáček: 'sáčku', stroužek: 'stroužku', hrst: 'hrsti', vanička: 'vaničky', tabulka: 'tabulky', plechovka: 'plechovky', kulička: 'kuličky', svitek: 'svitku', hvězdička: 'hvězdičky', lžíce: 'lžíce', lžička: 'lžičky' };
  if (plural) unit = Number.isInteger(max) ? plural[max === 1 ? 0 : max >= 2 && max <= 4 ? 1 : 2] : fraction[unit];
  return `${number.format(min)}${max !== min ? `–${number.format(max)}` : ''} ${unit}`;
}

/** Vrátí bezpečnou lokální konfiguraci receptu; hodnoty mimo nabízený rozsah se nepoužijí. */
export function recipeSettings(recipe, saved = {}) {
  const value = saved && typeof saved === 'object' ? saved : {};
  return {
    factor: [0.5, 1, 1.5, 2, 3, 4].includes(value.factor) ? value.factor : 1,
    choices: Object.fromEntries(recipe.ingredients.map(item => [item.id, Number.isInteger(value.choices?.[item.id]) && item.options[value.choices[item.id]] ? value.choices[item.id] : 0])),
    enabled: Object.fromEntries([...recipe.groups, ...recipe.ingredients].filter(item => item.optional).map(item => [item.id, typeof value.enabled?.[item.id] === 'boolean' ? value.enabled[item.id] : false])),
  };
}

/** Vybere z receptu skutečně zahrnuté suroviny podle zvolených alternativ a částí. */
export function selectedIngredients(recipe, saved) {
  const settings = recipeSettings(recipe, saved);
  return recipe.ingredients.filter(item => settings.enabled[item.id] !== false && settings.enabled[item.group] !== false)
    .map(item => ({ ...item, ...item.options[settings.choices[item.id]], factor: settings.factor }));
}

/** Sestaví společný nákup se zdroji množství; odlišné jednotky a neznámé údaje zůstávají oddělené. */
export function buildShoppingList(recipes, selections, departments) {
  const items = new Map();
  for (const recipe of recipes) {
    if (!Object.hasOwn(selections, recipe.id)) continue;
    for (const ingredient of selectedIngredients(recipe, selections[recipe.id])) {
      const parsed = parseQuantity(ingredient.quantity);
      const identity = JSON.stringify([ingredient.name, parsed?.unit || ingredient.quantity]);
      if (!items.has(identity)) items.set(identity, { key: identity, name: ingredient.name, category: ingredient.category, quantity: parsed ? { min: 0, max: 0, unit: parsed.unit } : null, text: ingredient.quantity, sources: [] });
      const item = items.get(identity);
      if (parsed) { item.quantity.min += parsed.min * ingredient.factor; item.quantity.max += parsed.max * ingredient.factor; }
      item.sources.push({ recipe: recipe.title, id: recipe.id, group: recipe.groups.find(group => group.id === ingredient.group).title, note: ingredient.note, quantity: parsed ? formatQuantity({ ...parsed, min: parsed.min * ingredient.factor, max: parsed.max * ingredient.factor }) : ingredient.quantity, factor: ingredient.factor });
    }
  }
  return [...items.values()].map(item => ({ ...item, amount: item.quantity ? formatQuantity(item.quantity) : item.text,
    signature: JSON.stringify(item.sources),
  })).sort((a, b) => departments.indexOf(a.category) - departments.indexOf(b.category) || collator.compare(a.name, b.name) || collator.compare(a.amount, b.amount));
}

/** Obnoví jen známá ID a platný stav, aby poškozené úložiště nevyřadilo nákup ani recepty. */
export function restoreState(raw, recipes) {
  const empty = { version: 1, selections: {}, checked: {}, cooking: {}, amounts: {} };
  if (!raw || raw.version !== 1 || typeof raw !== 'object') return empty;
  for (const recipe of recipes) {
    if (raw.selections && Object.hasOwn(raw.selections, recipe.id)) empty.selections[recipe.id] = recipeSettings(recipe, raw.selections[recipe.id]);
    const cooking = raw.cooking?.[recipe.id];
    if (cooking && Number.isInteger(cooking.step)) empty.cooking[recipe.id] = { step: Math.max(0, Math.min(recipe.steps.length - 1, cooking.step)), done: Array.isArray(cooking.done) ? [...new Set(cooking.done.filter(n => Number.isInteger(n) && n >= 0 && n < recipe.steps.length))] : [] };
  }
  if (raw.checked && typeof raw.checked === 'object') for (const [key, value] of Object.entries(raw.checked)) if (typeof value === 'string') empty.checked[key] = value;
  if (raw.amounts && typeof raw.amounts === 'object') for (const [key, value] of Object.entries(raw.amounts)) if (typeof value?.text === 'string' && typeof value?.signature === 'string') empty.amounts[key] = { text: value.text.slice(0, 120), signature: value.signature };
  return empty;
}

/** Použije vlastní nákupní množství jen pro nezměněný výběr a dávku. */
export function shoppingAmount(item, amounts = {}) {
  const custom = amounts[item.key];
  return custom?.signature === item.signature && custom.text.trim() ? `${custom.text.trim()} (vlastní)` : item.amount;
}

/** Exportuje celý nákup včetně poznámek a nejistých množství do textu použitelného bez připojení. */
export function shoppingText(items, checked, amounts = {}) {
  let category = '';
  return ['NÁKUPNÍ SEZNAM', '', ...items.flatMap(item => {
    const heading = item.category === category ? [] : ['', item.category.toLocaleUpperCase('cs')];
    category = item.category;
    const notes = [...new Set(item.sources.map(source => `${source.recipe}: ${source.quantity}${source.note ? ` (${source.note})` : ''}`))];
    return [...heading, `${checked[item.key] === item.signature ? '[x]' : '[ ]'} ${item.name} — ${shoppingAmount(item, amounts)}`, ...notes.map(note => `    ${note}`)];
  })].join('\n');
}
