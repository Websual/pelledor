"use client";

import type { PageBlock, HeroConfig, TextConfig, ImageConfig, GalleryConfig, CtaConfig, ServicesConfig, ContactInfoConfig, SeparatorConfig, EmbedConfig, BookingWidgetConfig, ClickCollectWidgetConfig, QuoteFormConfig } from "@/core/builder/block-types";

type Props = {
  block: PageBlock;
  onChange: (config: PageBlock["config"]) => void;
};

// ─── Champs communs réutilisables ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ─── Éditeurs par type ────────────────────────────────────────────────────────

function HeroEditor({ config, onChange }: { config: HeroConfig; onChange: (c: HeroConfig) => void }) {
  return (
    <>
      <Field label="Titre principal">
        <input className={inp} value={config.title} onChange={(e) => onChange({ ...config, title: e.target.value })} />
      </Field>
      <Field label="Sous-titre">
        <input className={inp} value={config.subtitle ?? ""} onChange={(e) => onChange({ ...config, subtitle: e.target.value })} />
      </Field>
      <Field label="Texte du bouton CTA">
        <input className={inp} value={config.ctaText ?? ""} onChange={(e) => onChange({ ...config, ctaText: e.target.value })} />
      </Field>
      <Field label="Lien du bouton">
        <input className={inp} placeholder="#rdv ou /rdv?e=slug" value={config.ctaLink ?? ""} onChange={(e) => onChange({ ...config, ctaLink: e.target.value })} />
      </Field>
      <Field label="Image de fond (URL)">
        <input className={inp} placeholder="https://…" value={config.bgImage ?? ""} onChange={(e) => onChange({ ...config, bgImage: e.target.value })} />
      </Field>
      <Field label="Couleur de fond (si pas d'image)">
        <div className="flex gap-2">
          <input type="color" value={config.bgColor ?? "#1a1a2e"} onChange={(e) => onChange({ ...config, bgColor: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
          <input className={`${inp} flex-1`} value={config.bgColor ?? "#1a1a2e"} onChange={(e) => onChange({ ...config, bgColor: e.target.value })} />
        </div>
      </Field>
      <Field label="Alignement du texte">
        <select className={sel} value={config.textAlign ?? "center"} onChange={(e) => onChange({ ...config, textAlign: e.target.value as "left" | "center" | "right" })}>
          <option value="left">Gauche</option>
          <option value="center">Centré</option>
          <option value="right">Droite</option>
        </select>
      </Field>
      <Field label={`Assombrissement fond: ${config.overlay ?? 40}%`}>
        <input type="range" min={0} max={90} value={config.overlay ?? 40} onChange={(e) => onChange({ ...config, overlay: parseInt(e.target.value) })} className="w-full" />
      </Field>
    </>
  );
}

function TextEditor({ config, onChange }: { config: TextConfig; onChange: (c: TextConfig) => void }) {
  return (
    <>
      <Field label="Contenu (HTML)">
        <textarea
          className={`${inp} min-h-[160px] font-mono text-xs`}
          value={config.content}
          onChange={(e) => onChange({ ...config, content: e.target.value })}
          placeholder="<p>Votre texte...</p><h2>Titre</h2><ul><li>Item</li></ul>"
        />
        <p className="text-xs text-gray-400 mt-1">HTML basique accepté : p, h2, h3, strong, em, ul, li, a</p>
      </Field>
      <Field label="Alignement">
        <select className={sel} value={config.align ?? "left"} onChange={(e) => onChange({ ...config, align: e.target.value as "left" | "center" | "right" })}>
          <option value="left">Gauche</option>
          <option value="center">Centré</option>
          <option value="right">Droite</option>
        </select>
      </Field>
      <Field label="Largeur max">
        <select className={sel} value={config.maxWidth ?? "md"} onChange={(e) => onChange({ ...config, maxWidth: e.target.value as "sm" | "md" | "lg" | "full" })}>
          <option value="sm">Étroite</option>
          <option value="md">Moyenne</option>
          <option value="lg">Large</option>
          <option value="full">Pleine largeur</option>
        </select>
      </Field>
    </>
  );
}

function ImageEditor({ config, onChange }: { config: ImageConfig; onChange: (c: ImageConfig) => void }) {
  return (
    <>
      <Field label="URL de l'image">
        <input className={inp} placeholder="https://…" value={config.src} onChange={(e) => onChange({ ...config, src: e.target.value })} />
      </Field>
      <Field label="Texte alternatif (SEO)">
        <input className={inp} value={config.alt ?? ""} onChange={(e) => onChange({ ...config, alt: e.target.value })} />
      </Field>
      <Field label="Légende">
        <input className={inp} value={config.caption ?? ""} onChange={(e) => onChange({ ...config, caption: e.target.value })} />
      </Field>
      <Field label="Lien au clic">
        <input className={inp} placeholder="https://… ou #section" value={config.link ?? ""} onChange={(e) => onChange({ ...config, link: e.target.value })} />
      </Field>
      <Field label="Largeur">
        <select className={sel} value={config.width ?? "full"} onChange={(e) => onChange({ ...config, width: e.target.value as "sm" | "md" | "lg" | "full" })}>
          <option value="sm">Petite</option>
          <option value="md">Moyenne</option>
          <option value="lg">Grande</option>
          <option value="full">Pleine largeur</option>
        </select>
      </Field>
      <Field label="">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={config.rounded ?? false} onChange={(e) => onChange({ ...config, rounded: e.target.checked })} />
          Coins arrondis
        </label>
      </Field>
    </>
  );
}

function GalleryEditor({ config, onChange }: { config: GalleryConfig; onChange: (c: GalleryConfig) => void }) {
  const images = config.images ?? [];

  function updateImage(i: number, field: "src" | "alt" | "caption", value: string) {
    const updated = [...images];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...config, images: updated });
  }

  function addImage() {
    onChange({ ...config, images: [...images, { src: "", alt: "" }] });
  }

  function removeImage(i: number) {
    onChange({ ...config, images: images.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <div className="space-y-3 mb-4">
        {images.map((img, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Image {i + 1}</span>
              <button onClick={() => removeImage(i)} className="text-red-400 text-xs hover:text-red-600">✕ Retirer</button>
            </div>
            <input className={inp} placeholder="URL de l'image" value={img.src} onChange={(e) => updateImage(i, "src", e.target.value)} />
            <input className={inp} placeholder="Légende (optionnel)" value={img.caption ?? ""} onChange={(e) => updateImage(i, "caption", e.target.value)} />
          </div>
        ))}
      </div>
      <button onClick={addImage} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-500 transition">
        + Ajouter une image
      </button>
      <Field label="Colonnes">
        <select className={sel} value={config.columns ?? 3} onChange={(e) => onChange({ ...config, columns: parseInt(e.target.value) as 2 | 3 | 4 })}>
          <option value={2}>2 colonnes</option>
          <option value={3}>3 colonnes</option>
          <option value={4}>4 colonnes</option>
        </select>
      </Field>
      <Field label="">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={config.lightbox ?? true} onChange={(e) => onChange({ ...config, lightbox: e.target.checked })} />
          Lightbox au clic
        </label>
      </Field>
    </>
  );
}

function CtaEditor({ config, onChange }: { config: CtaConfig; onChange: (c: CtaConfig) => void }) {
  return (
    <>
      <Field label="Texte du bouton">
        <input className={inp} value={config.text} onChange={(e) => onChange({ ...config, text: e.target.value })} />
      </Field>
      <Field label="Lien">
        <input className={inp} placeholder="https://… ou #section" value={config.link} onChange={(e) => onChange({ ...config, link: e.target.value })} />
      </Field>
      <Field label="Texte en dessous (optionnel)">
        <input className={inp} placeholder="Ex: Sans engagement" value={config.subtext ?? ""} onChange={(e) => onChange({ ...config, subtext: e.target.value })} />
      </Field>
      <Field label="Style">
        <select className={sel} value={config.style ?? "primary"} onChange={(e) => onChange({ ...config, style: e.target.value as "primary" | "secondary" | "outline" })}>
          <option value="primary">Principal (noir)</option>
          <option value="secondary">Secondaire (bleu)</option>
          <option value="outline">Contour</option>
        </select>
      </Field>
      <Field label="Taille">
        <select className={sel} value={config.size ?? "md"} onChange={(e) => onChange({ ...config, size: e.target.value as "sm" | "md" | "lg" })}>
          <option value="sm">Petit</option>
          <option value="md">Moyen</option>
          <option value="lg">Grand</option>
        </select>
      </Field>
      <Field label="Alignement">
        <select className={sel} value={config.align ?? "center"} onChange={(e) => onChange({ ...config, align: e.target.value as "left" | "center" | "right" })}>
          <option value="left">Gauche</option>
          <option value="center">Centré</option>
          <option value="right">Droite</option>
        </select>
      </Field>
    </>
  );
}

function ServicesEditor({ config, onChange }: { config: ServicesConfig; onChange: (c: ServicesConfig) => void }) {
  const items = config.items ?? [];

  function updateItem(i: number, field: keyof typeof items[0], value: string) {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...config, items: updated });
  }

  return (
    <>
      <Field label="Titre de la section">
        <input className={inp} value={config.title ?? ""} onChange={(e) => onChange({ ...config, title: e.target.value })} />
      </Field>
      <div className="space-y-3 mb-4">
        {items.map((item, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500">Prestation {i + 1}</span>
              <button onClick={() => onChange({ ...config, items: items.filter((_, idx) => idx !== i) })} className="text-red-400 text-xs">✕</button>
            </div>
            <input className={inp} placeholder="Nom de la prestation *" value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
            <input className={inp} placeholder="Description (optionnel)" value={item.description ?? ""} onChange={(e) => updateItem(i, "description", e.target.value)} />
            <div className="flex gap-2">
              <input className={inp} placeholder="Prix (ex: 50€)" value={item.price ?? ""} onChange={(e) => updateItem(i, "price", e.target.value)} />
              <input className={inp} placeholder="Durée (ex: 1h)" value={item.duration ?? ""} onChange={(e) => updateItem(i, "duration", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onChange({ ...config, items: [...items, { name: "", price: "", duration: "" }] })} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 transition">
        + Ajouter une prestation
      </button>
      <Field label="Colonnes">
        <select className={sel} value={config.columns ?? 2} onChange={(e) => onChange({ ...config, columns: parseInt(e.target.value) as 1 | 2 | 3 })}>
          <option value={1}>1 colonne</option>
          <option value={2}>2 colonnes</option>
          <option value={3}>3 colonnes</option>
        </select>
      </Field>
    </>
  );
}

function ContactInfoEditor({ config, onChange }: { config: ContactInfoConfig; onChange: (c: ContactInfoConfig) => void }) {
  return (
    <>
      <Field label="Titre"><input className={inp} value={config.title ?? ""} onChange={(e) => onChange({ ...config, title: e.target.value })} /></Field>
      <Field label="Téléphone"><input className={inp} placeholder="+33 6 XX XX XX XX" value={config.phone ?? ""} onChange={(e) => onChange({ ...config, phone: e.target.value })} /></Field>
      <Field label="Email"><input className={inp} type="email" value={config.email ?? ""} onChange={(e) => onChange({ ...config, email: e.target.value })} /></Field>
      <Field label="Adresse"><input className={inp} value={config.address ?? ""} onChange={(e) => onChange({ ...config, address: e.target.value })} /></Field>
      <Field label="Ville"><input className={inp} value={config.city ?? ""} onChange={(e) => onChange({ ...config, city: e.target.value })} /></Field>
      <Field label="">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={config.showMap ?? false} onChange={(e) => onChange({ ...config, showMap: e.target.checked })} />
          Afficher Google Maps (nécessite une URL embed)
        </label>
      </Field>
    </>
  );
}

function SeparatorEditor({ config, onChange }: { config: SeparatorConfig; onChange: (c: SeparatorConfig) => void }) {
  return (
    <>
      <Field label="Style">
        <select className={sel} value={config.style ?? "space"} onChange={(e) => onChange({ ...config, style: e.target.value as SeparatorConfig["style"] })}>
          <option value="space">Espace vide</option>
          <option value="line">Ligne horizontale</option>
          <option value="dots">Points décoratifs</option>
          <option value="title">Titre de section</option>
        </select>
      </Field>
      {config.style === "title" && (
        <Field label="Titre"><input className={inp} value={config.title ?? ""} onChange={(e) => onChange({ ...config, title: e.target.value })} /></Field>
      )}
      <Field label="Espacement">
        <select className={sel} value={config.spacing ?? "md"} onChange={(e) => onChange({ ...config, spacing: e.target.value as "sm" | "md" | "lg" })}>
          <option value="sm">Petit</option>
          <option value="md">Moyen</option>
          <option value="lg">Grand</option>
        </select>
      </Field>
    </>
  );
}

function EmbedEditor({ config, onChange }: { config: EmbedConfig; onChange: (c: EmbedConfig) => void }) {
  return (
    <>
      <Field label="Type">
        <select className={sel} value={config.type} onChange={(e) => onChange({ ...config, type: e.target.value as EmbedConfig["type"] })}>
          <option value="youtube">YouTube</option>
          <option value="vimeo">Vimeo</option>
          <option value="maps">Google Maps</option>
          <option value="custom">Iframe custom</option>
        </select>
      </Field>
      <Field label="URL">
        <input className={inp} placeholder={config.type === "maps" ? "URL embed Google Maps" : "https://…"} value={config.url} onChange={(e) => onChange({ ...config, url: e.target.value })} />
        <p className="text-xs text-gray-400 mt-1">
          {config.type === "youtube" && "Collez l'URL YouTube normale, elle sera convertie automatiquement."}
          {config.type === "maps" && "Dans Google Maps → Partager → Intégrer → copiez l'URL src de l'iframe"}
        </p>
      </Field>
      <Field label="Titre (optionnel)">
        <input className={inp} value={config.title ?? ""} onChange={(e) => onChange({ ...config, title: e.target.value })} />
      </Field>
      {config.type === "maps" && (
        <Field label="Hauteur (px)">
          <input className={inp} type="number" value={config.height ?? 400} onChange={(e) => onChange({ ...config, height: parseInt(e.target.value) })} />
        </Field>
      )}
    </>
  );
}

function WidgetEditor({ config, onChange, label }: { config: BookingWidgetConfig | ClickCollectWidgetConfig | QuoteFormConfig; onChange: (c: typeof config) => void; label: string }) {
  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-600">
        Ce bloc affiche automatiquement le widget <strong>{label}</strong> de l'établissement.
      </div>
      <Field label="Titre">
        <input className={inp} value={(config as { title?: string }).title ?? ""} onChange={(e) => onChange({ ...config, title: e.target.value })} />
      </Field>
      <Field label="Sous-titre">
        <input className={inp} value={(config as { subtitle?: string }).subtitle ?? ""} onChange={(e) => onChange({ ...config, subtitle: e.target.value } as typeof config)} />
      </Field>
    </>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function BlockConfigEditor({ block, onChange }: Props) {
  switch (block.type) {
    case "hero": return <HeroEditor config={block.config as HeroConfig} onChange={onChange} />;
    case "text": return <TextEditor config={block.config as TextConfig} onChange={onChange} />;
    case "image": return <ImageEditor config={block.config as ImageConfig} onChange={onChange} />;
    case "gallery": return <GalleryEditor config={block.config as GalleryConfig} onChange={onChange} />;
    case "cta": return <CtaEditor config={block.config as CtaConfig} onChange={onChange} />;
    case "services": return <ServicesEditor config={block.config as ServicesConfig} onChange={onChange} />;
    case "contact-info": return <ContactInfoEditor config={block.config as ContactInfoConfig} onChange={onChange} />;
    case "separator": return <SeparatorEditor config={block.config as SeparatorConfig} onChange={onChange} />;
    case "embed": return <EmbedEditor config={block.config as EmbedConfig} onChange={onChange} />;
    case "booking-widget":
    case "click-collect-widget":
    case "quote-form":
      return <WidgetEditor config={block.config as BookingWidgetConfig} onChange={onChange} label={block.type} />;
    default:
      return <p className="text-sm text-gray-400">Pas de configuration pour ce bloc.</p>;
  }
}
