/* eslint-disable @next/next/no-img-element */
import type { PageBlock, HeroConfig, TextConfig, ImageConfig, GalleryConfig, CtaConfig, ServicesConfig, ContactInfoConfig, SeparatorConfig, EmbedConfig } from "./block-types";

// ─── Renderers individuels ────────────────────────────────────────────────────

function HeroBlock({ config }: { config: HeroConfig }) {
  const align = config.textAlign ?? "center";
  const overlayOpacity = (config.overlay ?? 40) / 100;
  return (
    <section
      className="relative min-h-[60vh] flex items-center justify-center overflow-hidden"
      style={{
        background: config.bgImage
          ? `url(${config.bgImage}) center/cover no-repeat`
          : config.bgColor ?? "#1a1a2e",
      }}
    >
      {config.bgImage && (
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayOpacity})` }} />
      )}
      <div className={`relative z-10 px-6 py-16 max-w-3xl w-full text-${align}`}>
        <h1 className="text-4xl md:text-6xl font-light text-white mb-4 leading-tight">{config.title}</h1>
        {config.subtitle && <p className="text-xl text-white/70 mb-8 font-light">{config.subtitle}</p>}
        {config.ctaText && config.ctaLink && (
          <a
            href={config.ctaLink}
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
  return (
    <section className="py-12 px-6">
      <div className={`${maxW} mx-auto text-${config.align ?? "left"}`}>
        <div
          className="prose prose-lg max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: config.content }}
        />
      </div>
    </section>
  );
}

function ImageBlock({ config }: { config: ImageConfig }) {
  const widthClass = { sm: "max-w-sm", md: "max-w-xl", lg: "max-w-3xl", full: "max-w-full" }[config.width ?? "full"];
  if (!config.src) return null;
  return (
    <section className="py-8 px-6">
      <div className={`${widthClass} mx-auto`}>
        <img
          src={config.src}
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
        {config.images.map((img, i) => (
          <div key={i} className="overflow-hidden aspect-square group">
            <img
              src={img.src}
              alt={img.alt ?? ""}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ))}
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
        href={config.link}
        className={`inline-block font-medium transition ${styles[config.style ?? "primary"]} ${sizes[config.size ?? "md"]}`}
      >
        {config.text}
      </a>
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

function EmbedBlock({ config }: { config: EmbedConfig }) {
  if (!config.url) return null;
  let src = config.url;
  if (config.type === "youtube") {
    const m = config.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
    if (m) src = `https://www.youtube.com/embed/${m[1]}`;
  } else if (config.type === "vimeo") {
    const m = config.url.match(/vimeo\.com\/(\d+)/);
    if (m) src = `https://player.vimeo.com/video/${m[1]}`;
  }
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
          case "text": return <TextBlock key={block.id} config={block.config as TextConfig} />;
          case "image": return <ImageBlock key={block.id} config={block.config as ImageConfig} />;
          case "gallery": return <GalleryBlock key={block.id} config={block.config as GalleryConfig} />;
          case "cta": return <CtaBlock key={block.id} config={block.config as CtaConfig} />;
          case "services": return <ServicesBlock key={block.id} config={block.config as ServicesConfig} />;
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
