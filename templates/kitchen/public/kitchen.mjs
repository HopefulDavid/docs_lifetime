import { buildShoppingList, formatQuantity, parseQuantity, recipeSettings, restoreState, shoppingAmount, shoppingText } from './kitchen-core.mjs';

const base = new URL('../', import.meta.url);
const storageKey = `kitchen-plan-v1:${base.pathname}`;
let catalog;
let state;
let storageMessage = 'Výběr se ukládá jen v tomto prohlížeči.';
let tray;
let notification;
let undoState;
let notificationTimer;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'className') node.className = value;
    else if (key in node && !key.startsWith('aria')) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children.flat().filter(child => child !== null && child !== undefined));
  return node;
}

function button(text, action, attrs = {}) { return el('button', { type: 'button', ...attrs, onClick: action }, text); }
function url(path) { return new URL(path, base).href; }
function selected(recipe) { return Object.hasOwn(state.selections, recipe.id); }
function announce(message) {
  notification.textContent = message;
  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => { notification.textContent = ''; }, 4500);
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { storageMessage = 'Uložení není dostupné; před zavřením si nákup stáhněte nebo zkopírujte.'; }
  document.querySelectorAll('.storage-message').forEach(node => { node.textContent = storageMessage; });
  updateTray();
}

function toggle(recipe, control) {
  if (selected(recipe)) delete state.selections[recipe.id];
  else state.selections[recipe.id] = recipeSettings(recipe);
  save();
  if (control) { control.textContent = selected(recipe) ? '✓ Vybráno' : '+ Do nákupu'; control.setAttribute('aria-pressed', String(selected(recipe))); }
  announce(`${recipe.title}: ${selected(recipe) ? 'přidáno do nákupu' : 'odebráno z nákupu'}.`);
}

function updateTray() {
  if (!tray) return;
  const count = Object.keys(state.selections).length;
  const onPlan = Boolean(document.getElementById('kitchen-planner')) && count;
  tray.replaceChildren(el('span', {}, count ? `${count} ${count === 1 ? 'recept' : count < 5 ? 'recepty' : 'receptů'} v nákupu` : 'Vyberte si jídla na příští vaření'), el('a', { href: onPlan ? '#shopping-list' : url('nakup.html'), className: 'kitchen-button primary' }, onPlan ? 'K surovinám ↓' : 'Můj nákup', el('span', { className: 'count-badge' }, String(count))));
}

function workflow(active) {
  return el('nav', { className: 'kitchen-workflow', 'aria-label': 'Od výběru k vaření' },
    el('a', { href: url('index.html'), 'aria-current': active === 'recipes' ? 'page' : 'false' }, '01', el('span', {}, 'Vybrat jídla')),
    el('a', { href: url('nakup.html'), 'aria-current': active === 'shopping' ? 'page' : 'false' }, '02', el('span', {}, 'Nakoupit')),
    el('span', { className: active === 'cooking' ? 'current' : '' }, '03', el('span', {}, 'Uvařit')));
}

