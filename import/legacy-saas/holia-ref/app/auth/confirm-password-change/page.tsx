"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function ConfirmPasswordChangeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const confirmPasswordChange = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch(`/api/auth/confirm-password-change?token=${token}`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de la confirmation");
      }
      return res.json();
    },
    onSuccess: () => {
      setStatus("success");
      setMessage("Votre mot de passe a été changé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.");
      setTimeout(() => {
        router.push("/connexion?passwordChanged=success");
      }, 4000);
    },
    onError: (error: Error) => {
      setStatus("error");
      setMessage(error.message || "Le lien de confirmation est invalide ou a expiré.");
    },
  });

  useEffect(() => {
    if (token) {
      confirmPasswordChange.mutate(token);
    } else {
      setStatus("error");
      setMessage("Token manquant dans l'URL.");
    }
  }, [token, confirmPasswordChange]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4">
      <Card className="bg-white max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-anthracite text-center">
            Confirmation du changement de mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-sauge mb-4" />
              <p className="text-anthracite/70">Vérification en cours...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <p className="text-anthracite text-center mb-4 text-lg font-medium">{message}</p>
              <p className="text-sm text-anthracite/60 text-center mb-4">
                Redirection automatique vers la page de connexion dans quelques secondes...
              </p>
              <Button
                onClick={() => router.push("/connexion?passwordChanged=success")}
                className="bg-sauge hover:bg-sauge-dark text-white"
              >
                Aller à la page de connexion maintenant
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-8">
              <XCircle className="h-12 w-12 text-red-600 mb-4" />
              <p className="text-anthracite text-center mb-4">{message}</p>
              <Button
                onClick={() => router.push("/pro/settings?tab=security")}
                className="bg-sauge hover:bg-sauge-dark text-white"
              >
                Retour aux paramètres
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmPasswordChangePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConfirmPasswordChangeContent />
    </Suspense>
  );
}

