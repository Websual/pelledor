"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn, getProviders } from "next-auth/react";
import { Button, Input, Label } from "@/components/ui";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { 
  AlertCircle, 
  CheckCircle, 
  Mail, 
  Lock,
  Shield,
  CreditCard,
  CheckCircle2,
  BadgeCheck
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/page-skeleton";

interface ClaimedProfile {
  id: string;
  title: string;
  bio: string;
  address: string | null;
  locationCity: string;
  phone: string | null;
  photoUrl: string | null;
  sourceUrl: string | null;
  professionId: string | null;
  professionName: string | null;
}

type Provider = {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
};

function InscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimId = searchParams.get('claim');
  const roleParam = searchParams.get('role');
  
  // Déterminer le rôle : claim ou role=practitioner = praticien, sinon patient
  const isPractitioner = !!claimId || roleParam === 'practitioner';
  const [role, setRole] = useState<'patient' | 'practitioner'>(isPractitioner ? 'practitioner' : 'patient');
  const jobParam = searchParams.get('job') || '';

  // Stocker le claimId dans un cookie temporaire si présent
  useEffect(() => {
    if (claimId && typeof window !== 'undefined') {
      document.cookie = `holia_claim_id=${claimId}; path=/; max-age=3600; SameSite=Lax`; // 1 heure
      console.log(`[Claim] Stored claimId in cookie: ${claimId}`);
    }
  }, [claimId]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profession: '', // Ne pas initialiser avec jobParam, sera géré par useEffect
    professionOther: '', // Pour le champ "Autre"
    acceptTerms: false,
    acceptCharter: false, // Engagement charte déontologique (praticiens uniquement)
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const [professions, setProfessions] = useState<Array<{ id: string; name: string }>>([]);
  const [isOtherProfession, setIsOtherProfession] = useState(false);
  const hasPrefilledFromJob = useRef(false);

  // Charger les informations du profil à réclamer
  const { data: claimedProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['claimedProfile', claimId],
    queryFn: async (): Promise<ClaimedProfile | null> => {
      if (!claimId) return null;

      const res = await fetch(`/api/practitioners/${claimId}/claim-info`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!claimId
  });

  // Charger toutes les professions en base + option Autre dans le Combobox
  useEffect(() => {
    fetch("/api/professions?all=true")
      .then((res) => res.json())
      .then((data) => {
        setProfessions(data);
      })
      .catch((err) => console.error("Error fetching professions:", err));
  }, []);

  // Pré-remplir la profession depuis l'URL (job param) une fois que les professions sont chargées
  useEffect(() => {
    if (jobParam && !hasPrefilledFromJob.current && !claimedProfile && professions.length > 0) {
      hasPrefilledFromJob.current = true;
      // Ne pas pré-remplir avec un paramètre qui ressemble à un id externe (ex. prof_xxx_123456_yyy)
      const looksLikeExternalId = /^prof_[a-z0-9]+_\d+_[a-z0-9]+$/i.test(jobParam.trim());
      if (looksLikeExternalId) {
        return;
      }
      // Chercher si le job correspond à une profession en base (par nom ou id)
      const profession = professions.find(
        (p) =>
          p.id === jobParam.trim() ||
          p.name.toLowerCase() === jobParam.toLowerCase() ||
          p.name.toLowerCase().includes(jobParam.toLowerCase()) ||
          jobParam.toLowerCase().includes(p.name.toLowerCase())
      );
      if (profession) {
        setFormData((prev) => ({ ...prev, profession: profession.id }));
        setIsOtherProfession(false);
      } else {
        // Si pas trouvé, utiliser "Autre" avec le nom fourni (jamais un id externe)
        setIsOtherProfession(true);
        setFormData((prev) => ({ ...prev, profession: "other", professionOther: jobParam }));
      }
    }
  }, [jobParam, professions, claimedProfile]);

  // Pré-remplir le nom et la profession si claim présent
  useEffect(() => {
    if (claimedProfile?.title && !formData.name) {
      setFormData(prev => ({ ...prev, name: claimedProfile.title }));
    }
    // Pré-remplir la profession depuis le claim (seulement si les professions sont chargées)
    if (claimedProfile && professions.length > 0 && !formData.profession) {
      if (claimedProfile.professionId) {
        // Si on a l'ID, l'utiliser directement
        setFormData(prev => ({ ...prev, profession: claimedProfile.professionId! }));
        setIsOtherProfession(false);
      } else if (claimedProfile.professionName) {
        // Si on a le nom mais pas l'ID, chercher l'ID correspondant
        const profession = professions.find(p => p.name === claimedProfile.professionName);
        if (profession) {
          setFormData(prev => ({ ...prev, profession: profession.id }));
          setIsOtherProfession(false);
        } else {
          // Si la profession n'est pas dans la liste, utiliser "Autre"
          setIsOtherProfession(true);
          setFormData(prev => ({ ...prev, profession: 'other', professionOther: claimedProfile.professionName || '' }));
        }
      }
    }
  }, [claimedProfile, professions, formData.name, formData.profession]);

  // Note: Le pré-remplissage depuis jobParam est maintenant géré dans le useEffect qui charge les professions

  // Charger les providers OAuth
  useEffect(() => {
    const loadProviders = async () => {
      const availableProviders = await getProviders();
      setProviders(availableProviders);
    };
    loadProviders();
  }, []);

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData & { claimId?: string; role: string }) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role === 'practitioner' ? 'PRACTITIONER' : 'USER',
          claimId: data.claimId,
          profession: data.profession || undefined,
          acceptCharter: data.role === 'practitioner' ? data.acceptCharter : undefined,
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erreur lors de l\'inscription');
      }

      return res.json();
    },
    onSuccess: async (data) => {
      // Auto sign in after signup
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setErrors({ general: "Compte créé mais connexion échouée. Veuillez vous connecter." });
      } else {
        // Rediriger selon le rôle
        if (role === 'practitioner') {
          router.push('/pro/dashboard');
        } else {
          router.push('/');
        }
        router.refresh();
      }
    },
    onError: (error: Error) => {
      setErrors({ general: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
    if (!formData.email.trim()) newErrors.email = 'L\'email est requis';
    if (!formData.password) newErrors.password = 'Le mot de passe est requis';
    if (formData.password.length < 8) newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (role === 'practitioner') {
      if (!formData.profession || formData.profession === '') {
        newErrors.profession = 'La profession est requise pour les praticiens';
      } else if (formData.profession === 'other' && !formData.professionOther.trim()) {
        newErrors.professionOther = 'Veuillez préciser votre profession';
      }
      if (!formData.acceptCharter) newErrors.acceptCharter = 'Vous devez vous engager à respecter la charte déontologique';
    }
    if (!formData.acceptTerms) newErrors.acceptTerms = 'Vous devez accepter les conditions générales';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Si "Autre" est sélectionné, utiliser professionOther, sinon utiliser profession
      const professionToSend = formData.profession === 'other' ? formData.professionOther : formData.profession;
      registerMutation.mutate({
        ...formData,
        profession: professionToSend,
        claimId: claimId || undefined,
        role: role,
        acceptCharter: formData.acceptCharter,
      });
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleOAuthSignIn = (providerId: string) => {
    // Déterminer la callbackUrl selon la présence d'un claim
    let callbackUrl = '/'; // Par défaut : page d'accueil

    if (claimId) {
      // Si claim présent, rediriger vers la validation
      callbackUrl = `/reclamation/validation?claimId=${claimId}`;
    }
    // Si pas de claim, rester sur '/' (ClaimRedirect gérera les cookies existants)

    console.log(`[Inscription] OAuth signin for ${providerId}, callbackUrl: ${callbackUrl}`);
    signIn(providerId, { callbackUrl });
  };

  const toggleRole = () => {
    const newRole = role === 'patient' ? 'practitioner' : 'patient';
    setRole(newRole);
    // Réinitialiser la profession si on passe en patient
    if (newRole === 'patient') {
      setFormData(prev => ({ ...prev, profession: '', professionOther: '' }));
      setIsOtherProfession(false);
    }
  };

  if (claimId && profileLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Côté gauche - Formulaire */}
      <div className="bg-white flex flex-col">
        {/* Contenu centré verticalement */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-24">
          <div className="w-full max-w-md">
            {/* Badge de réclamation */}
            {claimedProfile && (
              <div className="mb-6 rounded-3xl bg-[#9bb49b]/10 p-6 border border-[#9bb49b]/20">
                <div className="flex items-center gap-2 mb-2">
                  <BadgeCheck className="h-5 w-5 text-[#9bb49b]" />
                  <span className="text-sm font-semibold text-[#9bb49b]">Réclamation de profil</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Ravi de vous voir, <span className="font-semibold">{claimedProfile.title}</span> ! Finalisez votre compte pour activer votre profil.
                </p>
              </div>
            )}

            {/* Titre */}
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              {claimedProfile 
                ? 'Finalisez votre inscription' 
                : 'Rejoignez Holia. La révolution du bien-être commence ici.'
              }
            </h1>

            {!claimedProfile && (
              <p className="text-gray-600 mb-8 text-lg">
                Créez votre compte en quelques secondes et commencez votre parcours bien-être.
              </p>
            )}

            {/* Toggle rôle (seulement si pas de claim) */}
            {!claimId && (
              <div className="mb-6 flex items-center justify-center gap-3 p-2 bg-gray-50 rounded-xl">
                <button
                  type="button"
                  onClick={toggleRole}
                  className={`flex-1 px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
                    role === 'patient'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={toggleRole}
                  className={`flex-1 px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
                    role === 'practitioner'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Praticien
                </button>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Erreur générale */}
              {errors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-700">{errors.general}</p>
                  </div>
                </div>
              )}

              {/* Nom */}
              <div>
                <Label htmlFor="name" className="text-gray-700 mb-2 block">
                  Nom complet
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`rounded-xl border-gray-200 focus:border-[#9bb49b] focus:ring-[#9bb49b] ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  placeholder="Votre nom complet"
                  disabled={!!claimedProfile}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1.5">{errors.name}</p>
                )}
              </div>

              {/* Profession / Métier (si praticien) */}
              {(role === 'practitioner' || claimId) && (
                <div>
                  <Label htmlFor="profession" className="text-gray-700 mb-2 block">
                    Profession / Métier
                  </Label>
                  <Combobox
                    options={[
                      ...professions.map(prof => ({
                        value: prof.id,
                        label: prof.name,
                      })),
                      {
                        value: 'other',
                        label: 'Autre',
                      },
                    ]}
                    value={formData.profession}
                    onValueChange={(value) => {
                      if (value === 'other') {
                        setIsOtherProfession(true);
                        setFormData(prev => ({ ...prev, profession: 'other', professionOther: prev.professionOther || '' }));
                      } else {
                        setIsOtherProfession(false);
                        setFormData(prev => ({ ...prev, profession: value, professionOther: '' }));
                      }
                      if (errors.profession) {
                        setErrors(prev => ({ ...prev, profession: '' }));
                      }
                    }}
                    placeholder="Sélectionnez votre profession"
                    emptyText="Aucune profession trouvée"
                    maxHeight="400px"
                  />
                  {errors.profession && (
                    <p className="text-sm text-red-600 mt-1.5">{errors.profession}</p>
                  )}
                  
                  {/* Input pour "Autre" si sélectionné */}
                  {isOtherProfession && (
                    <div className="mt-3">
                      <Input
                        id="professionOther"
                        type="text"
                        value={formData.professionOther}
                        onChange={(e) => handleChange('professionOther', e.target.value)}
                        className={`rounded-xl border-gray-200 focus:border-[#9bb49b] focus:ring-[#9bb49b] ${
                          errors.professionOther ? 'border-red-500' : ''
                        }`}
                        placeholder="Précisez votre profession"
                      />
                      {errors.professionOther && (
                        <p className="text-sm text-red-600 mt-1.5">{errors.professionOther}</p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1.5">
                    Ce champ sera utilisé pour créer votre profil public
                  </p>
                </div>
              )}

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-gray-700 mb-2 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`rounded-xl border-gray-200 focus:border-[#9bb49b] focus:ring-[#9bb49b] ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                  placeholder="votre.email@exemple.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1.5">{errors.email}</p>
                )}
              </div>

              {/* Mot de passe */}
              <div>
                <Label htmlFor="password" className="text-gray-700 mb-2 block">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`rounded-xl border-gray-200 focus:border-[#9bb49b] focus:ring-[#9bb49b] ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                  placeholder="Minimum 8 caractères"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1.5">{errors.password}</p>
                )}
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <Label htmlFor="confirmPassword" className="text-gray-700 mb-2 block">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`rounded-xl border-gray-200 focus:border-[#9bb49b] focus:ring-[#9bb49b] ${
                    errors.confirmPassword ? 'border-red-500' : ''
                  }`}
                  placeholder="Répétez votre mot de passe"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1.5">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Charte déontologique (praticiens uniquement) */}
              {(role === 'practitioner' || claimId) && (
                <div className="flex items-start gap-3">
                  <input
                    id="acceptCharter"
                    type="checkbox"
                    checked={formData.acceptCharter}
                    onChange={(e) => handleChange('acceptCharter', e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#9bb49b] focus:ring-[#9bb49b]"
                  />
                  <div className="flex-1">
                    <Label htmlFor="acceptCharter" className="text-sm text-gray-600 cursor-pointer">
                      Je m&apos;engage à respecter la{' '}
                      <Link href="/charte-deontologique" target="_blank" className="text-[#9bb49b] hover:underline font-medium">
                        charte déontologique Holia
                      </Link>
                    </Label>
                    {errors.acceptCharter && (
                      <p className="text-sm text-red-600 mt-1.5">{errors.acceptCharter}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Conditions générales */}
              <div className="flex items-start gap-3">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => handleChange('acceptTerms', e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-[#9bb49b] focus:ring-[#9bb49b]"
                />
                <div className="flex-1">
                  <Label htmlFor="acceptTerms" className="text-sm text-gray-600 cursor-pointer">
                    J'accepte les{' '}
                    <Link href="/terms" target="_blank" className="text-[#9bb49b] hover:underline font-medium">
                      conditions générales
                    </Link>{' '}
                    et la{' '}
                    <Link href="/privacy" target="_blank" className="text-[#9bb49b] hover:underline font-medium">
                      politique de confidentialité
                    </Link>
                  </Label>
                  {errors.acceptTerms && (
                    <p className="text-sm text-red-600 mt-1.5">{errors.acceptTerms}</p>
                  )}
                </div>
              </div>

              {/* Bouton */}
              <Button
                type="submit"
                className="w-full bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl py-6 text-base font-semibold transition-colors"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Création en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Créer mon compte
                  </>
                )}
              </Button>
            </form>

            {/* Séparateur OAuth */}
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
                        disabled={registerMutation.isPending}
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
                  </div>
                </div>
              )}

            {/* Points de réassurance */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#9bb49b]" />
                <span>Inscription gratuite</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#9bb49b]" />
                <span>Zéro engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#9bb49b]" />
                <span>Sécurisé par Stripe</span>
              </div>
            </div>

            {/* Lien vers connexion */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Déjà un compte ?{' '}
                <Link href="/connexion" className="text-[#9bb49b] hover:underline font-medium">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Côté droit - Image */}
      <div className="hidden lg:block relative bg-gray-100">
        <Image
          src="/images/register-zen.webp"
          alt="Bien-être et sérénité"
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
      </div>
    </div>
  );
}

function InscriptionPageWrapper() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InscriptionPage />
    </Suspense>
  );
}

export default InscriptionPageWrapper;