function renderCatalog(root) {
  document.body.classList.add('kitchen-catalog-page');
  root.className = 'kitchen-app';
  const search = el('input', { type: 'search', id: 'recipe-filter', placeholder: 'Třeba kuře, rajská nebo česnek…' });
  const type = el('select', { id: 'recipe-type' }, el('option', { value: '' }, 'Všechny typy'), [...new Set(catalog.recipes.map(recipe => recipe.typeLabel))].map(label => el('option', { value: label }, label)));
  const onlySelected = el('input', { type: 'checkbox', id: 'selected-only' });
  const resultCount = el('p', { className: 'kitchen-muted', role: 'status' });
  const grid = el('div', { className: 'recipe-grid' });
  const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('cs');
  const renderResults = () => {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    const recipes = catalog.recipes.filter(recipe => (!type.value || recipe.typeLabel === type.value) && (!onlySelected.checked || selected(recipe)) && terms.every(term => normalize([recipe.title, recipe.description, recipe.origin, ...recipe.ingredients.flatMap(item => item.options.map(option => option.name))].join(' ')).includes(term)));
    resultCount.textContent = `${recipes.length} z ${catalog.recipes.length} receptů a nápojů`;
    grid.replaceChildren(...recipes.map(recipe => {
      const control = button(selected(recipe) ? '✓ Vybráno' : '+ Do nákupu', () => { toggle(recipe, control); if (onlySelected.checked) renderResults(); }, { 'aria-label': `Vybrat: ${recipe.title}`, 'aria-pressed': String(selected(recipe)), className: 'kitchen-button' });
      return el('section', { className: 'recipe-card' },
        el('div', { className: 'recipe-card-meta' }, el('span', { className: 'recipe-symbol', 'aria-hidden': 'true' }, recipe.pageTitle.match(/^[^\p{L}\p{N}]+/u)?.[0].trim() || '•'), el('span', {}, recipe.typeLabel), el('span', { className: 'recipe-origin' }, recipe.origin.split(', ').at(-1))),
        el('h2', {}, el('a', { href: url(`${recipe.id}.html`) }, recipe.title)),
        el('p', {}, recipe.description),
        el('div', { className: 'recipe-card-actions' }, el('a', { href: url(`${recipe.id}.html`) }, `Postup · ${recipe.steps.length} ${recipe.steps.length < 5 ? 'kroky' : 'kroků'}`), control));
    }));
    if (!recipes.length) grid.append(el('div', { className: 'kitchen-empty' }, el('h2', {}, 'Tady zatím nic není'), el('p', {}, 'Zkuste jiný název, surovinu nebo zrušte filtr.'), button('Zrušit filtry', () => { search.value = ''; type.value = ''; onlySelected.checked = false; renderResults(); search.focus(); }, { className: 'kitchen-button' })));
  };
  search.addEventListener('input', renderResults);
  type.addEventListener('change', renderResults);
  onlySelected.addEventListener('change', renderResults);
  root.replaceChildren(workflow('recipes'), el('div', { className: 'catalog-tools' }, el('label', { htmlFor: search.id }, 'Na co máte chuť?', search), el('label', { htmlFor: type.id }, 'Druh receptu', type)), el('label', { className: 'check-label' }, onlySelected, 'Jen vybrané'), resultCount, grid);
  document.querySelector('.catalog-fallback')?.setAttribute('hidden', '');
  renderResults();
}

function quantityLabel(item, factor) {
  const parsed = parseQuantity(item.quantity);
  return parsed ? formatQuantity({ ...parsed, min: parsed.min * factor, max: parsed.max * factor }) : item.quantity === 'neuvedeno' ? 'Množství neuvedeno' : item.quantity;
}

function recipeEditor(recipe, config, changed, idPrefix) {
  const factor = el('select', { id: `${idPrefix}-factor`, value: String(config.factor), onChange: event => { config.factor = Number(event.target.value); changed(); } }, [0.5, 1, 1.5, 2, 3, 4].map(value => el('option', { value: String(value), selected: config.factor === value }, `${String(value).replace('.', ',')}× původní dávka`)));
  const editor = el('div', { className: 'recipe-editor' }, el('label', { className: 'factor-label', htmlFor: factor.id }, 'Kolik připravíte', factor), el('p', { className: 'kitchen-muted' }, 'Počet porcí zdroj neuvádí; násobí se pouze uvedená množství.'));
  for (const group of recipe.groups) {
    const groupOn = !group.optional || config.enabled[group.id];
    const groupBox = el('fieldset', { className: `ingredient-group${groupOn ? '' : ' is-omitted'}` });
    const legend = el('legend', {}, group.title);
    if (group.optional) legend.replaceChildren(el('label', { className: 'check-label' }, el('input', { type: 'checkbox', id: `${idPrefix}-${group.id}`, checked: groupOn, onChange: event => { config.enabled[group.id] = event.target.checked; changed(); } }), `${group.title} · volitelné`));
    groupBox.append(legend);
    for (const item of recipe.ingredients.filter(item => item.group === group.id)) {
      const enabled = groupOn && (!item.optional || config.enabled[item.id]);
      const row = el('div', { className: `ingredient-row${enabled ? '' : ' is-omitted'}` });
      let name;
      if (item.options.length > 1) {
        name = el('label', {}, el('span', { className: 'kitchen-muted choice-caption' }, 'Vyberte jednu možnost'), el('select', { id: `${idPrefix}-${item.id}-choice`, 'aria-label': `Varianta: ${item.options.map(option => option.name).join(' nebo ')}`, disabled: !enabled, onChange: event => { config.choices[item.id] = Number(event.target.value); changed(); } }, item.options.map((option, index) => el('option', { value: String(index), selected: config.choices[item.id] === index }, option.name))));
      } else name = el('strong', {}, item.options[0].name);
      if (item.optional) name = el('label', { className: 'check-label' }, el('input', { type: 'checkbox', id: `${idPrefix}-${item.id}`, checked: Boolean(config.enabled[item.id]), disabled: !groupOn, onChange: event => { config.enabled[item.id] = event.target.checked; changed(); } }), name);
      const note = item.note.replace(/(?:^|;\s*)volitelné(?:;\s*|$)/, '').trim();
      row.append(el('div', {}, name, note ? el('small', {}, note) : null), el('span', { className: `ingredient-amount${item.quantity === 'neuvedeno' ? ' amount-unknown' : ''}` }, enabled ? quantityLabel(item, config.factor) : 'Nezahrnuto'));
      groupBox.append(row);
    }
    editor.append(groupBox);
  }
  return editor;
}

