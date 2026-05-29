import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Fetches a PDF from a public URL and returns its full text content.
 * Returns "" on any failure (do not throw — caller stores empty string).
 */
export async function extractPdfText(url) {
  if (!url) return '';
  let pdf = null;
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const buffer = await res.arrayBuffer();
    pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const out = typeof text === 'string' ? text : Array.isArray(text) ? text.join('\n') : '';
    return out;
  } catch (err) {
    console.error('[pdfExtract]', err);
    return '';
  } finally {
    try { await pdf?.destroy?.(); } catch {}
  }
}
