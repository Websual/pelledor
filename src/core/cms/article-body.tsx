import { PageDocumentRenderer } from "@/core/builder/BlockRenderer";
import { isPageDocumentV1 } from "@/core/builder/page-document";
import { sanitizeCmsHtml } from "@/core/security/sanitize-cms-html";

type Props = {
  bodyHtml: string;
  bodyDocument: unknown;
};

/**
 * Corps d’article : si `bodyDocument` est un `PageDocumentV1` valide, rendu builder ;
 * sinon HTML (prose).
 */
export function ArticleBody({ bodyHtml, bodyDocument }: Props) {
  if (bodyDocument != null && isPageDocumentV1(bodyDocument)) {
    return <PageDocumentRenderer payload={bodyDocument} />;
  }
  if (!bodyHtml?.trim()) {
    return null;
  }
  const safe = sanitizeCmsHtml(bodyHtml);
  if (!safe.trim()) {
    return null;
  }
  return (
    <div
      className="prose prose-lg prose-neutral max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
