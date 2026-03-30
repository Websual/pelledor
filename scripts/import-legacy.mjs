#!/usr/bin/env node
/**
 * Import optionnel : base source (PostgreSQL, schéma proche users/professions/practitioners/…)
 * vers la base SaaS OS (Drizzle, migrations déjà appliquées).
 *
 * Requis :
 *   SOURCE_DATABASE_URL=postgresql://...
 *   TARGET_DATABASE_URL=postgresql://...
 *
 * Options :
 *   --dry-run
 *   --only=users,professions,practitioners,services,working_hours,appointments,messages,invoices
 *
 * Parcours produit normal : install vierge + modules — pas d’import requis.
 */
import postgres from "postgres";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? new Set(onlyArg.split("=")[1].split(",").map((s) => s.trim()))
  : null;

function want(step) {
  return !only || only.has(step);
}

const SOURCE = process.env.SOURCE_DATABASE_URL?.trim();
const TARGET = process.env.TARGET_DATABASE_URL?.trim();
if (!SOURCE || !TARGET) {
  console.error(
    "Definir SOURCE_DATABASE_URL et TARGET_DATABASE_URL (deux bases distinctes recommandees)."
  );
  process.exit(1);
}

const src = postgres(SOURCE, { max: 3 });
const tgt = postgres(TARGET, { max: 3 });

const log = (...a) => console.log("[import]", ...a);

