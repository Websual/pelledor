type OrgProps = {
  name: string;
  url: string;
  description?: string | null;
};

export function JsonLdOrganization({ name, url, description }: OrgProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(description?.trim() ? { description: description.trim() } : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type ArticleProps = {
  headline: string;
  url: string;
  datePublished?: Date | null;
  dateModified?: Date | null;
  image?: string | null;
  description?: string | null;
  publisherName: string;
  publisherUrl: string;
};

export function JsonLdBlogPosting({
  headline,
  url,
  datePublished,
  dateModified,
  image,
  description,
  publisherName,
  publisherUrl,
}: ArticleProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(description?.trim() ? { description: description.trim() } : {}),
    ...(datePublished
      ? { datePublished: datePublished.toISOString() }
      : {}),
    ...(dateModified ? { dateModified: dateModified.toISOString() } : {}),
    ...(image?.trim()
      ? { image: [image.trim()] }
      : {}),
    publisher: {
      "@type": "Organization",
      name: publisherName,
      url: publisherUrl,
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type CreativeWorkProps = {
  name: string;
  url: string;
  description?: string | null;
  image?: string | null;
};

export function JsonLdCreativeWork({
  name,
  url,
  description,
  image,
}: CreativeWorkProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(description?.trim() ? { description: description.trim() } : {}),
    ...(image?.trim() ? { image: image.trim() } : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
