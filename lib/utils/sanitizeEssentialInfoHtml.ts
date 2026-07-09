/**
 * Sanitize a supplier's "Important Information" (WBE EssentialInfo) HTML for
 * safe, readable rendering on the hotel card.
 *
 * The value is RAW third-party HTML, so it must never be trusted. Rather than
 * stripping it to a run-on plain-text wall, we keep only a small whitelist of
 * structural formatting tags (paragraphs, line breaks, lists, emphasis,
 * headings) and drop EVERYTHING else — including all attributes — so it renders
 * as readable, structured text with no room for scripts, event handlers,
 * `javascript:` hrefs, inline styles, images, iframes, etc.
 *
 * Non-whitelisted tags are UNWRAPPED (their text is kept) so no content is lost;
 * script/style/iframe-type tags are removed wholesale (content included).
 */

// Structural tags that make the info readable. Everything else is unwrapped.
const ALLOWED_TAGS = new Set([
  'P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U',
  'H3', 'H4', 'H5', 'H6',
]);

// Tags whose CONTENT must be dropped entirely (not unwrapped).
const DROP_WITH_CONTENT = 'script, style, noscript, iframe, object, embed, template';

export function sanitizeEssentialInfoHtml(html: string | null | undefined): string {
  if (!html) return '';

  // Browser path: parse into a detached document and clean the tree.
  if (typeof document !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement | null;
    if (!root) return '';

    root.querySelectorAll(DROP_WITH_CONTENT).forEach((el) => el.remove());

    // Walk deepest-first (reverse document order) so a parent is processed
    // after its children have already been cleaned/unwrapped.
    const all = Array.from(root.querySelectorAll('*')).reverse();
    for (const el of all) {
      // Strip every attribute (onclick, style, href, src, class, …).
      while (el.attributes.length) el.removeAttribute(el.attributes[0].name);

      if (!ALLOWED_TAGS.has(el.tagName)) {
        // Unwrap: splice the element's children in where it sat, keeping text.
        const parent = el.parentNode;
        if (!parent) continue;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    }

    return root.innerHTML.trim();
  }

  // SSR / non-DOM fallback: regex clean. Drop dangerous blocks with content,
  // then keep only whitelisted tags (stripping their attributes) and unwrap the
  // rest. This path is rarely hit — the card is a client component and re-cleans
  // on hydration — but it keeps SSR output safe and structured.
  return html
    .replace(
      /<(script|style|noscript|iframe|object|embed|template)\b[^>]*>[\s\S]*?<\/\1>/gi,
      '',
    )
    .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*?>/gi, (_m, rawTag: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag.toUpperCase())) return '';
      const isClose = _m.startsWith('</');
      if (isClose) return `</${tag}>`;
      return tag === 'br' ? '<br/>' : `<${tag}>`;
    })
    .trim();
}
