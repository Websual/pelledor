"use client";

import { signOut } from "next-auth/react";

export function AdminSignOut() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="mt-2 text-xs text-neutral-600 underline hover:text-neutral-900"
    >
      Deconnexion
    </button>
  );
}
