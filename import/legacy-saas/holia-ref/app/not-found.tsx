import Link from "next/link";
import { Button } from "@/components/ui";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold font-heading text-sauge mb-4">404</h1>
          <h2 className="text-4xl md:text-5xl font-bold font-heading text-anthracite mb-6">
            Page non trouvée
          </h2>
          <p className="text-xl text-anthracite/70 mb-8">
            Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-sauge hover:bg-sauge-dark text-white">
            <Link href="/">
              <Home className="h-5 w-5 mr-2" />
              Retour à l&apos;accueil
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-sauge text-sauge hover:bg-sauge/10"
          >
            <Link href="/recherche">
              <Search className="h-5 w-5 mr-2" />
              Rechercher un praticien
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
