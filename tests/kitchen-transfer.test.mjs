import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { createKitchenFixture } from './fixtures/kitchen.mjs';
import { recipeSettings, restoreState } from '../templates/life/public/kitchen-core.mjs';
import {
  exportShopping,
  importShopping,
  previewShoppingImport,
} from '../templates/life/public/kitchen-transfer.mjs';

const { catalog, recipe, shoppingList } = createKitchenFixture();
const pasta = recipe('sunkofleky');
const sauce = recipe('rajska-omacka');
const createSelection = (...recipes) => ({
  ...restoreState(null, catalog.recipes),
  selections: Object.fromEntries(recipes.map((recipe) => [recipe.id, recipeSettings(recipe)])),
});
const items = (state) => shoppingList(state.selections);
const plainCodeFor = (payload) =>
  `NK1j.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
const transferPayloadFor = (recipe) => ({
  version: 1,
  recipes: [{ id: recipe.id, revision: recipe.revision, factor: 1, choices: {}, enabled: {} }],
  checked: [],
  amounts: [],
});

test('export a odkaz přenesou dávku, volby, hotové a vlastní množství bez filtrů a vaření', async () => {
  const state = createSelection(sauce, pasta);
  state.selections[sauce.id].factor = 2;
  const alternative = sauce.ingredients.find((item) => item.options.length > 1);
  state.selections[sauce.id].choices[alternative.id] = 1;
  const optional = sauce.groups.find((group) => group.optional);
  state.selections[sauce.id].enabled[optional.id] = true;
  const unknown = items(state).find((item) => item.name === 'Pepř mletý');
  state.amounts[unknown.key] = { text: '2 balení po 150 g', signature: unknown.signature };
  state.checked[unknown.key] = unknown.signature;
  state.cooking[pasta.id] = { step: 2, done: [0, 1], revision: pasta.revision };
  const original = structuredClone(state);

  const code = await exportShopping(state, catalog);

  assert(code.startsWith('NK1g.'));

  const restored = await importShopping(
    `https://example.invalid/docs_lifetime/nakup.html#nakup=${code}`,
    catalog,
  );

  assert.deepEqual(restored, { ...state, cooking: {} });
  assert.deepEqual(state, original, 'export nemění nákup');
});

test('nekomprimovaný formát načte nákup a nezmění vstupní data', async () => {
  const payload = transferPayloadFor(pasta);

  const imported = await importShopping(plainCodeFor(payload), catalog);
  assert.equal(Object.keys(imported.selections).length, 1);
  assert.deepEqual(payload, transferPayloadFor(pasta));
});

const invalidCodes = [
  ['prázdný vstup', ''],
  ['běžný seznam místo kódu', 'běžný seznam'],
  ['poškozená komprese', 'NK1g.xxx'],
  ['neznámá verze obálky', 'NK2g.abc'],
  ['prázdný payload', plainCodeFor(null)],
  ['neznámá verze dat', plainCodeFor({ ...transferPayloadFor(pasta), version: 9 })],
  [
    'opakovaný recept',
    plainCodeFor({
      ...transferPayloadFor(pasta),
      recipes: [...transferPayloadFor(pasta).recipes, ...transferPayloadFor(pasta).recipes],
    }),
  ],
];
for (const [name, code] of invalidCodes) {
  test(`import odmítne: ${name}`, async () => {
    await assert.rejects(importShopping(code, catalog));
  });
}

const invalidRecipeSettings = [
  ['jiná revize', { revision: 'stará' }],
  ['neznámý recept', { id: 'food/unknown/recipe' }],
  ['nepovolená dávka', { factor: 999 }],
  ['cizí alternativa', { choices: { cizi: 0 } }],
  ['cizí příloha', { enabled: { cizi: true } }],
  ['přílohy nemají podobu objektu', { enabled: null }],
];
for (const [name, settings] of invalidRecipeSettings) {
  test(`import odmítne nastavení: ${name}`, async () => {
    const payload = transferPayloadFor(pasta);
    Object.assign(payload.recipes[0], settings);

    await assert.rejects(importShopping(plainCodeFor(payload), catalog));
  });
}