function preserveView(render) {
  const activeId = document.activeElement?.id;
  const open = [...document.querySelectorAll('details[open][id]')].map(node => node.id);
  render();
  open.forEach(id => { const node = document.getElementById(id); if (node) node.open = true; });
  if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
}

function renderPlanner(root) {
  root.className = 'kitchen-app';
  const render = () => {
    const recipes = catalog.recipes.filter(selected);
    const items = buildShoppingList(catalog.recipes, state.selections, catalog.departments);
    const bought = items.filter(item => state.checked[item.key] === item.signature).length;
    root.replaceChildren(workflow('shopping'));
    if (!recipes.length) {
      root.append(el('div', { className: 'kitchen-empty' }, el('div', { className: 'empty-symbol', 'aria-hidden': 'true' }, '⌑'), el('h2', {}, 'Co bude dobrého?'), el('p', {}, 'Vyberte si několik jídel a suroviny se spojí do jednoho nákupního seznamu.'), el('a', { className: 'kitchen-button primary', href: url('index.html') }, 'Vybrat recepty')));
      if (undoState) root.append(button('Vrátit vymazaný výběr', restoreUndo, { className: 'kitchen-button' }));
      return;
    }
    const selection = el('section', { className: 'selected-recipes', 'aria-label': 'Vybraná jídla' }, el('div', { className: 'section-heading' }, el('h2', {}, `Vybraná jídla (${recipes.length})`), el('a', { href: url('index.html') }, '+ Přidat další')));
    recipes.forEach(recipe => {
      const details = el('details', { className: 'selected-recipe', id: `selection-${recipe.id.replaceAll('/', '-')}` }, el('summary', {}, el('span', {}, recipe.title), el('span', { className: 'kitchen-muted' }, `${String(state.selections[recipe.id].factor).replace('.', ',')}× · upravit`)));
      details.append(el('div', { className: 'selected-actions' }, el('a', { href: url(`${recipe.id}.html#vareni`), className: 'kitchen-button primary' }, 'Začít vařit'), button('Odebrat z nákupu', () => { undoState = structuredClone(state); delete state.selections[recipe.id]; save(); preserveView(render); announce(`${recipe.title}: odebráno, změnu lze vrátit.`); }, { className: 'kitchen-button' })));
      details.append(recipeEditor(recipe, state.selections[recipe.id], () => { save(); preserveView(render); }, `plan-${recipe.id.replaceAll('/', '-')}`));
      selection.append(details);
    });
    root.append(selection);
    const summary = el('section', { className: 'shopping-summary' }, el('div', {}, el('p', { className: 'eyebrow' }, 'V OBCHODĚ'), el('h2', {}, 'Suroviny podle oddělení'), el('p', { id: 'shopping-progress', role: 'status' }, `${bought} z ${items.length} položek máte připraveno`)), el('progress', { value: bought, max: Math.max(items.length, 1), 'aria-label': 'Průběh nákupu' }));
    const hideDone = el('input', { id: 'hide-done', type: 'checkbox', checked: root.dataset.hideDone === 'true' });
    hideDone.addEventListener('change', () => { root.dataset.hideDone = String(hideDone.checked); preserveView(render); });
    const exportArea = el('div', { id: 'export-area' });
    const exportText = () => shoppingText(items, state.checked, state.amounts);
    const toolbar = el('div', { className: 'shopping-toolbar' }, el('label', { className: 'check-label' }, hideDone, 'Skrýt hotové'), el('div', { className: 'button-group' }, button('Kopírovat', async () => {
      try { await navigator.clipboard.writeText(exportText()); announce('Nákupní seznam zkopírován.'); }
      catch { const field = el('textarea', { readOnly: true, value: exportText(), 'aria-label': 'Text nákupního seznamu', rows: 10 }); exportArea.replaceChildren(el('p', {}, 'Automatické kopírování není dostupné; vyberte a zkopírujte tento text.'), field); field.focus(); field.select(); }
    }, { className: 'kitchen-button' }), button('Stáhnout', () => { const objectUrl = URL.createObjectURL(new Blob([exportText()], { type: 'text/plain;charset=utf-8' })); const link = el('a', { href: objectUrl, download: 'nakupni-seznam.txt' }); link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); announce('Textový seznam je připravený ke stažení.'); }, { className: 'kitchen-button' }), button('Tisk', () => window.print(), { className: 'kitchen-button' })));
    root.append(summary, el('p', { className: 'shopping-hint' }, 'Zaškrtněte, co už máte doma nebo v košíku. Chybějící množství ověřte v receptu; gramy, kusy a lžíce zůstávají odděleně.'), toolbar, exportArea);
    const shopping = el('div', { className: 'shopping-list', id: 'shopping-list' });
    for (const category of catalog.departments) {
      const categoryItems = items.filter(item => item.category === category);
      if (!categoryItems.length) continue;
      const section = el('section', { className: 'shopping-department' }, el('h3', {}, category, el('span', { className: 'count-badge' }, String(categoryItems.length))));
      let visible = 0;
      for (const item of categoryItems) {
        const done = state.checked[item.key] === item.signature;
        if (hideDone.checked && done) continue;
        visible++;
        const id = `shopping-${encodeURIComponent(item.key)}`;
        const check = el('input', { id, type: 'checkbox', checked: done, onChange: event => {
          if (event.target.checked) state.checked[item.key] = item.signature; else delete state.checked[item.key];
          save(); preserveView(render);
        } });
        const sources = el('details', { id: `${id}-sources`, className: 'shopping-sources' }, el('summary', {}, `Pro které recepty · ${new Set(item.sources.map(source => source.id)).size}`), el('ul', {}, item.sources.map(source => el('li', {}, el('a', { href: url(`${source.id}.html#ingredience`) }, source.recipe), ` · ${source.quantity}${source.group !== 'Základ' ? ` · ${source.group}` : ''}${source.note ? ` — ${source.note}` : ''}`))));
        const ownAmount = state.amounts[item.key]?.signature === item.signature ? state.amounts[item.key].text : '';
        if (!item.quantity) {
          const field = el('input', { id: `${id}-amount`, type: 'text', maxLength: 120, value: ownAmount, placeholder: 'Např. 1 balení nebo 200 g', 'aria-label': `Vlastní množství: ${item.name}` });
          sources.append(el('label', { className: 'factor-label' }, 'Vlastní množství pro tento nákup', field), button('Uložit množství', () => { state.amounts[item.key] = { text: field.value.trim(), signature: item.signature }; delete state.checked[item.key]; save(); preserveView(render); announce('Vlastní množství uloženo.'); }, { className: 'kitchen-button' }), el('p', {}, 'Při změně jídel nebo dávky se vrátí údaj z receptu.'));
          if (item.text === 'neuvedeno') sources.querySelector('summary').textContent += ' · doplnit množství';
        }
        const amount = shoppingAmount(item, state.amounts);
        section.append(el('div', { className: `shopping-item${done ? ' is-done' : ''}` }, el('label', { htmlFor: id, className: 'shopping-check' }, check, el('span', {}, el('strong', {}, item.name), el('small', {}, [...new Set(item.sources.map(source => source.note).filter(Boolean))].join(' · '))), el('span', { className: `ingredient-amount${amount === 'neuvedeno' ? ' amount-unknown' : ''}` }, amount === 'neuvedeno' ? 'Množství neuvedeno' : amount)), sources));
      }
      if (visible) shopping.append(section);
    }
    if (!shopping.children.length) shopping.append(el('div', { className: 'kitchen-empty' }, el('h3', {}, 'Všechno máte připravené'), el('p', {}, 'Otevřete vybrané jídlo nahoře a můžete začít vařit.')));
    root.append(shopping, el('div', { className: 'plan-footer' }, el('p', { className: 'storage-message kitchen-muted' }, storageMessage), el('p', { className: 'kitchen-muted' }, 'Do obchodu bez připojení si seznam stáhněte nebo vytiskněte.'), button('Začít nový nákup', () => { undoState = structuredClone(state); state.selections = {}; state.checked = {}; state.amounts = {}; save(); render(); announce('Nákup vymazán; můžete jej vrátit.'); }, { className: 'kitchen-button' })));
    if (undoState) root.append(button('Vrátit poslední odebrání', restoreUndo, { className: 'kitchen-button' }));
  };
  function restoreUndo() { state = undoState; undoState = null; save(); render(); announce('Původní výběr obnoven.'); }
  render();
}

