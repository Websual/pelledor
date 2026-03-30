"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

const POPULAR_CITIES = [
  "Paris",
  "Lyon",
  "Marseille",
  "Toulouse",
  "Bordeaux",
  "Lille",
  "Nice",
  "Nantes",
  "Strasbourg",
];

interface RdvCityWidgetProps {
  professionId: string;
  professionName: string;
}

export function RdvCityWidget({ professionId, professionName }: RdvCityWidgetProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-anthracite">
        Prendre RDV avec un expert {professionName.toLowerCase()}
      </h3>
      <p className="text-sm text-slate-600">
        Choisissez une ville pour trouver un praticien près de chez vous :
      </p>
      <div className="flex flex-wrap gap-2">
        {POPULAR_CITIES.map((city) => (
          <Link
            key={city}
            href={`/recherche?professionId=${professionId}&city=${encodeURIComponent(city)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-anthracite hover:border-sauge hover:bg-sauge/5 hover:text-sauge transition-all"
          >
            <MapPin className="h-4 w-4" />
            {city}
          </Link>
        ))}
      </div>
      <Link
        href={`/recherche?professionId=${professionId}`}
        className="inline-flex items-center gap-2 text-sauge font-medium hover:underline text-sm"
      >
        Rechercher dans une autre ville
        <MapPin className="h-4 w-4" />
      </Link>
    </div>
  );
}
