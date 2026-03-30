"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ChambreReservePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const establishment = searchParams.get("e") || "";
  const [room, setRoom] = useState<{
    id: string;
    title: string;
    description: string;
    priceCentsNight: number;
    imageUrl: string | null;
  } | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [avail, setAvail] = useState<{
    available: boolean;
    nights?: number;
    totalCents?: number;
  } | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!establishment || !slug) return;
    fetch(
      `/api/modules/lodging/rooms/public?establishment=${encodeURIComponent(establishment)}`
    )
      .then((r) => r.json())
      .then((j) => {
        const r0 = j.rooms?.find((x: { slug: string }) => x.slug === slug);
        setRoom(r0 || null);
      });
  }, [establishment, slug]);

  useEffect(() => {
    if (!room?.id || !checkIn || !checkOut) {
      setAvail(null);
      return;
    }
    fetch(
      `/api/modules/lodging/rooms/availability?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}`
    )
      .then((r) => r.json())
      .then(setAvail);
  }, [room?.id, checkIn, checkOut]);

  async function pay() {
    setMsg(null);
    if (!room || !avail?.available) return;
    const r = await fetch("/api/modules/lodging/rooms/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: room.id,
        checkIn,
        checkOut,
        guestEmail,
        guestName,
      }),
    });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else setMsg(j.error || "Erreur");
  }

  if (!establishment) {
    return (
      <main className="mx-auto max-w-lg px-6 py-12">
        <p className="text-sm text-red-600">Paramètre manquant : ?e=slug-établissement</p>
        <Link href="/" className="mt-4 block text-blue-600 underline">
          Accueil
        </Link>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="mx-auto max-w-lg px-6 py-12">
        <p className="text-sm text-neutral-600">Chambre introuvable.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      {room.imageUrl && (
        <img
          src={room.imageUrl}
          alt=""
          className="mb-6 h-48 w-full rounded-lg object-cover"
        />
      )}
      <h1 className="text-2xl font-semibold">{room.title}</h1>
      <p className="mt-2 text-sm text-neutral-600 whitespace-pre-wrap">
        {room.description}
      </p>
      <p className="mt-4 text-lg font-medium">
        {(room.priceCentsNight / 100).toFixed(0)} € / nuit
      </p>

      <div className="mt-8 space-y-3 border-t pt-6">
        <label className="block text-sm font-medium">Arrivée</label>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <label className="block text-sm font-medium">Départ</label>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {avail && (
          <p className="text-sm">
            {avail.available ? (
              <>
                Disponible — {avail.nights} nuit(s) —{" "}
                <strong>{((avail.totalCents || 0) / 100).toFixed(2)} €</strong>
              </>
            ) : (
              <span className="text-red-600">Indisponible sur ces dates</span>
            )}
          </p>
        )}
        <input
          placeholder="Email"
          type="email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          placeholder="Nom"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button
          type="button"
          disabled={!avail?.available || !guestEmail}
          onClick={pay}
          className="w-full rounded bg-neutral-900 py-3 text-white disabled:opacity-40"
        >
          Payer avec Stripe
        </button>
      </div>
      <Link href="/" className="mt-8 inline-block text-sm text-blue-600 underline">
        Retour
      </Link>
    </main>
  );
}
