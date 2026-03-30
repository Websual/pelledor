"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type P = { id: string; slug: string; title: string };

export function DataSeedForms({ practitioners }: { practitioners: P[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function post(url: string, body: object) {
    setMsg(null);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || r.statusText);
    else {
      setMsg("OK");
      router.refresh();
    }
  }

  return (
    <div className="mt-8 space-y-10">
      {msg && <p className="text-sm text-neutral-600">{msg}</p>}
      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">Praticien</h2>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            post("/api/modules/directory/practitioners", {
              slug: fd.get("slug"),
              title: fd.get("title"),
              city: fd.get("city"),
              bio: fd.get("bio"),
              linkToMe: (fd.get("linkToMe") as string) === "on",
            });
          }}
        >
          <input name="slug" placeholder="slug" className="rounded border px-2 py-1" required />
          <input name="title" placeholder="Titre" className="rounded border px-2 py-1" />
          <input name="city" placeholder="Ville" className="rounded border px-2 py-1" />
          <textarea name="bio" placeholder="Bio" className="rounded border px-2 py-1" rows={2} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="linkToMe" /> Lier a mon compte (notifs RDV)
          </label>
          <button type="submit" className="rounded bg-neutral-900 px-3 py-1 text-sm text-white">
            Creer
          </button>
        </form>
      </section>
      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">Prestation</h2>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            post("/api/modules/directory/services", {
              practitionerId: fd.get("practitionerId"),
              name: fd.get("name"),
              durationMin: fd.get("durationMin"),
              priceCents: fd.get("priceCents"),
            });
          }}
        >
          <select name="practitionerId" className="rounded border px-2 py-1" required>
            <option value="">Praticien</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.slug}
              </option>
            ))}
          </select>
          <input name="name" placeholder="Nom seance" className="rounded border px-2 py-1" required />
          <input name="durationMin" placeholder="Duree min" type="number" defaultValue={60} />
          <input name="priceCents" placeholder="Prix centimes" type="number" defaultValue={5000} />
          <button type="submit" className="rounded bg-neutral-900 px-3 py-1 text-sm text-white">
            Creer
          </button>
        </form>
      </section>
      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">Evenement</h2>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            post("/api/modules/events/events", {
              practitionerId: fd.get("practitionerId"),
              slug: fd.get("slug"),
              title: fd.get("title"),
              date: fd.get("date"),
              priceCents: fd.get("priceCents"),
              capacity: fd.get("capacity"),
            });
          }}
        >
          <select name="practitionerId" required className="rounded border px-2 py-1">
            <option value="">Praticien</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.slug}
              </option>
            ))}
          </select>
          <input name="slug" placeholder="slug event" required className="rounded border px-2 py-1" />
          <input name="title" placeholder="Titre" className="rounded border px-2 py-1" />
          <input name="date" type="datetime-local" required className="rounded border px-2 py-1" />
          <input name="priceCents" type="number" defaultValue={2500} />
          <input name="capacity" type="number" defaultValue={15} />
          <button type="submit" className="rounded bg-neutral-900 px-3 py-1 text-sm text-white">
            Creer
          </button>
        </form>
      </section>
      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">Creneaux (horaires)</h2>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            post("/api/modules/directory/working-hours", {
              practitionerId: fd.get("practitionerId"),
              dayOfWeek: fd.get("dayOfWeek"),
              startTime: fd.get("startTime"),
              endTime: fd.get("endTime"),
            });
          }}
        >
          <select name="practitionerId" required className="rounded border px-2 py-1">
            <option value="">Praticien</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.slug}
              </option>
            ))}
          </select>
          <select name="dayOfWeek" className="rounded border px-2 py-1">
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                Jour {d} (1=lun)
              </option>
            ))}
          </select>
          <input name="startTime" defaultValue="09:00" className="rounded border px-2 py-1" />
          <input name="endTime" defaultValue="18:00" className="rounded border px-2 py-1" />
          <button type="submit" className="rounded bg-neutral-900 px-3 py-1 text-sm text-white">
            Ajouter
          </button>
        </form>
      </section>
      <section className="rounded border bg-white p-4">
        <h2 className="font-medium">Article blog</h2>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            post("/api/modules/blog/posts", {
              slug: fd.get("slug"),
              title: fd.get("title"),
              body: fd.get("body"),
              published: true,
            });
          }}
        >
          <input name="slug" required className="rounded border px-2 py-1" placeholder="slug" />
          <input name="title" required className="rounded border px-2 py-1" placeholder="Titre" />
          <textarea name="body" rows={4} className="rounded border px-2 py-1" placeholder="Contenu" />
          <button type="submit" className="rounded bg-neutral-900 px-3 py-1 text-sm text-white">
            Publier
          </button>
        </form>
      </section>
    </div>
  );
}
