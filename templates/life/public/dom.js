import { labelIcon } from './ui-icons.js';

/** Vytvoří prvek. Známé vlastnosti nastaví přímo, ostatní jako atributy a on* jako posluchače. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'className') node.className = value;
    else if (key in node && !key.startsWith('aria')) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children.flat().filter((child) => child !== null && child !== undefined));
  return node;
}

/** Vytvoří tlačítko s ikonou odvozenou z jeho textu. */
export function button(text, action, attrs = {}) {
  return el('button', { type: 'button', ...attrs, onClick: action }, labelIcon(text, null), text);
}

/** Přesune fokus i pohled na začátek části stránky. */
export function focusSection(node) {
  if (!node) return;
  if (!node.hasAttribute('tabindex') && !node.matches('a, button, input, select, textarea'))
    node.tabIndex = -1;
  node.focus({ preventScroll: true });
  node.scrollIntoView({ block: 'start', behavior: 'instant' });
}

/** Překreslí část stránky a zachová fokus, otevřené podrobnosti a posun. */
export function preserveView(render) {
  const activeId = document.activeElement?.id;
  const open = [...document.querySelectorAll('details[open][id]')].map((node) => node.id);
  const scroll = [...document.querySelectorAll('[data-preserve-scroll][id]')].map((node) => [
    node.id,
    node.scrollTop,
  ]);
  render();
  open.forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.open = true;
  });
  scroll.forEach(([id, top]) => {
    const node = document.getElementById(id);
    if (node) node.scrollTop = top;
  });
  if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
}