function enhanceRecipe(recipe) {
  const article = document.querySelector('article');
  const ingredientsHeading = [...article.querySelectorAll('h2')].find(node => node.textContent.trim().startsWith('Ingredience'));
  if (!ingredientsHeading) return;
  const stepHeadings = [...article.querySelectorAll('h3')].filter(node => /^\d+\. /.test(node.textContent.trim()));
  const stepContents = stepHeadings.map(heading => {
    const nodes = [];
    for (let node = heading.nextElementSibling; node && !/^H[123]$/.test(node.tagName); node = node.nextElementSibling) nodes.push(node.cloneNode(true));
    return nodes;
  });
  for (let node = ingredientsHeading.nextElementSibling; node && node.tagName !== 'H2'; node = node.nextElementSibling) node.classList.add('source-ingredients');
  for (const link of document.querySelectorAll('.affix a[href^="#"]')) {
    const target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
    if (target?.classList.contains('source-ingredients')) link.closest('li')?.remove();
  }
  const editor = el('div', { className: 'kitchen-app' });
  const controls = el('section', { className: 'kitchen-app recipe-controls', 'aria-label': 'Nákup a vaření' });
  const config = recipeSettings(recipe, state.selections[recipe.id]);
  const repaint = () => {
    editor.replaceChildren(recipeEditor(recipe, config, () => { if (selected(recipe)) state.selections[recipe.id] = structuredClone(config); save(); preserveView(repaint); }, 'detail'));
    controls.replaceChildren(workflow('cooking'), el('div', { className: 'recipe-actions' }, button(selected(recipe) ? '✓ V nákupu' : '+ Přidat do nákupu', () => { if (selected(recipe)) delete state.selections[recipe.id]; else state.selections[recipe.id] = structuredClone(config); save(); repaint(); announce(selected(recipe) ? 'Recept je v nákupu.' : 'Recept byl odebrán.'); }, { className: 'kitchen-button', 'aria-pressed': String(selected(recipe)) }), button('Vařit krok za krokem', () => openCooking(recipe, stepContents, config, repaint), { className: 'kitchen-button primary', id: 'start-cooking' }), el('a', { href: '#postup' }, 'Celý postup')));
  };
  ingredientsHeading.before(controls);
  ingredientsHeading.after(editor);
  repaint();
  if (location.hash === '#vareni') openCooking(recipe, stepContents, config, repaint);
}

