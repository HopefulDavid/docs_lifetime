import { expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { createContent, writeDocset } from '../scripts/docset/docset.js';
import { repositoryRoot, temporaryDirectory, write } from './fixtures/directories.js';

const recipeFile = 'food/europe/france/soups/cibulacka.md';
const recipe = `# 🧅 Cibulačka

Polévka z cibule.

## Ingredience

| Surovina | Množství | Upřesnění |
|---|---|---|
| Cibule | 2 ks | — |

## Před přípravou

Cibuli oloupejte předem.

## Postup

### 1. Příprava

- Nakrájejte cibuli.
`;

/** Založí projekt se skutečnými slovníky a předanými recepty. */
function createProject(files = { [recipeFile]: recipe }) {
  const root = temporaryDirectory();
  fs.cpSync(path.join(repositoryRoot, 'data'), path.join(root, 'data'), { recursive: true });
  write(root, 'pruvodce.md', '# Průvodce\n');
  for (const [file, content] of Object.entries(files)) write(root, file, content);
  return root;
}

function changeData(root, file, change) {
  const data = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  change(data);
  write(root, file, JSON.stringify(data));
}

const catalogOf = ({ files }) => JSON.parse(files.get('data/recipes.json')).recipes;

test('recept se objeví v katalogu, všech přehledech a navigaci', () => {
  const content = createContent(createProject());

  expect(content.files.get(recipeFile)).toBe(recipe);
  expect(content.files.get('pruvodce.md')).toBe('# Průvodce\n');
  for (const file of [
    'kuchyne/index.md',
    'food/index.md',
    'food/europe/index.md',
    'food/europe/france/index.md',
    'food/toc.yml',
  ])
    expect(content.files.get(file)).toContain('cibulacka.md');
  expect(catalogOf(content)).toMatchObject([
    {
      id: 'food/europe/france/soups/cibulacka',
      title: 'Cibulačka',
      description: 'Polévka z cibule.',
      preparation: 'Cibuli oloupejte předem.',
      origin: 'Evropa, Francie',
      typeLabel: 'Polévky',
      steps: [{ number: 1, title: 'Příprava' }],
    },
  ]);
});

test('revize receptu závisí na obsahu, nikoli na koncích řádků', () => {
  const revision = (content) =>
    catalogOf(createContent(createProject({ [recipeFile]: content })))[0].revision;

  expect(revision(recipe.replaceAll('\n', '\r\n'))).toBe(revision(recipe));
  expect(revision(recipe.replace('předem', 'den předem'))).not.toBe(revision(recipe));
});

test('recept bez původu patří do univerzální oblasti bez stránky země', () => {
  const { files } = createContent(createProject({ 'food/universal/dips/dip.md': recipe }));
  const pages = [...files.keys()].filter((file) => file.startsWith('food/universal/'));

  expect(files.get('food/universal/index.md')).toContain('bez vazby na konkrétní zemi');
  expect(pages.sort()).toEqual(['food/universal/dips/dip.md', 'food/universal/index.md']);
});

test('nová země a surovina potřebují jen doplnění slovníků', () => {
  const root = createProject({
    'food/europe/austria/soups/polevka.md': recipe.replace('Cibule |', 'Nová zelenina |'),
  });
  expect(() => createContent(root)).toThrow('data/taxonomy.json');
  changeData(root, 'data/taxonomy.json', ({ countries }) => {
    countries.austria = { title: 'Rakousko', continent: 'europe' };
  });
  expect(() => createContent(root)).toThrow("neznámá surovina 'Nová zelenina'");
  changeData(root, 'data/ingredients.json', (departments) => {
    departments.Koření.push('Nová zelenina');
  });
  const content = createContent(root);

  expect(catalogOf(content)[0].origin).toBe('Evropa, Rakousko');
  expect(catalogOf(content)[0].ingredients[0].options[0].category).toBe('Koření');
  expect(content.files.has('food/europe/austria/index.md')).toBe(true);
});

test('prázdná sbírka nemá recepty ani stránky oblastí', () => {
  const content = createContent(createProject({}));

  expect(catalogOf(content)).toEqual([]);
  expect(content.files.has('food/europe/index.md')).toBe(false);
});

test('chyby všech receptů se hlásí najednou s cestou', () => {
  const root = createProject({
    'food/neplatna-cesta.md': recipe,
    'food/index.md': '# Ruční přehled\n',
    'food/europe/czech/soups/vadna.md': 'Bez nadpisu.\n',
  });
  const messages = ['food/neplatna-cesta.md: ', 'food/index.md: ', 'soups/vadna.md:1: '];

  for (const message of messages) expect(() => createContent(root)).toThrow(message);
});

test.each([
  ['duplicitní surovina', 'data/ingredients.json', (data) => data.Koření.push('Cibule')],
  ['prázdné oddělení', 'data/ingredients.json', (data) => (data.Nové = [])],
  ['země bez oblasti', 'data/taxonomy.json', (data) => (data.countries.czech.continent = 'mars')],
  ['prázdná skupina', 'data/taxonomy.json', (data) => (data.types = {})],
])('slovník odmítne: %s', (_name, file, change) => {
  const root = createProject();
  changeData(root, file, change);

  expect(() => createContent(root)).toThrow(file);
});

test('neuvedené množství je varování s řádkem, nikoli chyba', () => {
  const root = createProject({ [recipeFile]: recipe.replace('2 ks', 'neuvedeno') });

  expect(createContent(root).warnings).toMatchObject([
    { file: recipeFile, line: 9, code: 'RECIPE_QUANTITY_MISSING' },
  ]);
});

test('média se kopírují beze změny a jiný formát je chyba', () => {
  const root = createProject();
  const video = Buffer.from([0, 255, 13, 10]);
  write(root, 'media/videos/postup.mp4', video);
  expect(createContent(root).files.get('media/videos/postup.mp4')).toEqual(video);
  write(root, 'media/videos/postup.mov', video);

  expect(() => createContent(root)).toThrow('media/videos/postup.mov');
});

test('zápis nahradí celý předchozí výstup', () => {
  const output = path.join(temporaryDirectory(), '_generated');
  writeDocset(output, new Map([['stare/stranka.md', 'stará']]));
  writeDocset(output, new Map([['nove/stranka.md', 'nová']]));

  expect(fs.readdirSync(output)).toEqual(['nove']);
  expect(fs.readFileSync(path.join(output, 'nove/stranka.md'), 'utf8')).toBe('nová');
});

test('oblast s návody vznikne ze záznamu v data/areas.json a složky guides', () => {
  const root = createProject({
    [recipeFile]: recipe,
    'guides/household/prani.md':
      '---\ndescription: "Třídění prádla podle symbolů <40 °C> & barev."\n---\n\n# Praní prádla\n',
  });
  changeData(root, 'data/areas.json', (data) => {
    data.areas.push({
      id: 'household',
      type: 'guides',
      path: 'domacnost',
      title: 'Domácnost',
      intro: 'Běžné práce v domácnosti.',
      icon: 'home',
    });
  });
  const { files } = createContent(root);

  expect(files.get('domacnost/prani.md')).toContain('# Praní prádla');
  expect(files.get('domacnost/index.md')).toContain('- [Praní prádla](prani.md)');
  expect(files.get('domacnost/index.md')).toContain(
    '<span>Třídění prádla podle symbolů &lt;40 °C&gt; &amp; barev.</span>',
  );
  expect(files.get('domacnost/toc.yml')).toContain('"href": "prani.md"');
  expect(files.get('index.md')).toContain('[Domácnost](domacnost/index.md)');
  expect(files.get('index.md')).toContain('1 návod');
  expect(files.get('toc.yml')).toContain('"href": "domacnost/"');
});

test('oblast bez návodů se nezobrazí a návod bez popisu zastaví sestavení', () => {
  const root = createProject();
  changeData(root, 'data/areas.json', (data) => {
    data.areas.push({
      id: 'garden',
      type: 'guides',
      path: 'zahrada',
      title: 'Zahrada',
      intro: 'Péče o zahradu.',
      icon: 'leaf',
    });
  });
  expect(createContent(root).files.get('toc.yml')).not.toContain('zahrada');

  write(root, 'guides/garden/rez.md', '# Řez stromů\n');
  expect(() => createContent(root)).toThrow('guides/garden/rez.md: chybí description v metadatech');
});

test.each(['food', 'drink', 'media', 'public', 'data'])(
  'oblast s návody nesmí použít vyhrazenou cestu %s',
  (reserved) => {
    const root = createProject();
    changeData(root, 'data/areas.json', (data) => {
      data.areas.push({
        id: 'household',
        type: 'guides',
        path: reserved,
        title: 'Domácnost',
        intro: 'Běžné práce v domácnosti.',
        icon: 'home',
      });
    });

    expect(() => createContent(root)).toThrow(`nemůže použít path '${reserved}'`);
  },
);
