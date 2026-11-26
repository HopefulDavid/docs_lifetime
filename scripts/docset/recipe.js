import { parseQuantity } from '../../templates/life/public/kitchen/quantity.js';
import { identifier } from './ingredients.js';

const baseGroup = { id: 'zaklad', title: 'Základ', optional: false };

const textQuantities = new Set(['neuvedeno', 'dle chuti']);

const cellsOf = (line) =>
  line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

const isSeparator = (cells) => cells.every((cell) => /^:?-{3,}:?$/.test(cell));

/** Rozdělí recept na sekce druhé úrovně. Řádky si nesou číslo ve zdroji. */
function splitSections(content) {
  const sections = [{ title: '', line: 1, lines: [] }];
  for (const [index, raw] of content.split('\n').entries()) {
    const line = { number: index + 1, text: raw.trim() };
    const heading = line.text.match(/^## (.+)$/);
    if (heading) sections.push({ title: heading[1], line: line.number, lines: [] });
    else sections.at(-1).lines.push(line);
  }
  return sections;
}

function parseOptions(name, categories, fail) {
  const names = name.split(' nebo ');
  if (new Set(names).size !== names.length) fail(`opakovaná alternativa '${name}'`);
  return names.map((option) => {
    if (!categories.has(option)) {
      const known = [...categories.keys()].find((item) => identifier(item) === identifier(option));
      const advice = known
        ? `platí přesný název '${known}'`
        : 'surovina patří právě jednou do odpovídajícího nákupního oddělení';
      fail(`neznámá surovina '${option}' v data/ingredients.json; ${advice}`);
    }
    return { name: option, category: categories.get(option) };
  });
}

function parseIngredients(section, categories, failAt, onMissingQuantity) {
  const ingredients = [];
  const groups = [];
  let group = baseGroup;
  let groupLine = 0;
  let table = null;
  let line = section.line;
  const fail = (message) => failAt(line, message);

  function finishTable() {
    if (table && !table.rows)
      fail('tabulka surovin musí mít hlavičku, oddělovací řádek a alespoň jednu surovinu');
    table = null;
  }

  function finishGroup() {
    finishTable();
    if (groupLine && !ingredients.some((item) => item.group === group.id))
      fail(`skupina surovin '${group.title}' z řádku ${groupLine} nemá žádnou tabulku surovin`);
  }

  function startGroup(heading) {
    finishGroup();
    const title = heading.replace(/ \(volitelné\)$/, '');
    if (!identifier(title)) fail('skupina surovin musí mít název');
    group = { id: `g-${identifier(title)}`, title, optional: title !== heading };
    groupLine = line;
    if (groups.some((item) => item.id === group.id)) fail(`duplicitní skupina surovin '${title}'`);
  }

  function addIngredient([name, quantity, note]) {
    const item = {
      id: `${group.id}-${identifier(name)}`,
      group: group.id,
      options: parseOptions(name, categories, fail),
      quantity,
      note: note === '—' ? '' : note,
      optional: /(?:^|[;,]\s*)volitelné(?:[;,]|$)/.test(note),
    };
    if (ingredients.some((other) => other.id === item.id))
      fail(`duplicitní surovina '${name}' ve stejné části`);
    if (!textQuantities.has(quantity) && !parseQuantity(quantity))
      fail(`množství '${quantity}' nemá číslo s podporovanou jednotkou`);
    if (!groups.includes(group)) groups.push(group);
    ingredients.push(item);
    if (quantity === 'neuvedeno') onMissingQuantity(line, name);
  }

  function readTableRow(text) {
    if (!text.startsWith('|') || !text.endsWith('|'))
      fail('řádek tabulky surovin musí začínat i končit znakem |');
    const cells = cellsOf(text);
    if (cells.length !== 3 || cells.some((cell) => !cell)) fail('neúplný řádek ingrediencí');
    if (cells.join('|') === 'Surovina|Množství|Upřesnění') {
      finishTable();
      table = { separator: false, rows: 0 };
    } else if (!table) {
      fail('chybí hlavička tabulky Surovina / Množství / Upřesnění');
    } else if (!table.separator) {
      if (!isSeparator(cells)) fail('za hlavičkou tabulky musí být oddělovací řádek |---|---|---|');
      table.separator = true;
    } else {
      if (isSeparator(cells)) fail('opakovaný oddělovací řádek tabulky');
      addIngredient(cells);
      table.rows += 1;
    }
  }

  for (const { text, number } of section.lines) {
    line = number;
    const heading = text.match(/^### (.+)$/);
    if (heading) startGroup(heading[1]);
    else if (/^(?:[-*+] |\d+[.)] )/.test(text))
      fail('ingredience musí být v tabulce Surovina / Množství / Upřesnění');
    else if (text.includes('|')) readTableRow(text);
    else if (text && !/^(?:>|<!--)/.test(text) && (table || ingredients.length))
      fail('text surovin mimo tabulku; poznámka patří do citace > nebo do Upřesnění');
  }
  finishGroup();
  if (!ingredients.length) fail('chybí tabulka ingrediencí');
  return { ingredients, groups };
}

function parseSteps(section, groups, failAt) {
  const steps = [];
  let hasContent = true;
  let line = section.line;
  const fail = (message) => failAt(line, message);

  for (const { text, number } of section.lines) {
    line = number;
    const heading = text.match(/^### (\d+)\. (.+)$/);
    const optionalPart = text.match(/^<!-- recipe-group: (.+) -->$/);
    if (heading) {
      if (!hasContent) fail('krok postupu nemá žádný obsah');
      steps.push({ number: Number(heading[1]), title: heading[2] });
      hasContent = false;
    } else if (optionalPart) {
      const group = groups.find((item) => item.optional && item.title === optionalPart[1]);
      if (!group || !steps.length) fail('krok odkazuje na neznámou volitelnou část');
      steps.at(-1).optionalGroup = group.id;
    } else if (text && !/^(?:<!--|#)/.test(text)) {
      hasContent = true;
    }
  }
  if (!hasContent) fail('krok postupu nemá žádný obsah');
  if (!steps.length || steps.some((step, index) => step.number !== index + 1))
    fail('postup musí obsahovat navazující očíslované kroky od 1');
  return steps;
}

function parseSourceVideo(section, failAt) {
  let video;
  for (const { text, number } of section.lines) {
    if (!text.startsWith('- ')) continue;
    const item = text.match(/^- Soubor: \[([^\]]+)\]\((\S+)\)$/);
    if (!item) failAt(number, 'položka zdrojového videa musí mít tvar - Soubor: [název](cesta)');
    if (video) failAt(number, 'sekce Video postup smí uvádět pouze jeden Soubor');
    const [, title, file] = item;
    if (!/^[^/:][^:\s]*\.mp4$/.test(file))
      failAt(number, `'${file}' musí být relativní cesta k vlastní kopii videa ve formátu MP4`);
    video = { title, file };
  }
  if (!video) failAt(section.line, 'sekce Video postup musí uvádět položku Soubor');
  return video;
}

/** Ověří recept a vrátí jeho suroviny, kroky a video. Chyba i varování nesou soubor a řádek. */
export function parseRecipe(content, file, categories, onWarning = () => {}) {
  const failAt = (line, message) => {
    throw new Error(`${file}:${line}: ${message}`);
  };
  if (content.match(/^# /gm)?.length !== 1) failAt(1, 'recept musí mít právě jeden hlavní nadpis');
  const sections = splitSections(content);

  function section(title, required) {
    const [found, repeated] = sections.filter((item) => item.title === title);
    if (repeated) failAt(repeated.line, `sekce ${title} smí být v receptu pouze jednou`);
    if (!found && required) failAt(1, `chybí sekce ${title}`);
    return found;
  }

  const { ingredients, groups } = parseIngredients(
    section('Ingredience', true),
    categories,
    failAt,
    (line, name) =>
      onWarning({
        file,
        line,
        code: 'RECIPE_QUANTITY_MISSING',
        message: `Surovina '${name}' má množství neuvedeno, ve zdrojovém receptu chybí ověřené množství.`,
      }),
  );
  const steps = parseSteps(section('Postup', true), groups, failAt);
  const video = section('Video postup', false);
  return {
    ingredients,
    groups,
    steps,
    ...(video && { sourceVideo: parseSourceVideo(video, failAt) }),
  };
}
