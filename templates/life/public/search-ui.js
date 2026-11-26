import { el } from './dom.js';

/** Doplní hledání o ovládání výsledků a přesun fokusu po potvrzení klávesou Enter. */
export function enhanceSearch() {
  const search = document.getElementById('search-query');
  const results = document.getElementById('search-results');
  const panel = document.getElementById('navpanel');
  const menu = document.querySelector('.navbar button[aria-controls="navpanel"]');
  if (!search || !results) return;
  let confirmed = false;

  const isMenuOpen = () => menu?.getAttribute('aria-expanded') === 'true';
  const afterPanel = (event, action) =>
    panel.addEventListener(`${event}.bs.collapse`, action, { once: true });

  function focusResults() {
    results.tabIndex = -1;
    results.setAttribute('aria-label', 'Výsledky hledání');
    results.focus({ preventScroll: true });
    results.previousElementSibling.scrollIntoView({ block: 'start' });
  }

  /** Otevřená nabídka na telefonu zakrývá výsledky, proto se nejprve zavře. */
  function showResults() {
    if (!confirmed || !document.body.hasAttribute('data-search')) return;
    confirmed = false;
    if (!isMenuOpen()) {
      focusResults();
      return;
    }
    afterPanel('hidden', focusResults);
    if (panel.classList.contains('collapsing')) afterPanel('shown', () => menu.click());
    else menu.click();
  }

  function editSearch() {
    const isMenuVisible = menu && getComputedStyle(menu).display !== 'none';
    if (!isMenuVisible || isMenuOpen()) {
      search.focus();
      return;
    }
    afterPanel('shown', () => search.focus());
    menu.click();
  }

  function closeSearch() {
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('main')?.focus();
  }

  const control = (text, onClick) =>
    el('button', { type: 'button', className: 'kitchen-button', onClick }, text);
  results.before(
    el(
      'div',
      { className: 'site-search-tools container-xxl' },
      control('Upravit hledání', editSearch),
      control('Zavřít hledání', closeSearch),
    ),
  );
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    confirmed = true;
    showResults();
  });
  // Výsledky přicházejí z workeru až po potvrzení dotazu.
  new MutationObserver(showResults).observe(results, { childList: true, subtree: true });
}
