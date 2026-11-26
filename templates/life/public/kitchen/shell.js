import { el } from '../dom.js';
import { icon } from '../ui-icons.js';
import { plural } from './quantity.js';
import { onSave, selectedRecipes, storageAvailable, storageMessage, url } from './store.js';

const notification = el('div', {
  role: 'status',
  className: 'kitchen-notification',
  'aria-live': 'polite',
});
const tray = el('div', { className: 'kitchen-tray kitchen-app' });
let notificationTimer;
let pageTray = () => null;

/** Krátce oznámí výsledek akce. */
export function announce(message) {
  notification.textContent = message;
  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    notification.textContent = '';
  }, 4500);
}

function defaultTray() {
  const count = selectedRecipes().length;
  const cooking = Boolean(document.querySelector('.recipe-procedure:not([hidden])'));
  return [
    el(
      'span',
      {},
      count
        ? `${count} ${plural(count, 'recept', 'recepty', 'receptů')} v nákupu`
        : 'Jídla na příští vaření',
    ),
    el(
      'a',
      {
        href: url(cooking ? 'nakup.html#uvarit' : 'nakup.html'),
        className: 'kitchen-button primary',
      },
      icon(cooking ? 'kitchen' : 'basket'),
      cooking ? 'Jídla k vaření' : 'Můj nákup',
      el('span', { className: 'count-badge' }, String(count)),
    ),
  ];
}

/** Překreslí spodní lištu obsahem stránky nebo souhrnem výběru. */
export function updateTray() {
  tray.replaceChildren(...(pageTray() ?? defaultTray()));
  if (!storageAvailable)
    tray.append(el('p', { className: 'tray-storage', role: 'status' }, storageMessage));
}

/** Předá lištu stránce. Vrátí-li render null, zobrazí se souhrn výběru. */
export function setPageTray(render) {
  pageTray = render;
  updateTray();
}

/** Přidá na stránku lištu a oznámení a udržuje je shodné s uloženým stavem. */
export function mountShell() {
  document.body.append(notification, tray);
  document.body.classList.add('has-kitchen-tray');
  onSave(() => {
    document.body.classList.toggle('kitchen-storage-unavailable', !storageAvailable);
    for (const node of document.querySelectorAll('.storage-message'))
      node.textContent = storageMessage;
    updateTray();
  });
  updateTray();
}
