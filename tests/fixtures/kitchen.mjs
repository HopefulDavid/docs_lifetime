import assert from 'node:assert/strict';
import { createContentFiles } from '../../scripts/generate-docs.js';
import { buildShoppingList } from '../../templates/life/public/kitchen-core.mjs';

/** Připraví nový katalog ze skutečných zdrojů bez závislosti na _generated. */
export function createKitchenFixture() {
  const catalog = JSON.parse(createContentFiles().get('data/recipes.json'));
  return {
    catalog,
    recipe(slug) {
      const matches = catalog.recipes.filter((recipe) => recipe.id.endsWith(`/${slug}`));
      assert.equal(matches.length, 1, `Fixture musí obsahovat právě jeden recept: ${slug}`);
      return structuredClone(matches[0]);
    },
    shoppingList(selections) {
      return buildShoppingList(catalog.recipes, selections, catalog.departments);
    },
  };
}