const invalidShoppingItems = [
  ['cizí hotová surovina', { checked: ['cizí'] }],
  ['cizí vlastní množství', { amounts: [['cizí', '2 ks']] }],
  ['hotové položky nemají podobu pole', { checked: null }],
];
for (const [name, items] of invalidShoppingItems) {
  test(`import odmítne nákupní položky: ${name}`, async () => {
    const payload = { ...transferPayloadFor(pasta), ...items };

    await assert.rejects(importShopping(plainCodeFor(payload), catalog));
  });
}

test('import omezí vstup i velikost po rozbalení', async () => {
  await assert.rejects(importShopping('x'.repeat(180001), catalog), /velký/);
  const bomb = `NK1g.${gzipSync(Buffer.from(' '.repeat(140000))).toString('base64url')}`;
  await assert.rejects(importShopping(bomb, catalog), /velký/);
});

test('sloučení zachová hotové od obou lidí a opakování nezdvojuje dávku', () => {
  const local = createSelection(pasta);
  const incoming = createSelection(pasta);
  const list = items(local);
  local.checked[list[0].key] = list[0].signature;
  incoming.checked[list[1].key] = list[1].signature;
  const before = structuredClone(local);

  const plan = previewShoppingImport(local, incoming, catalog);

  assert(plan.ready);
  assert.equal(plan.summary.checked, 2);
  assert.equal(plan.state.selections[pasta.id].factor, 1);
  assert.deepEqual(previewShoppingImport(plan.state, incoming, catalog).state, plan.state);
  assert.deepEqual(local, before);
});

test('různé dávky vyžadují výslovnou volbu a staré potvrzení neplatí pro jiné množství', () => {
  const local = createSelection(pasta);
  const incoming = createSelection(pasta);
  const onion = items(local).find((item) => item.name === 'Cibule');
  local.checked[onion.key] = onion.signature;
  incoming.selections[pasta.id].factor = 2;

  const unresolved = previewShoppingImport(local, incoming, catalog);

  assert(!unresolved.ready);

  const plan = previewShoppingImport(local, incoming, catalog, 'merge', {
    [unresolved.conflicts[0].key]: 'incoming',
  });

  assert(plan.ready);
  assert.equal(plan.state.selections[pasta.id].factor, 2);
  assert.equal(plan.summary.checked, 0);
  assert.equal(plan.summary.recheck, 1);
});

test('nové jídlo v součtu zruší staré odškrtnutí společné suroviny', () => {
  const local = createSelection(pasta);
  const incoming = createSelection(sauce);
  const onion = items(local).find((item) => item.name === 'Cibule');
  local.checked[onion.key] = onion.signature;

  const plan = previewShoppingImport(local, incoming, catalog);

  assert(plan.ready);
  assert.equal(plan.summary.recipes, 2);
  assert(!plan.state.checked[onion.key]);
  assert.equal(items(plan.state).find((item) => item.name === 'Cibule').amount, '2 ks');
});

test('konflikt vlastních množství neslučuje potvrzení pro jiný nákupní údaj', () => {
  const local = createSelection(pasta);
  const incoming = createSelection(pasta);
  const unknown = items(local).find((item) => item.name === 'Pepř mletý');
  local.amounts[unknown.key] = { text: '1 sklenice', signature: unknown.signature };
  incoming.amounts[unknown.key] = { text: '2 sklenice', signature: unknown.signature };
  local.checked[unknown.key] = unknown.signature;

  const unresolved = previewShoppingImport(local, incoming, catalog);

  assert(!unresolved.ready);

  const plan = previewShoppingImport(local, incoming, catalog, 'merge', {
    [unresolved.conflicts[0].key]: 'incoming',
  });

  assert(plan.ready);
  assert.equal(plan.state.amounts[unknown.key].text, '2 sklenice');
  assert(!plan.state.checked[unknown.key]);
});

test('převzetí odstraní vlastní výběr a staré hotové, ale ponechá místní vaření', () => {
  const local = createSelection(pasta);
  const incoming = createSelection(sauce);
  local.cooking[pasta.id] = { step: 1, done: [0], revision: pasta.revision };
  const item = items(local)[0];
  local.checked[item.key] = item.signature;

  const plan = previewShoppingImport(local, incoming, catalog, 'replace');

  assert(plan.ready);
  assert.deepEqual(plan.state.selections, incoming.selections);
  assert.deepEqual(plan.state.checked, {});
  assert.deepEqual(plan.state.cooking, local.cooking);
});
