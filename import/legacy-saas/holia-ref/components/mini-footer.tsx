"use client";
import Link from "next/link";

export function MiniFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-sable/20 py-4 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-anthracite/60">
        <div className="flex flex-col sm:flex-row gap-4">
          <span>© {currentYear} Holia. Tous droits réservés.</span>
        </div>
        <div className="flex flex-wrap gap-4 justify-center sm:justify-end">
          <Link href="/mentions-legales" className="hover:text-anthracite transition-colors">
            Mentions légales
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link href="/cgu" className="hover:text-anthracite transition-colors">
            CGU
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link href="/confidentialite" className="hover:text-anthracite transition-colors">
            Politique de confidentialité
          </Link>
        </div>
      </div>
    </footer>
  );
}
