import { button, el } from '../dom.js';
import { icon } from '../ui-icons.js';
import { recipeMeta, storageNote, workflow } from './components.js';
import { foldText, recipeSettings } from './core.js';
import { plural } from './quantity.js';
import { announce } from './shell.js';
import { catalog, save, selected, state, url } from './store.js';

const searchText = (recipe) =>
  foldText(
    [
      recipe.title,
      recipe.description,
      recipe.typeLabel,
      recipe.origin,
      ...recipe.ingredients.flatMap((item) => item.options.map((option) => option.name)),
    ].join(' '),
  );

/** Tlačítko výběru, které po změně aktualizuje svůj stav na místě. */
function selectButton(recipe, onToggle) {
  const label = () => (selected(recipe) ? 'V nákupu' : 'Přidat do nákupu');
  const control = button(
    label(),
    () => {
      if (selected(recipe)) delete state.selections[recipe.id];
      else state.selections[recipe.id] = recipeSettings(recipe);
      save();
      control.replaceChildren(icon(selected(recipe) ? 'check' : 'basket-plus'), label());
      control.setAttribute('aria-label', `${label()}: ${recipe.title}`);
      control.setAttribute('aria-pressed', String(selected(recipe)));
      announce(`${recipe.title}: ${selected(recipe) ? 'přidáno do nákupu' : 'odebráno z nákupu'}.`);
      onToggle();
    },
    {
      'aria-label': `${label()}: ${recipe.title}`,
      'aria-pressed': String(selected(recipe)),
      className: 'kitchen-button',
    },
  );
  return control;
}

function recipeCard(recipe, onToggle) {
  const steps = recipe.steps.length;
  return el(
    'section',
    { className: 'recipe-card' },
    recipeMeta(recipe),
    el('h2', {}, el('a', { href: url(`${recipe.id}.html`) }, recipe.title)),
    el('p', {}, recipe.description),
    recipe.preparation
      ? el(
          'p',
          { className: 'recipe-card-preparation' },
          icon('clock'),
          el('strong', {}, 'Předem: '),
          recipe.preparation,
        )
      : null,
    el(
      'div',
      { className: 'recipe-card-actions' },
      el(
        'a',
        { href: url(`${recipe.id}.html#uvarit`) },
        icon('list'),
        `Postup · ${steps} ${plural(steps, 'krok', 'kroky', 'kroků')}`,
      ),
      selectButton(recipe, onToggle),
    ),
  );
}

/** Zobrazí katalog s hledáním, jehož filtry zůstávají v adrese stránky. */
export function renderCatalog(root) {
  document.body.classList.add('kitchen-catalog-page');
  root.className = 'kitchen-app';
  const search = el('input', {
    type: 'search',
    id: 'recipe-filter',
    placeholder: 'Třeba rajská nebo French Press…',
  });
  const type = el(
    'select',
    { id: 'recipe-type' },
    el('option', { value: '' }, 'Všechny typy'),
    [...new Set(catalog.recipes.map((recipe) => recipe.typeLabel))].map((label) =>
      el('option', { value: label }, label),
    ),
  );
  const onlySelected = el('input', { type: 'checkbox', id: 'selected-only' });
  const query = new URL(location.href).searchParams;
  search.value = query.get('q') || '';
  if ([...type.options].some((option) => option.value === query.get('type')))
    type.value = query.get('type');
  onlySelected.checked = query.get('selected') === '1';
  const resultCount = el('p', { className: 'kitchen-muted', role: 'status' });
  const grid = el('div', { className: 'recipe-grid' });
  const renderResults = () => {
    const address = new URL(location.href);
    for (const [key, value] of [
      ['q', search.value],
      ['type', type.value],
      ['selected', onlySelected.checked ? '1' : ''],
    ]) {
      if (value) address.searchParams.set(key, value);
      else address.searchParams.delete(key);
    }
    history.replaceState(null, '', address);
    const terms = foldText(search.value).split(/\s+/).filter(Boolean);
    const recipes = catalog.recipes.filter(
      (recipe) =>
        (!type.value || recipe.typeLabel === type.value) &&
        (!onlySelected.checked || selected(recipe)) &&
        terms.every((term) => searchText(recipe).includes(term)),
    );
    resultCount.textContent = `${recipes.length} z ${catalog.recipes.length} receptů a nápojů`;
    const onToggle = () => {
      if (!onlySelected.checked) return;
      renderResults();
      onlySelected.focus({ preventScroll: true });
    };
    grid.replaceChildren(...recipes.map((recipe) => recipeCard(recipe, onToggle)));
    if (!recipes.length)
      grid.append(
        el(
          'div',
          { className: 'kitchen-empty' },
          icon('search'),
          el('h2', {}, 'Tady zatím nic není'),
          el('p', {}, 'Pomůže jiný název jídla nebo pití, případně zrušení filtru.'),
          button(
            'Zrušit filtry',
            () => {
              search.value = '';
              type.value = '';
              onlySelected.checked = false;
              renderResults();
              search.focus();
            },
            { className: 'kitchen-button' },
          ),
        ),
      );
  };
  search.addEventListener('input', renderResults);
  type.addEventListener('change', renderResults);
  onlySelected.addEventListener('change', renderResults);
  root.replaceChildren(
    workflow('recipes'),
    el(
      'div',
      { className: 'catalog-tools' },
      el('label', { htmlFor: search.id }, 'Najít jídlo nebo pití', search),
      el(
        'div',
        { className: 'catalog-filter-row' },
        el(
          'label',
          { htmlFor: type.id },
          el('span', { className: 'visually-hidden' }, 'Druh receptu'),
          type,
        ),
        el('label', { className: 'check-label' }, onlySelected, 'Jen vybrané'),
      ),
    ),
    resultCount,
    grid,
    storageNote('catalog-storage'),
  );
  document.querySelector('.catalog-fallback')?.setAttribute('hidden', '');
  renderResults();
}