async function main() {
  const defaultPwd = process.env.IMPORT_DEFAULT_PASSWORD || "ImportTemp2024!";
  const fallbackHash = await hash(defaultPwd, 12);

  const userMap = new Map();
  const professionMap = new Map();
  const practitionerMap = new Map();
  const serviceMap = new Map();
  const appointmentMap = new Map();

  if (want("users")) {
    log("users…");
    const rows = await src`
      SELECT id, email, COALESCE(hashed_password, '') AS hashed_password, role::text AS role
      FROM users
      WHERE email IS NOT NULL AND email != ''
    `;
    log("  source:", rows.length);
    if (dryRun) {
      log("  dry-run skip ecriture");
    } else {
      for (const r of rows) {
        const existing = await tgt`SELECT id FROM users WHERE email = ${r.email} LIMIT 1`;
        if (existing.length) {
          userMap.set(r.id, existing[0].id);
          continue;
        }
        const role =
          String(r.role).toUpperCase() === "ADMIN" ? "admin" : "client";
        const pwd = r.hashed_password?.length > 20 ? r.hashed_password : fallbackHash;
        const ins = await tgt`
          INSERT INTO users (email, password_hash, role)
          VALUES (${r.email}, ${pwd}, ${role})
          RETURNING id
        `;
        userMap.set(r.id, ins[0].id);
      }
      log("  cible users mappees:", userMap.size);
    }
  }

  if (want("professions")) {
    log("professions…");
    const rows = await src`
      SELECT id, name, slug, COALESCE(description_pseo, '') AS description
      FROM professions
    `.catch(() => []);
    log("  source:", rows.length);
    if (!dryRun && rows.length) {
      for (const p of rows) {
        const ins = await tgt`
          INSERT INTO professions (name, slug, description)
          VALUES (${p.name}, ${p.slug.slice(0, 128)}, ${p.description || null})
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        const id = ins[0].id;
        professionMap.set(p.id, id);
      }
    }
  }

  if (want("practitioners")) {
    log("practitioners…");
    const rows = await src`
      SELECT id, user_id, title, bio, location_city AS city, profession_id, slug, is_active, created_at, updated_at
      FROM practitioners
    `;
    log("  source:", rows.length);
    if (!dryRun) {
      const usedSlugs = new Set();
      for (const p of rows) {
        let slug = String(p.slug).slice(0, 160);
        while (usedSlugs.has(slug)) {
          slug = slug.slice(0, 150) + "-" + randomUUID().slice(0, 6);
        }
        usedSlugs.add(slug);
        const userId = p.user_id ? userMap.get(p.user_id) : null;
        const professionId = p.profession_id
          ? professionMap.get(p.profession_id)
          : null;
        try {
          const ins = await tgt`
            INSERT INTO practitioners (user_id, profession_id, slug, title, bio, city, is_active, created_at, updated_at)
            VALUES (
              ${userId},
              ${professionId},
              ${slug},
              ${String(p.title).slice(0, 512)},
              ${String(p.bio || "").slice(0, 20000)},
              ${String(p.city || "").slice(0, 128)},
              ${p.is_active !== false},
              ${p.created_at},
              ${p.updated_at}
            )
            RETURNING id
          `;
          practitionerMap.set(p.id, ins[0].id);
        } catch (e) {
          log("  WARN practitioner", p.slug, e.message);
        }
      }
      log("  importes:", practitionerMap.size);
    }
  }

  if (want("services")) {
    log("services…");
    const rows = await src`
      SELECT id, practitioner_id, name, duration_min, price_cents, description, created_at
      FROM services
    `;
    log("  source:", rows.length);
    if (!dryRun) {
      for (const s of rows) {
        const pid = practitionerMap.get(s.practitioner_id);
        if (!pid) continue;
        const ins = await tgt`
          INSERT INTO services (practitioner_id, name, duration_min, price_cents, description, created_at)
          VALUES (
            ${pid},
            ${String(s.name).slice(0, 255)},
            ${Number(s.duration_min) || 60},
            ${Number(s.price_cents) || 0},
            ${s.description ? String(s.description).slice(0, 4000) : null},
            ${s.created_at}
          )
          RETURNING id
        `;
        serviceMap.set(s.id, ins[0].id);
      }
      log("  importes:", serviceMap.size);
    }
  }

  if (want("working_hours")) {
    log("working_hours…");
    const rows = await src`
      SELECT practitioner_id, day_of_week, start_time, end_time, is_active
      FROM working_hours
    `.catch(() => []);
    log("  source:", rows.length);
    if (!dryRun && rows.length) {
      for (const w of rows) {
        const pid = practitionerMap.get(w.practitioner_id);
        if (!pid) continue;
        await tgt`
          INSERT INTO working_hours (practitioner_id, day_of_week, start_time, end_time, is_active)
          VALUES (
            ${pid},
            ${Number(w.day_of_week)},
            ${String(w.start_time).slice(0, 8)},
            ${String(w.end_time).slice(0, 8)},
            ${w.is_active !== false}
          )
        `;
      }
    }
  }

  if (want("appointments")) {
    log("appointments…");
    const rows = await src`
      SELECT id, user_id, practitioner_id, service_id, starts_at,
             status::text AS status, payment_status::text AS payment_status,
             created_at, updated_at
      FROM appointments
    `;
    log("  source:", rows.length);
    if (!dryRun) {
      let ok = 0;
      let skip = 0;
      for (const a of rows) {
        const uid = userMap.get(a.user_id);
        const pid = practitionerMap.get(a.practitioner_id);
        const sid = serviceMap.get(a.service_id);
        if (!uid || !pid || !sid) {
          skip++;
          continue;
        }
        const st = String(a.status || "PENDING").toUpperCase().slice(0, 32);
        const pay = String(a.payment_status || "PENDING")
          .toUpperCase()
          .slice(0, 32);
        const ins = await tgt`
          INSERT INTO appointments (user_id, practitioner_id, service_id, starts_at, status, payment_status, created_at, updated_at)
          VALUES (${uid}, ${pid}, ${sid}, ${a.starts_at}, ${st}, ${pay}, ${a.created_at}, ${a.updated_at})
          RETURNING id
        `;
        appointmentMap.set(a.id, ins[0].id);
        ok++;
      }
      log("  importes:", ok, "ignores (refs manquantes):", skip);
    }
  }

  if (want("messages")) {
    log("appointment_messages (messages)…");
    const rows = await src`
      SELECT appointment_id, sender_id, content, created_at
      FROM messages
    `.catch(() => []);
    log("  source:", rows.length);
    if (!dryRun && rows.length) {
      let n = 0;
      for (const m of rows) {
        const aid = appointmentMap.get(m.appointment_id);
        const sid = userMap.get(m.sender_id);
        if (!aid || !sid) continue;
        await tgt`
          INSERT INTO appointment_messages (appointment_id, sender_id, content, created_at)
          VALUES (${aid}, ${sid}, ${String(m.content).slice(0, 50000)}, ${m.created_at})
        `;
        n++;
      }
      log("  importes:", n);
    }
  }

  if (want("invoices")) {
    log("invoices (simplifie)…");
    const rows = await src`
      SELECT practitioner_id, user_id, appointment_id, invoice_number, amount_cents, total_cents, status, created_at
      FROM invoices
      LIMIT 50000
    `.catch(() => []);
    log("  source:", rows.length);
    if (!dryRun && rows.length) {
      let n = 0;
      for (const inv of rows) {
        const pid = practitionerMap.get(inv.practitioner_id);
        if (!pid) continue;
        const uid = inv.user_id ? userMap.get(inv.user_id) : null;
        const aid = inv.appointment_id
          ? appointmentMap.get(inv.appointment_id)
          : null;
        const num = String(inv.invoice_number).slice(0, 64);
        const st = String(inv.status || "draft").toLowerCase().slice(0, 32);
        try {
          await tgt`
            INSERT INTO invoices (practitioner_id, user_id, appointment_id, invoice_number, amount_cents, total_cents, status, created_at)
            VALUES (
              ${pid},
              ${uid},
              ${aid},
              ${num + "-" + randomUUID().slice(0, 8)},
              ${Number(inv.amount_cents)},
              ${Number(inv.total_cents)},
              ${st},
              ${inv.created_at}
            )
          `;
          n++;
        } catch {
          /* numero unique */
        }
      }
      log("  importes:", n);
    }
  }

  log("termine.", dryRun ? "(dry-run)" : "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await src.end({ timeout: 5 });
    await tgt.end({ timeout: 5 });
  });
