"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";

export default function ValidationReclamationPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [validationStatus, setValidationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>("");

  const confirmClaim = useCallback(async (claimId: string) => {
    try {
      console.log('[Validation] Confirming claim for ID:', claimId);

      const res = await fetch('/api/practitioners/claim/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('[Validation] API error:', error);

        // Gérer spécifiquement le cas "profil déjà réclamé"
        if (error.error === "Ce profil a déjà été réclamé" || error.error === "Vous avez déjà un profil praticien") {
          console.log('[Validation] Profile already claimed, showing success message');
          setValidationStatus('success');
          // Supprimer le cookie même en cas d'erreur pour éviter les redirections infinies
          document.cookie = 'holia_claim_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          return;
        }

        setValidationStatus('error');
        setErrorMessage(error.error || 'Erreur lors de la validation');

        // Supprimer le cookie même en cas d'erreur pour éviter les redirections infinies
        document.cookie = 'holia_claim_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        return;
      }

      const data = await res.json();
      console.log('[Validation] Success:', data);

      // Supprimer le cookie de réclamation
      document.cookie = 'holia_claim_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      // Forcer la mise à jour de la session NextAuth pour récupérer le nouveau rôle
      console.log('[Validation] Updating session...');
      await update();

      // Garder l'utilisateur sur la page avec un message de succès définitif
      setValidationStatus('success');
      console.log('[Validation] Process completed, user stays on page with success message');

    } catch (error) {
      console.error('[Validation] Error:', error);
      setValidationStatus('error');
      setErrorMessage('Erreur réseau lors de la validation');

      // Supprimer le cookie même en cas d'erreur réseau
      document.cookie = 'holia_claim_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }, [update]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/connexion');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const claimId = urlParams.get('claimId');

    if (!claimId) {
      if (session.user.role === 'PRACTITIONER') {
        router.push('/pro/dashboard');
      } else {
        router.push('/');
      }
      return;
    }

    document.cookie = 'holia_claim_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    confirmClaim(claimId);
  }, [session, status, router, confirmClaim]);

  if (status === 'loading') {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {validationStatus === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Finalisation de votre profil professionnel...
            </h1>
            <p className="text-gray-600 mb-4">
              Nous validons votre réclamation et activons votre compte praticien.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </>
        )}

        {validationStatus === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Profil réclamé avec succès ! 🎉
            </h1>
            <p className="text-gray-600 mb-6">
              Votre profil praticien a été activé et associé à votre compte. Vous pouvez maintenant accéder à votre tableau de bord professionnel avec toutes vos fonctionnalités.
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/pro/dashboard')} className="w-full">
                Accéder à mon tableau de bord professionnel
              </Button>
              <Button variant="outline" onClick={() => router.push('/')} className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          </>
        )}


        {validationStatus === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Erreur lors de la validation
            </h1>
            <p className="text-gray-600 mb-6">
              {errorMessage || "Une erreur inattendue s'est produite lors de la validation de votre profil."}
            </p>
            <div className="space-y-3">
              <Link href="/recherche">
                <Button variant="outline" className="w-full">
                  Retour à la recherche
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full">
                  Contacter le support
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}