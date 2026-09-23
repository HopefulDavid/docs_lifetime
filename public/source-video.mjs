function findSourceList(section) {
  let node = section.nextElementSibling;
  while (node) {
    if (node.tagName === 'UL') return node;
    if (/^H[12]$/.test(node.tagName)) return null;
    node = node.nextElementSibling;
  }
  return null;
}

function sourceFile(list) {
  for (const item of list.querySelectorAll('li')) {
    const label = item.firstChild?.textContent?.trim().replace(/:$/, '');
    if (label !== 'Soubor') continue;
    const link = item.querySelector('a[href]');
    if (!link) return null;
    return { title: link.textContent.trim(), url: link.getAttribute('href') };
  }
  return null;
}

function posterFromCopy(url) {
  return url.replace(/\.mp4$/i, '.jpg');
}

/** Nahradí seznam se souborem lokálním přehrávačem, bez skriptu zůstane odkaz na soubor. */
export function enhanceSourceVideo() {
  const section = document.getElementById('video-postup');
  if (!section) return;
  const list = findSourceList(section);
  if (!list) return;
  const file = sourceFile(list);
  if (!file) return;
  const wrapper = document.createElement('section');
  wrapper.className = 'recipe-video';
  const frame = document.createElement('div');
  frame.className = 'recipe-video-frame';
  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  video.src = file.url;
  video.setAttribute('aria-label', file.title);
  const poster = posterFromCopy(file.url);
  if (poster !== file.url) video.poster = poster;
  frame.append(video);
  wrapper.append(frame);
  list.hidden = true;
  list.insertAdjacentElement('afterend', wrapper);
}
