import { el } from './dom.js';
import { startKitchen } from './kitchen/index.js';
import { enhanceSearch } from './search-ui.js';
import { enhanceSourceVideo } from './source-video.js';
import { decoratePage } from './ui-icons.js';

const siteRoot = new URL('../', import.meta.url);

// Popisky, které DocFX nepřekládá tokeny.
const ariaLabels = {
  'Toggle navigation': 'Přepnout navigaci',
  Search: 'Hledat',
  Close: 'Zavřít',
  'Show table of contents': 'Zobrazit obsah',
  Previous: 'Předchozí',
  Next: 'Další',
};

function localizeControls(root) {
  for (const link of root.querySelectorAll('.item-title a[target="_blank"]'))
    link.removeAttribute('target');
  for (const [source, translation] of Object.entries(ariaLabels))
    for (const control of root.querySelectorAll(`[aria-label="${source}"]`))
      control.setAttribute('aria-label', translation);
  for (const control of root.querySelectorAll('a[data-bs-toggle="dropdown"][title]:not([role])')) {
    control.setAttribute('role', 'button');
    control.setAttribute('aria-label', control.title);
    control.tabIndex = 0;
    control.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      control.click();
    });
  }
}

/** Katalog býval na úvodní stránce, jeho uložené odkazy vedou do kuchyně. */
function redirectOldCatalogLink() {
  const { pathname, search, hash } = location;
  const isHome = [siteRoot.pathname, `${siteRoot.pathname}index.html`].includes(pathname);
  const parameters = new URLSearchParams(search);
  const isCatalog =
    hash === '#recepty' || ['q', 'type', 'selected'].some((key) => parameters.has(key));
  if (!isHome || !isCatalog) return false;
  location.replace(new URL(`kuchyne/index.html${search}${hash}`, siteRoot));
  return true;
}

function improveLayout() {
  if (location.pathname === `${siteRoot.pathname}changelog.html`)
    document.body.classList.add('changelog-page');
  const main = document.querySelector('main');
  if (main) {
    main.id = 'main-content';
    main.tabIndex = -1;
    const skip = el(
      'a',
      { href: '#main-content', className: 'skip-to-content' },
      'Přejít k obsahu',
    );
    skip.addEventListener('click', (event) => {
      event.preventDefault();
      main.focus();
    });
    document.body.prepend(skip);
  }
  document.getElementById('logo')?.setAttribute('alt', '');
  const contentsLabel = document.getElementById('tocOffcanvasLabel');
  if (contentsLabel) contentsLabel.textContent = 'Obsah sekce';
  const menu = document.querySelector('.navbar button[aria-controls="navpanel"]');
  if (menu) {
    menu.textContent = 'Menu';
    menu.title = 'Hledání a hlavní navigace';
  }
}

/** Upraví i prvky, které DocFX vykreslí dodatečně. */
function watchDynamicParts() {
  for (const selector of ['#search-results', 'header', '.toc-offcanvas']) {
    const root = document.querySelector(selector);
    if (!root) continue;
    new MutationObserver(() => {
      localizeControls(root);
      decoratePage(root);
    }).observe(root, { childList: true, subtree: true });
  }
}

/** Otevře hledání v horní liště, na úzkém displeji nejdřív rozbalí navigaci. */
function openSearch() {
  const input = document.querySelector('#search-query');
  if (!input) return;
  if (!input.offsetParent) document.querySelector('[data-bs-target="#navpanel"]')?.click();
  requestAnimationFrame(() => input.focus());
}

/** Tlačítko hledání na úvodní stránce a klávesa / odkudkoli, pokud se zrovna nepíše do pole. */
function enableSearchShortcuts() {
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-home-search]')) openSearch();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.target.closest?.('input, textarea, select, [contenteditable]'))
      return;
    event.preventDefault();
    openSearch();
  });
}

/** Rozšíření šablony modern, DocFX volá start po vykreslení stránky. */
export default {
  anchors: {
    ariaLabel: 'Odkaz na nadpis',
  },
  start() {
    if (redirectOldCatalogLink()) return;
    localizeControls(document);
    decoratePage();
    enhanceSourceVideo();
    improveLayout();
    enhanceSearch();
    enableSearchShortcuts();
    startKitchen();
    watchDynamicParts();
  },
};
