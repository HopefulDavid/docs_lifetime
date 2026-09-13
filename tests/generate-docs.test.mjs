import assert from 'node:assert/strict';
import { mkdirSync, existsSync, renameSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { repositoryRoot } from './fixtures/repository.mjs';
import { createDocsetFixture, runGenerator } from './fixtures/docset.mjs';
const docfx = JSON.parse(readFileSync(path.join(repositoryRoot, 'docfx.json'), 'utf8'));

test('DocFX používá české rozhraní bez editačních odkazů', () => {
  const customTemplate = docfx.build.template.at(-1);
  const tokens = JSON.parse(
    readFileSync(path.join(repositoryRoot, customTemplate, 'token.json'), 'utf8'),
  );

  assert.equal(docfx.build.globalMetadata._lang, 'cs');
  assert.equal(docfx.build.globalMetadata._disableContribution, true);
  assert.equal(tokens.inThisArticle, 'V tomto článku');
  assert.equal(tokens.improveThisDoc, 'Upravit tuto stránku');
});

test('odmítne recept bez hlavního nadpisu a vypíše jeho cestu', (context) => {
  const fixtureRoot = createDocsetFixture(context);
  const relativePath = 'food/europe/czech/main-dishes/bez-nadpisu.md';

  writeFileSync(path.join(fixtureRoot, relativePath), 'Recept bez hlavního nadpisu.\n', 'utf8');

  const result = runGenerator(fixtureRoot, { check: true });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, new RegExp(`${escapeRegExp(relativePath)}: chybí hlavní nadpis`));
});

test('odmítne recept mimo podporovanou adresářovou strukturu', (context) => {
  const fixtureRoot = createDocsetFixture(context);
  const relativePath = 'food/neplatna-cesta.md';

  writeFileSync(path.join(fixtureRoot, relativePath), '# Neplatná cesta\n', 'utf8');

  const result = runGenerator(fixtureRoot, { check: true });

  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    new RegExp(`${escapeRegExp(relativePath)}: cesta neodpovídá očekávané struktuře`),
  );
});

test('vadný recept nesmí při generování přepsat zdroje ani rozpracovaný katalog', (context) => {
  const fixtureRoot = createDocsetFixture(context);
  assert.equal(runGenerator(fixtureRoot).status, 0);
  const home = readFileSync(path.join(fixtureRoot, '_generated/index.md'), 'utf8');
  const relativePath = 'food/europe/czech/main-dishes/vadny.md';
  const invalid = '# Vadný recept\n\n## Ingredience\n\n- Máslo\n';
  writeFileSync(path.join(fixtureRoot, relativePath), invalid);
  const result = runGenerator(fixtureRoot);

  assert.equal(result.status, 1);
  assert.equal(readFileSync(path.join(fixtureRoot, '_generated/index.md'), 'utf8'), home);
  assert.equal(readFileSync(path.join(fixtureRoot, relativePath), 'utf8'), invalid);
});

