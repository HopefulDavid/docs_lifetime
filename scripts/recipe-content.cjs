const departments = require('../data/ingredients.json');
const names = new Map(Object.entries(departments).flatMap(([category, values]) => values.map(name => [name, category])));
const identifier = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Načte jednotné tabulky surovin a kroky z autoritativního Markdownu nebo odmítne neplatný recept. */
function parseRecipeContent(content, file) {
  const fail = message => { throw new Error(`${file}: ${message}`); };
  const ingredients = [];
  const groups = [];
  const steps = [];
  let inIngredients = false;
  let group = { id: 'zaklad', title: 'Základ', optional: false };
  for (const line of content.split('\n')) {
    if (/^## Ingredience$/.test(line)) { inIngredients = true; continue; }
    if (/^## /.test(line)) inIngredients = false;
    const step = line.match(/^###? (\d+)\. (.+)$/);
    if (step) steps.push({ number: Number(step[1]), title: step[2] });
    const optionalStep = line.match(/^<!-- recipe-group: (.+) -->$/);
    if (optionalStep) {
      const target = groups.find(group => group.title === optionalStep[1] && group.optional);
      if (!target || !steps.length) fail('krok odkazuje na neznámou volitelnou část');
      steps.at(-1).optionalGroup = target.id;
    }
    if (!inIngredients) continue;
    const heading = line.match(/^### (.+)$/);
    if (heading) {
      const title = heading[1].replace(/ \(volitelné\)$/, '');
      group = { id: `g-${identifier(title)}`, title, optional: heading[1].endsWith('(volitelné)') };
      continue;
    }
    if (/^- /.test(line)) fail('ingredience musí být v tabulce Surovina / Množství / Upřesnění');
    if (!line.startsWith('|') || /^\|\s*(Surovina|---)/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(value => value.trim());
    if (cells.length !== 3 || cells.some(value => !value)) fail('neúplný řádek ingrediencí');
    const [name, quantity, rawNote] = cells;
    const options = name.split(' nebo ');
    for (const option of options) if (!names.has(option)) fail(`neznámá surovina '${option}' v data/ingredients.json`);
    if (!groups.some(item => item.id === group.id)) groups.push(group);
    const id = `${group.id}-${identifier(name)}`;
    if (ingredients.some(item => item.id === id)) fail(`duplicitní surovina '${name}' ve stejné části`);
    ingredients.push({
      id,
      group: group.id,
      options: options.map(name => ({ name, category: names.get(name) })),
      quantity,
      note: rawNote === '—' ? '' : rawNote,
      optional: /(?:^|;\s*)volitelné(?:;|$)/.test(rawNote),
    });
  }
  if (!ingredients.length) fail('chybí tabulka ingrediencí');
  if (!steps.length || steps.some((step, index) => step.number !== index + 1)) fail('postup musí obsahovat navazující očíslované kroky od 1');
  return { ingredients, groups, steps };
}

module.exports = { parseRecipeContent, departments };
