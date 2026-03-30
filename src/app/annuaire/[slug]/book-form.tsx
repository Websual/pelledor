"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BookForm({
  practitionerId,
  services,
}: {
  practitionerId: string;
  services: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [startsAt, setStartsAt] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/modules/booking/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practitionerId,
        serviceId,
        startsAt: new Date(startsAt).toISOString(),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error === "Unauthorized" ? "Connectez-vous pour reserver." : j.error);
      if (j.error === "Unauthorized") router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }
    router.push("/admin");
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <select
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value)}
        className="w-full rounded border px-2 py-2"
      >
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        required
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
        className="w-full rounded border px-2 py-2"
      />
      <button type="submit" className="w-full rounded bg-neutral-900 py-2 text-sm text-white">
        Reserver
      </button>
    </form>
  );
}
