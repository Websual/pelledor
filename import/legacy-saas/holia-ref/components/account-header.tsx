"use client";

import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function AccountHeader() {
  const { data: session } = useSession();
  
  // Extraire le prénom du nom complet ou utiliser l'email
  const firstName = session?.user?.name?.split(" ")[0] || session?.user?.email?.split("@")[0] || "Utilisateur";
  
  // Formater la date du jour
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
  const capitalizedToday = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <header className="mb-6 md:mb-8">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
        Bonjour {firstName}, ravi de vous revoir.
      </h1>
      <p className="text-sm md:text-base text-gray-500">
        {capitalizedToday}
      </p>
    </header>
  );
}
