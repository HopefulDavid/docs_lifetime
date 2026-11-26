import { expect, test } from 'bun:test';
import { readIngredients } from '../scripts/docset/ingredients.js';
import { parseRecipe } from '../scripts/docset/recipe.js';
import { repositoryRoot } from './fixtures/directories.js';

const { categories } = readIngredients(repositoryRoot);
const parse = (content) => parseRecipe(content, 'recept.md', categories);

const row = '| Máslo | 10 g | — |';
const source = `# Recept

## Ingredience

| Surovina | Množství | Upřesnění |
|---|---|---|
${row}

## Postup

### 1. Příprava

- Rozpusťte máslo.
`;

const video = '- Soubor: [Ukázka](../../media/videos/ukazka.mp4)';
const withVideo = (items) =>
  source.replace('## Ingredience', `## Video postup\n\n${items}\n\n## Ingredience`);
const withRows = (rows) => source.replace(row, rows);

test('načte surovinu, skupinu a krok', () => {
  expect(parse(source)).toEqual({
    ingredients: [
      {
        id: 'zaklad-maslo',
        group: 'zaklad',
        options: [{ name: 'Máslo', category: 'Mléčné výrobky a vejce' }],
        quantity: '10 g',
        note: '',
        optional: false,
      },
    ],
    groups: [{ id: 'zaklad', title: 'Základ', optional: false }],
    steps: [{ number: 1, title: 'Příprava' }],
  });
});

test('načte alternativy, volitelnou surovinu a volitelnou část s krokem', () => {
  const rows = `| Mango nebo Broskev | 1 ks | zralé; volitelné |

### Příloha (volitelné)

| Surovina | Množství | Upřesnění |
|---|---|---|
| Chléb | dle chuti | — |`;
  const step = '\n### 2. Příloha\n\n<!-- recipe-group: Příloha -->\n\n- Nakrájejte chléb.\n';
  const recipe = parse(withRows(rows) + step);

  expect(recipe.ingredients[0].options.map(({ name }) => name)).toEqual(['Mango', 'Broskev']);
  expect(recipe.ingredients[0].optional).toBe(true);
  expect(recipe.groups[1]).toEqual({ id: 'g-priloha', title: 'Příloha', optional: true });
  expect(recipe.steps[1].optionalGroup).toBe('g-priloha');
});

test('číslovaný nadpis mimo postup není krok', () => {
  const recipe = parse(`${source}\n## Poznámky\n\n### 1. Další tip\n\n- Nejde o krok.\n`);

  expect(recipe.steps).toHaveLength(1);
});

test('načte zdrojové video', () => {
  expect(parse(withVideo(video)).sourceVideo).toEqual({
    title: 'Ukázka',
    file: '../../media/videos/ukazka.mp4',
  });
});

test.each([
  ['druhý hlavní nadpis', `${source}\n# Druhý recept\n`, 'právě jeden hlavní nadpis'],
  ['bez surovin', source.replace('## Ingredience', '## Poznámky'), 'chybí sekce Ingredience'],
  ['bez postupu', source.replace('## Postup', '## Poznámky'), 'chybí sekce Postup'],
  ['opakovaná sekce', `${source}\n## Postup\n`, 'pouze jednou'],
  ['číslování od dvojky', source.replace('1. Příprava', '2. Příprava'), 'od 1'],
  ['krok bez činnosti', source.replace('- Rozpusťte máslo.', ''), 'žádný obsah'],
  ['krok neznámé části', `${source}<!-- recipe-group: Cizí -->\n`, 'neznámou volitelnou část'],
  ['prázdné video', withVideo(''), 'musí uvádět položku Soubor'],
  ['jiná položka videa', withVideo('- Video: [A](a.mp4)'), 'musí mít tvar'],
  ['dvě videa', withVideo(`${video}\n${video}`), 'pouze jeden Soubor'],
  ['video mimo repozitář', withVideo('- Soubor: [A](https://a.cz/a.mp4)'), 'relativní cesta'],
  ['video v jiném formátu', withVideo('- Soubor: [A](a.mov)'), 'relativní cesta'],
  ['neznámá surovina', withRows('| Neznámá | 1 ks | — |'), 'neznámá surovina'],
  ['nepřesný název', withRows('| maslo | 1 ks | — |'), "platí přesný název 'Máslo'"],
  ['opakovaná alternativa', withRows('| Máslo nebo Máslo | 1 g | — |'), 'opakovaná alternativa'],
  ['opakovaná surovina', withRows(`${row}\n${row}`), 'duplicitní surovina'],
  ['neznámá jednotka', withRows('| Máslo | 3 hrudky | — |'), "množství '3 hrudky'"],
  ['bez úvodního svislítka', withRows('Máslo | 10 g | — |'), 'začínat i končit'],
  ['bez závěrečného svislítka', withRows('| Máslo | 10 g | —'), 'začínat i končit'],
  ['bez sloupce', withRows('| Máslo | 10 g |'), 'neúplný řádek'],
  ['bez oddělovače', source.replace('|---|---|---|\n', ''), 'oddělovací řádek'],
  ['bez hlavičky', source.replace(/\| Surovina.+\n.+\n/, ''), 'chybí hlavička'],
  ['tabulka bez surovin', withRows(''), 'alespoň jednu surovinu'],
  ['surovina v odrážce', withRows(`${row}\n\n* Cukr`), 'musí být v tabulce'],
  ['text mezi surovinami', withRows(`${row}\n\nPoznámka.`), 'mimo tabulku'],
  ['skupina bez tabulky', withRows(`${row}\n\n### Příloha (volitelné)`), 'nemá žádnou tabulku'],
])('odmítne recept: %s', (_name, content, message) => {
  expect(() => parse(content)).toThrow(/^recept\.md:\d+: /);
  expect(() => parse(content)).toThrow(message);
});
