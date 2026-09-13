import { buildShoppingList, pruneShoppingState, recipeSettings, restoreState } from './kitchen-core.mjs';

const maxBytes = 131072;
const maxCodeLength = 180000;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = message => { throw new Error(message); };

function validatePayload(payload, catalog) {
  if (!object(payload) || payload.version !== 1) fail('Tento formát nákupu není podporovaný. Požádejte o nový export.');
  if (!Array.isArray(payload.recipes) || !payload.recipes.length || payload.recipes.length > catalog.recipes.length) fail('Export neobsahuje platný výběr receptů.');
  const selections = new Map();
  for (const value of payload.recipes) {
    if (!object(value) || typeof value.id !== 'string' || selections.has(value.id)) fail('Export obsahuje neplatný nebo opakovaný recept.');
    const recipe = catalog.recipes.find(recipe => recipe.id === value.id);
    if (!recipe) fail('Některý recept na tomto webu chybí. Ověřte adresu webu a požádejte o nový export.');
    if (value.revision !== recipe.revision) fail(`Recept „${recipe.title}“ se od exportu změnil. Obnovte stránku a použijte nový export ze stejné verze receptu.`);
    if (!object(value.choices) || !object(value.enabled)) fail('Chybí platné nastavení surovin.');
    const settings = recipeSettings(recipe, value);
    if (settings.factor !== value.factor) fail(`Recept „${recipe.title}“ má nepodporovanou dávku.`);
    for (const [id, choice] of Object.entries(value.choices)) {
      if (!Object.hasOwn(settings.choices, id) || settings.choices[id] !== choice) fail(`Recept „${recipe.title}“ má neplatnou variantu suroviny.`);
    }
    for (const [id, enabled] of Object.entries(value.enabled)) {
      if (!Object.hasOwn(settings.enabled, id) || settings.enabled[id] !== enabled) fail(`Recept „${recipe.title}“ má neplatnou volitelnou část.`);
    }
    selections.set(recipe.id, settings);
  }
  const state = { version: 1, selections: Object.fromEntries(selections), checked: {}, amounts: {}, cooking: {} };
  const items = new Map(buildShoppingList(catalog.recipes, state.selections, catalog.departments).map(item => [item.key, item]));
  if (!Array.isArray(payload.checked) || payload.checked.length > items.size || new Set(payload.checked).size !== payload.checked.length) fail('Neplatný seznam hotových surovin.');
  for (const key of payload.checked) {
    if (!items.has(key)) fail('Hotová surovina nepatří do importovaného nákupu.');
    state.checked[key] = items.get(key).signature;
  }
  if (!Array.isArray(payload.amounts) || payload.amounts.length > items.size) fail('Neplatná vlastní množství.');
  for (const value of payload.amounts) {
    if (!Array.isArray(value) || value.length !== 2) fail('Neplatný záznam vlastního množství.');
    const [key, text] = value;
    if (!items.has(key) || items.get(key).quantity || Object.hasOwn(state.amounts, key) || typeof text !== 'string' || !text.trim() || text !== text.trim() || text.length > 120 || /[\u0000-\u001f\u007f]/.test(text)) fail('Vlastní množství je neplatné nebo nepatří k této surovině.');
    state.amounts[key] = { text, signature: items.get(key).signature };
  }
  return state;
}

