import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  buildShoppingList,
  cookingProgress,
  filterShoppingItems,
  parseQuantity,
  pruneShoppingState,
  recipeSettings,
  restoreState,
  selectedIngredients,
  shoppingAmount,
  shoppingNeedsAmount,
  shoppingText,
} from '../templates/kitchen/public/kitchen-core.mjs';

const require = createRequire(import.meta.url);
const { parseRecipeContent } = require('../scripts/recipe-content.cjs');
const { createContentFiles } = require('../scripts/generate-docs.js');
const catalog = JSON.parse(createContentFiles().get('data/recipes.json'));
const recipe = (slug) => catalog.recipes.find((item) => item.id.endsWith(`/${slug}`));
const list = (selections) => buildShoppingList(catalog.recipes, selections, catalog.departments);

test('nákupní filtry kombinují české hledání, oddělení a platné odškrtnutí', () => {
  const items = list({ [recipe('sunkofleky').id]: {} });
  const onion = items.find((item) => item.name === 'Cibule');
  assert.deepEqual(filterShoppingItems(items, { search: '  CIBu  ', category: onion.category }), [
    onion,
  ]);
  assert.deepEqual(
    filterShoppingItems(
      items,
      { search: 'cibule', hideDone: true },
      { [onion.key]: onion.signature },
    ),
    [],
  );
  assert.deepEqual(
    filterShoppingItems(
      items,
      { search: 'cibule', hideDone: true },
      { [onion.key]: 'stará dávka' },
    ),
    [onion],
  );
  assert.equal(filterShoppingItems(items, { search: 'uzen', category: 'neexistující' }).length, 0);
  assert(filterShoppingItems(items, { search: 'uzen' }).some((item) => item.name.includes('Uzen')));
});

test('filtr chybějícího množství respektuje doplnění a jeho zneplatnění změnou dávky', () => {
  const items = list({ [recipe('kokosove-kure').id]: {} });
  const rice = items.find((item) => item.name === 'Rýže');
  const amounts = { [rice.key]: { text: '1 balení', signature: rice.signature } };
  assert(shoppingNeedsAmount(rice));
  assert(!shoppingNeedsAmount(rice, amounts));
  assert(!filterShoppingItems(items, { missing: true }, {}, amounts).includes(rice));
  const changed = list({ [recipe('kokosove-kure').id]: { factor: 2 } }).find(
    (item) => item.name === 'Rýže',
  );
  assert(shoppingNeedsAmount(changed, amounts));
  assert(!shoppingNeedsAmount({ ...rice, text: 'dle chuti' }));
});

test('dokončení vaření nevyžaduje vynechanou přílohu a po jejím zapnutí se přepočítá', () => {
  const tikka = recipe('kureci-tikka-masala');
  const config = recipeSettings(tikka);
  const initial = cookingProgress(tikka, config, { done: [] });
  assert(initial.active.length < tikka.steps.length);
  const saved = { done: [...initial.active] };
  assert(cookingProgress(tikka, config, saved).complete);
  const optional = tikka.steps.find((step) => step.optionalGroup).optionalGroup;
  config.enabled[optional] = true;
  assert(!cookingProgress(tikka, config, saved).complete);
  assert(cookingProgress(tikka, config, { done: tikka.steps.map((_, index) => index) }).complete);
});

test('spojí nákup rajské a šunkofleků, ale nemíchá gramy a lžičky másla', () => {
  const rajska = recipe('rajska-omacka');
  const sunkofleky = recipe('sunkofleky');
  const items = list({ [rajska.id]: {}, [sunkofleky.id]: {} });
  assert.equal(items.find((item) => item.name === 'Cibule').amount, '2 ks');
  assert.equal(items.find((item) => item.name === 'Vejce').amount, '3 ks');
  assert.deepEqual(
    items
      .filter((item) => item.name === 'Máslo')
      .map((item) => item.amount)
      .sort(),
    ['1 lžička', '60 g'],
  );
  assert.equal(items.find((item) => item.name === 'Cibule').sources.length, 2);
});

