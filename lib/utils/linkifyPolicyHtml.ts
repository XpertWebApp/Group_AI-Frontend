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
export function linkifyPolicyHtml(html: string | null | undefined): string {
  if (!html) return '';

  // Browser path: use the DOM so we never rewrite URLs that already live inside
  // a tag/attribute (e.g. an existing href), and never double-link text that is
  // already inside an <a>.
  if (typeof document !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
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
