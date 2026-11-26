import { readIngredients } from '../../scripts/docset/ingredients.js';
import { parseRecipe } from '../../scripts/docset/recipe.js';
import { buildShoppingList } from '../../templates/life/public/kitchen/core.js';
import { repositoryRoot } from './directories.js';

const table = (rows) =>
  ['| Surovina | Množství | Upřesnění |', '|---|---|---|', ...rows.map((row) => `| ${row} |`)].join(
    '\n',
  );

// Vlastní recepty oddělují testy výpočtů od skutečné sbírky, kterou mění její správce.
const sources = {
  testoviny: `# Testoviny

## Ingredience

${table([
  'Cibule | 1 ks | —',
  'Vejce | 2 ks | —',
  'Máslo | 1 lžíce | —',
  'Kyselé okurky | 4 ks | k podávání',
  'Pepř mletý | dle chuti | —',
])}

## Postup

### 1. Vaření

- Uvařte.

### 2. Zapékání

- Zapečte.

### 3. Podávání

- Podávejte.
`,
  omacka: `# Omáčka

## Ingredience

${table(['Cibule | 1 ks | —', 'Vejce | 1 ks | —', 'Máslo | 60 g | —'])}

### Příloha (volitelné)

${table(['Houskový knedlík nebo Těstoviny | neuvedeno | k podávání'])}

## Postup

### 1. Základ

- Opečte.

### 2. Příloha

<!-- recipe-group: Příloha -->

- Uvařte.
`,
  kari: `# Kari

## Ingredience

${table(['Mango nebo Broskev | 1 ks | —'])}

## Postup

### 1. Vaření

- Uvařte.
`,
  kava: `# Káva

## Ingredience

${table(['Káva | 30 g | —', 'Voda | 0,5 l | —', 'Led | 4–5 ks | do sklenice, volitelné'])}

## Postup

### 1. Příprava

- Zalijte.
`,
  jednotky: `# Jednotky

## Ingredience

${table([
  'Vývar | 2,5–3 l | —',
  'Rýže | 2 sáčky | —',
  'Rozmarýn | 1–2 snítky | —',
  'Zelenina | 1 porce | —',
  'Koriandr | 1 svazek | —',
  'Mražený špenát | 1 balení | —',
])}

## Postup

### 1. Vaření

- Uvařte.
`,
};

const { departments, categories } = readIngredients(repositoryRoot);

/** Katalog ve stejné podobě, jakou prohlížeč načítá z data/recipes.json. */
export const catalog = {
  version: 1,
  departments,
  recipes: Object.entries(sources).map(([slug, content]) => ({
    id: `food/europe/czech/main-dishes/${slug}`,
    title: content.match(/^# (.+)$/m)[1],
    revision: `revize-${slug}`,
    ...parseRecipe(content, `${slug}.md`, categories),
  })),
};

/** Vrátí samostatnou kopii receptu, kterou smí test změnit. */
export function recipe(slug) {
  return structuredClone(catalog.recipes.find(({ id }) => id.endsWith(`/${slug}`)));
}

export function shoppingList(selections) {
  return buildShoppingList(catalog.recipes, selections, departments);
}
