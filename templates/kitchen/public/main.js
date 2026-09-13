import { startKitchen } from './kitchen.mjs';

const ariaLabels = {
  'Toggle navigation': 'Přepnout navigaci',
  Search: 'Hledat',
  Close: 'Zavřít',
  'Show table of contents': 'Zobrazit obsah',
  Previous: 'Předchozí',
  Next: 'Další',
};

function localizeAriaLabels(root) {
  for (const link of root.querySelectorAll('.item-title a[target="_blank"]')) link.removeAttribute('target');
  for (const [source, translation] of Object.entries(ariaLabels)) {
    root
      .querySelectorAll(`[aria-label="${source}"]`)
      .forEach((element) => element.setAttribute('aria-label', translation));
  }
  for (const control of root.querySelectorAll('a[data-bs-toggle="dropdown"][title]:not([role])')) {
    control.setAttribute('role', 'button');
    control.setAttribute('aria-label', control.title);
    control.tabIndex = 0;
    control.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); }
    });
  }
}

/** Poskytuje české popisky a spouštěcí chování veřejnému kontraktu šablony DocFX. */
const docfxOptions = {
  anchors: {
    ariaLabel: 'Odkaz na nadpis',
  },
  start() {
    localizeAriaLabels(document);
    const main = document.querySelector('main');
    if (main) {
      main.id = 'main-content';
      main.tabIndex = -1;
      const skip = document.createElement('a');
      skip.href = '#main-content';
      skip.className = 'skip-to-content';
      skip.textContent = 'Přejít k obsahu';
      skip.addEventListener('click', event => { event.preventDefault(); main.focus(); });
      document.body.prepend(skip);
    }
    document.getElementById('logo')?.setAttribute('alt', '');
    const contentsLabel = document.getElementById('tocOffcanvasLabel');
    if (contentsLabel) contentsLabel.textContent = 'Obsah sekce';
    const menu = document.querySelector('.navbar button[aria-controls="navpanel"]');
    if (menu) { menu.textContent = 'Menu'; menu.title = 'Hledání a hlavní navigace'; }
    const search = document.getElementById('search-query');
    const results = document.getElementById('search-results');
    let focusResults = false;
    const showResults = () => {
      if (!focusResults || !document.body.hasAttribute('data-search')) return;
      focusResults = false;
      const focus = () => {
        results.tabIndex = -1;
        results.setAttribute('aria-label', 'Výsledky hledání');
        results.focus({ preventScroll: true });
        results.previousElementSibling.scrollIntoView({ block: 'start' });
      };
      if (menu?.getAttribute('aria-expanded') === 'true') {
        const panel = document.getElementById('navpanel');
        panel.addEventListener('hidden.bs.collapse', focus, { once: true });
        if (panel.classList.contains('collapsing')) panel.addEventListener('shown.bs.collapse', () => menu.click(), { once: true });
        else menu.click();
      } else focus();
    };
    if (search && results) {
      const tools = document.createElement('div');
      tools.className = 'site-search-tools container-xxl';
      for (const [label, action] of [
        ['Upravit hledání', () => {
          if (menu && getComputedStyle(menu).display !== 'none' && menu.getAttribute('aria-expanded') !== 'true') {
            document.getElementById('navpanel').addEventListener('shown.bs.collapse', () => search.focus(), { once: true });
            menu.click();
          } else search.focus();
        }],
        ['Zavřít hledání', () => { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); main?.focus(); }],
      ]) {
        const control = document.createElement('button');
        control.type = 'button'; control.className = 'kitchen-button'; control.textContent = label;
        control.addEventListener('click', action); tools.append(control);
      }
      results.before(tools);
      search.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); focusResults = true; showResults(); }
      });
    }
    startKitchen().catch(error => {
      console.error('Kuchařka:', error);
      const target = document.getElementById('kitchen-catalog') || document.getElementById('kitchen-planner');
      if (target) {
        const message = document.createElement('p');
        message.textContent = 'Výběr a nákup se nepodařilo načíst. Obnovte stránku nebo otevřete recepty.';
        const link = document.createElement('a');
        link.href = new URL('../index.html', import.meta.url).href;
        link.textContent = 'Prohlédnout recepty';
        target.replaceChildren(message, link);
        document.querySelector('.catalog-fallback')?.removeAttribute('hidden');
      } else if (document.querySelector('article')) {
        const message = document.createElement('p');
        message.setAttribute('role', 'status');
        message.textContent = 'Nákup a vaření se nepodařilo načíst. Recept můžete číst níže nebo stránku obnovit.';
        document.querySelector('article h1')?.after(message);
      }
    });

    for (const root of [document.getElementById('search-results'), document.querySelector('header')].filter(Boolean)) {
      new MutationObserver(() => { localizeAriaLabels(root); showResults(); }).observe(root, {
        childList: true,
        subtree: true,
      });
    }
  },
};

export default docfxOptions;
