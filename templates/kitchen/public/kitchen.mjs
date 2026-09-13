import { icon, labelIcon } from './ui-icons.mjs';
import { buildShoppingList, cookingProgress, filterShoppingItems, formatQuantity, parseQuantity, pruneShoppingState, recipeSettings, restoreState, selectedIngredients, shoppingAmount, shoppingText } from './kitchen-core.mjs';
import { exportShopping, importShopping, previewShoppingImport } from './kitchen-transfer.mjs';

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

function button(text, action, attrs = {}) { return el('button', { type: 'button', ...attrs, onClick: action }, labelIcon(text, null), text); }
function url(path) { return new URL(path, base).href; }
function selected(recipe) { return Object.hasOwn(state.selections, recipe.id); }
function announce(message) {
  notification.textContent = message;
  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => { notification.textContent = ''; }, 4500);
}

function save() {
  pruneShoppingState(
    state,
    buildShoppingList(catalog.recipes, state.selections, catalog.departments),
  );
  document.querySelectorAll('.ingredient-prepared').forEach((control) => {
    control.checked =
      state.checked[control.dataset.shoppingKey] === control.dataset.shoppingSignature;
    control.closest('.ingredient-row').classList.toggle('is-prepared', control.checked);
  });
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    storageMessage = 'Před zavřením použijte Export nákupu, protože ukládání není dostupné.';
    document.body.classList.add('kitchen-storage-unavailable');
  }
  document.querySelectorAll('.storage-message').forEach((node) => {
    node.textContent = storageMessage;
  });
  updateTray();
}

function toggle(recipe, control) {
  if (selected(recipe)) delete state.selections[recipe.id];
  else state.selections[recipe.id] = recipeSettings(recipe);
  save();
  if (control) {
    control.replaceChildren(icon(selected(recipe) ? 'check' : 'basket-plus'), selected(recipe) ? 'V nákupu' : 'Přidat do nákupu');
    control.setAttribute('aria-label', `${selected(recipe) ? 'V nákupu' : 'Přidat do nákupu'}: ${recipe.title}`);
    control.setAttribute('aria-pressed', String(selected(recipe)));
  }
  announce(`${recipe.title}: ${selected(recipe) ? 'přidáno do nákupu' : 'odebráno z nákupu'}.`);
}

function updateTray() {
  if (!tray) return;
  const count = Object.keys(state.selections).length;
  const cookingView = Boolean(document.querySelector('.recipe-procedure:not([hidden])'));
  if (plannerController && count) plannerController.updateTray();
  else tray.replaceChildren(el('span', {}, count ? `${count} ${count === 1 ? 'recept' : count < 5 ? 'recepty' : 'receptů'} v nákupu` : 'Vyberte si jídla na příští vaření'), el('a', { href: url(cookingView ? 'nakup.html#uvarit' : 'nakup.html'), className: 'kitchen-button primary' }, icon(cookingView ? 'kitchen' : 'basket'), cookingView ? 'Jídla k vaření' : 'Můj nákup', el('span', { className: 'count-badge' }, String(count))));
  if (document.body.classList.contains('kitchen-storage-unavailable')) tray.append(el('p', { className: 'tray-storage', role: 'status' }, storageMessage));
}

function focusSection(node) {
  if (!node) return;
  if (!node.hasAttribute('tabindex') && !node.matches('a, button, input, select, textarea')) node.tabIndex = -1;
  node.focus({ preventScroll: true });
  node.scrollIntoView({ block: 'start', behavior: 'instant' });
}

