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

const withSource = (items) =>
  source.replace('## Ingredience', `## Video postup\n\n${items}\n\n## Ingredience`);
const sourceItems = `- Soubor: [Ukázka](../../media/videos/ukazka.mp4)`;

test('parser přečte lokální zdrojové video', () => {
  const recipe = parseRecipeContent(withSource(sourceItems), 'test.md');

  assert.deepEqual(recipe.sourceVideo, {
    title: 'Ukázka',
    file: '../../media/videos/ukazka.mp4',
  });
});

test('recept bez sekce zdroje nemá pole sourceVideo', () => {
  assert.equal(Object.hasOwn(parseRecipeContent(source, 'test.md'), 'sourceVideo'), false);
});

const invalidRecipes = [
  {
    name: 'zdrojové video bez položky Soubor',
    content: withSource(''),
    error: /musí uvádět položku Soubor/,
  },
  {
    name: 'neznámá položka zdrojového videa',
    content: withSource('- Video: [Ukázka](https://example.com/ukazka.mp4)'),
    error: /neznámá položka 'Video'/,
  },
  {
    name: 'opakovaná sekce zdrojového videa',
    content: withSource(sourceItems).replace('## Postup', '## Video postup\n\n## Postup'),
    error: /pouze jednou/,
  },
  {
    name: 'položka zdroje bez odkazu',
    content: withSource('- Soubor: ../../media/videos/ukazka.mp4'),
    error: /musí mít tvar/,
  },
  {
    name: 'kopie videa mimo repozitář',
    content: withSource('- Soubor: [Kopie](https://example.com/ukazka.mp4)'),
    error: /relativní cesta k vlastní kopii/,
  },
  {
    name: 'kopie videa v nepodporovaném formátu',
    content: withSource('- Soubor: [Kopie](../../media/videos/ukazka.mov)'),
    error: /relativní cesta k vlastní kopii/,
  },
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
