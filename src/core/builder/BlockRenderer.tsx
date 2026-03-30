/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import type {
  PageBlock,
  HeroConfig,
  HeadingConfig,
  TextConfig,
  ImageConfig,
  GalleryConfig,
  CtaConfig,
  ServicesConfig,
  FaqConfig,
  TestimonialsConfig,
  ContactInfoConfig,
  SeparatorConfig,
  EmbedConfig,
} from "./block-types";
import {
  normalizeBlocksToDocument,
  parsePageBlocksFromDb,
  type BuilderColumnV1,
  type BuilderRowV1,
  type PageDocumentV1,
} from "./page-document";
import { safeCssBackgroundUrl, safeHref, safeImageSrc } from "@/core/security/safe-url";
import { sanitizeCmsHtml } from "@/core/security/sanitize-cms-html";

// ─── Renderers individuels ────────────────────────────────────────────────────

const alignClass = { left: "text-left", center: "text-center", right: "text-right" };

function HeadingBlock({ config }: { config: HeadingConfig }) {
  const level = config.level ?? "h2";
  const Tag = level;
  const sizes: Record<NonNullable<HeadingConfig["size"]>, string> = {
    display: "text-4xl md:text-6xl",
    xl: "text-3xl md:text-5xl",
    lg: "text-2xl md:text-4xl",
    md: "text-xl md:text-3xl",
    sm: "text-lg md:text-xl",
  };
  const cl = sizes[config.size ?? "lg"];
  const ta = alignClass[config.align ?? "left"];
  return (
    <div className={`py-6 px-6 ${ta}`}>
      <Tag className={`${cl} font-light text-gray-900 tracking-tight`}>{config.text}</Tag>
    </div>
  );
}