function workflow(active, destinations = {}, changed) {
  const navigation = el('nav', { className: 'kitchen-workflow', 'aria-label': 'Od výběru k vaření' },
    el('a', { href: url('kuchyne/index.html#recepty'), 'aria-current': active === 'recipes' ? 'page' : 'false' }, icon('book'), el('span', {}, 'Vybrat jídla')),
    el('a', { href: destinations.shopping || url('nakup.html'), 'data-phase': 'shopping', 'aria-current': active === 'shopping' ? 'page' : 'false' }, icon('basket'), el('span', {}, 'Nakoupit')),
    el('a', { href: destinations.cooking || url('nakup.html#uvarit'), 'data-phase': 'cooking', 'aria-current': active === 'cooking' ? 'page' : 'false' }, icon('kitchen'), el('span', {}, 'Uvařit')));
  if (changed) navigation.addEventListener('click', event => {
    const link = event.target.closest('a[data-phase]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault();
    if (location.href !== link.href) history.pushState(null, '', link.href);
    changed();
    focusSection(navigation);
  });
  return navigation;
}

function cookingActionLabel(recipe, config) {
  const cooking = state.cooking[recipe.id] || { step: 0, done: [] };
  const progress = cookingProgress(recipe, config, cooking);
  if (progress.complete) return 'Otevřít hotové vaření';
  return progress.done.length || cooking.step > 0 ? 'Pokračovat ve vaření' : 'Vařit krok za krokem';
}

function cookingSelection(recipes) {
  const section = el('section', { id: 'cooking-selection', 'aria-labelledby': 'cooking-selection-heading' },
    el('div', { className: 'section-heading' }, el('h2', { id: 'cooking-selection-heading', tabIndex: -1 }, 'Co budete vařit?')),
    el('p', { className: 'kitchen-muted' }, 'Vařte krok za krokem, nebo si prohlédněte celý postup.'));
  if (!recipes.length) {
    section.append(el('div', { className: 'kitchen-empty' }, icon('kitchen'),
      el('h3', {}, 'Nejdřív vyberte něco dobrého'),
      el('a', { href: url('kuchyne/index.html#recepty'), className: 'kitchen-button primary' }, icon('book'), 'Vybrat recepty')));
    return section;
  }
  section.append(el('div', { className: 'cooking-selection-grid' }, recipes.map(recipe => {
    const config = recipeSettings(recipe, state.selections[recipe.id]);
    const progress = cookingProgress(recipe, config, state.cooking[recipe.id] || { step: 0, done: [] });
    const action = cookingActionLabel(recipe, config);
    return el('section', { className: 'cooking-selection-card' },
      el('div', { className: 'recipe-card-meta' }, el('span', { className: 'recipe-symbol' }, labelIcon(recipe.typeLabel, 'food')),
        el('span', {}, recipe.typeLabel), el('span', { className: 'recipe-origin' }, labelIcon(recipe.origin.split(', ').at(-1)), recipe.origin.split(', ').at(-1))),
      el('h3', {}, el('a', { href: url(`${recipe.id}.html#uvarit`) }, recipe.title)),
      el('p', { className: 'kitchen-muted' }, `${String(config.factor).replace('.', ',')}× dávka · ${progress.done.length} z ${progress.active.length} kroků hotovo`),
      el('div', { className: 'recipe-card-actions' },
        el('a', { href: url(`${recipe.id}.html#vareni`), className: 'kitchen-button primary', 'aria-label': `${action}: ${recipe.title}` }, icon('kitchen'), action),
        el('a', { href: url(`${recipe.id}.html#uvarit`), 'aria-label': `Celý postup: ${recipe.title}` }, icon('list'), 'Celý postup')));
  })));
  return section;
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
    const recipes = catalog.recipes.filter(recipe => (!type.value || recipe.typeLabel === type.value) && (!onlySelected.checked || selected(recipe)) && terms.every(term => normalize([recipe.title, recipe.description, recipe.typeLabel, recipe.origin, ...recipe.ingredients.flatMap(item => item.options.map(option => option.name))].join(' ')).includes(term)));
    resultCount.textContent = `${recipes.length} z ${catalog.recipes.length} receptů a nápojů`;
    grid.replaceChildren(...recipes.map(recipe => {
      const control = button(selected(recipe) ? 'V nákupu' : 'Přidat do nákupu', () => {
        toggle(recipe, control);
        if (onlySelected.checked) { renderResults(); onlySelected.focus({ preventScroll: true }); }
      }, { 'aria-label': `${selected(recipe) ? 'V nákupu' : 'Přidat do nákupu'}: ${recipe.title}`, 'aria-pressed': String(selected(recipe)), className: 'kitchen-button' });
      return el('section', { className: 'recipe-card' },
        el('div', { className: 'recipe-card-meta' }, el('span', { className: 'recipe-symbol' }, labelIcon(recipe.typeLabel, 'food')), el('span', {}, recipe.typeLabel), el('span', { className: 'recipe-origin' }, labelIcon(recipe.origin.split(', ').at(-1)), recipe.origin.split(', ').at(-1))),
        el('h2', {}, el('a', { href: url(`${recipe.id}.html`) }, recipe.title)),
        el('p', {}, recipe.description),
        recipe.preparation ? el('p', { className: 'recipe-card-preparation' }, icon('clock'), el('strong', {}, 'Předem: '), recipe.preparation) : null,
        el('div', { className: 'recipe-card-actions' }, el('a', { href: url(`${recipe.id}.html#uvarit`) }, icon('list'), `Postup · ${recipe.steps.length} ${recipe.steps.length === 1 ? 'krok' : recipe.steps.length < 5 ? 'kroky' : 'kroků'}`), control));
    }));
    if (!recipes.length) grid.append(el('div', { className: 'kitchen-empty' }, icon('search'), el('h2', {}, 'Tady zatím nic není'), el('p', {}, 'Zkuste jiný název, surovinu nebo zrušte filtr.'), button('Zrušit filtry', () => { search.value = ''; type.value = ''; onlySelected.checked = false; renderResults(); search.focus(); }, { className: 'kitchen-button' })));
  };
  search.addEventListener('input', renderResults);
  type.addEventListener('change', renderResults);
  onlySelected.addEventListener('change', renderResults);
  root.replaceChildren(workflow('recipes'), el('div', { className: 'catalog-tools' }, el('label', { htmlFor: search.id }, 'Najít jídlo nebo surovinu', search), el('div', { className: 'catalog-filter-row' }, el('label', { htmlFor: type.id }, el('span', { className: 'visually-hidden' }, 'Druh receptu'), type), el('label', { className: 'check-label' }, onlySelected, 'Jen vybrané'))), resultCount, grid, el('p', { className: 'storage-message catalog-storage kitchen-muted' }, storageMessage));
  document.querySelector('.catalog-fallback')?.setAttribute('hidden', '');
  renderResults();
}

function quantityLabel(item, factor) {
  const parsed = parseQuantity(item.quantity);
  return parsed ? formatQuantity({ ...parsed, min: parsed.min * factor, max: parsed.max * factor }) : item.quantity === 'neuvedeno' ? 'Množství neuvedeno' : item.quantity;
}

