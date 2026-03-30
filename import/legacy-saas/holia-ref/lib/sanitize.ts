/**
 * Server-side HTML sanitization for user-generated content (e.g. practitioner bio).
 * Uses DOMPurify via isomorphic-dompurify to prevent XSS while allowing safe formatting.
 * Use this in API routes before persisting HTML to the database.
 */

import DOMPurify from "isomorphic-dompurify";

/** Tags allowed in the RichEditor bio (Gras, Italique, H3, listes). */
const BIO_ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "h3", "ul", "ol", "li"];

/** No attributes needed for our editor output; strip all to be safe. */
const BIO_ALLOWED_ATTR: string[] = [];

/**
 * Sanitize HTML from the bio RichEditor for safe storage and display.
 * Keeps only tags produced by our editor (paragraphs, bold, italic, H3, lists).
 */
export function sanitizeBioHtml(html: string): string {
  if (typeof html !== "string") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: BIO_ALLOWED_TAGS,
    ALLOWED_ATTR: BIO_ALLOWED_ATTR,
  });
}
