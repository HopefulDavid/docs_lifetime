import assert from 'node:assert/strict';
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
  shoppingText,
} from '../templates/kitchen/public/kitchen-core.mjs';

import { createKitchenFixture } from './fixtures/kitchen.mjs';
const { catalog, recipe, shoppingList } = createKitchenFixture();

test('nákupní filtry kombinují české hledání, oddělení a platné odškrtnutí', () => {
  const items = shoppingList({ [recipe('sunkofleky').id]: {} });
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

test('spojí nákup rajské a šunkofleků, ale nemíchá gramy a lžíce másla', () => {
  const rajska = recipe('rajska-omacka');
  const sunkofleky = recipe('sunkofleky');
  const items = shoppingList({ [rajska.id]: {}, [sunkofleky.id]: {} });

  assert.equal(items.find((item) => item.name === 'Cibule').amount, '2 ks');
  assert.equal(items.find((item) => item.name === 'Vejce').amount, '3 ks');
  assert.deepEqual(
    items
      .filter((item) => item.name === 'Máslo')
      .map((item) => item.amount)
      .sort(),
    ['1 lžíce', '60 g'],
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
    shoppingList({ [burtgulas.id]: { factor: 2 } }).find((item) => item.name === 'Vývar').amount,
    '5–6 l',
  );
  assert.equal(
    shoppingList({ [recipe('kokosove-kure').id]: { factor: 2 } }).find(
      (item) => item.name === 'Rýže',
    ).amount,
    '4 sáčky',
  );
});

test('číselné množství každé ingredience má podporovanou jednotku pro přepočet dávky', () => {
  for (const recipe of catalog.recipes) {
    for (const item of recipe.ingredients) {
      if (['neuvedeno', 'dle chuti'].includes(item.quantity)) continue;
      assert(parseQuantity(item.quantity), `${recipe.id}: ${item.quantity}`);
    }
  }
});

test('násobí balení, snítky, svazky i porce a přepočítá dávku kávy', () => {
  const steak = recipe('steak');
  const config = recipeSettings(steak, { factor: 3 });
  config.enabled[steak.groups.find((group) => group.optional).id] = true;
  const list = shoppingList({
    [steak.id]: config,
    [recipe('tortilly-s-masem-a-salsou').id]: { factor: 0.5 },
    [recipe('gnocchi-se-spenatem').id]: { factor: 2 },
    [recipe('french-press').id]: { factor: 2 },
  });

  assert.equal(list.find((item) => item.name === 'Rozmarýn').amount, '3–6 snítek');
  assert.equal(list.find((item) => item.name === 'Zelenina').amount, '3 porce');
  assert.equal(list.find((item) => item.name === 'Koriandr').amount, '0,5 svazku');
  assert.equal(list.find((item) => item.name === 'Mražený špenát').amount, '2 balení');
  assert.equal(list.find((item) => item.name === 'Káva').amount, '60 g');
  assert.equal(list.find((item) => item.name === 'Voda').amount, '1 l');
});

test('neuvedené množství zůstane přiznané v nákupu i exportu při změně dávky', () => {
  const incomplete = recipe('french-press');
  incomplete.ingredients.forEach((item) => {
    item.quantity = 'neuvedeno';
  });
  const items = buildShoppingList(
    [incomplete],
    { [incomplete.id]: { factor: 2 } },
    catalog.departments,
  );

  assert.equal(items.length, 2);
  assert(items.every((item) => item.amount === 'neuvedeno'));
  assert.match(shoppingText(items, {}), /Káva — neuvedeno/);
  assert.match(shoppingText(items, {}), /Voda — neuvedeno/);
});

test('volitelný led s upřesněním za čárkou se nakoupí až po zapnutí a násobí dávkou', () => {
  const vietnamese = recipe('vietnamska-kava');
  const config = recipeSettings(vietnamese, { factor: 2 });
  const ice = vietnamese.ingredients.find((item) => item.options[0].name === 'Led');

  assert(!shoppingList({ [vietnamese.id]: config }).some((item) => item.name === 'Led'));
  config.enabled[ice.id] = true;
  assert.equal(
    shoppingList({ [vietnamese.id]: config }).find((item) => item.name === 'Led').amount,
    '8–10 ks',
  );
});

test('zvolí pouze jednu alternativu a přidá přílohu až na výslovný výběr', () => {
  const kari = recipe('kureci-kari-s-ryzi');
  const settings = recipeSettings(kari);
  const fruit = kari.ingredients.find((item) => item.options[0].name === 'Mango');
  settings.choices[fruit.id] = 1;
  const items = shoppingList({ [kari.id]: settings });

  assert(items.some((item) => item.name === 'Broskev'));
  assert(!items.some((item) => item.name === 'Mango'));
  const rajska = recipe('rajska-omacka');
  const config = recipeSettings(rajska);
  assert(!selectedIngredients(rajska, config).some((item) => item.name === 'Houskový knedlík'));
  config.enabled[rajska.groups.find((group) => group.optional).id] = true;
  assert(selectedIngredients(rajska, config).some((item) => item.name === 'Houskový knedlík'));
  assert(!selectedIngredients(rajska, config).some((item) => item.name === 'Těstoviny'));
  const side = rajska.ingredients.find((item) => item.options[0].name === 'Houskový knedlík');
  config.choices[side.id] = 1;
  assert(selectedIngredients(rajska, config).some((item) => item.name === 'Těstoviny'));
  assert(!selectedIngredients(rajska, config).some((item) => item.name === 'Houskový knedlík'));
});

test('zvýšení dávky nebo změna zdroje zneplatní staré odškrtnutí, nezměněná položka je zachová', () => {
  const selected = recipe('sunkofleky');
  const before = shoppingList({ [selected.id]: { factor: 1 } }).find(
    (item) => item.name === 'Vejce',
  );
  const same = shoppingList({ [selected.id]: { factor: 1 } }).find((item) => item.name === 'Vejce');
  const after = shoppingList({ [selected.id]: { factor: 2 } }).find(
    (item) => item.name === 'Vejce',
  );

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
  const original = shoppingList({ [id]: {} });
  const eggs = original.find((item) => item.name === 'Vejce');
  const pickles = original.find((item) => item.name === 'Kyselé okurky');
  const state = {
    checked: { [eggs.key]: eggs.signature },
    amounts: { [pickles.key]: { text: '1 sklenice', signature: pickles.signature } },
  };
  pruneShoppingState(state, original);
  assert.equal(state.checked[eggs.key], eggs.signature);
  assert.equal(shoppingAmount(pickles, state.amounts), '1 sklenice (vlastní)');
  pruneShoppingState(state, shoppingList({ [id]: { factor: 2 } }));
  pruneShoppingState(state, original);
  assert.deepEqual(state.checked, {});
  assert.deepEqual(state.amounts, {});
});

test('nákup obsahuje všechny vybrané suroviny včetně dochucení, ale žádný French Press ani Phin', () => {
  const items = shoppingList(Object.fromEntries(catalog.recipes.map((recipe) => [recipe.id, {}])));

  assert(items.some((item) => item.name === 'Sůl'));
  assert(items.some((item) => item.name === 'Voda' && item.category === 'Doma připravit'));
  assert(!items.some((item) => /French Press|Phin/.test(item.name)));
  const text = shoppingText(items, {});

  assert.match(text, /Sůl — dle chuti/);
  assert.match(text, /ZELENINA, OVOCE A BYLINKY/);
  assert.match(text, /Cibule/);
});

test('dříve uložené vlastní množství přežije obnovení a export, ale nepřejde na jinou dávku', () => {
  const selected = recipe('sunkofleky');
  const item = shoppingList({ [selected.id]: {} }).find((item) => item.name === 'Kyselé okurky');
  const raw = {
    version: 1,
    amounts: { [item.key]: { text: '1 sklenice', signature: item.signature } },
  };
  const restored = restoreState(JSON.parse(JSON.stringify(raw)), catalog.recipes);

  assert.equal(shoppingAmount(item, restored.amounts), '1 sklenice (vlastní)');
  assert.match(shoppingText([item], {}, restored.amounts), /1 sklenice \(vlastní\)/);
  const changed = shoppingList({ [selected.id]: { factor: 2 } }).find(
    (item) => item.name === 'Kyselé okurky',
  );

  assert.equal(shoppingAmount(changed, restored.amounts), '8 ks');
});