async function readLimited(stream) {
  const reader = stream.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); fail('Nákup je příliš velký pro bezpečný import.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

/** Vytvoří přenositelnou kopii nákupu s verzí receptů; neobsahuje průběh vaření ani filtry a nic neodesílá. */
export async function exportShopping(state, catalog) {
  const clean = restoreState(state, catalog.recipes);
  pruneShoppingState(clean, buildShoppingList(catalog.recipes, clean.selections, catalog.departments));
  const payload = { version: 1, recipes: catalog.recipes.filter(recipe => Object.hasOwn(clean.selections, recipe.id)).map(recipe => {
    const settings = clean.selections[recipe.id];
    return { id: recipe.id, revision: recipe.revision, factor: settings.factor,
      choices: Object.fromEntries(Object.entries(settings.choices).filter(([, choice]) => choice !== 0)),
      enabled: Object.fromEntries(Object.entries(settings.enabled).filter(([, enabled]) => enabled)) };
  }), checked: Object.keys(clean.checked), amounts: Object.entries(clean.amounts).filter(([, value]) => value.text.trim()).map(([key, value]) => [key, value.text.trim()]) };
  validatePayload(payload, catalog);
  let bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.byteLength > maxBytes) fail('Nákup je příliš velký pro export; rozdělte jej na menší části.');
  let encoding = 'j';
  if (typeof CompressionStream === 'function') {
    bytes = await readLimited(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')));
    encoding = 'g';
  }
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `NK1${encoding}.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

/** Ověří sdílený kód nebo odkaz a vrátí nákup pro náhled bez změny místního stavu a bez síťového požadavku. */
export async function importShopping(text, catalog) {
  if (typeof text !== 'string' || text.length > maxCodeLength) fail('Vložený nákup je příliš velký.');
  let code = text.trim();
  if (/^https?:\/\//i.test(code)) {
    let address;
    try { address = new URL(code); } catch { fail('Vložte celý platný odkaz nebo kód nákupu.'); }
    code = address.hash.startsWith('#nakup=') ? address.hash.slice(7) : '';
  }
  const match = code.match(/^NK1([jg])\.([A-Za-z0-9_-]+)$/);
  if (!match) fail('Vložte celý odkaz nebo kód z tlačítka Export nákupu; běžný textový seznam ani PDF nelze importovat.');
  let bytes;
  try {
    const binary = atob(match[2].replace(/-/g, '+').replace(/_/g, '/'));
    bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch { fail('Kód nákupu je poškozený nebo neúplný.'); }
  if (bytes.byteLength > maxBytes) fail('Nákup je příliš velký pro bezpečný import.');
  if (match[1] === 'g') {
    if (typeof DecompressionStream !== 'function') fail('Tento prohlížeč neumí rozbalit nákup; otevřete odkaz v aktuálním prohlížeči.');
    try { bytes = await readLimited(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))); }
    catch { fail('Kód nákupu je poškozený, neúplný nebo příliš velký.'); }
  }
  let payload;
  try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('Kód nákupu neobsahuje platná data.'); }
  return validatePayload(payload, catalog);
}

function customText(state, item) {
  return state.amounts[item.key]?.signature === item.signature ? state.amounts[item.key].text : '';
}

/** Připraví sloučení nebo nahrazení nákupu; konflikty vyžadují volbu a potvrzení platí jen pro shodná množství. */
export function previewShoppingImport(current, incoming, catalog, mode = 'merge', resolutions = {}) {
  if (!['merge', 'replace'].includes(mode)) fail('Neznámý způsob importu.');
  const local = restoreState(current, catalog.recipes);
  const remote = restoreState(incoming, catalog.recipes);
  const conflicts = [];
  const result = { version: 1, selections: {}, checked: {}, amounts: {}, cooking: local.cooking };
  for (const recipe of catalog.recipes) {
    const a = local.selections[recipe.id];
    const b = remote.selections[recipe.id];
    if (mode === 'replace') { if (b) result.selections[recipe.id] = b; continue; }
    let chosen = b || a;
    if (a && b && !same(a, b)) {
      const key = `recipe:${recipe.id}`;
      conflicts.push({ key, kind: 'recipe', recipe, local: a, incoming: b, resolved: ['local', 'incoming'].includes(resolutions[key]) });
      chosen = resolutions[key] === 'incoming' ? b : a;
    }
    if (chosen) result.selections[recipe.id] = chosen;
  }
  const items = buildShoppingList(catalog.recipes, result.selections, catalog.departments);
  let recheck = 0;
  for (const item of items) {
    const a = mode === 'merge' ? customText(local, item) : '';
    const b = customText(remote, item);
    let amount = b || a;
    if (a && b && a !== b) {
      const key = `amount:${item.key}`;
      conflicts.push({ key, kind: 'amount', name: item.name, local: a, incoming: b, resolved: ['local', 'incoming'].includes(resolutions[key]) });
      amount = resolutions[key] === 'incoming' ? b : a;
    }
    if (amount) result.amounts[item.key] = { text: amount, signature: item.signature };
    const sources = mode === 'replace' ? [remote] : [local, remote];
    if (sources.some(source => source.checked[item.key] === item.signature && customText(source, item) === amount)) result.checked[item.key] = item.signature;
    else if (sources.some(source => source.checked[item.key] || source.amounts[item.key] && !amount)) recheck++;
  }
  return { state: result, conflicts, ready: conflicts.every(conflict => conflict.resolved), summary: {
    recipes: Object.keys(result.selections).length, items: items.length, checked: Object.keys(result.checked).length, recheck,
  } };
}