test('obecný návod nevstoupí do receptů a generované přehledy i revize pocházejí ze zdroje', (context) => {
  const fixtureRoot = createDocsetFixture(context);
  const guide = '# Obecný návod\n\nText bez ingrediencí a vaření.\n';
  writeFileSync(path.join(fixtureRoot, 'pruvodce.md'), guide);
  assert.equal(runGenerator(fixtureRoot).status, 0);
  const catalog = () =>
    JSON.parse(readFileSync(path.join(fixtureRoot, '_generated/data/recipes.json'), 'utf8'));
  const before = catalog();

  assert(!before.recipes.some((item) => item.id === 'pruvodce'));
  assert.equal(readFileSync(path.join(fixtureRoot, 'pruvodce.md'), 'utf8'), guide);
  const original = before.recipes.find((item) => item.preparation);

  assert(original, 'sbírka má alespoň jeden recept s přípravou předem');
  const sourcePath = path.join(fixtureRoot, original.relPath);
  writeFileSync(
    sourcePath,
    readFileSync(sourcePath, 'utf8').replace(original.preparation, 'Připravte si vše den předem.'),
  );
  assert.equal(runGenerator(fixtureRoot).status, 0);
  const updated = catalog().recipes.find((item) => item.id === original.id);

  assert.notEqual(updated.revision, original.revision);
  assert.equal(updated.preparation, 'Připravte si vše den předem.');
  const overview = readFileSync(path.join(fixtureRoot, '_generated/food/index.md'), 'utf8');
  assert.match(overview, /content-overview/);
  assert(!overview.includes('| Recept |'), 'mobilní přehled nepoužívá širokou tabulku');
  assert.equal(
    runGenerator(fixtureRoot, { check: true }).status,
    0,
    'opakované generování je deterministické',
  );
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('kontrola chybějícího docsetu nic nevytvoří a kontrola poškozeného changelogu jej neopraví', (context) => {
  const root = createDocsetFixture(context);
  assert.equal(runGenerator(root, { check: true }).status, 1);
  assert(!existsSync(path.join(root, '_generated')));
  assert.equal(runGenerator(root).status, 0);
  const file = path.join(root, '_generated/changelog.md');
  writeFileSync(file, 'ruční zásah do výstupu');
  const result = runGenerator(root, { check: true });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /_generated\/changelog.md/);
  assert.equal(readFileSync(file, 'utf8'), 'ruční zásah do výstupu');
  assert.equal(runGenerator(root).status, 0);
  assert.equal(runGenerator(root, { check: true }).status, 0);
  const canonical = readFileSync(file, 'utf8');
  writeFileSync(file, canonical.replace(/\n/g, '\r\n'));
  assert.equal(
    runGenerator(root, { check: true }).status,
    1,
    'kontrolní součet se vztahuje k přesným bajtům výstupu',
  );
  assert.equal(runGenerator(root).status, 0);
  assert.equal(readFileSync(file, 'utf8'), canonical);
});

const newRecipe = `# Zkušební recept

Jednoduchý obsah pro ověření automatizace.

## Ingredience

| Surovina | Množství | Upřesnění |
|---|---|---|
| Cibule | 2 ks | — |

## Postup

### 1. Příprava

- Nakrájejte cibuli.
`;

test('nový recept vytvoří katalog, kopii, všechny přehledy a TOC; přejmenování a odstranění uklidí staré výstupy', (context) => {
  const root = createDocsetFixture(context);
  const source = 'food/europe/france/soups/zkusebni.md';
  const write = (file, content) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  write(source, newRecipe);
  assert.equal(runGenerator(root).status, 0);
  const read = (file) => readFileSync(path.join(root, '_generated', file), 'utf8');
  assert.equal(read(source), newRecipe);
  assert.equal(readFileSync(path.join(root, source), 'utf8'), newRecipe);
  assert(read('data/recipes.json').includes('Zkušební recept'));
  for (const file of [
    'kuchyne/index.md',
    'food/index.md',
    'food/europe/index.md',
    'food/europe/france/index.md',
    'food/toc.yml',
  ])
    assert(read(file).includes('zkusebni.md'), file);
  assert(!read('index.md').includes('kitchen-catalog'));
  assert(read('index.md').includes('kuchyne/index.md'));
  assert.match(read('toc.yml'), /^# Generováno/);
  assert.equal(runGenerator(root, { check: true }).status, 0);
  const renamed = source.replace('zkusebni', 'prejmenovany');
  renameSync(path.join(root, source), path.join(root, renamed));
  const before = read('data/recipes.json');
  const check = runGenerator(root, { check: true });

  assert.equal(check.status, 1);
  assert.equal(read('data/recipes.json'), before, 'check nezapisuje');
  assert(existsSync(path.join(root, '_generated', source)), 'check nemaže');
  assert.equal(runGenerator(root).status, 0);
  assert(!existsSync(path.join(root, '_generated', source)));
  assert(read('data/recipes.json').includes('prejmenovany'));
  rmSync(path.join(root, renamed));
  write('_generated/nahodny-stary.html', 'stary');
  assert.equal(runGenerator(root).status, 0);
  assert(!existsSync(path.join(root, '_generated/food/europe/france/index.md')));
  assert(!existsSync(path.join(root, '_generated/nahodny-stary.html')));
  assert(!read('food/toc.yml').includes('france'));
  assert.equal(runGenerator(root, { check: true }).status, 0);
});

test('odmítne duplicitní surovinu v odděleních i neznámou kategorii před zápisem', (context) => {
  const root = createDocsetFixture(context);
  assert.equal(runGenerator(root).status, 0);
  const original = readFileSync(path.join(root, '_generated/data/recipes.json'), 'utf8');
  const dictionaryPath = path.join(root, 'data/ingredients.json');
  const dictionary = JSON.parse(readFileSync(dictionaryPath, 'utf8'));
  dictionary.Koření.push('Cibule');
  writeFileSync(dictionaryPath, JSON.stringify(dictionary));
  let result = runGenerator(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /data\/ingredients.json: duplicitní surovina/);
  dictionary.Koření.pop();
  writeFileSync(dictionaryPath, JSON.stringify(dictionary));
  mkdirSync(path.join(root, 'food/europe/czech/preklep'), { recursive: true });
  writeFileSync(path.join(root, 'food/europe/czech/preklep/zkouska.md'), newRecipe);
  result = runGenerator(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /data\/taxonomy.json/);
  assert.equal(readFileSync(path.join(root, '_generated/data/recipes.json'), 'utf8'), original);
  rmSync(path.join(root, 'food/europe/czech/preklep'), { recursive: true });
  const taxonomyPath = path.join(root, 'data/taxonomy.json');
  const taxonomy = JSON.parse(readFileSync(taxonomyPath, 'utf8'));
  delete taxonomy.continents.universal;
  writeFileSync(taxonomyPath, JSON.stringify(taxonomy));
  result = runGenerator(root);
  assert.equal(result.status, 1, 'také univerzální oblast musí být v taxonomii');
  assert.match(result.stderr, /data\/taxonomy.json/);
  assert.equal(readFileSync(path.join(root, '_generated/data/recipes.json'), 'utf8'), original);
});

test('ruční index ve zdrojích se neignoruje ani nepřepíše', (context) => {
  const root = createDocsetFixture(context);
  const manual = '# Ruční obsah\n';
  writeFileSync(path.join(root, 'food/index.md'), manual);
  const result = runGenerator(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /index.md je vyhrazený/);
  assert.equal(readFileSync(path.join(root, 'food/index.md'), 'utf8'), manual);
  assert(!existsSync(path.join(root, '_generated')));
});

test('nová země a surovina potřebují jen ruční slovníky; prázdné sekce nezanechají recepty ani oblasti', (context) => {
  const root = createDocsetFixture(context);
  const relative = 'food/europe/austria/soups/zkouska.md';
  mkdirSync(path.join(root, path.dirname(relative)), { recursive: true });
  writeFileSync(path.join(root, relative), newRecipe.replace('Cibule', 'Testovací zelenina'));
  const taxonomyPath = path.join(root, 'data/taxonomy.json');
  const taxonomy = JSON.parse(readFileSync(taxonomyPath, 'utf8'));
  taxonomy.countries.austria = { title: 'Rakousko', continent: 'europe' };
  writeFileSync(taxonomyPath, JSON.stringify(taxonomy));
  assert.match(runGenerator(root).stderr, /neznámá surovina 'Testovací zelenina'/);
  const ingredientsPath = path.join(root, 'data/ingredients.json');
  const dictionary = JSON.parse(readFileSync(ingredientsPath, 'utf8'));
  dictionary['Zelenina, ovoce a bylinky'].push('Testovací zelenina');
  writeFileSync(ingredientsPath, JSON.stringify(dictionary));
  assert.equal(runGenerator(root).status, 0);
  const catalog = () =>
    JSON.parse(readFileSync(path.join(root, '_generated/data/recipes.json'), 'utf8'));
  const added = catalog().recipes.find((item) => item.relPath === relative);

  assert.equal(added.origin, 'Evropa, Rakousko');
  assert.equal(added.ingredients[0].options[0].category, 'Zelenina, ovoce a bylinky');
  assert(existsSync(path.join(root, '_generated/food/europe/austria/index.md')));
  rmSync(path.join(root, 'food'), { recursive: true });
  rmSync(path.join(root, 'drink'), { recursive: true });
  assert.equal(runGenerator(root).status, 0);
  assert.equal(catalog().recipes.length, 0);
  assert(!existsSync(path.join(root, '_generated/food/europe/austria/index.md')));
  assert.equal(runGenerator(root, { check: true }).status, 0);
});

test('neuvedeno je lokalizovaný warning, samostatná kontrola nic nepíše a obecný návod není recept', (context) => {
  const root = createDocsetFixture(context);
  writeFileSync(
    path.join(root, 'pruvodce.md'),
    '# Údržba domácnosti\n\nMnožství neuvedeno; tento návod nemá ingredience.\n',
  );
  writeFileSync(
    path.join(root, 'food/europe/czech/main-dishes/zkouska.md'),
    newRecipe.replace('2 ks', 'neuvedeno'),
  );
  const result = runGenerator(root, {
    validateOnly: true,
    environment: { GITHUB_ACTIONS: 'true' },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stderr,
    /WARNING food\/europe\/czech\/main-dishes\/zkouska.md:9 \[RECIPE_QUANTITY_MISSING\]/,
  );
  assert.match(result.stdout, /::warning file=food\/europe\/czech\/main-dishes\/zkouska.md,line=9/);
  assert(!result.stderr.includes('pruvodce.md'));
  assert(!existsSync(path.join(root, '_generated')));
  assert.equal(runGenerator(root).status, 0);
  const report = JSON.parse(
    readFileSync(path.join(root, '_generated/content-report.json'), 'utf8'),
  );
  assert(report.warnings.some((warning) => warning.ingredient === 'Cibule' && warning.line === 9));
  for (const quantity of ['2 ks', 'dle chuti']) {
    writeFileSync(
      path.join(root, 'food/europe/czech/main-dishes/zkouska.md'),
      newRecipe.replace('2 ks', quantity),
    );
    assert.equal(runGenerator(root).status, 0);
    const updated = JSON.parse(
      readFileSync(path.join(root, '_generated/content-report.json'), 'utf8'),
    );
    assert(
      !updated.warnings.some((warning) => warning.file.endsWith('/zkouska.md')),
      'varování zmizí po doplnění množství',
    );
  }
});

const invalidIngredientTables = [
  ['chybí úvodní svislítko', newRecipe.replace('| Cibule | 2 ks | — |', 'Cibule | 2 ks | — |')],
  ['chybí závěrečné svislítko', newRecipe.replace('| Cibule | 2 ks | — |', '| Cibule | 2 ks | —')],
  ['chybí oddělovací řádek', newRecipe.replace('|---|---|---|\n', '')],
  ['chybí hlavička', newRecipe.replace('| Surovina | Množství | Upřesnění |\n|---|---|---|\n', '')],
  ['název není kanonický', newRecipe.replace('Cibule', 'cibule')],
  ['surovina zůstala v odrážce', newRecipe.replace('## Postup', '* Zapomenutý cukr\n\n## Postup')],
  [
    'příloha nemá suroviny',
    newRecipe.replace('## Postup', '### Zapomenutá příloha (volitelné)\n\n## Postup'),
  ],
];

test('neúplné řádky a zapomenuté suroviny nezmění platný docset', async (context) => {
  const root = createDocsetFixture(context);
  const file = path.join(root, 'food/europe/czech/main-dishes/zkouska.md');
  assert.equal(runGenerator(root).status, 0);
  const original = readFileSync(path.join(root, '_generated/manifest.json'), 'utf8');

  for (const [name, content] of invalidIngredientTables) {
    await context.test(name, () => {
      // Každá varianta nahrazuje celý vstup; společný platný výstup se nesmí změnit.
      writeFileSync(file, content);

      const result = runGenerator(root);

      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /zkouska.md:\d+:/);
      assert.equal(readFileSync(path.join(root, '_generated/manifest.json'), 'utf8'), original);
    });
  }
});
