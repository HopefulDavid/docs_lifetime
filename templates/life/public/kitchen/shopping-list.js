import { button, el } from '../dom.js';
import { icon, labelIcon } from '../ui-icons.js';
import { filterShoppingItems, shoppingAmount, shoppingText } from './core.js';
import { openShoppingPrint } from './print.js';
import { announce, updateTray } from './shell.js';
import { catalog, isPrepared, save, state, url } from './store.js';

const emptyFilters = { search: '', category: '', hideDone: false };

/** Filtry seznamu, které přežijí jeho překreslení. */
export const createFilters = () => ({ ...emptyFilters });

/** Zruší filtry bez výměny objektu, který sdílí seznam a stránka. */
export const clearFilters = (filters) => Object.assign(filters, emptyFilters);

function sourceDetails(item, id) {
  const recipes = new Set(item.sources.map((source) => source.id));
  return el(
    'details',
    { id: `${id}-sources`, className: 'shopping-sources' },
    el('summary', {}, `Původ a poznámky · ${recipes.size}`),
    el(
      'ul',
      {},
      item.sources.map(({ id, recipe, quantity, group, note }) =>
        el(
          'li',
          {},
          el('a', { href: url(`${id}.html#ingredience`) }, recipe),
          ` · ${quantity}${group !== 'Základ' ? ` · ${group}` : ''}${note ? ` — ${note}` : ''}`,
        ),
      ),
    ),
  );
}

function itemRow(item, onChange) {
  const id = `shopping-${encodeURIComponent(item.key)}`;
  const amount = shoppingAmount(item, state.amounts);
  const unknown = amount === 'neuvedeno';
  const notes = new Set(item.sources.map((source) => source.note).filter(Boolean));
  const check = el('input', {
    id,
    type: 'checkbox',
    checked: isPrepared(item),
    onChange: () => {
      if (check.checked) state.checked[item.key] = item.signature;
      else delete state.checked[item.key];
      save();
      onChange(item.key);
    },
  });
  const row = el(
    'div',
    { className: 'shopping-item' },
    el(
      'label',
      { htmlFor: id, className: 'shopping-check' },
      check,
      el('span', {}, el('strong', {}, item.name), el('small', {}, [...notes].join(' · '))),
      el(
        'span',
        { className: `ingredient-amount${unknown ? ' amount-unknown' : ''}` },
        unknown ? 'Množství neuvedeno' : amount,
      ),
    ),
    sourceDetails(item, id),
  );
  return { row, check };
}

function exportControls(items, recipes) {
  const area = el('div', { id: 'export-area' });
  async function copy() {
    const text = shoppingText(items, state.checked, state.amounts);
    try {
      await navigator.clipboard.writeText(text);
      announce('Nákupní seznam zkopírován.');
    } catch {
      const field = el('textarea', {
        readOnly: true,
        value: text,
        'aria-label': 'Text nákupního seznamu',
        rows: 10,
      });
      area.replaceChildren(el('p', {}, 'Text se vybere a zkopíruje.'), field);
      field.focus();
      field.select();
    }
  }
  const controls = el(
    'div',
    { className: 'shopping-exports button-group' },
    button('Kopírovat', copy, { className: 'kitchen-button' }),
    button('PDF / tisk', () => openShoppingPrint(items, recipes), { className: 'kitchen-button' }),
  );
  return [controls, area];
}

