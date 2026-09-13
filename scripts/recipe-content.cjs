const departments = require('../data/ingredients.json');
const identifier = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function indexIngredientNames(departments) {
  const names = new Map();
  if (
    !departments ||
    Array.isArray(departments) ||
    typeof departments !== 'object' ||
    !Object.keys(departments).length
  ) {
    throw new Error('data/ingredients.json: slovník musí obsahovat nákupní oddělení');
  }
  const normalizedNames = new Set();
  const normalizedCategories = new Set();
  const validName = (value) =>
    typeof value === 'string' &&
    identifier(value) &&
    value === value.trim() &&
    !/[|<>\r\n\t\u0000-\u001f]/.test(value);
  for (const [category, values] of Object.entries(departments)) {
    if (!validName(category) || !Array.isArray(values) || !values.length) {
      throw new Error(`data/ingredients.json: neplatné oddělení '${category}'`);
    }
    if (normalizedCategories.has(identifier(category)))
      throw new Error(`data/ingredients.json: duplicitní oddělení '${category}'`);
    normalizedCategories.add(identifier(category));
    for (const name of values) {
      if (!validName(name) || name.includes(' nebo ')) {
        throw new Error(`data/ingredients.json: neplatný název suroviny v '${category}'`);
      }
      if (normalizedNames.has(identifier(name)))
        throw new Error(`data/ingredients.json: duplicitní surovina '${name}'`);
      names.set(name, category);
      normalizedNames.add(identifier(name));
    }
  }

  return names;
}

const names = indexIngredientNames(departments);

function ingredientOptions(name, fail) {
  const options = name.split(' nebo ');
  if (new Set(options).size !== options.length) fail(`opakovaná alternativa '${name}'`);
  for (const option of options)
    if (!names.has(option)) {
      const canonical = [...names.keys()].find((name) => identifier(name) === identifier(option));
      fail(
        `neznámá surovina '${option}' v data/ingredients.json; ${canonical ? `použijte přesný název '${canonical}'` : 'doplňte ji právě jednou do odpovídajícího nákupního oddělení'}`,
      );
    }
  return options;
}

