/**
 * Prepare admin-authored policy HTML (Terms & Conditions / Cancellation
 * Conditions) for display so links are usable:
 *   1. every <a> opens in a new tab (target="_blank" + rel="noopener noreferrer"),
 *   2. bare http(s) URLs typed/pasted as plain text become clickable links
 *      (also opening in a new tab).
 *
 * The content is staff-authored (via the RichTextEditor / Settings → Policies)
 * and is already rendered with dangerouslySetInnerHTML — this only augments the
 * links, it does not sanitize untrusted input.
 */
/**
 * Strip editor-chrome / non-content markup that can leak into saved policy HTML
 * (e.g. a rich-text toolbar's buttons/icons baked into the value). Policy text
 * is prose + links + lists + emphasis, so buttons, icons, form controls, and
 * scripts are never legitimate content. Also drops the empty wrapper elements
 * left behind (which render as stray grey bars). Use this before loading a
 * policy value into the editor AND before rendering it.
 */
export function sanitizePolicyHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    // SSR / non-DOM fallback: remove the obvious chrome blocks by regex.
    return html.replace(
      /<(script|style|button|svg|input|textarea|select)\b[^>]*>[\s\S]*?<\/\1>/gi,
      '',
    );
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return html;
  root
    .querySelectorAll('script, style, button, svg, input, textarea, select, [role="toolbar"], [contenteditable]')
    .forEach((el) => el.remove());
  // Removing the toolbar's buttons/icons can leave its empty wrapper behind,
  // which still renders as a stray (grey) bar. Drop leftover empty container
  // elements — div/span with no text and no real content. Paragraphs are left
  // alone to preserve spacing.
  root.querySelectorAll('div, span').forEach((el) => {
    if (!el.textContent?.trim() && !el.querySelector('a, img, li, br, hr, table')) {
      el.remove();
    }
  });
  return root.innerHTML;
}

export function linkifyPolicyHtml(html: string | null | undefined): string {
  if (!html) return '';

  // Browser path: use the DOM so we never rewrite URLs that already live inside
  // a tag/attribute (e.g. an existing href), and never double-link text that is
  // already inside an <a>.
  if (typeof document !== 'undefined' && typeof DOMParser !== 'undefined') {
    // Strip editor-chrome first so the rendered output is clean.
    const doc = new DOMParser().parseFromString(`<div>${sanitizePolicyHtml(html)}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement | null;
    if (!root) return html;

    // 1) Linkify bare URLs in text nodes that aren't already inside an anchor.
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const targets: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      if (textNode.parentElement?.closest('a')) continue;
      if (/https?:\/\/\S/.test(textNode.nodeValue ?? '')) targets.push(textNode);
    }
    const urlRe = /(https?:\/\/[^\s<]+)/g;
    for (const textNode of targets) {
      const text = textNode.nodeValue ?? '';
      const frag = doc.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      urlRe.lastIndex = 0;
      while ((match = urlRe.exec(text))) {
        if (match.index > lastIndex) {
          frag.appendChild(doc.createTextNode(text.slice(lastIndex, match.index)));
        }
        const a = doc.createElement('a');
        a.href = match[1];
        a.textContent = match[1];
        frag.appendChild(a);
        lastIndex = match.index + match[1].length;
      }
      if (lastIndex < text.length) {
        frag.appendChild(doc.createTextNode(text.slice(lastIndex)));
      }
      textNode.parentNode?.replaceChild(frag, textNode);
    }

    // 2) Make every anchor open safely in a new tab.
    root.querySelectorAll('a').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    return root.innerHTML;
  }

  // SSR / non-DOM fallback: at least make existing anchors open in a new tab.
  return html.replace(/<a\b(?![^>]*\btarget=)/gi, '<a target="_blank" rel="noopener noreferrer"');
}