test('převádí kg a litry, násobí oba konce rozmezí a neodhaduje balení ani chybějící množství', () => {
  assert.deepEqual(parseQuantity('2,5–3 l'), { min: 2500, max: 3000, unit: 'ml' });
  assert.deepEqual(parseQuantity('1 kg'), { min: 1000, max: 1000, unit: 'g' });
  assert.equal(parseQuantity('neuvedeno'), null);
  assert.equal(parseQuantity('dle chuti'), null);
  const burtgulas = recipe('burtgulas');
  assert.equal(
    list({ [burtgulas.id]: { factor: 2 } }).find((item) => item.name === 'Vývar').amount,
    '5–6 l',
  );
  assert.equal(
    list({ [recipe('kokosove-kure').id]: { factor: 2 } }).find((item) => item.name === 'Rýže')
      .amount,
    'neuvedeno',
  );
});

test('zvolí pouze jednu alternativu a přidá přílohu až na výslovný výběr', () => {
  const kari = recipe('kureci-kari-s-ryzi');
  const settings = recipeSettings(kari);
  const fruit = kari.ingredients.find((item) => item.options[0].name === 'Mango');
  settings.choices[fruit.id] = 1;
  const items = list({ [kari.id]: settings });
  assert(items.some((item) => item.name === 'Broskev'));
  assert(!items.some((item) => item.name === 'Mango'));
  const rajska = recipe('rajska-omacka');
  const config = recipeSettings(rajska);
  assert(!selectedIngredients(rajska, config).some((item) => item.name === 'Houskový knedlík'));
  config.enabled[rajska.groups.find((group) => group.optional).id] = true;
  assert(selectedIngredients(rajska, config).some((item) => item.name === 'Houskový knedlík'));
});

test('zvýšení dávky nebo změna zdroje zneplatní staré odškrtnutí, nezměněná položka je zachová', () => {
  const selected = recipe('sunkofleky');
  const before = list({ [selected.id]: { factor: 1 } }).find((item) => item.name === 'Vejce');
  const same = list({ [selected.id]: { factor: 1 } }).find((item) => item.name === 'Vejce');
  const after = list({ [selected.id]: { factor: 2 } }).find((item) => item.name === 'Vejce');
  assert.equal(before.signature, same.signature);
  assert.notEqual(before.signature, after.signature);
  assert.equal(after.amount, '4 ks');
});

test('poškozené lokální hodnoty nevyřadí recepty ani nezavedou neznámá ID', () => {
  const selected = recipe('sunkofleky');
  assert.deepEqual(restoreState(null, catalog.recipes).selections, {});
  const restored = restoreState(
    {
      version: 1,
      selections: { [selected.id]: { factor: -2, choices: {} }, unknown: {} },
      cooking: { [selected.id]: { revision: selected.revision, step: 100, done: [0, -1, 99] } },
    },
    catalog.recipes,
  );
  assert.equal(restored.selections[selected.id].factor, 1);
  assert.equal(Object.keys(restored.selections).length, 1);
  assert.equal(restored.cooking[selected.id].step, selected.steps.length - 1);
  assert.deepEqual(restored.cooking[selected.id].done, [0]);
});

test('změna receptu nebo neznámá starší verze zruší průběh, ale zachová výběr jídel', () => {
  const selected = recipe('sunkofleky');
  const raw = {
    version: 1,
    selections: { [selected.id]: { factor: 2 } },
    cooking: { [selected.id]: { revision: selected.revision, step: 1, done: [0] } },
  };
  assert.equal(restoreState(raw, catalog.recipes).cooking[selected.id].step, 1);
  const changed = catalog.recipes.map((item) =>
    item.id === selected.id ? { ...item, revision: 'nový obsah' } : item,
  );
  const restored = restoreState(raw, changed);
  assert.deepEqual(restored.cooking, {});
  assert.equal(restored.selections[selected.id].factor, 2);
  delete raw.cooking[selected.id].revision;
  assert.deepEqual(restoreState(raw, catalog.recipes).cooking, {});
});

