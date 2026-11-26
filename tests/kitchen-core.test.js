import { expect, test } from 'bun:test';
import {
  buildShoppingList,
  cookingProgress,
  filterShoppingItems,
  pruneShoppingState,
  recipeSettings,
  restoreState,
  selectedIngredients,
  shoppingAmount,
  shoppingText,
} from '../templates/life/public/kitchen/core.js';
import { catalog, recipe, shoppingList } from './fixtures/catalog.js';

test('nákupní filtry kombinují české hledání, oddělení a platné odškrtnutí', () => {
  const items = shoppingList({ [recipe('testoviny').id]: {} });
  const onion = items.find((item) => item.name === 'Cibule');

  expect(filterShoppingItems(items, { search: '  CIBu  ', category: onion.category })).toEqual([
    onion,
  ]);
  expect(
    filterShoppingItems(
      items,
      { search: 'cibule', hideDone: true },
      { [onion.key]: onion.signature },
    ),
  ).toEqual([]);
  expect(
    filterShoppingItems(
      items,
      { search: 'cibule', hideDone: true },
      { [onion.key]: 'stará dávka' },
    ),
  ).toEqual([onion]);
  expect(filterShoppingItems(items, { search: 'cibule', category: 'neexistující' })).toEqual([]);
});

test('dokončení vaření nevyžaduje vynechanou přílohu a po jejím zapnutí se přepočítá', () => {
  const sauce = recipe('omacka');
  const config = recipeSettings(sauce);
  const initial = cookingProgress(sauce, config, { done: [] });
  expect(initial.active.length).toBeLessThan(sauce.steps.length);
  const saved = { done: [...initial.active] };
  expect(cookingProgress(sauce, config, saved).complete).toBeTruthy();
  const optional = sauce.steps.find((step) => step.optionalGroup).optionalGroup;
  config.enabled[optional] = true;
  expect(cookingProgress(sauce, config, saved).complete).toBeFalsy();
  expect(
    cookingProgress(sauce, config, { done: sauce.steps.map((_, index) => index) }).complete,
  ).toBeTruthy();
});

test('spojí suroviny dvou jídel, ale nemíchá gramy a lžíce másla', () => {
  const sauce = recipe('omacka');
  const pasta = recipe('testoviny');
  const items = shoppingList({ [sauce.id]: {}, [pasta.id]: {} });

  expect(items.find((item) => item.name === 'Cibule').amount).toBe('2 ks');
  expect(items.find((item) => item.name === 'Vejce').amount).toBe('3 ks');
  expect(
    items
      .filter((item) => item.name === 'Máslo')
      .map((item) => item.amount)
      .sort(),
  ).toEqual(['1 lžíce', '60 g']);
  expect(items.find((item) => item.name === 'Cibule').sources.length).toBe(2);
});

test('neuvedené množství zůstane přiznané v nákupu i exportu při změně dávky', () => {
  const incomplete = recipe('kava');
  incomplete.ingredients.forEach((item) => {
    item.quantity = 'neuvedeno';
  });
  const items = buildShoppingList(
    [incomplete],
    { [incomplete.id]: { factor: 2 } },
    catalog.departments,
  );

  expect(items.length).toBe(2);
  expect(items.every((item) => item.amount === 'neuvedeno')).toBeTruthy();
  expect(shoppingText(items, {})).toMatch(/Káva — neuvedeno/);
  expect(shoppingText(items, {})).toMatch(/Voda — neuvedeno/);
});

test('volitelný led s upřesněním za čárkou se nakoupí až po zapnutí a násobí dávkou', () => {
  const coffee = recipe('kava');
  const config = recipeSettings(coffee, { factor: 2 });
  const ice = coffee.ingredients.find((item) => item.options[0].name === 'Led');

  expect(shoppingList({ [coffee.id]: config }).some((item) => item.name === 'Led')).toBeFalsy();
  config.enabled[ice.id] = true;
  expect(shoppingList({ [coffee.id]: config }).find((item) => item.name === 'Led').amount).toBe(
    '8–10 ks',
  );
});

test('zvolí pouze jednu alternativu a přidá přílohu až na výslovný výběr', () => {
  const kari = recipe('kari');
  const settings = recipeSettings(kari);
  const fruit = kari.ingredients.find((item) => item.options[0].name === 'Mango');
  settings.choices[fruit.id] = 1;
  const items = shoppingList({ [kari.id]: settings });

  expect(items.some((item) => item.name === 'Broskev')).toBeTruthy();
  expect(items.some((item) => item.name === 'Mango')).toBeFalsy();
  const sauce = recipe('omacka');
  const config = recipeSettings(sauce);
  expect(
    selectedIngredients(sauce, config).some((item) => item.name === 'Houskový knedlík'),
  ).toBeFalsy();
  config.enabled[sauce.groups.find((group) => group.optional).id] = true;
  expect(
    selectedIngredients(sauce, config).some((item) => item.name === 'Houskový knedlík'),
  ).toBeTruthy();
  expect(selectedIngredients(sauce, config).some((item) => item.name === 'Těstoviny')).toBeFalsy();
  const side = sauce.ingredients.find((item) => item.options[0].name === 'Houskový knedlík');
  config.choices[side.id] = 1;
  expect(selectedIngredients(sauce, config).some((item) => item.name === 'Těstoviny')).toBeTruthy();
  expect(
    selectedIngredients(sauce, config).some((item) => item.name === 'Houskový knedlík'),
  ).toBeFalsy();
});

