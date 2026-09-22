import labels from './icon-labels.mjs';

/** Vytvoří dekorativní SVG ikonu; význam vždy poskytuje sousední text ovládání. */
export function icon(name) {
  const element = document.createElement('span');
  element.className = `ui-icon ui-icon--${name}${name.startsWith('flag-') ? ' ui-flag' : ''}`;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

/** Vrátí jednotnou ikonu známého popisku nebo zvolenou obecnou náhradu. */
export function labelIcon(label, fallback = 'world') {
  const name = labels[label] || fallback;
  return name ? icon(name) : null;
}

/** Doplní ikony do statických nadpisů a navigace bez změny jejich textu nebo kotev. */
export function decoratePage(root = document) {
  for (const element of root.querySelectorAll('article h1, article h2, article h3, .content-overview a, .home-actions a, #navbar a, #toc a')) {
    if (element.querySelector('.ui-icon') || element.closest('.kitchen-app')) continue;
    const text = element.textContent.replace(/Odkaz na nadpis|#/g, '').trim();
    if (labels[text]) element.prepend(icon(labels[text]), document.createTextNode(' '));
  }
}