function openCooking(recipe, contents, config, closed) {
  const cooking = state.cooking[recipe.id] ||= { step: 0, done: [] };
  const dialog = el('dialog', { className: 'kitchen-app cooking-dialog', 'aria-labelledby': 'cook-title' });
  const render = () => {
    const step = recipe.steps[cooking.step];
    const omitted = step.optionalGroup && !config.enabled[step.optionalGroup];
    const done = cooking.done.includes(cooking.step);
    const jump = el('select', { id: 'cook-jump', 'aria-label': 'Přejít na krok', onChange: event => { cooking.step = Number(event.target.value); save(); render(); } }, recipe.steps.map((item, index) => el('option', { value: String(index), selected: index === cooking.step }, `${index + 1}. ${item.title}${cooking.done.includes(index) ? ' ✓' : ''}`)));
    const ingredients = el('details', { className: 'cook-ingredients', id: 'cook-ingredients' }, el('summary', {}, 'Suroviny a zvolené varianty'), recipeEditor(recipe, config, () => { if (selected(recipe)) state.selections[recipe.id] = structuredClone(config); save(); preserveView(render); }, 'cook'));
    dialog.replaceChildren(...[el('div', { className: 'cook-top' }, el('p', { className: 'eyebrow' }, recipe.title), button('Zavřít', () => dialog.close(), { className: 'kitchen-button' })), el('p', { className: 'kitchen-muted' }, `Krok ${cooking.step + 1} z ${recipe.steps.length} · ${cooking.done.length} hotovo`), el('progress', { value: cooking.done.length, max: recipe.steps.length, 'aria-label': 'Hotové kroky' }), jump, el('h2', { id: 'cook-title', tabIndex: -1 }, step.title), config.factor !== 1 ? el('p', { className: 'shopping-hint' }, `Suroviny jsou přepočítané na ${String(config.factor).replace('.', ',')}× dávku; množství zmíněná přímo v textu, časy a teploty zůstávají původní.`) : null, el('div', { className: 'cook-content' }, contents[cooking.step].map(node => node.cloneNode(true))), el('label', { className: 'check-label cook-done' }, el('input', { type: 'checkbox', id: 'cook-done', checked: done, onChange: event => { cooking.done = event.target.checked ? [...cooking.done, cooking.step] : cooking.done.filter(index => index !== cooking.step); save(); preserveView(render); } }), 'Tento krok mám hotový'), el('div', { className: 'cook-navigation' }, button('← Předchozí', () => { cooking.step--; save(); render(); dialog.querySelector('#cook-title').focus(); }, { disabled: cooking.step === 0, className: 'kitchen-button' }), button(cooking.step === recipe.steps.length - 1 ? 'Dokončit vaření' : 'Hotovo, další krok →', () => {
      if (!cooking.done.includes(cooking.step)) cooking.done.push(cooking.step);
      if (cooking.step < recipe.steps.length - 1) { cooking.step++; save(); render(); dialog.querySelector('#cook-title').focus(); }
      else { save(); render(); announce(cooking.done.length === recipe.steps.length ? 'Všechny kroky máte hotové. Dobrou chuť!' : 'Poslední krok je hotový; zkontrolujte přeskočené kroky.'); }
    }, { className: 'kitchen-button primary' })), cooking.done.length === recipe.steps.length ? el('p', { className: 'cooking-complete', role: 'status' }, 'Vše hotovo. Dobrou chuť!') : null, ingredients, el('p', { className: 'storage-message kitchen-muted' }, storageMessage), button('Začít postup znovu', () => { cooking.step = 0; cooking.done = []; save(); render(); }, { className: 'kitchen-button' })].filter(Boolean));
    if (omitted) dialog.querySelector('.cook-content').before(el('p', { className: 'shopping-hint' }, 'Tuto volitelnou část nemáte vybranou; její suroviny nejsou v nákupu a tento krok můžete přeskočit.'));
  };
  dialog.addEventListener('close', () => { dialog.remove(); closed(); document.getElementById('start-cooking')?.focus(); });
  document.body.append(dialog);
  render();
  dialog.showModal();
  dialog.querySelector('#cook-title').focus();
}

/** Přidá výběr, společný nákup a vaření jako progresivní rozšíření statického webu DocFX. */
export async function startKitchen() {
  const response = await fetch(url('data/recipes.json'));
  if (!response.ok) throw new Error(`Katalog receptů: HTTP ${response.status}`);
  catalog = await response.json();
  if (catalog.version !== 1 || !Array.isArray(catalog.recipes)) throw new Error('Nepodporovaný katalog receptů');
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); }
  catch { storageMessage = 'Předchozí výběr nelze načíst; recepty můžete vybrat znovu.'; }
  state = restoreState(saved, catalog.recipes);
  notification = el('div', { role: 'status', className: 'kitchen-notification', 'aria-live': 'polite' });
  tray = el('div', { className: 'kitchen-tray kitchen-app' });
  document.body.append(notification, tray);
  updateTray();
  const home = document.getElementById('kitchen-catalog');
  const planner = document.getElementById('kitchen-planner');
  if (home) renderCatalog(home);
  if (planner) renderPlanner(planner);
  const recipe = catalog.recipes.find(item => new URL(`${item.id}.html`, base).pathname === decodeURI(location.pathname));
  if (recipe) enhanceRecipe(recipe);
}
