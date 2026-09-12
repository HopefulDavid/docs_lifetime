import { buildShoppingList, cookingProgress, filterShoppingItems, formatQuantity, parseQuantity, recipeSettings, restoreState, selectedIngredients, shoppingAmount, shoppingNeedsAmount, shoppingText } from './kitchen-core.mjs';

const base = new URL('../', import.meta.url);
const storageKey = `kitchen-plan-v1:${base.pathname}`;
let catalog;
let state;
let storageMessage = 'Výběr se ukládá jen v tomto prohlížeči.';
let tray;
let notification;
let undoState;
let notificationTimer;
let plannerController;

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
  if (control) {
    control.textContent = selected(recipe) ? '✓ V nákupu' : 'Přidat do nákupu';
    control.setAttribute('aria-label', `${selected(recipe) ? 'V nákupu' : 'Přidat do nákupu'}: ${recipe.title}`);
    control.setAttribute('aria-pressed', String(selected(recipe)));
  }
  announce(`${recipe.title}: ${selected(recipe) ? 'přidáno do nákupu' : 'odebráno z nákupu'}.`);
}

function updateTray() {
  if (!tray) return;
  const count = Object.keys(state.selections).length;
  if (plannerController && count) { plannerController.updateTray(); return; }
  tray.replaceChildren(el('span', {}, count ? `${count} ${count === 1 ? 'recept' : count < 5 ? 'recepty' : 'receptů'} v nákupu` : 'Vyberte si jídla na příští vaření'), el('a', { href: url('nakup.html'), className: 'kitchen-button primary' }, 'Můj nákup', el('span', { className: 'count-badge' }, String(count))));
}