test('návrat ke staré dávce neoživí odškrtnutí ani vlastní množství a nezměněné zdroje zachová', () => {
  const id = recipe('sunkofleky').id;
  const original = list({ [id]: {} });
  const eggs = original.find((item) => item.name === 'Vejce');
  const pickles = original.find((item) => item.name === 'Kyselé okurky');
  const state = {
    checked: { [eggs.key]: eggs.signature },
    amounts: { [pickles.key]: { text: '1 sklenice', signature: pickles.signature } },
  };
  pruneShoppingState(state, original);
  assert.equal(state.checked[eggs.key], eggs.signature);
  assert.equal(shoppingAmount(pickles, state.amounts), '1 sklenice (vlastní)');
  pruneShoppingState(state, list({ [id]: { factor: 2 } }));
  pruneShoppingState(state, original);
  assert.deepEqual(state.checked, {});
  assert.deepEqual(state.amounts, {});
});

test('nákup obsahuje všechny vybrané suroviny včetně dochucení, ale žádný French Press ani Phin', () => {
  const items = list(Object.fromEntries(catalog.recipes.map((recipe) => [recipe.id, {}])));
  assert(items.some((item) => item.name === 'Sůl'));
  assert(items.some((item) => item.name === 'Voda' && item.category === 'Doma připravit'));
  assert(!items.some((item) => /French Press|Phin/.test(item.name)));
  const text = shoppingText(items, {});
  assert.match(text, /Množství|neuvedeno/);
  assert.match(text, /ZELENINA, OVOCE A BYLINKY/);
  assert.match(text, /Cibule/);
});

test('odmítne neznámou surovinu a neúplný postup ještě před generováním', () => {
  const source =
    '# Recept\n\n## Ingredience\n\n| Surovina | Množství | Upřesnění |\n|---|---|---|\n| Máslo | 10 g | — |\n\n## Postup\n\n### 1. Příprava\n\n- Rozpusťte máslo.\n';
  assert.equal(parseRecipeContent(source, 'test.md').ingredients.length, 1);
  assert.equal(
    parseRecipeContent(`${source}\n## Poznámky\n\n### 1. Další tip\n\n- Nejde o krok.\n`, 'test.md')
      .steps.length,
    1,
  );
  assert.throws(
    () => parseRecipeContent(source.replace('Máslo |', 'Neznámá surovina |'), 'test.md'),
    /neznámá surovina/,
  );
  assert.throws(
    () => parseRecipeContent(source.replace('1. Příprava', '2. Příprava'), 'test.md'),
    /navazující/,
  );
  assert.throws(
    () => parseRecipeContent(source.replace('- Rozpusťte máslo.', ''), 'test.md'),
    /žádný obsah/,
  );
  assert.throws(
    () => parseRecipeContent(source.replace('## Postup', '## Poznámky'), 'test.md'),
    /navazující/,
  );
  assert.throws(
    () => parseRecipeContent(`${source}\n# Druhý recept\n`, 'test.md'),
    /právě jeden hlavní/,
  );
});

test('vlastní množství přežije obnovení a export, ale nepřejde na jinou dávku', () => {
  const selected = recipe('sunkofleky');
  const item = list({ [selected.id]: {} }).find((item) => item.name === 'Kyselé okurky');
  const raw = {
    version: 1,
    amounts: { [item.key]: { text: '1 sklenice', signature: item.signature } },
  };
  const restored = restoreState(JSON.parse(JSON.stringify(raw)), catalog.recipes);
  assert.equal(shoppingAmount(item, restored.amounts), '1 sklenice (vlastní)');
  assert.match(shoppingText([item], {}, restored.amounts), /1 sklenice \(vlastní\)/);
  const changed = list({ [selected.id]: { factor: 2 } }).find(
    (item) => item.name === 'Kyselé okurky',
  );
  assert.equal(shoppingAmount(changed, restored.amounts), 'neuvedeno');
});
