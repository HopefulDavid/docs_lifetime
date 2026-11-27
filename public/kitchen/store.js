import { buildShoppingList, pruneShoppingState, restoreState } from './core.js';

/** Kořen webu. Je součástí klíče úložiště, proto jeho změna odpojí uložené výběry čtenářů. */
export const base = new URL('../../', import.meta.url);
const storageKey = `kitchen-plan-v1:${base.pathname}`;

/** Katalog a stav nákupu. Přiřazuje je pouze openStore, ostatní moduly mění jen obsah stavu. */
export let catalog;
export let state;
export let storageAvailable = true;
export let storageMessage = 'Výběr se ukládá jen v tomto prohlížeči.';

const saveListeners = [];

export const url = (path) => new URL(path, base).href;
export const selected = (recipe) => Object.hasOwn(state.selections, recipe.id);
export const isPrepared = (item) => state.checked[item.key] === item.signature;
export const selectedRecipes = () => catalog.recipes.filter(selected);
export const shoppingItems = () =>
  buildShoppingList(catalog.recipes, state.selections, catalog.departments);

/** Zaregistruje překreslení po každém uložení stavu. */
export function onSave(listener) {
  saveListeners.push(listener);
}

/** Uloží stav bez potvrzení, která už neodpovídají nákupu. */
export function save() {
  pruneShoppingState(state, shoppingItems());
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    storageAvailable = false;
    storageMessage =
      'Před zavřením je potřeba použít Export nákupu, protože ukládání není dostupné.';
  }
  for (const listener of saveListeners) listener();
}

/** Načte katalog a uložený stav. Vrátí, zda změna receptu zrušila rozvařený postup. */
export async function openStore() {
  const response = await fetch(url('data/recipes.json'));
  if (!response.ok) throw new Error(`Katalog receptů: HTTP ${response.status}`);
  catalog = await response.json();
  if (catalog.version !== 1 || !Array.isArray(catalog.recipes))
    throw new Error('Nepodporovaný katalog receptů');
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    storageMessage = 'Předchozí výběr nelze načíst, ale recepty lze vybrat znovu.';
  }
  state = restoreState(saved, catalog.recipes);
  return catalog.recipes.some(({ id }) => saved?.cooking?.[id] !== undefined && !state.cooking[id]);
}
