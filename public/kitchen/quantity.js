const metric = {
  g: ['g', 1],
  kg: ['g', 1000],
  ml: ['ml', 1],
  l: ['ml', 1000],
  ks: ['ks', 1],
};

// Tvary pro 1, pro 2 až 4, pro 5 a více a pro zlomek. První tvar je název jednotky v uložených datech.
const counted = [
  ['balení', 'balení', 'balení', 'balení'],
  ['hrnek', 'hrnky', 'hrnků', 'hrnku'],
  ['hrst', 'hrsti', 'hrstí', 'hrsti'],
  ['hvězdička', 'hvězdičky', 'hvězdiček', 'hvězdičky'],
  ['kelímek', 'kelímky', 'kelímků', 'kelímku'],
  ['kulička', 'kuličky', 'kuliček', 'kuličky'],
  ['lžíce', 'lžíce', 'lžic', 'lžíce'],
  ['lžička', 'lžičky', 'lžiček', 'lžičky'],
  ['plechovka', 'plechovky', 'plechovek', 'plechovky'],
  ['porce', 'porce', 'porcí', 'porce'],
  ['sáček', 'sáčky', 'sáčků', 'sáčku'],
  ['snítka', 'snítky', 'snítek', 'snítky'],
  ['stroužek', 'stroužky', 'stroužků', 'stroužku'],
  ['svazek', 'svazky', 'svazků', 'svazku'],
  ['svitek', 'svitky', 'svitků', 'svitku'],
  ['tabulka', 'tabulky', 'tabulek', 'tabulky'],
  ['vanička', 'vaničky', 'vaniček', 'vaničky'],
];

const forms = new Map(counted.map((unit) => [unit[0], unit]));
const units = new Map([
  ...Object.entries(metric),
  ...counted.flatMap((unit) => unit.map((form) => [form, [unit[0], 1]])),
]);
const number = new Intl.NumberFormat('cs', { maximumFractionDigits: 3 });

/** Rozpozná hmotnost, objem a počet v podporované jednotce bez odhadu velikosti balení. */
export function parseQuantity(text) {
  const match = text.match(/^(\d+(?:[,.]\d+)?)(?:[–-](\d+(?:[,.]\d+)?))? (.+)$/);
  if (!match || !units.has(match[3])) return null;
  const [unit, factor] = units.get(match[3]);
  const min = Number(match[1].replace(',', '.')) * factor;
  const max = Number((match[2] || match[1]).replace(',', '.')) * factor;
  return min > 0 && max >= min ? { min, max, unit } : null;
}

/** Vynásobí rozpoznané množství dávkou. */
export function scaleQuantity(quantity, factor) {
  return { ...quantity, min: quantity.min * factor, max: quantity.max * factor };
}

/** Vybere český tvar pro počet, desetinné číslo patří k poslednímu tvaru. */
export function plural(count, one, few, many, fraction = many) {
  if (!Number.isInteger(count)) return fraction;
  if (count === 1) return one;
  return count >= 2 && count <= 4 ? few : many;
}

/** Zobrazí násobek dávky. */
export const formatFactor = (factor) => `${String(factor).replace('.', ',')}×`;

/** Zobrazí množství česky bez převodů mezi hmotností, objemem a kusy. */
export function formatQuantity({ min, max, unit }) {
  const larger = { g: 'kg', ml: 'l' }[unit];
  if (larger && min >= 1000)
    return formatQuantity({ min: min / 1000, max: max / 1000, unit: larger });
  const range = max === min ? '' : `–${number.format(max)}`;
  return `${number.format(min)}${range} ${plural(max, ...(forms.get(unit) ?? Array(4).fill(unit)))}`;
}