test('zvýšení dávky nebo změna zdroje zneplatní staré odškrtnutí, nezměněná položka je zachová', () => {
  const selected = recipe('testoviny');
  const before = shoppingList({ [selected.id]: { factor: 1 } }).find(
    (item) => item.name === 'Vejce',
  );
  const same = shoppingList({ [selected.id]: { factor: 1 } }).find((item) => item.name === 'Vejce');
  const after = shoppingList({ [selected.id]: { factor: 2 } }).find(
    (item) => item.name === 'Vejce',
  );

  expect(before.signature).toBe(same.signature);
  expect(before.signature).not.toBe(after.signature);
  expect(after.amount).toBe('4 ks');
});

test('poškozené lokální hodnoty nevyřadí recepty ani nezavedou neznámá ID', () => {
  const selected = recipe('testoviny');
  expect(restoreState(null, catalog.recipes).selections).toEqual({});
  const restored = restoreState(
    {
      version: 1,
      selections: { [selected.id]: { factor: -2, choices: {} }, unknown: {} },
      cooking: { [selected.id]: { revision: selected.revision, step: 100, done: [0, -1, 99] } },
    },
    catalog.recipes,
  );

  expect(restored.selections[selected.id].factor).toBe(1);
  expect(Object.keys(restored.selections).length).toBe(1);
  expect(restored.cooking[selected.id].step).toBe(selected.steps.length - 1);
  expect(restored.cooking[selected.id].done).toEqual([0]);
});

test('změna receptu nebo neznámá starší verze zruší průběh, ale zachová výběr jídel', () => {
  const selected = recipe('testoviny');
  const raw = {
    version: 1,
    selections: { [selected.id]: { factor: 2 } },
    cooking: { [selected.id]: { revision: selected.revision, step: 1, done: [0] } },
  };
  expect(restoreState(raw, catalog.recipes).cooking[selected.id].step).toBe(1);
  const changed = catalog.recipes.map((item) =>
    item.id === selected.id ? { ...item, revision: 'nový obsah' } : item,
  );
  const restored = restoreState(raw, changed);

  expect(restored.cooking).toEqual({});
  expect(restored.selections[selected.id].factor).toBe(2);
  delete raw.cooking[selected.id].revision;
  expect(restoreState(raw, catalog.recipes).cooking).toEqual({});
});

test('návrat ke staré dávce neoživí odškrtnutí ani vlastní množství a nezměněné zdroje zachová', () => {
  const id = recipe('testoviny').id;
  const original = shoppingList({ [id]: {} });
  const eggs = original.find((item) => item.name === 'Vejce');
  const pickles = original.find((item) => item.name === 'Kyselé okurky');
  const state = {
    checked: { [eggs.key]: eggs.signature },
    amounts: { [pickles.key]: { text: '1 sklenice', signature: pickles.signature } },
  };
  pruneShoppingState(state, original);
  expect(state.checked[eggs.key]).toBe(eggs.signature);
  expect(shoppingAmount(pickles, state.amounts)).toBe('1 sklenice (vlastní)');
  pruneShoppingState(state, shoppingList({ [id]: { factor: 2 } }));
  pruneShoppingState(state, original);
  expect(state.checked).toEqual({});
  expect(state.amounts).toEqual({});
});

test('nákup zachová dochucení, oddělení a pořadí obchodu v textovém exportu', () => {
  const items = shoppingList(Object.fromEntries(catalog.recipes.map(({ id }) => [id, {}])));
  const text = shoppingText(items, {});

  expect(text).toContain('[ ] Pepř mletý — dle chuti');
  expect(text).toContain('ZELENINA, OVOCE A BYLINKY');
  expect(text.indexOf('] Cibule')).toBeLessThan(text.indexOf('DOMA PŘIPRAVIT'));
});

test('dříve uložené vlastní množství přežije obnovení a export, ale nepřejde na jinou dávku', () => {
  const selected = recipe('testoviny');
  const item = shoppingList({ [selected.id]: {} }).find((item) => item.name === 'Kyselé okurky');
  const raw = {
    version: 1,
    amounts: { [item.key]: { text: '1 sklenice', signature: item.signature } },
  };
  const restored = restoreState(JSON.parse(JSON.stringify(raw)), catalog.recipes);

  expect(shoppingAmount(item, restored.amounts)).toBe('1 sklenice (vlastní)');
  expect(shoppingText([item], {}, restored.amounts)).toMatch(/1 sklenice \(vlastní\)/);
  const changed = shoppingList({ [selected.id]: { factor: 2 } }).find(
    (item) => item.name === 'Kyselé okurky',
  );

  expect(shoppingAmount(changed, restored.amounts)).toBe('8 ks');
});
