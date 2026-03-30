"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Room = {
  id: string;
  slug: string;
  title: string;
  priceCentsNight: number;
  published: boolean;
};

export function AdminLodgingClient({
  initialRooms,
  hasProfile,
}: {
  initialRooms: Room[];
  hasProfile: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasProfile) return;
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/modules/lodging/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: fd.get("slug"),
        title: fd.get("title"),
        description: fd.get("description"),
        capacity: fd.get("capacity"),
        priceCentsNight: fd.get("priceCentsNight"),
        imageUrl: fd.get("imageUrl"),
        published: fd.get("published") === "on",
      }),
    });
    const j = await r.json();
    setMsg(r.ok ? "Chambre créée" : j.error || "Erreur");
    if (r.ok) router.refresh();
  }

  async function toggle(id: string, published: boolean) {
    await fetch(`/api/modules/lodging/rooms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-8">
      {msg && <p className="text-sm text-neutral-600">{msg}</p>}
      {hasProfile && (
        <form onSubmit={create} className="space-y-2 rounded border bg-white p-4">
          <h2 className="font-medium">Nouvelle chambre</h2>
          <input
            name="slug"
            placeholder="slug-url (ex: suite-romantique)"
            className="w-full rounded border px-2 py-1 text-sm"
            required
          />
          <input
            name="title"
            placeholder="Titre"
            className="w-full rounded border px-2 py-1 text-sm"
            required
          />
          <textarea
            name="description"
            placeholder="Description"
            className="w-full rounded border px-2 py-1 text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <input
              name="capacity"
              type="number"
              placeholder="Capacité"
              defaultValue={2}
              className="w-24 rounded border px-2 py-1 text-sm"
            />
            <input
              name="priceCentsNight"
              type="number"
              placeholder="Prix / nuit (centimes)"
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <input
            name="imageUrl"
            placeholder="URL image"
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" /> Publiée
          </label>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white"
          >
            Créer
          </button>
        </form>
      )}
      <ul className="divide-y rounded border bg-white">
        {initialRooms.map((room) => (
          <li
            key={room.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
          >
            <div>
              <span className="font-medium">{room.title}</span>{" "}
              <code className="text-xs text-neutral-500">{room.slug}</code>
              <div className="text-xs text-neutral-500">
                {(room.priceCentsNight / 100).toFixed(0)} € / nuit —{" "}
                {room.published ? "publiée" : "brouillon"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle(room.id, room.published)}
              className="text-sm text-blue-600 underline"
            >
              {room.published ? "Dépublier" : "Publier"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