function recipeEditor(recipe, config, changed, idPrefix) {
  const plannedItems = new Map(
    buildShoppingList(
      catalog.recipes,
      { ...state.selections, [recipe.id]: config },
      catalog.departments,
    ).map((item) => [item.key, item]),
  );
  const factor = el(
    'select',
    {
      id: `${idPrefix}-factor`,
      value: String(config.factor),
      onChange: (event) => {
        config.factor = Number(event.target.value);
        changed();
      },
    },
    [0.5, 1, 1.5, 2, 3, 4].map((value) =>
      el(
        'option',
        { value: String(value), selected: config.factor === value },
        `${String(value).replace('.', ',')}× původní dávka`,
      ),
    ),
  );
  const editor = el(
    'div',
    { className: 'recipe-editor' },
    el('label', { className: 'factor-label', htmlFor: factor.id }, 'Kolik připravíte', factor),
    el(
      'p',
      { className: 'kitchen-muted' },
      'Protože zdroj neuvádí počet porcí, násobí se pouze uvedená množství.',
    ),
  );
  editor.append(
    el(
      'p',
      { className: 'ingredient-check-help' },
      icon('check'),
      'Zaškrtněte, co už máte doma nebo připravené.',
    ),
  );
  if (!selected(recipe))
    editor.append(
      el('p', { className: 'kitchen-muted' }, 'První zaškrtnutí přidá tento recept do nákupu.'),
    );
  for (const group of recipe.groups) {
    const groupOn = !group.optional || config.enabled[group.id];
    const groupBox = el('fieldset', {
      className: `ingredient-group${groupOn ? '' : ' is-omitted'}`,
    });
    const legend = el('legend', {}, group.title);
    if (group.optional)
      legend.replaceChildren(
        el(
          'label',
          { className: 'check-label' },
          el('input', {
            type: 'checkbox',
            id: `${idPrefix}-${group.id}`,
            checked: groupOn,
            onChange: (event) => {
              config.enabled[group.id] = event.target.checked;
              changed();
            },
          }),
          `Zahrnout: ${group.title} · volitelné`,
        ),
      );
    groupBox.append(legend);
    for (const item of recipe.ingredients.filter((item) => item.group === group.id)) {
      const enabled = groupOn && (!item.optional || config.enabled[item.id]);
      const option = item.options[config.choices[item.id]];
      const contribution = buildShoppingList(
        [{ ...recipe, ingredients: [item] }],
        { [recipe.id]: config },
        catalog.departments,
      )[0];
      const planned = plannedItems.get(contribution?.key);
      const ready = Boolean(planned && state.checked[planned.key] === planned.signature);
      const row = el('div', {
        className: `ingredient-row has-prepared-check${enabled ? '' : ' is-omitted'}${ready ? ' is-prepared' : ''}`,
      });
      const prepared = el('input', {
        type: 'checkbox',
        id: `${idPrefix}-${item.id}-prepared`,
        className: 'ingredient-prepared',
        checked: ready,
        disabled: !enabled,
        'aria-label': `Mám připraveno: ${option.name}`,
        'data-shopping-key': planned?.key || '',
        'data-shopping-signature': planned?.signature || '',
        onChange: (event) => {
          const added = !selected(recipe);
          state.selections[recipe.id] = structuredClone(config);
          if (event.target.checked) state.checked[planned.key] = planned.signature;
          else delete state.checked[planned.key];
          changed();
          announce(
            `${option.name}: ${event.target.checked ? 'připraveno' : 'zbývá připravit'}${added ? `, recept ${recipe.title} byl přidán do nákupu` : ''}.`,
          );
        },
      });
      const content = el(
        'div',
        { className: 'ingredient-content' },
        el(
          'label',
          { htmlFor: prepared.id, className: 'ingredient-name' },
          el('strong', {}, option.name),
        ),
      );
      if (item.options.length > 1) {
        content.append(
          el(
            'label',
            {},
            el('span', { className: 'kitchen-muted choice-caption' }, 'Vyberte jednu možnost'),
            el(
              'select',
              {
                id: `${idPrefix}-${item.id}-choice`,
                'aria-label': `Varianta: ${item.options.map((option) => option.name).join(' nebo ')}`,
                disabled: !enabled,
                onChange: (event) => {
                  config.choices[item.id] = Number(event.target.value);
                  changed();
                },
              },
              item.options.map((option, index) =>
                el(
                  'option',
                  { value: String(index), selected: config.choices[item.id] === index },
                  option.name,
                ),
              ),
            ),
          ),
        );
      }
      const note = item.note.replace(/(?:^|[;,]\s*)volitelné(?:[;,]\s*|$)/, '').trim();
      if (note) content.append(el('small', {}, note));
      if (planned && planned.sources.length > 1)
        content.append(
          el(
            'small',
            { className: 'ingredient-shared' },
            `V celém nákupu potvrzujete ${planned.amount} ze všech použití této suroviny.`,
          ),
        );
      if (item.optional)
        content.append(
          button(
            config.enabled[item.id] ? 'Vynechat' : 'Zahrnout',
            () => {
              config.enabled[item.id] = !config.enabled[item.id];
              changed();
            },
            {
              id: `${idPrefix}-${item.id}`,
              className: 'ingredient-inclusion kitchen-button',
              disabled: !groupOn,
              'aria-pressed': String(Boolean(config.enabled[item.id])),
              'aria-label': `${config.enabled[item.id] ? 'Vynechat' : 'Zahrnout'} volitelnou surovinu: ${option.name}`,
            },
          ),
          el('small', { className: 'ingredient-optional' }, 'Volitelné'),
        );
      row.append(
        prepared,
        content,
        el(
          'span',
          {
            className: `ingredient-amount${item.quantity === 'neuvedeno' ? ' amount-unknown' : ''}`,
          },
          enabled ? quantityLabel(item, config.factor) : 'Nezahrnuto',
        ),
      );
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
  const filters = { search: '', category: '', hideDone: false };
  let shoppingMode = location.hash === '#nakupovat';
  let cookingView = location.hash === '#uvarit';

  const syncViews = (focus = false) => {
    cookingView = location.hash === '#uvarit';
    shoppingMode = location.hash === '#nakupovat' && Object.keys(state.selections).length > 0;
    document.body.classList.toggle('kitchen-shopping-mode', shoppingMode);
    document.body.classList.toggle('kitchen-cooking-view', cookingView);
    const shopping = root.querySelector('#shopping-view');
    const cooking = root.querySelector('#cooking-selection');
    if (shopping) shopping.hidden = cookingView;
    if (cooking) cooking.hidden = !cookingView;
    for (const link of root.querySelectorAll('.kitchen-workflow [data-phase]')) {
      link.setAttribute('aria-current', link.dataset.phase === (cookingView ? 'cooking' : 'shopping') ? 'page' : 'false');
    }
    updateTray();
    if (focus) focusSection(root.querySelector(shoppingMode ? '#shopping-heading' : '.kitchen-workflow'));
  };

  const finishViews = recipes => {
    const navigation = root.firstElementChild;
    const shopping = el('section', { id: 'shopping-view', 'aria-label': 'Nákup' });
    while (navigation.nextSibling) shopping.append(navigation.nextSibling);
    root.append(shopping, cookingSelection(recipes));
    syncViews();
  };

  const setMode = mode => {
    location.hash = mode ? 'nakupovat' : 'nakup';
    syncViews(true);
  };

  plannerController = {
    applyImported(imported) {
      undoState = structuredClone(state);
      Object.assign(state, imported);
      Object.assign(filters, { search: '', category: '', hideDone: false });
      save(); render();
    },
    updateTray() {
      const items = buildShoppingList(catalog.recipes, state.selections, catalog.departments);
      const remaining = items.filter(item => state.checked[item.key] !== item.signature).length;
      if (cookingView) {
        tray.replaceChildren(el('span', {}, 'Jídla připravená k vaření'),
          el('a', { href: '#nakup', className: 'kitchen-button' }, icon('basket'), 'Zpět k nákupu'));
      } else if (shoppingMode) {
        tray.replaceChildren(el('span', {}, el('strong', {}, String(remaining)), ' položek zbývá'),
          button('Filtr', () => focusSection(document.getElementById('shopping-filter')), { className: 'kitchen-button' }),
          button('Jídla', () => setMode(false), { className: 'kitchen-button', 'aria-label': 'Jídla: upravit výběr' }),
          el('a', { href: '#uvarit', className: 'kitchen-button primary' }, icon('kitchen'), 'Uvařit'));
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
    root.replaceChildren(workflow('shopping', { shopping: '#nakup', cooking: '#uvarit' }, syncViews), el('section', { className: 'shopping-sharing', 'aria-label': 'Sdílení nákupu' },
      el('div', {}, el('strong', {}, 'Nakupujete společně?'), el('p', { className: 'kitchen-muted' }, 'Pošlete si aktuální nákup včetně hotových položek.')),
      el('div', { className: 'button-group' },
        button('Export nákupu', openShoppingExport, { id: 'export-shopping', className: 'kitchen-button', disabled: !recipes.length }),
        button('Import nákupu', () => openShoppingImport(), { id: 'import-shopping', className: 'kitchen-button' }))));
    if (!recipes.length) {
      root.append(el('div', { className: 'kitchen-empty' }, el('div', { className: 'empty-symbol' }, icon('basket')),
        el('h2', {}, 'Co bude dobrého?'), el('p', {}, 'Vyberte si několik jídel a suroviny se spojí do jednoho nákupního seznamu.'),
        el('a', { className: 'kitchen-button primary', href: url('kuchyne/index.html#recepty') }, icon('book'), 'Vybrat recepty')));
      if (undoState) root.append(button('Vrátit vymazaný výběr', restoreUndo, { className: 'kitchen-button' }));
      finishViews(recipes);
      return;
    }

    const selection = el('section', { className: 'selected-recipes', 'aria-label': 'Vybraná jídla' },
      el('div', { className: 'section-heading' }, el('h2', { id: 'selected-heading', tabIndex: -1 }, `Vybraná jídla (${recipes.length})`),
        el('a', { href: url('kuchyne/index.html#recepty') }, '+ Přidat další')));
    for (const recipe of recipes) {
      const id = `selection-${recipe.id.replaceAll('/', '-')}`;
      const card = el('div', { className: 'selected-recipe-card' },
        el('div', { className: 'selected-recipe-title' }, el('h3', {}, el('a', { href: url(`${recipe.id}.html#ingredience`) }, recipe.title))));
      const details = el('details', { className: 'selected-recipe', id },
        el('summary', {}, `${String(state.selections[recipe.id].factor).replace('.', ',')}× dávka · upravit suroviny`),
        recipeEditor(recipe, state.selections[recipe.id], () => { save(); preserveView(render); }, id),
        el('div', { className: 'selected-actions' }, button('Odebrat z nákupu', () => {
          undoState = structuredClone(state);
          delete state.selections[recipe.id];
          save(); preserveView(render);
          focusSection(root.querySelector('#selected-heading') || root.querySelector('.kitchen-empty a'));
          announce(`${recipe.title}: odebráno, změnu lze vrátit.`);
        }, { className: 'kitchen-button' })));
      card.append(details);
      selection.append(card);
    }
    root.append(selection);

    const progressText = el('p', { id: 'shopping-progress', role: 'status' });
    const progress = el('progress', { max: Math.max(items.length, 1), 'aria-label': 'Průběh nákupu' });
    root.append(el('section', { className: 'shopping-summary' }, el('p', { className: 'eyebrow' }, 'V OBCHODĚ'),
      el('h2', { id: 'shopping-heading', tabIndex: -1 }, icon('basket'), 'Suroviny k nákupu'), progressText, progress));

    const search = el('input', { type: 'search', id: 'shopping-filter', placeholder: 'Najít surovinu v nákupu…', value: filters.search });
    const category = el('select', { id: 'shopping-category' }, el('option', { value: '' }, 'Všechna oddělení'),
      catalog.departments.filter(name => items.some(item => item.category === name)).map(name => el('option', { value: name, selected: name === filters.category }, name)));
    const hideDone = el('input', { id: 'hide-done', type: 'checkbox', checked: filters.hideDone });
    const syncFilters = () => { search.value = filters.search; category.value = filters.category; hideDone.checked = filters.hideDone; };
    const resetFilters = () => {
      Object.assign(filters, { search: '', category: '', hideDone: false });
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
    root.append(el('div', { className: 'shopping-exports button-group' },
      button('Kopírovat', async () => {
        try { await navigator.clipboard.writeText(exportText()); announce('Nákupní seznam zkopírován.'); }
        catch {
          const field = el('textarea', { readOnly: true, value: exportText(), 'aria-label': 'Text nákupního seznamu', rows: 10 });
          exportArea.replaceChildren(el('p', {}, 'Vyberte a zkopírujte tento text.'), field);
          field.focus(); field.select();
        }
      }, { className: 'kitchen-button' }),
      button('PDF / tisk', () => openShoppingPrint(items, recipes), { className: 'kitchen-button' })), exportArea);

    const shopping = el('div', { className: 'shopping-list', id: 'shopping-list' });
    const rows = new Map();
    const sections = [];
    for (const name of catalog.departments) {
      const categoryItems = items.filter(item => item.category === name);
      if (!categoryItems.length) continue;
      const count = el('span', { className: 'count-badge' });
      const section = el('section', { className: 'shopping-department' }, el('h3', {}, labelIcon(name, 'basket'), name, count));
      sections.push({ section, count, items: categoryItems });
      for (const item of categoryItems) {
        const id = `shopping-${encodeURIComponent(item.key)}`;
        const done = state.checked[item.key] === item.signature;
        const check = el('input', { id, type: 'checkbox', checked: done, onChange: event => {
          if (event.target.checked) state.checked[item.key] = item.signature; else delete state.checked[item.key];
          save(); refreshItems(item.key);
        } });
        const sources = el('details', { id: `${id}-sources`, className: 'shopping-sources' },
          el('summary', {}, `Původ a poznámky · ${new Set(item.sources.map(source => source.id)).size}`),
          el('ul', {}, item.sources.map(source => el('li', {}, el('a', { href: url(`${source.id}.html#ingredience`) }, source.recipe),
            ` · ${source.quantity}${source.group !== 'Základ' ? ` · ${source.group}` : ''}${source.note ? ` — ${source.note}` : ''}`))));
        const amount = shoppingAmount(item, state.amounts);
        const row = el('div', { className: 'shopping-item' },
          el('label', { htmlFor: id, className: 'shopping-check' }, check,
            el('span', {}, el('strong', {}, item.name), el('small', {}, [...new Set(item.sources.map(source => source.note).filter(Boolean))].join(' · '))),
            el('span', { className: `ingredient-amount${amount === 'neuvedeno' ? ' amount-unknown' : ''}` }, amount === 'neuvedeno' ? 'Množství neuvedeno' : amount)), sources);
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
        state.selections = {}; state.checked = {}; state.amounts = {};
        save(); render(); root.querySelector('.kitchen-empty a')?.focus(); announce('Nákup je vymazaný, ale můžete jej vrátit.');
      }, { className: 'kitchen-button' })));
    if (undoState) root.append(button('Vrátit poslední změnu', restoreUndo, { className: 'kitchen-button' }));

    function refreshItems(changedKey) {
      const visible = new Set(filterShoppingItems(items, filters, state.checked).map(item => item.key));
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
      progress.value = bought;
      progressText.textContent = `${bought} z ${items.length} položek máte připraveno`;
      filterStatus.textContent = visible.size === items.length ? 'Zaškrtněte, co máte doma nebo v košíku.' : `Zobrazeno ${visible.size} z ${items.length} položek · export obsahuje celý nákup`;
      empty.hidden = visible.size > 0;
      if (!visible.size) {
        const allDone = bought === items.length && !filters.search && !filters.category;
        empty.replaceChildren(el('h3', {}, allDone ? 'Všechno máte připravené' : 'Tomuto filtru nic neodpovídá'),
          allDone ? el('a', { href: '#uvarit', className: 'kitchen-button primary' }, icon('kitchen'), 'Vybrat jídlo k vaření')
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
    finishViews(recipes);
  };

  function restoreUndo() {
    Object.assign(state, { selections: undoState.selections, checked: undoState.checked, amounts: undoState.amounts });
    undoState = null;
    save(); render(); focusSection(root.querySelector('#selected-heading')); announce('Původní výběr obnoven.');
  }
  render();
  window.addEventListener('hashchange', () => {
    if (!location.hash.startsWith('#nakup=')) syncViews(true);
  });
}

function transferDialog(title) {
  const opener = document.activeElement;
  const body = el('div', { className: 'transfer-body' });
  const footer = el('footer', { className: 'transfer-footer button-group' });
  const dialog = el('dialog', { className: 'kitchen-app shopping-transfer-dialog', 'aria-labelledby': 'transfer-title' },
    el('header', { className: 'transfer-header' }, el('h2', { id: 'transfer-title' }, title),
      button('Zavřít', () => dialog.close(), { className: 'kitchen-button', 'aria-label': `Zavřít: ${title}` })), body, footer);
  dialog.addEventListener('close', () => { dialog.remove(); (opener?.isConnected ? opener : document.getElementById('import-shopping'))?.focus({ preventScroll: true }); });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, body, footer };
}

async function openShoppingExport() {
  const { dialog, body, footer } = transferDialog('Export nákupu');
  const status = el('p', { role: 'status', className: 'kitchen-muted' }, 'Připravuji nákup ke sdílení…');
  body.append(el('div', { className: 'transfer-intro' },
    el('p', {}, 'Příjemce otevře odkaz a zvolí sloučení nebo převzetí nákupu.'),
    el('p', {}, 'Přenesou se vybraná jídla, jejich nastavení a hotové položky.')), status);
  try {
    const code = await exportShopping(state, catalog);
    if (!dialog.isConnected) return;
    const address = new URL('nakup.html', base);
    address.hash = `nakup=${code}`;
    const field = el('textarea', { id: 'shopping-share-link', readOnly: true, rows: 4, value: address.href, spellcheck: false });
    body.append(el('label', { htmlFor: field.id }, 'Odkaz k odeslání', field),
      el('aside', { className: 'transfer-notes kitchen-muted', 'aria-label': 'Jak odkaz funguje' },
        el('p', {}, 'Odkaz je kopie nákupu v okamžiku odeslání.'),
        el('p', {}, 'Pokud nákup změníte, pošlete nový odkaz.'),
        el('p', {}, 'Každý, kdo má odkaz, může nákup otevřít.'),
        el('p', {}, 'Posílejte celý odkaz, nejlépe přes chat, protože SMS jej může rozdělit.')));
    status.textContent = 'Zkopírujte připravený odkaz do zprávy nebo použijte sdílení telefonu.';
    footer.append(button('Kopírovat odkaz', async () => {
      try { await navigator.clipboard.writeText(field.value); status.textContent = 'Zkopírovaný odkaz vložte do zprávy příjemci.'; }
      catch { field.focus(); field.select(); status.textContent = 'Označený odkaz zkopírujte ručně, protože prohlížeč automatické kopírování nepovolil.'; }
    }, { className: 'kitchen-button primary' }));
    if (typeof navigator.share === 'function') footer.append(button('Sdílet…', async () => {
      try { await navigator.share({ title: 'Společný nákup', url: field.value }); status.textContent = 'Odkaz byl předán sdílení zařízení.'; }
      catch (error) { status.textContent = error.name === 'AbortError' ? 'Sdílení je zrušené, ale připravený odkaz můžete použít později.' : 'Pokud sdílení není dostupné, zkopírujte odkaz.'; }
    }, { className: 'kitchen-button' }));
  } catch (error) { status.textContent = error.message; }
}

function settingsDescription(recipe, settings) {
  return [`${String(settings.factor).replace('.', ',')}× dávka`,
    ...recipe.ingredients.filter(item => item.options.length > 1).map(item => item.options[settings.choices[item.id]].name),
    ...[...recipe.groups, ...recipe.ingredients].filter(item => item.optional).map(item => `${settings.enabled[item.id] ? 's' : 'bez'}: ${item.title || item.options.map(option => option.name).join(' nebo ')}`)].join(' · ');
}

function openShoppingImport(initial = '') {
  const { dialog, body, footer } = transferDialog('Import nákupu');
  const field = el('textarea', { id: 'shopping-import-code', rows: 4, value: initial, spellcheck: false, placeholder: 'Vložte odkaz nebo kód od druhého člověka…' });
  const status = el('p', { role: 'status', className: 'transfer-status' });
  const preview = el('div', { className: 'transfer-preview' });
  let incoming;
  let mode = 'merge';
  let resolutions = {};
  let plan;
  let attempt = 0;
  const apply = button('Sloučit nákupy', () => {
    plan = previewShoppingImport(state, incoming, catalog, mode, resolutions);
    if (!plan.ready) { renderPreview(); return; }
    plannerController.applyImported(plan.state);
    dialog.close();
    announce(mode === 'merge' ? 'Nákupy jsou sloučené, změnu můžete vrátit.' : 'Importovaný nákup je převzatý, změnu můžete vrátit.');
  }, { disabled: true, className: 'kitchen-button primary' });

  function renderPreview() {
    if (!incoming) return;
    plan = previewShoppingImport(state, incoming, catalog, mode, resolutions);
    const { summary } = plan;
    apply.disabled = !plan.ready;
    apply.textContent = mode === 'merge' ? 'Sloučit nákupy' : 'Převzít celý nákup';
    preview.replaceChildren(el('fieldset', { className: 'transfer-mode' }, el('legend', {}, 'Jak nákup použít'),
      ...[['merge', 'Sloučit s mým nákupem', ['Zachová vaše jídla a přidá chybějící.', 'U stejného seznamu spojí hotové položky od obou lidí.']],
        ['replace', 'Převzít celý nákup', ['Nahradí váš výběr a hotové položky importovaným stavem.']]].map(([value, label, descriptions]) =>
        el('label', {}, el('input', { type: 'radio', name: 'shopping-import-mode', value, checked: mode === value, onChange: () => { mode = value; renderPreview(); preview.querySelector(`input[value="${value}"]`)?.focus({ preventScroll: true }); } }),
          el('span', {}, el('strong', {}, label), descriptions.map(description => el('span', { className: 'transfer-mode-description' }, description)))))),
      el('p', { className: 'transfer-summary', role: 'status' }, `Výsledný nákup · recepty: ${summary.recipes} · položky: ${summary.items} · hotovo: ${summary.checked}`));
    if (summary.recheck) preview.append(el('p', { className: 'shopping-hint' }, `${summary.recheck} ${summary.recheck === 1 ? 'položka vyžaduje' : summary.recheck < 5 ? 'položky vyžadují' : 'položek vyžaduje'} novou kontrolu, protože se změnilo množství nebo složení nákupu.`));
    const imported = catalog.recipes.filter(recipe => Object.hasOwn(incoming.selections, recipe.id));
    preview.append(el('details', {}, el('summary', {}, `Jídla v importu (${imported.length})`), el('ul', {}, imported.map(recipe => el('li', {}, `${recipe.title} · ${String(incoming.selections[recipe.id].factor).replace('.', ',')}× dávka`)))));
    for (const [index, conflict] of plan.conflicts.entries()) {
      preview.append(el('fieldset', { className: 'transfer-conflict' }, el('legend', {}, conflict.kind === 'recipe' ? `Odlišné nastavení: ${conflict.recipe.title}` : `Odlišné množství: ${conflict.name}`),
        ...[['local', 'Můj nákup'], ['incoming', 'Importovaný nákup']].map(([side, label]) => el('label', {},
          el('input', { type: 'radio', name: `transfer-conflict-${index}`, id: `transfer-conflict-${index}-${side}`, checked: resolutions[conflict.key] === side,
            onChange: () => { resolutions[conflict.key] = side; renderPreview(); document.getElementById(`transfer-conflict-${index}-${side}`)?.focus({ preventScroll: true }); } }),
          el('span', {}, el('strong', {}, label), el('small', {}, conflict.kind === 'recipe' ? settingsDescription(conflict.recipe, conflict[side]) : conflict[side]))))));
    }
    status.textContent = plan.ready ? 'Zkontrolujte náhled a změnu potvrďte tlačítkem dole.' : 'U každého rozdílu vyberte hodnotu, kterou chcete použít.';
  }

  async function load() {
    const currentAttempt = ++attempt;
    apply.disabled = true; loadButton.disabled = true;
    incoming = null; plan = null; preview.replaceChildren();
    status.textContent = 'Kontroluji nákup…';
    try {
      const decoded = await importShopping(field.value, catalog);
      if (!dialog.isConnected || currentAttempt !== attempt) return;
      incoming = decoded; resolutions = {}; sourceBox.open = false; sourceTitle.textContent = 'Změnit vložený odkaz'; renderPreview();
      preview.querySelector('input')?.focus();
    } catch (error) { if (currentAttempt === attempt) status.textContent = error.message; }
    finally { if (currentAttempt === attempt) loadButton.disabled = false; }
  }
  const loadButton = button('Načíst nákup', load, { className: 'kitchen-button' });
  const sourceTitle = el('summary', {}, 'Odkaz k importu');
  const sourceBox = el('details', { className: 'transfer-source', open: true }, sourceTitle,
    el('p', {}, 'Vložte celý odkaz nebo kód od druhého člověka.'),
    el('p', {}, 'Nejprve uvidíte náhled, váš nákup se změní až po potvrzení.'),
    el('label', { htmlFor: field.id }, 'Odkaz nebo kód nákupu', field), loadButton);
  field.addEventListener('input', () => { attempt++; incoming = null; plan = null; apply.disabled = true; loadButton.disabled = false; preview.replaceChildren(); status.textContent = ''; });
  body.append(sourceBox, status, preview);
  footer.append(apply, button('Zrušit', () => dialog.close(), { className: 'kitchen-button' }));
  field.focus();
  if (initial) load();
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
  const status = el('div', { className: 'kitchen-muted', role: 'status' }, el('p', {}, 'Připravuje se soubor PDF…'));
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
  }).catch(() => { status.replaceChildren(el('p', {}, 'PDF se nepodařilo připravit.'), el('p', {}, 'Zkuste náhled otevřít znovu nebo použijte Tisk → Uložit jako PDF.')); });
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
  const stepHeadings = [];
  for (let node = article.querySelector('#postup')?.nextElementSibling; node && !/^H[12]$/.test(node.tagName); node = node.nextElementSibling) {
    if (node.tagName === 'H3' && /^\d+\. /.test(node.textContent.trim())) stepHeadings.push(node);
  }
  if (stepHeadings.length !== recipe.steps.length) throw new Error('Obsah receptu neodpovídá katalogu, proto sestavte celý web znovu.');
  const title = document.querySelector('article h1');
  title.replaceChildren(labelIcon(recipe.typeLabel, 'food'), document.createTextNode(' ' + recipe.title));
  title.after(el('p', { className: 'recipe-provenance' }, labelIcon(recipe.origin.split(', ').at(-1)), recipe.origin, el('span', {}, ' · ' + recipe.typeLabel)));
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
  const procedureHeading = article.querySelector('#postup');
  const shoppingPanel = el('section', { id: 'recipe-shopping', 'aria-labelledby': ingredientsHeading.id, tabIndex: -1 });
  const cookingPanel = el('section', { id: 'uvarit', className: 'recipe-procedure', 'aria-labelledby': procedureHeading.id, tabIndex: -1 });
  ingredientsHeading.before(shoppingPanel);
  for (let node = ingredientsHeading; node && node !== procedureHeading;) {
    const next = node.nextSibling;
    shoppingPanel.append(node);
    node = next;
  }
  procedureHeading.before(cookingPanel);
  for (let node = procedureHeading; node;) {
    const next = node.nextSibling;
    cookingPanel.append(node);
    node = next;
  }
  const shoppingActions = el('div', { className: 'kitchen-app recipe-actions' });
  const cookingActions = el('div', { className: 'kitchen-app recipe-actions' });
  shoppingPanel.prepend(shoppingActions);
  cookingPanel.prepend(cookingActions);
  const navigation = workflow('shopping', { shopping: '#ingredience', cooking: '#uvarit' }, () => syncView());
  controls.append(navigation, el('p', { className: 'storage-message recipe-storage kitchen-muted' }, storageMessage));
  (article.querySelector('.recipe-preparation') || shoppingPanel).before(controls);
  ingredientsHeading.after(editor);

  const syncContents = () => {
    for (const link of document.querySelectorAll('.affix a[href^="#"]')) {
      const target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
      const item = link.closest('li');
      if (item && target) item.hidden = Boolean(target.classList.contains('source-ingredients') || target.closest('#recipe-shopping[hidden], #uvarit[hidden]'));
    }
  };
  const syncView = (focus = false) => {
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch { target = null; }
    const cooking = location.hash === '#vareni' || Boolean(target && cookingPanel.contains(target));
    shoppingPanel.hidden = cooking;
    cookingPanel.hidden = !cooking;
    for (const link of navigation.querySelectorAll('[data-phase]')) {
      link.setAttribute('aria-current', link.dataset.phase === (cooking ? 'cooking' : 'shopping') ? 'page' : 'false');
    }
    syncContents();
    updateTray();
    if (focus) focusSection(location.hash === '#uvarit' || location.hash === '#ingredience' ? navigation : target || navigation);
  };
  const printButton = () => button('PDF / tisk receptu', () => openRecipePrint(recipe, stepContents, config, preparation), { className: 'kitchen-button' });
  const repaint = () => {
    editor.replaceChildren(recipeEditor(recipe, config, () => { if (selected(recipe)) state.selections[recipe.id] = structuredClone(config); save(); preserveView(repaint); }, 'detail'));
    shoppingActions.replaceChildren(
      button(selected(recipe) ? 'V nákupu' : 'Přidat do nákupu', () => {
        if (selected(recipe)) delete state.selections[recipe.id]; else state.selections[recipe.id] = structuredClone(config);
        save(); preserveView(repaint); announce(selected(recipe) ? 'Recept je v nákupu.' : 'Recept byl odebrán.');
      }, { id: 'detail-select', className: 'kitchen-button', 'aria-pressed': String(selected(recipe)) }), printButton());
    cookingActions.replaceChildren(
      button(cookingActionLabel(recipe, config), () => openCooking(recipe, stepContents, config, preparation, repaint), { className: 'kitchen-button primary', id: 'start-cooking' }), printButton());
    syncView();
  };
  repaint();
  const contents = document.querySelector('.affix');
  if (contents) new MutationObserver(syncContents).observe(contents, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {
    syncView(true);
    if (location.hash === '#vareni' && !document.querySelector('.cooking-dialog')) openCooking(recipe, stepContents, config, preparation, repaint);
  });
  if (location.hash === '#vareni') openCooking(recipe, stepContents, config, preparation, repaint);
}

function openCooking(recipe, contents, config, preparation, closed) {
  const cooking = state.cooking[recipe.id] ||= { revision: recipe.revision, step: 0, done: [] };
  const dialog = el('dialog', { className: 'kitchen-app cooking-dialog', 'aria-labelledby': 'cook-recipe' });
  let showCompletion = cookingProgress(recipe, config, cooking).complete;

  const focusStep = () => {
    const title = dialog.querySelector('#cook-title');
    title.focus({ preventScroll: true });
    // Při přechodu začíná posouvaný obsah aktuálním krokem i na nízkém displeji.
    dialog.querySelector('.cook-scroll').scrollTop = 0;
  };
  const move = index => {
    cooking.step = index;
    showCompletion = false;
    save(); render(); focusStep();
  };
  const render = () => {
    const progress = cookingProgress(recipe, config, cooking);
    const step = recipe.steps[cooking.step];
    const omitted = !progress.active.includes(cooking.step);
    const done = progress.done.includes(cooking.step);
    const previous = progress.active.filter(index => index < cooking.step).at(-1);
    const next = progress.active.find(index => index > cooking.step);
    const completed = showCompletion && progress.complete;

    const overview = el('details', { className: 'cook-support', id: 'cook-overview' },
      el('summary', {}, icon('list'), 'Přehled kroků'),
      el('ol', { className: 'cook-step-list' }, recipe.steps.map((item, index) => {
        const excluded = !progress.active.includes(index);
        const finished = progress.done.includes(index);
        const control = button(item.title, () => move(index), {
          className: 'cook-step-link',
          ...(index === cooking.step && !completed ? { 'aria-current': 'step' } : {}),
        });
        control.prepend(el('span', { className: 'cook-step-number', 'aria-hidden': true },
          finished ? icon('check') : String(index + 1)));
        control.append(el('span', { className: 'cook-step-state' },
          excluded ? 'Vynecháno' : finished ? 'Hotovo' : index === cooking.step && !completed ? 'Právě vaříte' : 'Čeká'));
        return el('li', {}, control);
      })));
    const ingredients = el('details', { className: 'cook-support', id: 'cook-ingredients' },
      el('summary', {}, icon('carrot'), 'Suroviny a zvolené varianty'), recipeEditor(recipe, config, () => {
        if (selected(recipe)) state.selections[recipe.id] = structuredClone(config);
        save(); preserveView(render);
      }, 'cook'));
    const options = el('details', { className: 'cook-support', id: 'cook-options' },
      el('summary', {}, icon('info'), 'Uložení a možnosti'),
      el('p', { className: 'storage-message kitchen-muted' }, storageMessage),
      button('Začít postup znovu', () => { cooking.done = []; move(progress.active[0]); }, { className: 'kitchen-button' }));
    const body = el('div', { className: 'cook-scroll', id: 'cook-scroll', 'data-preserve-scroll': '' });
    if (completed) {
      body.append(el('div', { className: 'cook-success', role: 'status' },
        icon('check-circle'), el('h2', { id: 'cook-title', tabIndex: -1 }, 'Dobrou chuť!'),
        el('p', {}, 'Všechny kroky máte hotové.'),
        button('Prohlédnout hotové kroky', () => move(progress.active[0]), { className: 'kitchen-button' })));
    } else {
      body.append(el('div', { className: 'cook-step-heading' },
        el('p', { className: 'eyebrow' }, omitted ? 'Volitelná příloha' : `Krok ${progress.active.indexOf(cooking.step) + 1} z ${progress.active.length}`),
        el('h2', { id: 'cook-title', tabIndex: -1 }, step.title)));
      if (done) body.append(el('div', { className: 'cook-finished' },
        el('span', {}, icon('check-circle'), 'Tento krok je hotový'),
        button('Vrátit mezi nedokončené', () => {
          cooking.done = cooking.done.filter(index => index !== cooking.step);
          save(); render(); focusStep();
        }, { className: 'cook-text-button' })));
      if (config.factor !== 1) body.append(el('p', { className: 'shopping-hint' }, `${String(config.factor).replace('.', ',')}× dávka: suroviny jsou přepočítané, ale údaje v textu, časy a teploty zůstávají původní.`));
      if (omitted) body.append(el('p', { className: 'shopping-hint' }, 'Tuto přílohu nemáte vybranou a pro dokončení ji nemusíte připravovat.'));
      if (preparation.length) body.append(el('details', { className: 'cook-preparation', id: 'cook-preparation' },
        el('summary', {}, icon('clock'), 'Než začnete'), preparation.map(node => node.cloneNode(true))));
      body.append(el('div', { className: 'cook-content' }, contents[cooking.step].map(node => node.cloneNode(true))));
    }
    body.append(el('div', { className: 'cook-tools' }, ingredients, overview, options));

    let actionLabel = omitted ? 'Přeskočit přílohu' : done ? 'Další krok' : 'Hotovo, pokračovat';
    if (completed) actionLabel = 'Zavřít vaření';
    else if (progress.complete) actionLabel = 'Zobrazit dokončení';
    else if (next === undefined) actionLabel = done || omitted ? 'K nedokončenému kroku' : 'Dokončit krok';
    const advance = () => {
      if (completed) { dialog.close(); return; }
      if (!omitted && !done) cooking.done.push(cooking.step);
      const updated = cookingProgress(recipe, config, cooking);
      if (updated.complete) { showCompletion = true; save(); render(); focusStep(); return; }
      if (next !== undefined) { move(next); return; }
      announce('Pokračujte nedokončeným krokem.');
      move(updated.active.find(index => !updated.done.includes(index)));
    };
    const primary = button(actionLabel, advance, { className: 'kitchen-button primary' });
    primary.append(icon(completed ? 'check' : 'arrow-right'));
    const back = button('Předchozí', () => move(previous), { disabled: previous === undefined, className: 'kitchen-button' });
    back.prepend(icon('arrow-left'));
    dialog.replaceChildren(el('header', { className: 'cook-header' },
      el('div', { className: 'cook-top' },
        el('div', {}, el('p', { className: 'eyebrow' }, icon('kitchen'), 'Vaření krok za krokem'),
          el('p', { id: 'cook-recipe', className: 'cook-recipe' }, recipe.title)),
        button('Zavřít', () => dialog.close(), { className: 'kitchen-button' })),
      el('div', { className: 'cook-progress' },
        el('progress', { value: progress.done.length, max: progress.active.length, 'aria-label': 'Hotové kroky' }),
        el('span', {}, `${progress.done.length} / ${progress.active.length} hotovo`))), body,
      el('footer', { className: 'cook-navigation' }, completed ? null : back, primary));
  };
  dialog.addEventListener('close', () => {
    dialog.remove(); closed();
    if (location.hash === '#vareni') { const address = new URL(location.href); address.hash = 'uvarit'; history.replaceState(null, '', address); }
    document.getElementById('start-cooking')?.focus({ preventScroll: true });
  });
  document.body.append(dialog);
  render(); dialog.showModal(); focusStep();
}


/** Přidá výběr, společný nákup a vaření jako progresivní rozšíření statického webu DocFX. */
export async function startKitchen() {
  const home = document.getElementById('kitchen-catalog');
  const planner = document.getElementById('kitchen-planner');
  const relativePath = decodeURI(location.pathname).slice(base.pathname.length);
  if (!home && !planner && !/^(food|drink)\//.test(relativePath)) return;
  const response = await fetch(url('data/recipes.json'));
  if (!response.ok) throw new Error(`Katalog receptů: HTTP ${response.status}`);
  catalog = await response.json();
  if (catalog.version !== 1 || !Array.isArray(catalog.recipes)) throw new Error('Nepodporovaný katalog receptů');
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); }
  catch { storageMessage = 'Předchozí výběr nelze načíst, ale recepty můžete vybrat znovu.'; }
  state = restoreState(saved, catalog.recipes);
  const resetCooking = Object.keys(saved?.cooking || {}).some(id => catalog.recipes.some(recipe => recipe.id === id) && !state.cooking[id]);
  notification = el('div', { role: 'status', className: 'kitchen-notification', 'aria-live': 'polite' });
  tray = el('div', { className: 'kitchen-tray kitchen-app' });
  document.body.append(notification, tray);
  document.body.classList.add('has-kitchen-tray');
  updateTray();
  if (home) renderCatalog(home);
  if (planner) renderPlanner(planner);
  if (planner) {
    const fromLink = () => {
      if (!location.hash.startsWith('#nakup=')) return;
      const code = location.hash.slice(7);
      const address = new URL(location.href); address.hash = '';
      history.replaceState(null, '', address);
      document.querySelector('.shopping-transfer-dialog')?.close();
      openShoppingImport(code);
    };
    fromLink();
    window.addEventListener('hashchange', fromLink);
  }
  const recipe = catalog.recipes.find(item => new URL(`${item.id}.html`, base).pathname === decodeURI(location.pathname));
  if (recipe) enhanceRecipe(recipe);
  if (resetCooking) { save(); announce('Starší průběh vaření byl obnoven od začátku.'); }
}
