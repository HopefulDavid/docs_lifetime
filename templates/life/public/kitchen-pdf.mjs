let engine;

function loadScript(name) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(name, import.meta.url).href;
    script.onload = resolve;
    script.onerror = () => { script.remove(); reject(new Error('PDF knihovnu se nepodařilo načíst.')); };
    document.head.append(script);
  });
}

async function loadEngine() {
  if (!engine) engine = (async () => {
    if (!window.pdfMake) await loadScript('pdfmake.min.js');
    await loadScript('vfs_fonts.js');
    return window.pdfMake;
  })().catch(error => { engine = null; throw error; });
  return engine;
}

function inline(node, style = {}) {
  if (node.nodeType === 3) return [{ text: node.textContent.replace(/☐/g, '[ ]').replace(/☑/g, '[x]').replace(/\s+/g, ' '), ...style }];
  if (node.tagName === 'BR') return [{ text: '\n' }];
  const next = { ...style };
  if (['STRONG', 'B'].includes(node.tagName)) next.bold = true;
  if (['EM', 'I'].includes(node.tagName)) next.italics = true;
  if (node.tagName === 'A' && /^https?:/.test(node.href)) { next.link = node.href; next.decoration = 'underline'; }
  return [...node.childNodes].flatMap(child => inline(child, next));
}

function blocks(node) {
  if (node.classList?.contains('print-department')) {
    const [heading, ...items] = [...node.children];
    return [{ table: { widths: ['*'], headerRows: 1, keepWithHeaderRows: 1, dontBreakRows: true,
      body: [[{ text: inline(heading), style: 'h2', margin: [0, 6, 0, 5] }], ...items.map(item => [{
        stack: [...item.children].flatMap(blocks).map(part => ({ ...part, margin: [0, 0, 0, 2] })), margin: [0, 0, 0, 2],
      }])],
    }, layout: 'noBorders', margin: [0, 4, 0, 7] }];
  }
  if (['H1', 'H2', 'H3'].includes(node.tagName)) return [{ text: inline(node), style: node.tagName.toLowerCase(), headlineLevel: Number(node.tagName[1]) }];
  if (node.tagName === 'SMALL') return [{ text: inline(node), fontSize: 8.5, color: '#555555', margin: [0, 0, 0, 3] }];
  if (node.tagName === 'P') return [{ text: inline(node), margin: [0, 0, 0, 6] }];
  if (['UL', 'OL'].includes(node.tagName)) return [{ [node.tagName === 'UL' ? 'ul' : 'ol']: [...node.children].map(item => {
    const stack = [];
    let text = [];
    const flush = () => { if (text.some(part => part.text.trim())) stack.push({ text, margin: [0, 0, 0, 4] }); text = []; };
    for (const child of item.childNodes) {
      if (child.nodeType === 1 && ['P', 'UL', 'OL', 'BLOCKQUOTE'].includes(child.tagName)) { flush(); stack.push(...blocks(child)); }
      else text.push(...inline(child));
    }
    flush();
    return { stack, margin: [0, 0, 0, 5] };
  }), margin: [0, 2, 0, 8] }];
  if (node.tagName === 'BLOCKQUOTE') return [{ stack: [...node.children].flatMap(blocks), color: '#4b5448', italics: true, margin: [10, 2, 0, 7] }];
  return [...node.children].flatMap(blocks);
}

/** Převede sémantický exportní náhled na stránkovaný dokument pdfmake se zachováním poznámek a seznamů. */
export function kitchenPdfDefinition(sheet) {
  const title = sheet.querySelector('h1').textContent;
  return {
    info: { title, creator: 'Dokumentace ze života' }, pageSize: 'A4', pageMargins: [42, 40, 42, 42],
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.2, color: '#252b24' },
    styles: {
      h1: { fontSize: 23, bold: true, color: '#314830', margin: [0, 0, 0, 12] },
      h2: { fontSize: 14, bold: true, color: '#314830', margin: [0, 14, 0, 7] },
      h3: { fontSize: 11.5, bold: true, margin: [0, 10, 0, 6] },
    },
    content: blocks(sheet),
    footer: (current, total) => ({ text: `${title}  ·  ${current} / ${total}`, alignment: 'center', fontSize: 8, color: '#666666', margin: [42, 14, 42, 0] }),
    pageBreakBefore: (node, container) => Boolean(node.headlineLevel && container.getFollowingNodesOnPage().length === 0),
  };
}

/** Vytvoří stažitelné PDF z právě zobrazeného exportního náhledu, bez odesílání obsahu na server. */
export async function createKitchenPdf(sheet) {
  const pdfMake = await loadEngine();
  return pdfMake.createPdf(kitchenPdfDefinition(sheet)).getDataUrl();
}
