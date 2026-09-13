import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRecipeContent } from '../scripts/recipe-content.cjs';

const source = `# Recept

## Ingredience

| Surovina | Množství | Upřesnění |
|---|---|---|
| Máslo | 10 g | — |

## Postup

### 1. Příprava

- Rozpusťte máslo.
`;

test('parser načte surovinu a nepovažuje číslovanou poznámku za krok', () => {
  const content = `${source}\n## Poznámky\n\n### 1. Další tip\n\n- Nejde o krok.\n`;

  const recipe = parseRecipeContent(content, 'test.md');

  assert.equal(recipe.ingredients.length, 1);
  assert.equal(recipe.steps.length, 1);
});

const invalidRecipes = [
  {
    name: 'neznámá surovina',
    content: source.replace('Máslo |', 'Neznámá surovina |'),
    error: /neznámá surovina/,
  },
  {
    name: 'číslování nezačíná jedničkou',
    content: source.replace('1. Příprava', '2. Příprava'),
    error: /navazující/,
  },
  {
    name: 'krok nemá činnost',
    content: source.replace('- Rozpusťte máslo.', ''),
    error: /žádný obsah/,
  },
  {
    name: 'chybí sekce Postup',
    content: source.replace('## Postup', '## Poznámky'),
    error: /navazující/,
  },
  {
    name: 'druhý hlavní nadpis',
    content: `${source}\n# Druhý recept\n`,
    error: /právě jeden hlavní/,
  },
];

for (const { name, content, error } of invalidRecipes) {
  test(`parser odmítne: ${name}`, () => {
    assert.throws(() => parseRecipeContent(content, 'test.md'), error);
  });
}
