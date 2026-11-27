import { el, focusSection } from '../dom.js';
import { icon, labelIcon } from '../ui-icons.js';
import { storageMessage, url } from './store.js';

const phases = [
  { id: 'recipes', icon: 'book', label: 'Vybrat jídla', page: 'kuchyne/index.html#recepty' },
  { id: 'shopping', icon: 'basket', label: 'Nakoupit', page: 'nakup.html' },
  { id: 'cooking', icon: 'kitchen', label: 'Uvařit', page: 'nakup.html#uvarit' },
];

/** Vyznačí v navigaci právě zobrazenou fázi. */
export function setPhase(navigation, active) {
  for (const link of navigation.querySelectorAll('[data-phase]'))
    link.setAttribute('aria-current', link.dataset.phase === active ? 'page' : 'false');
}

/**
 * Navigace od výběru k vaření. Kotvy v local přepínají části stejné stránky,
 * po přepnutí se zavolá onSwitch.
 */
export function workflow(active, local = {}, onSwitch) {
  const navigation = el(
    'nav',
    { className: 'kitchen-workflow', 'aria-label': 'Od výběru k vaření' },
    phases.map((phase) =>
      el(
        'a',
        { href: local[phase.id] ?? url(phase.page), 'data-phase': phase.id },
        icon(phase.icon),
        el('span', {}, phase.label),
      ),
    ),
  );
  setPhase(navigation, active);
  navigation.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
    if (!link || !local[link.dataset.phase] || modified || event.button) return;
    event.preventDefault();
    if (location.href !== link.href) history.pushState(null, '', link.href);
    onSwitch();
    focusSection(navigation);
  });
  return navigation;
}

const placeOf = (recipe) => recipe.countryLabel || recipe.continentLabel;

/** Ikona země nebo oblasti původu. */
export function originIcon(recipe) {
  return labelIcon(placeOf(recipe));
}

/** Typ a původ receptu v záhlaví karty. */
export function recipeMeta(recipe) {
  return el(
    'div',
    { className: 'recipe-card-meta' },
    el('span', { className: 'recipe-symbol' }, labelIcon(recipe.typeLabel, 'food')),
    el('span', {}, recipe.typeLabel),
    el('span', { className: 'recipe-origin' }, originIcon(recipe), placeOf(recipe)),
  );
}

/** Odkaz do katalogu pro prázdný nákup. */
export function chooseRecipesLink() {
  return el(
    'a',
    { href: url('kuchyne/index.html#recepty'), className: 'kitchen-button primary' },
    icon('book'),
    'Vybrat recepty',
  );
}

/** Sdělení o ukládání výběru, jehož text se po selhání úložiště změní. */
export function storageNote(className = '') {
  return el('p', { className: `storage-message ${className} kitchen-muted` }, storageMessage);
}
