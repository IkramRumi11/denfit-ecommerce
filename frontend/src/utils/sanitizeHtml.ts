/**
 * Sanitizes unsafe HTML string before rendering with dangerouslySetInnerHTML.
 * Strips script/iframe/object/embed/style tags, on* inline event handlers, and javascript: links.
 */
export const sanitizeHtml = (html: string): string => {
  if (!html || typeof html !== 'string') return '';

  let clean = html.replace(/<(script|iframe|object|embed|style)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/\s*on[a-z]+\s*=\s*(['"])[^'"]*\1/gi, '');
  clean = clean.replace(/\s*on[a-z]+\s*=\s*[^>\s]+/gi, '');
  clean = clean.replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"');

  return clean;
};
