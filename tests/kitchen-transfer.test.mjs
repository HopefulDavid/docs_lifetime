import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { createContentFiles } from '../scripts/generate-docs.js';
import {
  buildShoppingList,
  recipeSettings,
  restoreState,
} from '../templates/kitchen/public/kitchen-core.mjs';
import {
  exportShopping,
  importShopping,
  previewShoppingImport,
} from '../templates/kitchen/public/kitchen-transfer.mjs';

const catalog = JSON.parse(createContentFiles().get('data/recipes.json'));
const pasta = catalog.recipes.find((recipe) => recipe.id.endsWith('/sunkofleky'));
const sauce = catalog.recipes.find((recipe) => recipe.id.endsWith('/rajska-omacka'));
const selected = (...recipes) => ({
  ...restoreState(null, catalog.recipes),
  selections: Object.fromEntries(recipes.map((recipe) => [recipe.id, recipeSettings(recipe)])),
});
const items = (state) => buildShoppingList(catalog.recipes, state.selections, catalog.departments);
const codeFor = (payload) => `NK1j.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
const payloadFor = (recipe) => ({
  version: 1,
  recipes: [{ id: recipe.id, revision: recipe.revision, factor: 1, choices: {}, enabled: {} }],
  checked: [],
  amounts: [],
});

test('export a odkaz přenesou dávku, volby, hotové a vlastní množství bez filtrů a vaření', async () => {
  const state = selected(sauce, pasta);
  state.selections[sauce.id].factor = 2;
  const alternative = sauce.ingredients.find((item) => item.options.length > 1);
  state.selections[sauce.id].choices[alternative.id] = 1;
  const optional = sauce.groups.find((group) => group.optional);
  state.selections[sauce.id].enabled[optional.id] = true;
  const unknown = items(state).find((item) => item.text === 'neuvedeno');
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

test('nekomprimovaný formát má stejnou validaci a neplatný vstup nic nepřepisuje', async () => {
  const payload = payloadFor(pasta);
  assert.equal(Object.keys((await importShopping(codeFor(payload), catalog)).selections).length, 1);
  for (const bad of [
    '',
    'běžný seznam',
    'NK1g.xxx',
    'NK2g.abc',
    codeFor(null),
    codeFor({ ...payload, version: 9 }),
    codeFor({ ...payload, recipes: [...payload.recipes, ...payload.recipes] }),
  ]) {
    await assert.rejects(importShopping(bad, catalog));
  }
  assert.deepEqual(payload, payloadFor(pasta));
});

test('odmítne jinou revizi, neznámý recept, chybné volby a cizí suroviny', async () => {
  for (const patch of [
    { revision: 'stará' },
    { id: 'food/unknown/recipe' },
    { factor: 999 },
    { choices: { cizi: 0 } },
    { enabled: { cizi: true } },
    { enabled: null },
  ]) {
    const payload = payloadFor(pasta);
    Object.assign(payload.recipes[0], patch);
    await assert.rejects(importShopping(codeFor(payload), catalog));
  }
  for (const patch of [{ checked: ['cizí'] }, { amounts: [['cizí', '2 ks']] }, { checked: null }]) {
    await assert.rejects(importShopping(codeFor({ ...payloadFor(pasta), ...patch }), catalog));
  }
});

test('import omezí vstup i velikost po rozbalení', async () => {
  await assert.rejects(importShopping('x'.repeat(180001), catalog), /velký/);
  const bomb = `NK1g.${gzipSync(Buffer.from(' '.repeat(140000))).toString('base64url')}`;
  await assert.rejects(importShopping(bomb, catalog), /velký/);
});

test('sloučení zachová hotové od obou lidí a opakování nezdvojuje dávku', () => {
  const a = selected(pasta);
  const b = selected(pasta);
  const list = items(a);
  a.checked[list[0].key] = list[0].signature;
  b.checked[list[1].key] = list[1].signature;
  const before = structuredClone(a);
  const plan = previewShoppingImport(a, b, catalog);
  assert(plan.ready);
  assert.equal(plan.summary.checked, 2);
  assert.equal(plan.state.selections[pasta.id].factor, 1);
  assert.deepEqual(previewShoppingImport(plan.state, b, catalog).state, plan.state);
  assert.deepEqual(a, before);
});

test('různé dávky vyžadují výslovnou volbu a staré potvrzení neplatí pro jiné množství', () => {
  const a = selected(pasta);
  const b = selected(pasta);
  const onion = items(a).find((item) => item.name === 'Cibule');
  a.checked[onion.key] = onion.signature;
  b.selections[pasta.id].factor = 2;
  const unresolved = previewShoppingImport(a, b, catalog);
  assert(!unresolved.ready);
  const plan = previewShoppingImport(a, b, catalog, 'merge', {
    [unresolved.conflicts[0].key]: 'incoming',
  });
  assert(plan.ready);
  assert.equal(plan.state.selections[pasta.id].factor, 2);
  assert.equal(plan.summary.checked, 0);
  assert.equal(plan.summary.recheck, 1);
});

test('nové jídlo v součtu zruší staré odškrtnutí společné suroviny', () => {
  const a = selected(pasta);
  const b = selected(sauce);
  const onion = items(a).find((item) => item.name === 'Cibule');
  a.checked[onion.key] = onion.signature;
  const plan = previewShoppingImport(a, b, catalog);
  assert(plan.ready);
  assert.equal(plan.summary.recipes, 2);
  assert(!plan.state.checked[onion.key]);
  assert.equal(items(plan.state).find((item) => item.name === 'Cibule').amount, '2 ks');
});

test('konflikt vlastních množství neslučuje potvrzení pro jiný nákupní údaj', () => {
  const a = selected(pasta);
  const b = selected(pasta);
  const unknown = items(a).find((item) => item.text === 'neuvedeno');
  a.amounts[unknown.key] = { text: '1 sklenice', signature: unknown.signature };
  b.amounts[unknown.key] = { text: '2 sklenice', signature: unknown.signature };
  a.checked[unknown.key] = unknown.signature;
  const unresolved = previewShoppingImport(a, b, catalog);
  assert(!unresolved.ready);
  const plan = previewShoppingImport(a, b, catalog, 'merge', {
    [unresolved.conflicts[0].key]: 'incoming',
  });
  assert(plan.ready);
  assert.equal(plan.state.amounts[unknown.key].text, '2 sklenice');
  assert(!plan.state.checked[unknown.key]);
});

test('převzetí odstraní vlastní výběr a staré hotové, ale ponechá místní vaření', () => {
  const a = selected(pasta);
  const b = selected(sauce);
  a.cooking[pasta.id] = { step: 1, done: [0], revision: pasta.revision };
  const item = items(a)[0];
  a.checked[item.key] = item.signature;
  const plan = previewShoppingImport(a, b, catalog, 'replace');
  assert(plan.ready);
  assert.deepEqual(plan.state.selections, b.selections);
  assert.deepEqual(plan.state.checked, {});
  assert.deepEqual(plan.state.cooking, a.cooking);
});
