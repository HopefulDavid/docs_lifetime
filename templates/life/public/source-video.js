import { el } from './dom.js';

/** Nahradí odkaz na video přehrávačem. Bez skriptu zůstane v receptu odkaz na soubor. */
export function enhanceSourceVideo() {
  const list = document.querySelector('#video-postup ~ ul');
  const link = list?.querySelector('a[href$=".mp4"]');
  if (!link) return;
  const file = link.getAttribute('href');
  const video = el('video', {
    controls: true,
    preload: 'metadata',
    playsInline: true,
    src: file,
    poster: file.replace(/\.mp4$/, '.jpg'),
    'aria-label': link.textContent.trim(),
  });
  list.hidden = true;
  list.after(
    el(
      'section',
      { className: 'recipe-video' },
      el('div', { className: 'recipe-video-frame' }, video),
    ),
  );
}