function HeroBlock({ config }: { config: HeroConfig }) {
  const ta = alignClass[config.textAlign ?? "center"];
  const overlayOpacity = (config.overlay ?? 40) / 100;
  const bgUrl = safeCssBackgroundUrl(config.bgImage);
  return (
    <section
      className="relative min-h-[60vh] flex items-center justify-center overflow-hidden"
      style={{
        background: bgUrl
          ? `url(${bgUrl}) center/cover no-repeat`
          : config.bgColor ?? "#1a1a2e",
      }}
    >
      {bgUrl && (
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayOpacity})` }} />
      )}
      <div className={`relative z-10 px-6 py-16 max-w-3xl w-full ${ta}`}>
        <h1 className="text-4xl md:text-6xl font-light text-white mb-4 leading-tight">{config.title}</h1>
        {config.subtitle && <p className="text-xl text-white/70 mb-8 font-light">{config.subtitle}</p>}
        {config.ctaText && config.ctaLink && (
          <a
            href={safeHref(config.ctaLink)}
            className="inline-block bg-white text-gray-900 px-8 py-3 font-medium hover:bg-gray-100 transition"
          >
            {config.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

function TextBlock({ config }: { config: TextConfig }) {
  const maxW = { sm: "max-w-sm", md: "max-w-2xl", lg: "max-w-4xl", full: "max-w-full" }[config.maxWidth ?? "md"];
  const html = sanitizeCmsHtml(config.content ?? "");
  if (!html.trim()) return null;
  return (
    <section className="py-12 px-6">
      <div className={`${maxW} mx-auto ${alignClass[config.align ?? "left"]}`}>
        <div
          className="prose prose-lg max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  );
}

function ImageBlock({ config }: { config: ImageConfig }) {
  const widthClass = { sm: "max-w-sm", md: "max-w-xl", lg: "max-w-3xl", full: "max-w-full" }[config.width ?? "full"];
  const src = safeImageSrc(config.src);
  if (!src) return null;
  return (
    <section className="py-8 px-6">
      <div className={`${widthClass} mx-auto`}>
        <img
          src={src}
          alt={config.alt ?? ""}
          className={`w-full object-cover ${config.rounded ? "rounded-2xl" : ""}`}
        />
        {config.caption && <p className="text-center text-sm text-gray-500 mt-2 italic">{config.caption}</p>}
      </div>
    </section>
  );
}

function GalleryBlock({ config }: { config: GalleryConfig }) {
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[config.columns ?? 3];
  const gap = { sm: "gap-1", md: "gap-3", lg: "gap-6" }[config.gap ?? "md"];
  if (!config.images?.length) return null;
  return (
    <section className="py-10 px-6">
      <div className={`grid ${cols} ${gap} max-w-5xl mx-auto`}>
        {config.images.flatMap((img, i) => {
          const s = safeImageSrc(img.src);
          if (!s) return [];
          return [
            <div key={`${i}-${s.slice(0, 48)}`} className="overflow-hidden aspect-square group">
              <img
                src={s}
                alt={img.alt ?? ""}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>,
          ];
        })}
      </div>
    </section>
  );
}

function CtaBlock({ config }: { config: CtaConfig }) {
  const styles = {
    primary: "bg-gray-900 text-white hover:bg-gray-700",
    secondary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white",
  };
  const sizes = { sm: "px-5 py-2 text-sm", md: "px-8 py-3", lg: "px-12 py-4 text-lg" };
  const align = { left: "text-left", center: "text-center", right: "text-right" };
  return (
    <section className={`py-10 px-6 ${align[config.align ?? "center"]}`}>
      {config.subtext && <p className="text-gray-500 mb-3 text-sm">{config.subtext}</p>}
      <a
        href={safeHref(config.link)}
        className={`inline-block font-medium transition ${styles[config.style ?? "primary"]} ${sizes[config.size ?? "md"]}`}
      >
        {config.text}
      </a>
    </section>
  );
}

function FaqBlock({ config }: { config: FaqConfig }) {
  const items = config.items ?? [];
  if (!items.length) return null;
  return (
    <section className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {config.title ? (
          <h2 className="text-2xl font-light text-gray-800 mb-8 text-center">{config.title}</h2>
        ) : null}
        <div className="space-y-2">
          {items.map((item, i) => (
            <details
              key={i}
              className="group border border-gray-200 rounded-xl bg-white open:shadow-sm transition-shadow"
            >
              <summary className="cursor-pointer select-none px-4 py-3.5 font-medium text-gray-800 flex justify-between items-center gap-4 list-none [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span className="text-gray-400 text-xs shrink-0 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div
                className="px-4 pb-4 pt-0 prose prose-sm max-w-none text-gray-600 border-t border-gray-100"
                dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(item.answer ?? "") }}
              />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ config }: { config: TestimonialsConfig }) {
  const items = config.items ?? [];
  if (!items.length) return null;
  const cols = { 1: "grid-cols-1", 2: "grid-cols-1 md:grid-cols-2", 3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" }[
    config.columns ?? 2
  ];
  return (
    <section className="py-12 px-6 bg-gray-50/80">
      <div className="max-w-5xl mx-auto">
        {config.title ? (
          <h2 className="text-2xl font-light text-gray-800 mb-10 text-center">{config.title}</h2>
        ) : null}
        <div className={`grid ${cols} gap-6`}>
          {items.map((item, i) => {
            const av = safeImageSrc(item.avatarUrl);
            return (
              <figure key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <blockquote className="text-gray-700 text-sm leading-relaxed mb-4">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  {av ? (
                    <img src={av} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                      {(item.author || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{item.author}</div>
                    {item.role && <div className="text-xs text-gray-500">{item.role}</div>}
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ServicesBlock({ config }: { config: ServicesConfig }) {
  const cols = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" }[config.columns ?? 2];
  return (
    <section className="py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {config.title && <h2 className="text-3xl font-light text-gray-800 mb-8 text-center">{config.title}</h2>}
        <div className={`grid ${cols} gap-6`}>
          {config.items.map((item, i) => (
            <div key={i} className="border border-gray-200 p-6 hover:border-gray-400 transition">
              {item.icon && <div className="text-3xl mb-3">{item.icon}</div>}
              <h3 className="font-semibold text-gray-800 text-lg mb-1">{item.name}</h3>
              {item.description && <p className="text-gray-500 text-sm mb-3">{item.description}</p>}
              <div className="flex gap-4 text-sm">
                {item.price && <span className="font-semibold text-gray-800">{item.price}</span>}
                {item.duration && <span className="text-gray-400">{item.duration}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactInfoBlock({ config }: { config: ContactInfoConfig }) {
  return (
    <section className="py-12 px-6 bg-gray-50">
      <div className="max-w-2xl mx-auto text-center">
        {config.title && <h2 className="text-2xl font-light text-gray-800 mb-8">{config.title}</h2>}
        <div className="space-y-3">
          {config.phone && (
            <p><span className="text-gray-400 text-sm block">Téléphone</span>
              <a href={`tel:${config.phone}`} className="text-gray-800 font-medium hover:text-blue-600">{config.phone}</a>
            </p>
          )}
          {config.email && (
            <p><span className="text-gray-400 text-sm block">Email</span>
              <a href={`mailto:${config.email}`} className="text-gray-800 font-medium hover:text-blue-600">{config.email}</a>
            </p>
          )}
          {config.address && (
            <p><span className="text-gray-400 text-sm block">Adresse</span>
              <span className="text-gray-800">{config.address}{config.city && `, ${config.city}`}</span>
            </p>
          )}
          {config.hours?.map((h, i) => (
            <p key={i}><span className="text-gray-400 text-sm">{h.label}</span> <span className="text-gray-700 ml-2">{h.value}</span></p>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeparatorBlock({ config }: { config: SeparatorConfig }) {
  const spacing = { sm: "py-4", md: "py-8", lg: "py-16" }[config.spacing ?? "md"];
  if (config.style === "line") return <div className={`${spacing} px-6`}><hr className="border-gray-200" /></div>;
  if (config.style === "title" && config.title)
    return (
      <div className={`${spacing} px-6 text-center`}>
        <h2 className="text-2xl font-light text-gray-800 inline-block border-b-2 border-gray-300 pb-2">{config.title}</h2>
      </div>
    );
  if (config.style === "dots")
    return <div className={`${spacing} text-center text-gray-300 text-2xl tracking-widest`}>• • •</div>;
  return <div className={spacing} />;
}

function embedIframeSrc(config: EmbedConfig): string | null {
  const raw = config.url?.trim();
  if (!raw) return null;
  const t = config.type ?? "generic";
  if (t === "youtube") {
    const m = raw.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    if (!m?.[1]) return null;
    return `https://www.youtube.com/embed/${encodeURIComponent(m[1])}`;
  }
  if (t === "vimeo") {
    const m = raw.match(/vimeo\.com\/(\d+)/);
    if (!m?.[1]) return null;
    return `https://player.vimeo.com/video/${encodeURIComponent(m[1])}`;
  }
  if (t === "maps") {
    try {
      const u = new URL(raw);
      if (u.protocol !== "https:") return null;
      const h = u.hostname.toLowerCase();
      const ok =
        h === "www.google.com" ||
        h === "google.com" ||
        h === "maps.google.com" ||
        h === "maps.googleapis.com" ||
        h === "www.openstreetmap.org";
      return ok ? raw : null;
    } catch {
      return null;
    }
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    const h = u.hostname.toLowerCase();
    const allowed = new Set([
      "www.youtube.com",
      "youtube.com",
      "www.youtube-nocookie.com",
      "player.vimeo.com",
    ]);
    return allowed.has(h) ? raw : null;
  } catch {
    return null;
  }
}