/** Ověří receptové tabulky a kroky; chybu lokalizuje řádkem, neznámé množství předá jako neblokující diagnostiku. */
function parseRecipeContent(content, file, { onWarning = () => {} } = {}) {
  let lineNumber = 1;
  const fail = (message) => {
    throw new Error(`${file}:${lineNumber}: ${message}`);
  };
  const ingredients = [];
  const groups = [];
  const steps = [];
  let inIngredients = false;
  let inSteps = false;
  let stepHasContent = false;
  let ingredientSections = 0;
  let table = null;
  const finishTable = () => {
    if (table && (!table.separator || !table.rows))
      fail('tabulka surovin musí mít hlavičku, oddělovací řádek a alespoň jednu surovinu');
    table = null;
  };
  const finishStep = () => {
    if (steps.length && !stepHasContent) fail('krok postupu nemá žádný obsah');
  };
  let group = { id: 'zaklad', title: 'Základ', optional: false };
  let groupLine = 0;
  const finishGroup = () => {
    if (groupLine && !ingredients.some((item) => item.group === group.id))
      fail(`skupina surovin '${group.title}' z řádku ${groupLine} nemá žádnou tabulku surovin`);
  };
  if ((content.match(/^# /gm) || []).length !== 1)
    fail('recept musí mít právě jeden hlavní nadpis');
  for (const [index, rawLine] of content.replace(/\r\n/g, '\n').split('\n').entries()) {
    lineNumber = index + 1;
    const line = rawLine.trim();
    if (/^## /.test(line)) {
      if (inSteps) finishStep();
      if (inIngredients) {
        finishTable();
        finishGroup();
      }
      inSteps = line === '## Postup';
    }
    if (/^## Ingredience$/.test(line)) {
      if (++ingredientSections > 1) fail('sekce Ingredience smí být v receptu pouze jednou');
      inIngredients = true;
      continue;
    }
    if (/^## /.test(line)) inIngredients = false;
    const step = line.match(/^### (\d+)\. (.+)$/);
    if (step && inSteps) {
      finishStep();
      steps.push({ number: Number(step[1]), title: step[2] });
      stepHasContent = false;
    } else if (
      inSteps &&
      steps.length &&
      line.trim() &&
      !line.startsWith('<!--') &&
      !line.startsWith('#')
    )
      stepHasContent = true;
    const optionalStep = line.match(/^<!-- recipe-group: (.+) -->$/);
    if (optionalStep) {
      const target = groups.find((group) => group.title === optionalStep[1] && group.optional);
      if (!target || !steps.length || !inSteps) fail('krok odkazuje na neznámou volitelnou část');
      steps.at(-1).optionalGroup = target.id;
    }
    if (!inIngredients) continue;
    const heading = line.match(/^### (.+)$/);
    if (heading) {
      finishTable();
      finishGroup();
      const title = heading[1].replace(/ \(volitelné\)$/, '');
      if (!identifier(title)) fail('skupina surovin musí mít název');
      group = { id: `g-${identifier(title)}`, title, optional: heading[1].endsWith('(volitelné)') };
      groupLine = lineNumber;
      if (groups.some((item) => item.id === group.id))
        fail(`duplicitní skupina surovin '${title}'`);
      continue;
    }
    if (/^(?:[-*+] |\d+[.)] )/.test(line))
      fail('ingredience musí být v tabulce Surovina / Množství / Upřesnění');
    if (!line.includes('|')) {
      if (
        line &&
        !line.startsWith('>') &&
        !line.startsWith('<!--') &&
        (table || ingredients.length)
      )
        fail('text surovin mimo tabulku; poznámku zapište jako citaci > nebo do Upřesnění');
      continue;
    }
    if (!line.startsWith('|') || !line.endsWith('|'))
      fail('řádek tabulky surovin musí začínat i končit znakem |');
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((value) => value.trim());
    if (cells.length !== 3 || cells.some((value) => !value)) fail('neúplný řádek ingrediencí');
    if (cells.join('|') === 'Surovina|Množství|Upřesnění') {
      finishTable();
      table = { separator: false, rows: 0 };
      continue;
    }
    if (!table) fail('chybí hlavička tabulky Surovina / Množství / Upřesnění');
    if (!table.separator) {
      if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell)))
        fail('za hlavičkou tabulky musí být oddělovací řádek |---|---|---|');
      table.separator = true;
      continue;
    }
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) fail('opakovaný oddělovací řádek tabulky');
    const [name, quantity, rawNote] = cells;
    const options = ingredientOptions(name, fail);
    if (!groups.some((item) => item.id === group.id)) groups.push(group);
    const id = `${group.id}-${identifier(name)}`;
    if (ingredients.some((item) => item.id === id))
      fail(`duplicitní surovina '${name}' ve stejné části`);
    ingredients.push({
      id,
      group: group.id,
      options: options.map((name) => ({ name, category: names.get(name) })),
      quantity,
      note: rawNote === '—' ? '' : rawNote,
      optional: /(?:^|;\s*)volitelné(?:;|$)/.test(rawNote),
    });
    table.rows++;
    if (quantity === 'neuvedeno')
      onWarning({
        severity: 'warning',
        code: 'RECIPE_QUANTITY_MISSING',
        file,
        line: lineNumber,
        ingredient: name,
        message: `Surovina '${name}' má množství neuvedeno; doplňte ověřené množství ve zdrojovém receptu.`,
      });
  }
  if (inIngredients) {
    finishTable();
    finishGroup();
  }
  if (inSteps) finishStep();
  if (!ingredients.length) fail('chybí tabulka ingrediencí');
  if (!steps.length || steps.some((step, index) => step.number !== index + 1))
    fail('postup musí obsahovat navazující očíslované kroky od 1');
  return { ingredients, groups, steps };
}

module.exports = { parseRecipeContent, departments };
