import Link from "next/link";
import { Stethoscope, User } from "lucide-react";
import { AideSearchHome } from "@/components/aide-search-home";

export default function AideHomePage() {
  return (
    <div className="space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold font-heading text-anthracite">
          Centre d&apos;aide Holia
        </h1>
        <p className="text-anthracite/70">
          Choisissez votre profil ou recherchez directement
        </p>
      </div>

      <div>
        <AideSearchHome />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link
          href="/aide/pro"
          className="group flex flex-col items-center justify-center p-10 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-sauge/30 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-sauge/10 flex items-center justify-center mb-6 group-hover:bg-sauge/20 transition-colors">
            <Stethoscope className="h-8 w-8 text-sauge" />
          </div>
          <h2 className="text-xl font-bold font-heading text-anthracite mb-2">
            Je suis un Praticien
          </h2>
          <p className="text-anthracite/60 text-center text-sm">
            Inscription, gestion du cabinet, paiements, profil public et options Premium
          </p>
        </Link>

        <Link
          href="/aide/patient"
          className="group flex flex-col items-center justify-center p-10 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-sauge/30 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-sauge/10 flex items-center justify-center mb-6 group-hover:bg-sauge/20 transition-colors">
            <User className="h-8 w-8 text-sauge" />
          </div>
          <h2 className="text-xl font-bold font-heading text-anthracite mb-2">
            Je suis un Patient
          </h2>
          <p className="text-anthracite/60 text-center text-sm">
            Réserver, annuler, modifier un rendez-vous, utiliser une carte cadeau
          </p>
        </Link>
      </div>
    </div>
  );
}
