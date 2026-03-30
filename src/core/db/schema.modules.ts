/**
 * Schéma Drizzle des modules métier (annuaire, RDV, facturation, événements, etc.).
 */
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

export const professions = pgTable("professions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const practitioners = pgTable("practitioners", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }).unique(),
  professionId: uuid("profession_id").references(() => professions.id, {
    onDelete: "set null",
  }),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull().default(""),
  bio: text("bio").notNull().default(""),
  city: varchar("city", { length: 128 }).notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  /** URL publique de référence (canonical absolus, partage). */
  publicSiteUrl: varchar("public_site_url", { length: 2048 }),
  /** robots.txt personnalisé ; si vide, généré par défaut + lien sitemap. */
  seoRobotsTxt: text("seo_robots_txt"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  durationMin: integer("duration_min").notNull().default(60),
  priceCents: integer("price_cents").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workingHours = pgTable("working_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 8 }).notNull(),
  endTime: varchar("end_time", { length: 8 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  paymentStatus: varchar("payment_status", { length: 32 })
    .notNull()
    .default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, {
    onDelete: "set null",
  }),
  invoiceNumber: varchar("invoice_number", { length: 64 }).notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Demande de devis (blueprint artisan) — conversion facture manuelle admin. */
export const quoteRequests = pgTable("quote_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 64 }),
  address: text("address"),
  description: text("description").notNull().default(""),
  status: varchar("status", { length: 32 }).notNull().default("new"),
  convertedInvoiceId: uuid("converted_invoice_id").references(() => invoices.id, {
    onDelete: "set null",
  }),
  // Signature électronique (migration 0010_quote_signature)
  publicToken: varchar("public_token", { length: 64 }).unique(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signatureData: text("signature_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  capacity: integer("capacity").notNull().default(20),
  remainingPlaces: integer("remaining_places").notNull().default(20),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  amountCents: integer("amount_cents"),
  status: varchar("status", { length: 32 }).notNull().default("confirmed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  link: varchar("link", { length: 1024 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  body: text("body").notNull(),
  published: boolean("published").notNull().default(false),
  authorUserId: uuid("author_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const giftCards = pgTable("gift_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  buyerUserId: uuid("buyer_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appointmentMessages = pgTable("appointment_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Chambre / hébergement (produit réservable par nuit) — lié à l’établissement (practitioner). */
export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 160 }).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull().default(""),
  capacity: integer("capacity").notNull().default(2),
  priceCentsNight: integer("price_cents_night").notNull().default(0),
  imageUrl: varchar("image_url", { length: 2048 }),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/** Réservation par nuit ; chevauchement interdit par chambre si status confirmed. */
/** Table physique (restaurant) — capacité couverts. */
export const restaurantTables = pgTable("restaurant_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  seats: integer("seats").notNull().default(2),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Réservation sur un créneau [starts_at, ends_at) — pas de chevauchement par table. */
export const restaurantReservations = pgTable("restaurant_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  tableId: uuid("table_id")
    .notNull()
    .references(() => restaurantTables.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  partySize: integer("party_size").notNull().default(2),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("confirmed"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const roomBookings = pgTable("room_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  guestEmail: varchar("guest_email", { length: 255 }).notNull(),
  guestName: varchar("guest_name", { length: 255 }).notNull().default(""),
  checkIn: varchar("check_in", { length: 10 }).notNull(),
  checkOut: varchar("check_out", { length: 10 }).notNull(),
  nights: integer("nights").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** E‑commerce (module shop) — catalogue, panier, commande, frais de port. */

export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 512 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  description: text("description"),
  priceCents: integer("price_cents").notNull().default(0),
  imageUrl: varchar("image_url", { length: 2048 }),
  stock: integer("stock"), // null = pas de gestion stock
  published: boolean("published").notNull().default(false),
  weightG: integer("weight_g"), // pour calcul livraison
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const productCategoryLinks = pgTable(
  "product_category_links",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] })]
);

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 64 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 255 }).notNull(),
  billingName: varchar("billing_name", { length: 255 }).notNull(),
  billingAddress: text("billing_address"),
  billingCity: varchar("billing_city", { length: 128 }),
  billingPostalCode: varchar("billing_postal_code", { length: 20 }),
  billingCountry: varchar("billing_country", { length: 2 }).notNull().default("FR"),
  shippingName: varchar("shipping_name", { length: 255 }),
  shippingAddress: text("shipping_address"),
  shippingCity: varchar("shipping_city", { length: 128 }),
  shippingPostalCode: varchar("shipping_postal_code", { length: 20 }),
  shippingCountry: varchar("shipping_country", { length: 2 }),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: varchar("product_name", { length: 512 }).notNull(),
  quantity: integer("quantity").notNull(),
  priceCents: integer("price_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  countryCodes: varchar("country_codes", { length: 512 }).notNull().default("FR"), // comma-separated or * for default
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const shippingRates = pgTable("shipping_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => shippingZones.id, { onDelete: "cascade" }),
  minOrderCents: integer("min_order_cents").notNull().default(0),
  maxOrderCents: integer("max_order_cents"), // null = no max
  priceCents: integer("price_cents").notNull().default(0),
  freeShippingOverCents: integer("free_shipping_over_cents"), // if set, price_cents ignored when order >= this
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Module: anamnese ────────────────────────────────────────────────────────

export const anamneseForms = pgTable("anamnese_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  fields: jsonb("fields").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const anamneseResponses = pgTable("anamnese_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id")
    .notNull()
    .references(() => anamneseForms.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientEmail: varchar("patient_email", { length: 255 }).notNull(),
  answers: jsonb("answers").notNull().default({}),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Module: click-collect ───────────────────────────────────────────────────

export const ccProducts = pgTable("cc_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 512 }).notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull().default(0),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ccOrders = pgTable("cc_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 64 }),
  items: jsonb("items").notNull().default([]),
  totalCents: integer("total_cents").notNull().default(0),
  pickupSlot: timestamp("pickup_slot", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Signature devis (upgrade quote_requests) ────────────────────────────────
// Migration: drizzle/0010_quote_signature.sql
// Colonnes ajoutées: public_token, signed_at, signature_data

// ─── Page Builder ─────────────────────────────────────────────────────────────

export const pageBlocks = pgTable(
  "page_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitioners.id, { onDelete: "cascade" }),
    pageSlug: varchar("page_slug", { length: 128 }).notNull().default("home"),
    blocks: jsonb("blocks").notNull().default([]),
    metaTitle: varchar("meta_title", { length: 512 }),
    metaDescription: text("meta_description"),
    canonicalUrl: varchar("canonical_url", { length: 2048 }),
    ogTitle: varchar("og_title", { length: 512 }),
    ogDescription: text("og_description"),
    ogImageUrl: varchar("og_image_url", { length: 2048 }),
    noindex: boolean("noindex").notNull().default(false),
    targetKeyword: varchar("target_keyword", { length: 255 }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({ uniq: { columns: [t.practitionerId, t.pageSlug] } })
);

// ─── CMS Phase C — blog / portfolio / menu (par praticien) ───────────────────

export const cmsBlogCategories = pgTable(
  "cms_blog_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitioners.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ uniq: { columns: [t.practitionerId, t.slug] } })
);

export const cmsBlogPosts = pgTable(
  "cms_blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitioners.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => cmsBlogCategories.id, {
      onDelete: "set null",
    }),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    excerpt: text("excerpt").notNull().default(""),
    bodyHtml: text("body_html").notNull().default(""),
    bodyDocument: jsonb("body_document"),
    coverImageUrl: varchar("cover_image_url", { length: 2048 }),
    metaTitle: varchar("meta_title", { length: 512 }),
    metaDescription: text("meta_description"),
    canonicalUrl: varchar("canonical_url", { length: 2048 }),
    ogTitle: varchar("og_title", { length: 512 }),
    ogDescription: text("og_description"),
    ogImageUrl: varchar("og_image_url", { length: 2048 }),
    noindex: boolean("noindex").notNull().default(false),
    targetKeyword: varchar("target_keyword", { length: 255 }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({ uniq: { columns: [t.practitionerId, t.slug] } })
);

export const cmsPortfolioProjects = pgTable(
  "cms_portfolio_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practitionerId: uuid("practitioner_id")
      .notNull()
      .references(() => practitioners.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    summary: text("summary").notNull().default(""),
    descriptionHtml: text("description_html").notNull().default(""),
    descriptionDocument: jsonb("description_document"),
    coverImageUrl: varchar("cover_image_url", { length: 2048 }),
    gallery: jsonb("gallery").notNull().default([]),
    clientName: varchar("client_name", { length: 255 }).notNull().default(""),
    roleLabel: varchar("role_label", { length: 255 }).notNull().default(""),
    externalUrl: varchar("external_url", { length: 2048 }),
    metaTitle: varchar("meta_title", { length: 512 }),
    metaDescription: text("meta_description"),
    canonicalUrl: varchar("canonical_url", { length: 2048 }),
    ogTitle: varchar("og_title", { length: 512 }),
    ogDescription: text("og_description"),
    ogImageUrl: varchar("og_image_url", { length: 2048 }),
    noindex: boolean("noindex").notNull().default(false),
    targetKeyword: varchar("target_keyword", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({ uniq: { columns: [t.practitionerId, t.slug] } })
);

/** Entrées de menu du site vitrine (liens page builder, blog, portfolio, externe). */
export const siteNavItems = pgTable("site_nav_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  practitionerId: uuid("practitioner_id")
    .notNull()
    .references(() => practitioners.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  label: varchar("label", { length: 255 }).notNull(),
  linkType: varchar("link_type", { length: 32 }).notNull(),
  linkTarget: varchar("link_target", { length: 512 }).notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