/** Sestaví průběh, filtry, výstupy a odškrtávací seznam. Obsah se mění bez překreslení stránky. */
export function shoppingList(items, recipes, filters) {
  const progressText = el('p', { id: 'shopping-progress', role: 'status' });
  const progress = el('progress', {
    max: Math.max(items.length, 1),
    'aria-label': 'Průběh nákupu',
  });
  const search = el('input', {
    type: 'search',
    id: 'shopping-filter',
    placeholder: 'Najít surovinu v nákupu…',
    value: filters.search,
    onInput: () => {
      filters.search = search.value;
      refresh();
    },
  });
  const category = el(
    'select',
    {
      id: 'shopping-category',
      onChange: () => {
        filters.category = category.value;
        refresh();
      },
    },
    el('option', { value: '' }, 'Všechna oddělení'),
    catalog.departments
      .filter((name) => items.some((item) => item.category === name))
      .map((name) => el('option', { value: name, selected: name === filters.category }, name)),
  );
  const hideDone = el('input', {
    id: 'hide-done',
    type: 'checkbox',
    checked: filters.hideDone,
    onChange: () => {
      filters.hideDone = hideDone.checked;
      refresh();
    },
  });
  const filterStatus = el('p', {
    className: 'kitchen-muted shopping-filter-status',
    role: 'status',
  });
  const rows = new Map(items.map((item) => [item.key, itemRow(item, refresh)]));
  const departments = catalog.departments.flatMap((name) => {
    const departmentItems = items.filter((item) => item.category === name);
    if (!departmentItems.length) return [];
    const count = el('span', { className: 'count-badge' });
    const section = el(
      'section',
      { className: 'shopping-department' },
      el('h3', {}, labelIcon(name, 'basket'), name, count),
      departmentItems.map((item) => rows.get(item.key).row),
    );
    return { section, count, items: departmentItems };
  });
  const empty = el('div', { className: 'kitchen-empty', hidden: true });

  function resetFilters() {
    clearFilters(filters);
    search.value = filters.search;
    category.value = filters.category;
    hideDone.checked = filters.hideDone;
    refresh();
    search.focus();
  }

  function showEmpty(allDone) {
    empty.replaceChildren(
      el('h3', {}, allDone ? 'Všechno máte připravené' : 'Tomuto filtru nic neodpovídá'),
      allDone
        ? el(
            'a',
            { href: '#uvarit', className: 'kitchen-button primary' },
            icon('kitchen'),
            'Vybrat jídlo k vaření',
          )
        : button('Zrušit filtry', resetFilters, { className: 'kitchen-button' }),
    );
  }

  /** Po skrytí odškrtnuté položky přesune fokus na další viditelnou. */
  function focusAfter(key, visible) {
    const index = items.findIndex((item) => item.key === key);
    const next =
      items.slice(index + 1).find((item) => visible.has(item.key)) ??
      items.find((item) => visible.has(item.key));
    const target = next ? rows.get(next.key).check : (empty.querySelector('button') ?? search);
    target.focus({ preventScroll: true });
  }

  function refresh(changedKey) {
    const visible = new Set(
      filterShoppingItems(items, filters, state.checked).map((item) => item.key),
    );
    for (const item of items) {
      const { row, check } = rows.get(item.key);
      row.hidden = !visible.has(item.key);
      row.classList.toggle('is-done', isPrepared(item));
      check.checked = isPrepared(item);
    }
    for (const department of departments) {
      const count = department.items.filter((item) => visible.has(item.key)).length;
      department.section.hidden = !count;
      department.count.textContent = String(count);
    }
    const prepared = items.filter(isPrepared).length;
    progress.value = prepared;
    progressText.textContent = `${prepared} z ${items.length} položek máte připraveno`;
    filterStatus.textContent =
      visible.size === items.length
        ? 'Zaškrtnutí označí, co je doma nebo v košíku.'
        : `Zobrazeno ${visible.size} z ${items.length} položek · export obsahuje celý nákup`;
    empty.hidden = visible.size > 0;
    if (!visible.size) showEmpty(prepared === items.length && !filters.search && !filters.category);
    if (changedKey && !visible.has(changedKey)) focusAfter(changedKey, visible);
    updateTray();
  }

  refresh();
  return [
    el(
      'section',
      { className: 'shopping-summary' },
      el('p', { className: 'eyebrow' }, 'V OBCHODĚ'),
      el('h2', { id: 'shopping-heading', tabIndex: -1 }, icon('basket'), 'Suroviny k nákupu'),
      progressText,
      progress,
    ),
    el(
      'div',
      { className: 'shopping-filters' },
      el(
        'label',
        { htmlFor: search.id },
        el('span', { className: 'visually-hidden' }, 'Najít surovinu v nákupu'),
        search,
      ),
      el(
        'div',
        { className: 'shopping-filter-row' },
        el(
          'label',
          { htmlFor: category.id },
          el('span', { className: 'visually-hidden' }, 'Oddělení obchodu'),
          category,
        ),
        el('label', { className: 'check-label' }, hideDone, 'Skrýt hotové'),
      ),
      filterStatus,
    ),
    ...exportControls(items, recipes),
    el(
      'div',
      { className: 'shopping-list', id: 'shopping-list' },
      departments.map(({ section }) => section),
      empty,
    ),
  ];
}
