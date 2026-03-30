"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ClaimRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Éviter les redirections multiples
    if (hasRedirected.current) return;

    // Attendre que la session soit chargée
    if (status === 'loading') return;

    // Si pas connecté, ne rien faire
    if (!session) return;

    // Ne pas rediriger si on est déjà sur une page liée à la validation
    if (pathname === '/reclamation/validation' || pathname?.startsWith('/pro/')) return;

    // Vérifier s'il y a un cookie de réclamation (sécurité de fallback)
    const cookies = document.cookie.split(';');
    const claimCookie = cookies.find(cookie => cookie.trim().startsWith('holia_claim_id='));

    if (claimCookie) {
      // Il y a une réclamation en attente, rediriger vers la page de claim
      const claimId = claimCookie.split('=')[1].trim();
      console.log(`[Claim Redirect] Fallback: Found claim cookie: ${claimId}, redirecting to validation page`);
      hasRedirected.current = true;

      // Utiliser window.location pour une redirection forcée
      window.location.href = `/reclamation/validation?claimId=${claimId}`;
    }
  }, [session, status, pathname]);

  return null; // Ce composant ne rend rien
}