function EmbedBlock({ config }: { config: EmbedConfig }) {
  const src = embedIframeSrc(config);
  if (!src) return null;
  return (
    <section className="py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {config.title && <h3 className="text-xl text-gray-700 mb-4">{config.title}</h3>}
        <div className="relative w-full overflow-hidden" style={{ paddingTop: config.type === "maps" ? `${config.height ?? 400}px` : "56.25%" }}>
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            title={config.title ?? "Embed"}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function BlockRenderer({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="block-renderer">
      {blocks.map((block) => {
        switch (block.type) {
          case "hero": return <HeroBlock key={block.id} config={block.config as HeroConfig} />;
          case "heading": return <HeadingBlock key={block.id} config={block.config as HeadingConfig} />;
          case "text": return <TextBlock key={block.id} config={block.config as TextConfig} />;
          case "image": return <ImageBlock key={block.id} config={block.config as ImageConfig} />;
          case "gallery": return <GalleryBlock key={block.id} config={block.config as GalleryConfig} />;
          case "cta": return <CtaBlock key={block.id} config={block.config as CtaConfig} />;
          case "services": return <ServicesBlock key={block.id} config={block.config as ServicesConfig} />;
          case "faq": return <FaqBlock key={block.id} config={block.config as FaqConfig} />;
          case "testimonials":
            return <TestimonialsBlock key={block.id} config={block.config as TestimonialsConfig} />;
          case "contact-info": return <ContactInfoBlock key={block.id} config={block.config as ContactInfoConfig} />;
          case "separator": return <SeparatorBlock key={block.id} config={block.config as SeparatorConfig} />;
          case "embed": return <EmbedBlock key={block.id} config={block.config as EmbedConfig} />;
          case "booking-widget":
          case "click-collect-widget":
          case "quote-form":
          case "restaurant-menu":
            return (
              <div key={block.id} className="py-8 px-6 bg-blue-50 border border-blue-200 text-center text-blue-600 text-sm">
                Widget {block.type} — intégré automatiquement
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function resolvePageDocument(payload: unknown): PageDocumentV1 {
  try {
    return normalizeBlocksToDocument(payload);
  } catch {
    return parsePageBlocksFromDb(null);
  }
}

function rowPaddingClass(rs: Record<string, unknown> | undefined): string {
  if (!rs) return "";
  return { none: "", sm: "py-6", md: "py-12", lg: "py-20" }[String(rs.paddingY)] ?? "";
}

function rowOuterStyle(rs: Record<string, unknown> | undefined): CSSProperties {
  if (!rs) return {};
  const s: CSSProperties = {};
  if (typeof rs.background === "string") s.backgroundColor = rs.background;
  if (typeof rs.backgroundImage === "string") {
    s.backgroundImage = `url(${rs.backgroundImage})`;
    s.backgroundSize = "cover";
    s.backgroundPosition = "center";
  }
  return s;
}

function BuilderColumnCell({ col }: { col: BuilderColumnV1 }) {
  const cs = col.columnSettings as Record<string, unknown> | undefined;
  const ta = String(cs?.textAlign ?? "left");
  const textAlign =
    ta === "center" ? "text-center" : ta === "right" ? "text-right" : "text-left";
  const pad = { none: "", sm: "p-2", md: "p-4", lg: "p-6" }[String(cs?.padding)] ?? "";
  return (
    <div
      className={`min-w-0 ${textAlign} ${pad}`}
      style={{ gridColumn: `span ${col.span} / span ${col.span}` }}
      data-col-id={col.id}
    >
      <BlockRenderer blocks={col.blocks} />
    </div>
  );
}

function BuilderRowSection({ row }: { row: BuilderRowV1 }) {
  const rs = row.rowSettings as Record<string, unknown> | undefined;
  const py = rowPaddingClass(rs);
  const style = rowOuterStyle(rs);
  const innerBoxed = rs?.maxWidth === "boxed";
  const grid = (
    <div
      className="grid w-full gap-4 md:gap-6"
      style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
    >
      {row.columns.map((col) => (
        <BuilderColumnCell key={col.id} col={col} />
      ))}
    </div>
  );
  return (
    <div className={`page-row w-full ${py}`} style={style} data-row-id={row.id}>
      {innerBoxed ? (
        <div className="max-w-6xl mx-auto px-4 md:px-6">{grid}</div>
      ) : (
        <div className="w-full px-4 md:px-6">{grid}</div>
      )}
    </div>
  );
}

/** Rendu lignes / colonnes (grille 12) + dispatch blocs — pour preview admin et pages publiques. */
export function PageDocumentRenderer({ payload }: { payload: unknown }) {
  const doc = resolvePageDocument(payload);
  return (
    <div className="page-document">
      {doc.rows.map((row) => (
        <BuilderRowSection key={row.id} row={row} />
      ))}
    </div>
  );
}
