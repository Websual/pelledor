"use client";

import { Button, Input, Label } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // TODO: Implémenter l'API de réinitialisation de mot de passe
      // const res = await fetch("/api/auth/forgot-password", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email }),
      // });
      
      // Pour l'instant, on simule une réponse réussie
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex pt-24">
      {/* Bloc gauche - Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
              Mot de passe oublié ?
            </h1>
            <p className="text-anthracite/60">
              {success
                ? "Un email de réinitialisation a été envoyé à votre adresse."
                : "Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe."}
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                <p className="text-sm text-green-600">
                  Si un compte existe avec cette adresse email, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/connexion">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="mt-1"
                  placeholder="votre@email.com"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
              </Button>

              <div className="text-center">
                <Link
                  href="/connexion"
                  className="text-sm text-sauge hover:text-sauge/80 transition-colors"
                >
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Bloc droit - Visuel */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-sauge/10 via-[#f7f7f7] to-sable/20">
        <div className="absolute inset-0">
          <Image
            src="/images/login-wellness.webp"
            alt="Composition apaisante d'objets de bien-être : tapis de yoga, coussin de méditation, bougies naturelles et plantes"
            fill
            className="object-cover"
            priority
            quality={90}
          />
        </div>
      </div>
    </main>
  );
}

