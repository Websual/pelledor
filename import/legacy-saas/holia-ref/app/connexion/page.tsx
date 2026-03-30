"use client";

import { Button, Input, Label } from "@/components/ui";
import { signIn, getProviders } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { PageSkeleton } from "@/components/page-skeleton";

type Provider = {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
};

function ConnexionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = rawCallbackUrl ? decodeURIComponent(rawCallbackUrl) : "/";
  const passwordChanged = searchParams.get("passwordChanged");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      const availableProviders = await getProviders();
      setProviders(availableProviders);
    };
    loadProviders();
  }, []);

  useEffect(() => {
    if (passwordChanged === "success") {
      setSuccessMessage("Votre mot de passe a été changé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.");
      // Nettoyer l'URL après 5 secondes
      setTimeout(() => {
        router.replace("/connexion");
        setSuccessMessage(null);
      }, 5000);
    }
  }, [passwordChanged, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (providerId: string) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signIn(providerId, {
        callbackUrl: callbackUrl || "/",
        redirect: false,
      });
      
      if (result?.error) {
        console.error("OAuth error:", result.error);
        setError("Erreur lors de la connexion. Veuillez réessayer.");
        setIsLoading(false);
      } else if (result?.ok) {
        window.location.href = callbackUrl || "/";
      }
    } catch (err: any) {
      console.error("OAuth sign in error:", err);
      setError(err?.message || "Erreur lors de la connexion");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Côté gauche - Formulaire */}
      <div className="bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-24">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Vous avez déjà utilisé Holia ?
              </h1>
              <p className="text-gray-600 text-lg">
                Connectez-vous pour accéder à votre compte
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-gray-700 mb-2 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="rounded-xl border-gray-200 focus:border-[#9bb49b] focus:ring-[#9bb49b]"
                  placeholder="votre.email@exemple.com"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700 mb-2 block">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-xl border-gray-200 focus:border-[#9bb49b] focus:ring-[#9bb49b] pr-10"
                    placeholder="Votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 flex-1">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl py-6 text-base font-semibold transition-colors" 
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>

              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#9bb49b] hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </form>

            {/* Affichage des boutons OAuth */}
            {providers &&
              Object.values(providers)
                .filter((provider) => provider.id !== "credentials")
                .length > 0 && (
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Ou</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {providers.google && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-xl border-gray-200 hover:bg-gray-50"
                        onClick={() => handleOAuthSignIn("google")}
                        disabled={isLoading}
                      >
                        <svg
                          className="mr-2 h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continuer avec Google
                      </Button>
                    )}

                    {providers.apple && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-xl bg-black text-white hover:bg-gray-800 border-black"
                        onClick={() => handleOAuthSignIn("apple")}
                        disabled={isLoading}
                      >
                        <svg
                          className="mr-2 h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                        Continuer avec Apple
                      </Button>
                    )}
                  </div>
                </div>
              )}

            <div className="text-center text-sm text-gray-600">
              <p>
                Pas encore de compte ?{" "}
                <Link href="/inscription" className="text-[#9bb49b] hover:underline font-medium">
                  S&apos;inscrire
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Côté droit - Image */}
      <div className="hidden lg:block relative bg-gray-100">
        <Image
          src="/images/login-wellness.webp"
          alt="Composition apaisante d'objets de bien-être : tapis de yoga, coussin de méditation, bougies naturelles et plantes"
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConnexionPageContent />
    </Suspense>
  );
}
