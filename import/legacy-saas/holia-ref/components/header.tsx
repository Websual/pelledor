"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Menu, BarChart3 } from "lucide-react";
import { useState } from "react";
import { NotificationCenter } from "@/components/notification-center";
import { Button } from "@/components/ui";

export function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show loading state for auth-dependent elements
  const isLoading = status === 'loading';

  return (
    <header className="border-b border-sable bg-white sticky top-0 z-50">
      <div className="w-full max-w-[100vw] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold font-heading text-sauge">
            Holia
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 ml-auto">
            <Link
              href="/recherche"
              className="text-anthracite/70 hover:text-anthracite transition-colors"
            >
              Rechercher
            </Link>
            <Link
              href="/pro"
              className="text-anthracite/70 hover:text-anthracite transition-colors"
            >
              Praticien
            </Link>
            {session ? (
              <div className="flex items-center gap-4">
                       {session.user.role === "PRACTITIONER" ? (
                         <>
                           <NotificationCenter variant="pro" />
                           <Link href="/pro/dashboard">
                             <Button variant="ghost" size="sm">
                               <User className="h-4 w-4 mr-2" />
                               Dashboard
                             </Button>
                           </Link>
                           <Link href="/pro/profile">
                             <Button variant="ghost" size="sm">
                               Services
                             </Button>
                           </Link>
                           <Link href="/pro/appointments">
                             <Button variant="ghost" size="sm">
                               Rendez-vous
                             </Button>
                           </Link>
                           <Link href="/pro/calendar">
                             <Button variant="ghost" size="sm">
                               Agenda
                             </Button>
                           </Link>
                           <Link href="/pro/reviews">
                             <Button variant="ghost" size="sm">
                               Avis
                             </Button>
                           </Link>
                           <Link href="/pro/profile">
                             <Button variant="ghost" size="sm">
                               Profil
                             </Button>
                           </Link>
                         </>
                       ) : session.user.role === "ADMIN" ? (
                  <>
                    <Link href="/admin/dashboard">
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/admin/practitioners">
                      <Button variant="ghost" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        Praticiens
                      </Button>
                    </Link>
                    <Link href="/admin/reviews">
                      <Button variant="ghost" size="sm">
                        Avis
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/account/appointments">
                      <Button variant="ghost" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        Mes réservations
                      </Button>
                    </Link>
                    <Link href="/account/favorites">
                      <Button variant="ghost" size="sm">
                        Favoris
                      </Button>
                    </Link>
                    <Link href="/account/profile">
                      <Button variant="ghost" size="sm">
                        Profil
                      </Button>
                    </Link>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Se déconnecter
                </Button>
              </div>
            ) : (
              <Link href="/connexion">
                <Button size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Mon compte
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6 text-anthracite" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-sable">
            <nav className="flex flex-col gap-4">
              <Link
                href="/recherche"
                className="text-anthracite/70 hover:text-anthracite transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Rechercher
              </Link>
              <Link
                href="/pro"
                className="text-anthracite/70 hover:text-anthracite transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Praticien
              </Link>
              {session ? (
                <>
                         {session.user.role === "PRACTITIONER" ? (
                           <>
                             <Link
                               href="/pro/dashboard"
                               className="text-anthracite/70 hover:text-anthracite transition-colors"
                               onClick={() => setMobileMenuOpen(false)}
                             >
                               Dashboard
                             </Link>
                             <Link
                               href="/pro/profile"
                               className="text-anthracite/70 hover:text-anthracite transition-colors"
                               onClick={() => setMobileMenuOpen(false)}
                             >
                               Services
                             </Link>
                             <Link
                               href="/pro/appointments"
                               className="text-anthracite/70 hover:text-anthracite transition-colors"
                               onClick={() => setMobileMenuOpen(false)}
                             >
                               Rendez-vous
                             </Link>
                             <Link
                               href="/pro/calendar"
                               className="text-anthracite/70 hover:text-anthracite transition-colors"
                               onClick={() => setMobileMenuOpen(false)}
                             >
                               Agenda
                             </Link>
                             <Link
                               href="/pro/reviews"
                               className="text-anthracite/70 hover:text-anthracite transition-colors"
                               onClick={() => setMobileMenuOpen(false)}
                             >
                               Avis
                             </Link>
                             <Link
                               href="/pro/profile"
                               className="text-anthracite/70 hover:text-anthracite transition-colors"
                               onClick={() => setMobileMenuOpen(false)}
                             >
                               Profil
                             </Link>
                           </>
                         ) : session.user.role === "ADMIN" ? (
                    <>
                      <Link
                        href="/admin/dashboard"
                        className="text-anthracite/70 hover:text-anthracite transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/admin/practitioners"
                        className="text-anthracite/70 hover:text-anthracite transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Praticiens
                      </Link>
                      <Link
                        href="/admin/reviews"
                        className="text-anthracite/70 hover:text-anthracite transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Avis
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/account/appointments"
                        className="text-anthracite/70 hover:text-anthracite transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Mes réservations
                      </Link>
                      <Link
                        href="/account/favorites"
                        className="text-anthracite/70 hover:text-anthracite transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Favoris
                      </Link>
                      <Link
                        href="/account/profile"
                        className="text-anthracite/70 hover:text-anthracite transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Profil
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: "/" });
                      setMobileMenuOpen(false);
                    }}
                    className="text-left text-anthracite/70 hover:text-anthracite transition-colors"
                  >
                    Se déconnecter
                  </button>
                </>
              ) : (
                <Link
                  href="/connexion"
                  className="text-anthracite/70 hover:text-anthracite transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Mon compte
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