function focusSection(node) {
  if (!node) return;
  node.focus({ preventScroll: true });
  node.scrollIntoView({ block: 'start', behavior: 'instant' });
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
  const query = new URL(location.href).searchParams;
  search.value = query.get('q') || '';
  if ([...type.options].some(option => option.value === query.get('type'))) type.value = query.get('type');
  onlySelected.checked = query.get('selected') === '1';
  const resultCount = el('p', { className: 'kitchen-muted', role: 'status' });
  const grid = el('div', { className: 'recipe-grid' });
  const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('cs');
  const renderResults = () => {
    const address = new URL(location.href);
    for (const [key, value] of [['q', search.value], ['type', type.value], ['selected', onlySelected.checked ? '1' : '']]) {
      if (value) address.searchParams.set(key, value); else address.searchParams.delete(key);
    }
    history.replaceState(null, '', address);
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    const recipes = catalog.recipes.filter(recipe => (!type.value || recipe.typeLabel === type.value) && (!onlySelected.checked || selected(recipe)) && terms.every(term => normalize([recipe.title, recipe.description, recipe.origin, ...recipe.ingredients.flatMap(item => item.options.map(option => option.name))].join(' ')).includes(term)));
    resultCount.textContent = `${recipes.length} z ${catalog.recipes.length} receptů a nápojů`;
    grid.replaceChildren(...recipes.map(recipe => {
      const control = button(selected(recipe) ? '✓ V nákupu' : 'Přidat do nákupu', () => { toggle(recipe, control); if (onlySelected.checked) renderResults(); }, { 'aria-label': `${selected(recipe) ? 'V nákupu' : 'Přidat do nákupu'}: ${recipe.title}`, 'aria-pressed': String(selected(recipe)), className: 'kitchen-button' });
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
  root.replaceChildren(workflow('recipes'), el('div', { className: 'catalog-tools' }, el('label', { htmlFor: search.id }, 'Najít jídlo nebo surovinu', search), el('div', { className: 'catalog-filter-row' }, el('label', { htmlFor: type.id }, el('span', { className: 'visually-hidden' }, 'Druh receptu'), type), el('label', { className: 'check-label' }, onlySelected, 'Jen vybrané'))), resultCount, grid);
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
  const scroll = [...document.querySelectorAll('[data-preserve-scroll][id]')].map(node => [node.id, node.scrollTop]);
  render();
  open.forEach(id => { const node = document.getElementById(id); if (node) node.open = true; });
  scroll.forEach(([id, top]) => { const node = document.getElementById(id); if (node) node.scrollTop = top; });
  if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
}

function renderPlanner(root) {
  root.className = 'kitchen-app';
  document.body.classList.add('kitchen-shopping-page');
  const filters = { search: '', category: '', hideDone: false, missing: false };
  const drafts = new Map();
  let shoppingMode = location.hash === '#nakupovat';

  const setMode = mode => {
    shoppingMode = mode;
    document.body.classList.toggle('kitchen-shopping-mode', mode);
    const address = new URL(location.href);
    address.hash = mode ? 'nakupovat' : '';
    history.replaceState(null, '', address);
    updateTray();
    focusSection(document.getElementById(mode ? 'shopping-heading' : 'selected-heading'));
  };

  plannerController = {
    updateTray() {
      const items = buildShoppingList(catalog.recipes, state.selections, catalog.departments);
      const remaining = items.filter(item => state.checked[item.key] !== item.signature).length;
      if (shoppingMode) {
        tray.replaceChildren(el('span', {}, el('strong', {}, String(remaining)), ' položek zbývá'),
          button('Filtr', () => focusSection(document.getElementById('shopping-filter')), { className: 'kitchen-button' }),
          button('Jídla', () => setMode(false), { className: 'kitchen-button primary', 'aria-label': 'Jídla: upravit výběr a začít vařit' }));
      } else {
        tray.replaceChildren(el('span', {}, `${items.length} položek v seznamu`),
          button('Začít nakupovat', () => setMode(true), { className: 'kitchen-button primary' }));
      }
    },
  };

  const render = () => {
    const recipes = catalog.recipes.filter(selected);
    const items = buildShoppingList(catalog.recipes, state.selections, catalog.departments);
    if (!recipes.length) shoppingMode = false;
    document.body.classList.toggle('kitchen-shopping-mode', shoppingMode);
    root.replaceChildren(workflow('shopping'));
    if (!recipes.length) {
      root.append(el('div', { className: 'kitchen-empty' }, el('div', { className: 'empty-symbol', 'aria-hidden': 'true' }, '⌑'),
        el('h2', {}, 'Co bude dobrého?'), el('p', {}, 'Vyberte si několik jídel a suroviny se spojí do jednoho nákupního seznamu.'),
        el('a', { className: 'kitchen-button primary', href: url('index.html') }, 'Vybrat recepty')));
      if (undoState) root.append(button('Vrátit vymazaný výběr', restoreUndo, { className: 'kitchen-button' }));
      updateTray();
      return;
    }

    const selection = el('section', { className: 'selected-recipes', 'aria-label': 'Vybraná jídla' },
      el('div', { className: 'section-heading' }, el('h2', { id: 'selected-heading', tabIndex: -1 }, `Vybraná jídla (${recipes.length})`),
        el('a', { href: url('index.html') }, '+ Přidat další')));
    for (const recipe of recipes) {
      const id = `selection-${recipe.id.replaceAll('/', '-')}`;
      const card = el('div', { className: 'selected-recipe-card' },
        el('div', { className: 'selected-recipe-title' }, el('h3', {}, el('a', { href: url(`${recipe.id}.html`) }, recipe.title)),
          el('a', { href: url(`${recipe.id}.html#vareni`), className: 'kitchen-button', 'aria-label': `Vařit: ${recipe.title}` }, 'Vařit')));
      const details = el('details', { className: 'selected-recipe', id },
        el('summary', {}, `${String(state.selections[recipe.id].factor).replace('.', ',')}× dávka · upravit suroviny`),
        recipeEditor(recipe, state.selections[recipe.id], () => { save(); preserveView(render); }, id),
        el('div', { className: 'selected-actions' }, button('Odebrat z nákupu', () => {
          undoState = structuredClone(state);
          delete state.selections[recipe.id];
          save(); preserveView(render);
          announce(`${recipe.title}: odebráno, změnu lze vrátit.`);
        }, { className: 'kitchen-button' })));
      card.append(details);
      selection.append(card);
    }
    root.append(selection);

    const progressText = el('p', { id: 'shopping-progress', role: 'status' });
    const progress = el('progress', { max: Math.max(items.length, 1), 'aria-label': 'Průběh nákupu' });
    const missingControl = button('', () => {
      filters.missing = !filters.missing;
      if (filters.missing) { filters.search = ''; filters.category = ''; filters.hideDone = false; }
      syncFilters(); refreshItems();
    }, { className: 'kitchen-button missing-filter', 'aria-pressed': 'false' });
    root.append(el('section', { className: 'shopping-summary' }, el('p', { className: 'eyebrow' }, 'V OBCHODĚ'),
      el('h2', { id: 'shopping-heading', tabIndex: -1 }, 'Suroviny k nákupu'), progressText, progress, missingControl));

    const search = el('input', { type: 'search', id: 'shopping-filter', placeholder: 'Najít surovinu v nákupu…', value: filters.search });
    const category = el('select', { id: 'shopping-category' }, el('option', { value: '' }, 'Všechna oddělení'),
      catalog.departments.filter(name => items.some(item => item.category === name)).map(name => el('option', { value: name, selected: name === filters.category }, name)));
    const hideDone = el('input', { id: 'hide-done', type: 'checkbox', checked: filters.hideDone });
    const syncFilters = () => { search.value = filters.search; category.value = filters.category; hideDone.checked = filters.hideDone; };
    const resetFilters = () => {
      Object.assign(filters, { search: '', category: '', hideDone: false, missing: false });
      syncFilters(); refreshItems(); search.focus();
    };
    search.addEventListener('input', () => { filters.search = search.value; refreshItems(); });
    category.addEventListener('change', () => { filters.category = category.value; refreshItems(); });
    hideDone.addEventListener('change', () => { filters.hideDone = hideDone.checked; refreshItems(); });
    const filterStatus = el('p', { className: 'kitchen-muted shopping-filter-status', role: 'status' });
    root.append(el('div', { className: 'shopping-filters' },
      el('label', { htmlFor: search.id }, el('span', { className: 'visually-hidden' }, 'Najít surovinu v nákupu'), search),
      el('div', { className: 'shopping-filter-row' }, el('label', { htmlFor: category.id }, el('span', { className: 'visually-hidden' }, 'Oddělení obchodu'), category),
        el('label', { className: 'check-label' }, hideDone, 'Skrýt hotové')), filterStatus));

    const exportArea = el('div', { id: 'export-area' });
    const exportText = () => shoppingText(items, state.checked, state.amounts);
    const download = el('a', { className: 'kitchen-button', download: 'nakupni-seznam.txt' }, 'Stáhnout .txt');
    root.append(el('div', { className: 'shopping-exports button-group' },
      button('Kopírovat', async () => {
        try { await navigator.clipboard.writeText(exportText()); announce('Nákupní seznam zkopírován.'); }
        catch {
          const field = el('textarea', { readOnly: true, value: exportText(), 'aria-label': 'Text nákupního seznamu', rows: 10 });
          exportArea.replaceChildren(el('p', {}, 'Vyberte a zkopírujte tento text.'), field);
          field.focus(); field.select();
        }
      }, { className: 'kitchen-button' }), download,
      button('PDF / tisk', () => openShoppingPrint(items, recipes), { className: 'kitchen-button' })), exportArea);

    const shopping = el('div', { className: 'shopping-list', id: 'shopping-list' });
    const rows = new Map();
    const sections = [];
    for (const name of catalog.departments) {
      const categoryItems = items.filter(item => item.category === name);
      if (!categoryItems.length) continue;
      const count = el('span', { className: 'count-badge' });
      const section = el('section', { className: 'shopping-department' }, el('h3', {}, name, count));
      sections.push({ section, count, items: categoryItems });
      for (const item of categoryItems) {
        const id = `shopping-${encodeURIComponent(item.key)}`;
        const done = state.checked[item.key] === item.signature;
        const check = el('input', { id, type: 'checkbox', checked: done, onChange: event => {
          if (event.target.checked) state.checked[item.key] = item.signature; else delete state.checked[item.key];
          save(); refreshItems(item.key);
        } });
        const sources = el('details', { id: `${id}-sources`, className: 'shopping-sources' },
          el('summary', {}, shoppingNeedsAmount(item, state.amounts) ? 'Doplnit množství' : `Původ a poznámky · ${new Set(item.sources.map(source => source.id)).size}`),
          el('ul', {}, item.sources.map(source => el('li', {}, el('a', { href: url(`${source.id}.html#ingredience`) }, source.recipe),
            ` · ${source.quantity}${source.group !== 'Základ' ? ` · ${source.group}` : ''}${source.note ? ` — ${source.note}` : ''}`))));
        if (!item.quantity) {
          const draftKey = `${item.key}:${item.signature}`;
          const ownAmount = state.amounts[item.key]?.signature === item.signature ? state.amounts[item.key].text : '';
          const field = el('input', { id: `${id}-amount`, type: 'text', maxLength: 120, value: drafts.get(draftKey) ?? ownAmount,
            placeholder: 'Např. 1 balení nebo 200 g', 'aria-label': `Vlastní množství: ${item.name}`, onInput: event => drafts.set(draftKey, event.target.value) });
          sources.append(el('label', { className: 'factor-label' }, 'Vlastní množství pro tento nákup', field),
            button('Uložit množství', () => {
              state.amounts[item.key] = { text: field.value.trim(), signature: item.signature };
              drafts.delete(draftKey);
              delete state.checked[item.key];
              save(); preserveView(render);
              const next = root.querySelector('.shopping-item:not([hidden]) input[type="checkbox"]');
              if (filters.missing) (next || root.querySelector('#shopping-filter')).focus({ preventScroll: true });
              announce('Vlastní množství uloženo.');
            }, { className: 'kitchen-button' }), el('p', {}, 'Při změně jídel nebo dávky se vrátí údaj z receptu.'));
        }
        const amount = shoppingAmount(item, state.amounts);
        const row = el('div', { className: 'shopping-item' },
          el('label', { htmlFor: id, className: 'shopping-check' }, check,
            el('span', {}, el('strong', {}, item.name), el('small', {}, [...new Set(item.sources.map(source => source.note).filter(Boolean))].join(' · '))),
            el('span', { className: `ingredient-amount${amount === 'neuvedeno' ? ' amount-unknown' : ''}` }, amount === 'neuvedeno' ? 'Doplnit' : amount)), sources);
        if (shoppingNeedsAmount(item, state.amounts)) row.classList.add('needs-amount');
        rows.set(item.key, { row, check });
        section.append(row);
      }
      shopping.append(section);
    }
    const empty = el('div', { className: 'kitchen-empty', hidden: true });
    shopping.append(empty);
    root.append(shopping, el('div', { className: 'plan-footer' },
      el('p', { className: 'storage-message kitchen-muted' }, storageMessage),
      el('p', { className: 'kitchen-muted' }, 'Bez připojení použijte stažený nebo vytištěný seznam.'),
      button('Začít nový nákup', () => {
        undoState = structuredClone(state);
        state.selections = {}; state.checked = {}; state.amounts = {}; drafts.clear();
        save(); render(); announce('Nákup vymazán; můžete jej vrátit.');
      }, { className: 'kitchen-button' })));
    if (undoState) root.append(button('Vrátit poslední odebrání', restoreUndo, { className: 'kitchen-button' }));

    function refreshItems(changedKey) {
      const visible = new Set(filterShoppingItems(items, filters, state.checked, state.amounts).map(item => item.key));
      for (const item of items) {
        const { row, check } = rows.get(item.key);
        const done = state.checked[item.key] === item.signature;
        row.hidden = !visible.has(item.key);
        row.classList.toggle('is-done', done);
        check.checked = done;
      }
      for (const group of sections) {
        const visibleCount = group.items.filter(item => visible.has(item.key)).length;
        group.section.hidden = !visibleCount;
        group.count.textContent = String(visibleCount);
      }
      const bought = items.filter(item => state.checked[item.key] === item.signature).length;
      const missing = items.filter(item => shoppingNeedsAmount(item, state.amounts)).length;
      progress.value = bought;
      progressText.textContent = `${bought} z ${items.length} položek máte připraveno`;
      missingControl.textContent = `Chybí množství (${missing})`;
      missingControl.hidden = !missing && !filters.missing;
      missingControl.setAttribute('aria-pressed', String(filters.missing));
      filterStatus.textContent = visible.size === items.length ? 'Zaškrtněte, co máte doma nebo v košíku.' : `Zobrazeno ${visible.size} z ${items.length} položek · export obsahuje celý nákup`;
      download.href = `data:text/plain;charset=utf-8,${encodeURIComponent(exportText())}`;
      empty.hidden = visible.size > 0;
      if (!visible.size) {
        const allDone = bought === items.length && !filters.search && !filters.category && !filters.missing;
        empty.replaceChildren(el('h3', {}, allDone ? 'Všechno máte připravené' : 'Tomuto filtru nic neodpovídá'),
          allDone ? button('Vybrat jídlo k vaření', () => setMode(false), { className: 'kitchen-button primary' })
            : button('Zrušit filtry', resetFilters, { className: 'kitchen-button' }));
      }
      if (changedKey && !visible.has(changedKey)) {
        const index = items.findIndex(item => item.key === changedKey);
        const next = items.slice(index + 1).find(item => visible.has(item.key)) || items.find(item => visible.has(item.key));
        if (next) rows.get(next.key).check.focus({ preventScroll: true });
        else (empty.querySelector('button') || search).focus({ preventScroll: true });
      }
      updateTray();
    }
    refreshItems();
  };

  function restoreUndo() {
    Object.assign(state, { selections: undoState.selections, checked: undoState.checked, amounts: undoState.amounts });
    undoState = null;
    save(); render(); announce('Původní výběr obnoven.');
  }
  render();
}

function openShoppingPrint(items, recipes) {
  const sheet = el('div', { className: 'shopping-print-sheet' }, el('h1', { id: 'print-title' }, 'Nákupní seznam'),
    el('p', { className: 'print-recipes' }, recipes.map(recipe => `${recipe.title} (${String(state.selections[recipe.id].factor).replace('.', ',')}×)`).join(' · ')));
  for (const category of catalog.departments) {
    const group = items.filter(item => item.category === category);
    if (!group.length) continue;
    sheet.append(el('section', { className: 'print-department' }, el('h2', {}, category), group.map(item =>
      el('div', { className: 'print-item' }, el('p', {}, state.checked[item.key] === item.signature ? '☑ ' : '☐ ',
        el('strong', {}, item.name), ` — ${shoppingAmount(item, state.amounts)}`),
        el('small', {}, item.sources.map(source => `${source.recipe}${source.group !== 'Základ' ? ` (${source.group})` : ''}: ${source.quantity}${source.note ? ` (${source.note})` : ''}`).join(' · '))))));
  }
  openPrintPreview(sheet, 'Celý nákup včetně hotových položek a původních množství.');
}

function openPrintPreview(sheet, description) {
  const opener = document.activeElement;
  const status = el('p', { className: 'kitchen-muted', role: 'status' }, 'Připravuje se soubor PDF…');
  const download = el('a', { className: 'kitchen-button primary', hidden: true,
    download: `${sheet.querySelector('h1').textContent.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf` }, 'Stáhnout PDF');
  const dialog = el('dialog', { className: 'kitchen-app shopping-print-dialog', 'aria-labelledby': 'print-title' },
    el('div', { className: 'print-controls' }, el('p', {}, description),
      status,
      el('div', { className: 'button-group' }, download, button('Tisk', () => window.print(), { className: 'kitchen-button' }),
        button('Zavřít náhled', () => dialog.close(), { className: 'kitchen-button' }))), el('div', { className: 'print-preview-scroll' }, sheet));
  dialog.addEventListener('close', () => { dialog.remove(); opener?.focus(); });
  document.body.append(dialog);
  dialog.showModal();
  import('./kitchen-pdf.mjs').then(module => module.createKitchenPdf(sheet)).then(href => {
    download.href = href;
    download.hidden = false;
    status.textContent = 'PDF je připravené ke stažení a použití bez připojení.';
  }).catch(() => { status.textContent = 'PDF se nepodařilo připravit. Zkuste náhled otevřít znovu nebo použijte Tisk → Uložit jako PDF.'; });
}

function openRecipePrint(recipe, contents, config, preparation) {
  const sheet = el('div', { className: 'shopping-print-sheet recipe-print-sheet' },
    el('h1', { id: 'print-title' }, recipe.title), el('p', {}, recipe.description),
    el('p', {}, `${String(config.factor).replace('.', ',')}× původní dávka · počet porcí zdroj neuvádí`),
    preparation.length ? el('section', {}, el('h2', {}, 'Než začnete'), preparation.map(node => node.cloneNode(true))) : null,
    el('h2', {}, 'Suroviny'));
  const ingredients = selectedIngredients(recipe, config);
  for (const group of recipe.groups) {
    const included = ingredients.filter(item => item.group === group.id);
    if (!included.length) continue;
    sheet.append(el('h3', {}, group.title), el('ul', {}, included.map(item =>
      el('li', {}, el('strong', {}, item.name), ` — ${quantityLabel(item, config.factor)}${item.note ? ` · ${item.note}` : ''}`))));
  }
  sheet.append(el('h2', {}, 'Postup'));
  if (config.factor !== 1) sheet.append(el('p', {}, 'Množství uvedená přímo v textu postupu, časy a teploty zůstávají původní.'));
  recipe.steps.forEach((step, index) => {
    if (step.optionalGroup && !config.enabled[step.optionalGroup]) return;
    sheet.append(el('section', { className: 'print-step' }, el('h3', {}, `${index + 1}. ${step.title}`), contents[index].map(node => node.cloneNode(true))));
  });
  openPrintPreview(sheet, 'Recept obsahuje právě zvolenou dávku, suroviny a přílohy.');
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
  const preparationHeading = [...article.querySelectorAll('h2')].find(node => node.textContent.trim().startsWith('Než začnete'));
  const preparation = [];
  if (preparationHeading) {
    for (let node = preparationHeading.nextElementSibling; node && node.tagName !== 'H2'; node = node.nextElementSibling) preparation.push(node);
    const aside = el('aside', { className: 'recipe-preparation' }, preparationHeading, preparation);
    ingredientsHeading.before(aside);
    const preparationLink = document.querySelector(`.affix a[href="#${preparationHeading.id}"]`)?.closest('li');
    const ingredientsLink = document.querySelector(`.affix a[href="#${ingredientsHeading.id}"]`)?.closest('li');
    if (preparationLink && ingredientsLink) ingredientsLink.before(preparationLink);
  }
  const equipmentHeading = [...article.querySelectorAll('h2')].find(node => node.textContent.trim().startsWith('Pomůcky'));
  if (equipmentHeading) {
    preparation.push(el('h3', {}, 'Pomůcky'));
    for (let node = equipmentHeading.nextElementSibling; node && node.tagName !== 'H2'; node = node.nextElementSibling) preparation.push(node.cloneNode(true));
  }
  const config = recipeSettings(recipe, state.selections[recipe.id]);
  const repaint = () => {
    editor.replaceChildren(recipeEditor(recipe, config, () => { if (selected(recipe)) state.selections[recipe.id] = structuredClone(config); save(); preserveView(repaint); }, 'detail'));
    controls.replaceChildren(workflow('cooking'), el('div', { className: 'recipe-actions' },
      button('Vařit krok za krokem', () => openCooking(recipe, stepContents, config, preparation, repaint), { className: 'kitchen-button primary', id: 'start-cooking' }),
      button(selected(recipe) ? '✓ V nákupu' : 'Přidat do nákupu', () => {
        if (selected(recipe)) delete state.selections[recipe.id]; else state.selections[recipe.id] = structuredClone(config);
        save(); repaint(); announce(selected(recipe) ? 'Recept je v nákupu.' : 'Recept byl odebrán.');
      }, { className: 'kitchen-button', 'aria-pressed': String(selected(recipe)) })),
      el('div', { className: 'recipe-secondary-actions' },
        el('a', { href: '#postup', onClick: event => { event.preventDefault(); const heading = document.getElementById('postup'); heading.tabIndex = -1; focusSection(heading); } }, 'Celý postup'),
        button('PDF / tisk receptu', () => openRecipePrint(recipe, stepContents, config, preparation), { className: 'kitchen-button' })));
  };
  ingredientsHeading.before(controls);
  ingredientsHeading.after(editor);
  repaint();
  if (location.hash === '#vareni') openCooking(recipe, stepContents, config, preparation, repaint);
}

function openCooking(recipe, contents, config, preparation, closed) {
  const cooking = state.cooking[recipe.id] ||= { step: 0, done: [] };
  const dialog = el('dialog', { className: 'kitchen-app cooking-dialog', 'aria-labelledby': 'cook-title' });
  const move = index => {
    cooking.step = index;
    save(); render();
    dialog.querySelector('#cook-title').focus({ preventScroll: true });
  };
  const render = () => {
    const progress = cookingProgress(recipe, config, cooking);
    const step = recipe.steps[cooking.step];
    const omitted = !progress.active.includes(cooking.step);
    const position = progress.active.indexOf(cooking.step);
    const previous = progress.active.filter(index => index < cooking.step).at(-1);
    const next = progress.active.find(index => index > cooking.step);
    const remaining = progress.active.filter(index => !progress.done.includes(index));
    const jump = el('select', { id: 'cook-jump', 'aria-label': 'Přejít na krok', onChange: event => move(Number(event.target.value)) },
      recipe.steps.map((item, index) => el('option', { value: String(index), selected: index === cooking.step },
        `${index + 1}. ${item.title}${!progress.active.includes(index) ? ' · vynecháno' : cooking.done.includes(index) ? ' ✓' : ''}`)));
    const ingredients = el('details', { className: 'cook-ingredients', id: 'cook-ingredients' },
      el('summary', {}, 'Suroviny a zvolené varianty'), recipeEditor(recipe, config, () => {
        if (selected(recipe)) state.selections[recipe.id] = structuredClone(config);
        save(); preserveView(render);
      }, 'cook'));
    const body = el('div', { className: 'cook-scroll', id: 'cook-scroll', 'data-preserve-scroll': '' },
      preparation.length ? el('details', { className: 'cook-preparation', id: 'cook-preparation' },
        el('summary', {}, 'Než začnete'), preparation.map(node => node.cloneNode(true))) : null,
      jump, el('h2', { id: 'cook-title', tabIndex: -1 }, step.title),
      config.factor !== 1 ? el('p', { className: 'shopping-hint' }, `${String(config.factor).replace('.', ',')}× dávka: suroviny jsou přepočítané; údaje v textu, časy a teploty zůstávají původní.`) : null,
      omitted ? el('p', { className: 'shopping-hint' }, 'Tuto přílohu nemáte vybranou a pro dokončení ji nemusíte připravovat.') : null,
      el('div', { className: 'cook-content' }, contents[cooking.step].map(node => node.cloneNode(true))),
      omitted ? null : el('label', { className: 'check-label cook-done' },
        el('input', { type: 'checkbox', id: 'cook-done', checked: cooking.done.includes(cooking.step), onChange: event => {
          cooking.done = event.target.checked ? [...new Set([...cooking.done, cooking.step])] : cooking.done.filter(index => index !== cooking.step);
          save(); preserveView(render);
        } }), 'Tento krok mám hotový'),
      progress.complete ? el('p', { className: 'cooking-complete', role: 'status' }, 'Vše hotovo. Dobrou chuť!') : null,
      ingredients, el('p', { className: 'storage-message kitchen-muted' }, storageMessage),
      button('Začít postup znovu', () => { cooking.done = []; move(progress.active[0]); }, { className: 'kitchen-button' }));
    let actionLabel = omitted ? 'Přeskočit přílohu' : next !== undefined ? 'Hotovo, další krok →' : 'Dokončit krok';
    if (progress.complete) actionLabel = 'Zavřít vaření';
    else if (!omitted && cooking.done.includes(cooking.step) && next === undefined && remaining.length) actionLabel = 'K nedokončenému kroku';
    const advance = () => {
      if (progress.complete) { dialog.close(); return; }
      if (!omitted && !cooking.done.includes(cooking.step)) cooking.done.push(cooking.step);
      if (next !== undefined) { move(next); return; }
      const updated = cookingProgress(recipe, config, cooking);
      if (!updated.complete) {
        const pending = updated.active.find(index => !updated.done.includes(index));
        announce('Pokračujte nedokončeným krokem.');
        move(pending);
      } else { save(); render(); }
    };
    dialog.replaceChildren(el('header', { className: 'cook-header' },
      el('div', { className: 'cook-top' }, el('p', { className: 'eyebrow' }, recipe.title),
        button('Zavřít', () => dialog.close(), { className: 'kitchen-button' })),
      el('p', { className: 'kitchen-muted' }, omitted ? 'Volitelný krok mimo výběr' : `Krok ${position + 1} z ${progress.active.length} · ${progress.done.length} hotovo`),
      el('progress', { value: progress.done.length, max: progress.active.length, 'aria-label': 'Hotové kroky' })), body,
      el('footer', { className: 'cook-navigation' },
        button('← Předchozí', () => move(previous), { disabled: previous === undefined, className: 'kitchen-button' }),
        button(actionLabel, advance, { className: 'kitchen-button primary' })));
  };
  dialog.addEventListener('close', () => { dialog.remove(); closed(); document.getElementById('start-cooking')?.focus({ preventScroll: true }); });
  document.body.append(dialog);
  render();
  dialog.showModal();
  dialog.querySelector('#cook-title').focus({ preventScroll: true });
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
