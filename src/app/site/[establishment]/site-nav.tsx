import Link from "next/link";
import type { NavLinkType } from "@/core/cms/practitioner-utils";

export type SiteNavItemRow = {
  id: string;
  label: string;
  linkType: string;
  linkTarget: string;
};

function itemHref(establishment: string, item: SiteNavItemRow): string {
  const base = `/site/${establishment}`;
  const t = item.linkType as NavLinkType | string;
  switch (t) {
    case "page":
      return `${base}/${(item.linkTarget || "home").replace(/^\//, "")}`;
    case "external":
      return item.linkTarget || "#";
    case "blog":
      return `${base}/blog`;
    case "portfolio":
      return `${base}/portfolio`;
    case "blog_category":
      return item.linkTarget
        ? `${base}/blog?category=${encodeURIComponent(item.linkTarget)}`
        : `${base}/blog`;
    default:
      return `${base}/home`;
  }
}

export function SiteNav({
  establishment,
  siteTitle,
  items,
}: {
  establishment: string;
  siteTitle: string;
  items: SiteNavItemRow[];
}) {
  return (
    <header className="border-b border-gray-200 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href={`/site/${establishment}/home`}
          className="text-sm font-semibold tracking-tight text-gray-900"
        >
          {siteTitle || establishment}
        </Link>
        {items.length > 0 && (
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {items.map((item) => {
              const href = itemHref(establishment, item);
              const external = item.linkType === "external" && /^https?:\/\//i.test(href);
              if (external) {
                return (
                  <a
                    key={item.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
