"use client";

import { Button, Card, CardContent, Input, Label, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { Combobox } from "@/components/ui/combobox";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import { Save, ArrowLeft, User, Image as ImageIcon, GraduationCap, Sparkles, Clock, X, Plus, Trash2, Edit2, Upload, Verified, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { VerificationTab } from "./verification-tab";
import Image from "next/image";
import { TagsInput } from "@/components/tags-input";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import Link from "next/link";
import { ToastContainer, ToastType } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RichEditor } from "@/components/ui/rich-editor";

// Base de mots-clés de traitement
const TREATMENT_KEYWORDS = {
  mental: ["Stress", "Anxiété", "Burn-out", "Dépression", "Confiance en soi", "Gestion des émotions", "Deuil", "Phobies", "Troubles de l'humeur"],
  physique: ["Douleurs chroniques", "Sommeil", "Insomnie", "Fatigue", "Digestion", "Perte de poids", "Arrêt du tabac", "Allergies", "Peau", "Dos & Articulations"],
  vie: ["Préparation aux examens", "Changement de vie", "Parentalité", "Couple", "Sexualité", "Performance sportive", "Créativité"],
  public: ["Enfants", "Adolescents", "Femmes enceintes", "Seniors", "Sportifs", "Entreprises"],
};

const ALL_KEYWORDS = Object.values(TREATMENT_KEYWORDS).flat();

interface Qualification {
  id: string;
  title: string;
  institution: string;
  discipline: string | null;
  obtainedYear: number | null;
  duration: string | null;
  description: string | null;
  certificateUrl: string | null;
  skills: string[];
  isVerified: boolean;
}

interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  description: string | null;
  locationType?: "PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID";
}

interface PractitionerProfile {
  id: string;
  title: string;
  bio: string;
  address: string | null;
  locationCity: string;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  slogan: string | null;
  accessInfo: string | null;
  transportInfo: string | null;
  instagramUrl: string | null;
  linkedInUrl: string | null;
  siret: string | null;
  verificationDocumentUrl: string | null;
  diplomaDocumentUrl: string | null;
  diplomaVerified: boolean;
  kbisDocumentUrl: string | null;
  kbisVerified: boolean;
  rcpDocumentUrl: string | null;
  rcpVerified: boolean;
  isVerified: boolean;
  hasRCPInsurance: boolean;
  acceptNewPatients: boolean;
  treatmentKeywords: string[];
  categoryId: string | null;
  phone: string | null;
  website: string | null;
  languages: string[];
  paymentMethods: string[];
  gallery: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  qualifications: Qualification[];
  services: Service[];
  updatedAt?: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface WorkingHours {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

type TabId = "identity" | "media" | "expertise" | "services" | "hours" | "verification";

const TABS: Array<{ id: TabId; label: string; icon: typeof User }> = [
  { id: "identity", label: "Identité & Contact", icon: User },
  { id: "media", label: "Médias & Galerie", icon: ImageIcon },
  { id: "expertise", label: "Parcours & Expertise", icon: GraduationCap },
  { id: "services", label: "Services & Tarifs", icon: Sparkles },
  { id: "hours", label: "Horaires & Dispos", icon: Clock },
  { id: "verification", label: "Vérification Professionnelle", icon: Verified },
];

export default function ProProfilePage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("identity");
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const loadingToastIdRef = useRef<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "default",
  });

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    
    // Si c'est un toast loading, on stocke son ID pour pouvoir le retirer plus tard
    if (type === "loading") {
      loadingToastIdRef.current = id;
    } else {
      // Si on ajoute un toast success/error, on retire d'abord le toast loading s'il existe
      if (loadingToastIdRef.current) {
        removeToast(loadingToastIdRef.current);
        loadingToastIdRef.current = null;
      }
    }
    
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    if (loadingToastIdRef.current === id) {
      loadingToastIdRef.current = null;
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: "default" | "destructive" = "default"
  ) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      onConfirm,
      variant,
    });
  };

  // Fetch profile
  const { data: profile, isLoading } = useQuery<PractitionerProfile>({
    queryKey: ["practitionerProfile"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  // Fetch toutes les professions (82) pour le dropdown profil
  const { data: professions } = useQuery<{ id: string; name: string; slug: string }[]>({
    queryKey: ["professions", "all"],
    queryFn: async () => {
      const res = await fetch("/api/professions?all=true");
      if (!res.ok) throw new Error("Failed to fetch professions");
      return res.json();
    },
  });

  // Fetch working hours
  const { data: fetchedWorkingHours } = useQuery<WorkingHours[]>({
    queryKey: ["workingHours"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/working-hours");
      if (!res.ok) throw new Error("Failed to fetch working hours");
      const data = await res.json();
      // Convertir les champs snake_case en camelCase
      return data.map((wh: any) => ({
        id: wh.id,
        dayOfWeek: wh.day_of_week,
        startTime: wh.start_time,
        endTime: wh.end_time,
        isActive: wh.is_active,
      }));
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  // Fetch services
  const { data: services } = useQuery<Service[]>({
    queryKey: ["practitionerServices"],
    queryFn: async () => {
      const res = await fetch(`/api/services?practitionerId=${profile?.id || ""}`);
      if (!res.ok) throw new Error("Failed to fetch services");
      const data = await res.json();
      // Convertir les champs snake_case en camelCase
      return data.map((s: any) => ({
        id: s.id,
        name: s.name,
        durationMin: s.duration_min || 0,
        priceCents: s.price_cents || 0,
        description: s.description || null,
      }));
    },
    enabled: !!profile?.id,
  });

  // Redirection si l'utilisateur n'est pas un praticien
  useEffect(() => {
    if (data && data.user.role !== "PRACTITIONER") {
      router.push("/");
    }
  }, [data, router]);

  // Gérer le hash dans l'URL pour changer d'onglet
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1); // Enlever le #
      if (hash && ["identity", "media", "expertise", "services", "hours", "verification"].includes(hash)) {
        setActiveTab(hash as TabId);
      }
    }
  }, []);

  // Calculate profile completion percentage
  const completionPercentage = useMemo(() => {
    if (!profile) return 0;
    let filled = 0;
    let total = 0;
    const missingFields: string[] = [];

    // Identity fields
    total += 5;
    if (profile.title) filled++; else missingFields.push("title");
    if (profile.bio) filled++; else missingFields.push("bio");
    if (profile.address) filled++; else missingFields.push("address");
    if (profile.locationCity) filled++; else missingFields.push("locationCity");
    if (profile.phone) filled++; else missingFields.push("phone");

    // Media
    total += 2;
    if (profile.photoUrl) filled++; else missingFields.push("photoUrl");
    // Vérifier gallery : peut être null, undefined, ou un tableau vide
    const hasGallery = Array.isArray(profile.gallery) && profile.gallery.length > 0;
    if (hasGallery) filled++; else missingFields.push("gallery");

    // Expertise
    total += 3;
    const hasKeywords = Array.isArray(profile.treatmentKeywords) && profile.treatmentKeywords.length > 0;
    if (hasKeywords) filled++; else missingFields.push("treatmentKeywords");
    const hasQualifications = Array.isArray(profile.qualifications) && profile.qualifications.length > 0;
    if (hasQualifications) filled++; else missingFields.push("qualifications");
    if (profile.categoryId) filled++; else missingFields.push("categoryId");

    // Services - utiliser la variable `services` récupérée séparément, pas `profile.services`
    total += 1;
    const hasServices = Array.isArray(services) && services.length > 0;
    if (hasServices) filled++; else missingFields.push("services");

    // Hours - utiliser la variable `fetchedWorkingHours` récupérée séparément
    total += 1;
    const hasHours = Array.isArray(fetchedWorkingHours) && fetchedWorkingHours.length > 0;
    if (hasHours) filled++; else missingFields.push("workingHours");

    const percentage = Math.round((filled / total) * 100);
    
    // Log pour déboguer (seulement si pas 100%)
    if (percentage < 100) {
      console.log(`[Profile Completion] ${percentage}% (${filled}/${total}) - Missing:`, missingFields);
      console.log(`[Profile Completion Debug] services:`, services, `fetchedWorkingHours:`, fetchedWorkingHours);
    }

    return percentage;
  }, [profile, services, fetchedWorkingHours]);

  if (!data || data.user.role !== "PRACTITIONER") {
    return null;
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-anthracite/70">Profil non trouvé</p>
        </div>
      </main>
    );
  }

  if (session.status === 'loading') return <Skeleton />

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        <div className="mb-8">
          <Link
            href="/pro/dashboard"
            className="text-sauge hover:text-sauge/80 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au dashboard
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold font-heading text-anthracite">
              Mon Profil Public
            </h1>
            {profile.isVerified && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1">
                <Verified className="h-4 w-4" />
                Vérifié
              </span>
            )}
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-anthracite/70">Profil complété à {completionPercentage}%</span>
            </div>
            <div className="w-full bg-sable/30 rounded-full h-2">
              <div
                className="bg-sauge h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:sticky lg:top-28 h-fit">
            <Card className="hidden lg:block overflow-hidden">
              <CardContent className="p-0">
                <nav className="flex flex-col">
                  {TABS.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isFirst = index === 0;
                    const isLast = index === TABS.length - 1;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isFirst ? "rounded-t-2xl " : ""
                        }${isLast ? "rounded-b-2xl " : ""}${
                          isActive
                            ? "bg-sauge/10 text-sauge border-l-4 border-sauge"
                            : "text-anthracite/70 hover:bg-[#f7f7f7]"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
            {/* Mobile Navigation */}
            <div className="lg:hidden mb-4">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as TabId)}
                className="w-full rounded-2xl border border-sable bg-white px-3 py-2 text-sm"
              >
                {TABS.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content Area */}
          <div>
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-6">
                {activeTab === "identity" && (
                  <IdentityTab profile={profile} professions={professions || []} onToast={addToast} onConfirm={showConfirm} />
                )}
                {activeTab === "media" && (
                  <MediaTab profile={profile} onToast={addToast} />
                )}
                {activeTab === "expertise" && (
                  <ExpertiseTab profile={profile} onToast={addToast} onConfirm={showConfirm} />
                )}
                {activeTab === "services" && (
                  <ServicesTab profile={profile} services={services || []} onToast={addToast} onConfirm={showConfirm} />
                )}
                {activeTab === "hours" && (
                  <HoursTab workingHours={fetchedWorkingHours || []} onToast={addToast} onConfirm={showConfirm} />
                )}
                {activeTab === "verification" && (
                  <VerificationTab profile={profile} onToast={addToast} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog({ ...confirmDialog, open: false });
          }}
          onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
          variant={confirmDialog.variant}
        />
      </div>
    </main>
  );
}

// Tab Components

function IdentityTab({ profile, professions, onToast, onConfirm }: { profile: PractitionerProfile; professions: { id: string; name: string; slug: string }[]; onToast: (message: string, type: ToastType) => void; onConfirm: (title: string, message: string, onConfirm: () => void, variant?: "destructive" | "default") => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    title: profile.title || "",
    slogan: profile.slogan || "",
    address: profile.address || "",
    locationCity: profile.locationCity || "",
    phone: profile.phone || "",
    website: profile.website || "",
    instagramUrl: profile.instagramUrl || "",
    linkedInUrl: profile.linkedInUrl || "",
    categoryId: profile.categoryId || "",
    accessInfo: profile.accessInfo || "",
    transportInfo: profile.transportInfo || "",
    siret: profile.siret || "",
    hasRCPInsurance: profile.hasRCPInsurance || false,
    acceptNewPatients: profile.acceptNewPatients ?? true,
  });

  // État pour la vérification du SIRET
  const [siretVerification, setSiretVerification] = useState<{
    status: "idle" | "loading" | "success" | "error";
    officialName?: string;
    errorMessage?: string;
  }>({ status: "idle" });
  const [isEditingSiret, setIsEditingSiret] = useState(false);
  const [localIsVerified, setLocalIsVerified] = useState(profile.isVerified);
  const lastVerifiedSiretRef = useRef<string | null>(null);
  const originalSiretRef = useRef<string | null>(profile.siret || null);

  // Synchroniser formData avec profile quand profile change (après un refetch)
  useEffect(() => {
    setFormData({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      title: profile.title || "",
      slogan: profile.slogan || "",
      address: profile.address || "",
      locationCity: profile.locationCity || "",
      phone: profile.phone || "",
      website: profile.website || "",
      instagramUrl: profile.instagramUrl || "",
      linkedInUrl: profile.linkedInUrl || "",
      categoryId: profile.categoryId || "",
      accessInfo: profile.accessInfo || "",
      transportInfo: profile.transportInfo || "",
      siret: profile.siret || "",
      hasRCPInsurance: profile.hasRCPInsurance || false,
      acceptNewPatients: profile.acceptNewPatients ?? true,
    });
    // Mettre à jour les refs et l'état local
    originalSiretRef.current = profile.siret || null;
    setLocalIsVerified(profile.isVerified);
    // Si le profil est vérifié et qu'on n'est pas en mode édition, désactiver l'édition
    if (profile.isVerified && !isEditingSiret) {
      setIsEditingSiret(false);
      setSiretVerification({ status: "idle" });
    }
    // Réinitialiser l'état de vérification si le SIRET change depuis le profil
    if (profile.siret !== lastVerifiedSiretRef.current) {
      setSiretVerification({ status: "idle" });
    }
  }, [profile, isEditingSiret]);

  // Vérification automatique du SIRET quand 14 chiffres sont saisis
  // Ne lancer l'appel QUE SI :
  // - Le praticien n'est pas déjà vérifié (localIsVerified === false) OU
  // - Le SIRET saisi est différent de celui stocké en base (formData.siret !== originalSiretRef.current)
  useEffect(() => {
    const siret = formData.siret.replace(/\D/g, '');
    const originalSiret = originalSiretRef.current?.replace(/\D/g, '') || '';
    
    // Condition de déclenchement optimisée
    const shouldVerify = 
      siret.length === 14 && 
      siret !== lastVerifiedSiretRef.current &&
      (localIsVerified === false || siret !== originalSiret);
    
    if (shouldVerify) {
      // Attendre un peu pour éviter les appels multiples pendant la saisie
      const timeoutId = setTimeout(async () => {
        setSiretVerification({ status: "loading" });
        
        try {
          const res = await fetch("/api/practitioner/verify-siret", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ siret }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            // Succès
            lastVerifiedSiretRef.current = siret;
            setSiretVerification({
              status: "success",
              officialName: data.data.officialName || undefined,
            });

            // Mettre à jour le cache pour que isVerified soit mis à jour en temps réel
            queryClient.setQueryData<PractitionerProfile>(["practitionerProfile"], (old) => {
              if (!old) return old;
              return {
                ...old,
                isVerified: true,
                siret: siret,
              };
            });

            // Mettre à jour l'état local
            setLocalIsVerified(true);
            originalSiretRef.current = siret;

            // Refetch pour s'assurer que toutes les données sont à jour
            await queryClient.refetchQueries({ queryKey: ["practitionerProfile"], exact: true });

            // Auto-remplir l'adresse si elle est disponible et plus précise que l'actuelle
            if (data.data.address) {
              setFormData((prev) => {
                const currentAddress = prev.address || "";
                const inseeAddress = data.data.address;
                if (!currentAddress || (inseeAddress.length > currentAddress.length && inseeAddress.includes(data.data.city || ""))) {
                  return {
                    ...prev,
                    address: inseeAddress,
                    locationCity: data.data.city || prev.locationCity,
                  };
                }
                return prev;
              });
            }
          } else {
            // Erreur
            setSiretVerification({
              status: "error",
              errorMessage: data.error || "SIRET introuvable ou entreprise fermée. Veuillez vérifier les chiffres.",
            });
          }
        } catch (error) {
          setSiretVerification({
            status: "error",
            errorMessage: "Erreur lors de la vérification du SIRET",
          });
        }
      }, 500); // Délai de 500ms après la dernière frappe

      return () => clearTimeout(timeoutId);
    } else if (siret.length !== 14) {
      // Réinitialiser si on n'a plus 14 chiffres
      setSiretVerification({ status: "idle" });
    }
  }, [formData.siret, localIsVerified, queryClient]);

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: async (updatedData) => {
      // Mettre à jour immédiatement le cache avec les données retournées
      if (updatedData) {
        queryClient.setQueryData(["practitionerProfile"], updatedData);
      }
      // Refetch pour s'assurer que toutes les données sont à jour
      await queryClient.refetchQueries({ queryKey: ["practitionerProfile"], exact: true });
      onToast("Profil mis à jour avec succès !", "success");
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur lors de la mise à jour", "error");
    },
  });

  // Mutation silencieuse pour mettre à jour les coordonnées sans toast
  const updateCoordinates = useMutation({
    mutationFn: async (data: { address: string; locationCity: string; lat: number; lng: number }) => {
      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update coordinates");
      }
      return res.json();
    },
    onSuccess: async (updatedData) => {
      // Mettre à jour le cache silencieusement
      if (updatedData) {
        queryClient.setQueryData(["practitionerProfile"], updatedData);
      }
    },
    // Pas de toast pour cette mutation silencieuse
  });

  const handleAddressSelect = (addressData: {
    fullAddress: string;
    city: string;
    lat: number;
    lng: number;
  }) => {
    // Mettre à jour les champs localement
    setFormData({
      ...formData,
      address: addressData.fullAddress,
      locationCity: addressData.city,
    });

    // Mettre à jour les coordonnées en base de données de manière invisible (sans toast)
    updateCoordinates.mutate({
      address: addressData.fullAddress,
      locationCity: addressData.city,
      lat: addressData.lat,
      lng: addressData.lng,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mapper categoryId vers professionId pour l'API
    const dataToSend = {
      ...formData,
      professionId: formData.categoryId || null,
    };
    // Retirer categoryId pour éviter la confusion
    delete (dataToSend as any).categoryId;
    updateProfile.mutate(dataToSend);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-anthracite mb-6">Identité & Coordonnées</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            disabled={updateProfile.isPending}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            disabled={updateProfile.isPending}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="title">Titre professionnel *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          disabled={updateProfile.isPending}
          placeholder="Ex: Sophrologue certifiée"
        />
      </div>

      <div>
        <Label htmlFor="slogan">Mantra / Slogan</Label>
        <Input
          id="slogan"
          value={formData.slogan}
          onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
          disabled={updateProfile.isPending}
          placeholder="Ex: Votre bien-être, ma priorité"
        />
      </div>

      <div>
        <Label htmlFor="address">Adresse complète</Label>
        <AddressAutocomplete
          id="address"
          value={formData.address}
          onChange={(value) => setFormData({ ...formData, address: value })}
          onSelect={handleAddressSelect}
          disabled={updateProfile.isPending}
          placeholder="Rechercher une adresse (France, Belgique, Suisse, Luxembourg…)"
        />
      </div>

      <div>
        <Label htmlFor="locationCity">Ville *</Label>
        <Input
          id="locationCity"
          value={formData.locationCity}
          onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
          required
          disabled={updateProfile.isPending}
          placeholder="Ex: Pau"
        />
      </div>

      <div>
        <Label htmlFor="accessInfo">Infos d'accès</Label>
        <textarea
          id="accessInfo"
          value={formData.accessInfo}
          onChange={(e) => setFormData({ ...formData, accessInfo: e.target.value })}
          disabled={updateProfile.isPending}
          placeholder="Digicode, étage, ascenseur, accès PMR..."
          rows={3}
          className="flex min-h-[80px] w-full rounded-2xl border border-sable bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <Label htmlFor="transportInfo">Moyens de transport</Label>
        <textarea
          id="transportInfo"
          value={formData.transportInfo}
          onChange={(e) => setFormData({ ...formData, transportInfo: e.target.value })}
          disabled={updateProfile.isPending}
          placeholder="Métro/Bus à proximité..."
          rows={2}
          className="flex min-h-[60px] w-full rounded-2xl border border-sable bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <Label htmlFor="phone">Téléphone professionnel</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          disabled={updateProfile.isPending}
          placeholder="Ex: +33 6 12 34 56 78"
        />
      </div>

      <div>
        <Label htmlFor="website">Site internet</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          disabled={updateProfile.isPending}
          placeholder="https://example.com"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="instagramUrl">Instagram</Label>
          <Input
            id="instagramUrl"
            type="url"
            value={formData.instagramUrl}
            onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
            disabled={updateProfile.isPending}
            placeholder="https://instagram.com/..."
          />
        </div>
        <div>
          <Label htmlFor="linkedInUrl">LinkedIn</Label>
          <Input
            id="linkedInUrl"
            type="url"
            value={formData.linkedInUrl}
            onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
            disabled={updateProfile.isPending}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
      </div>

      <div>
        <Label htmlFor="profession">Profession</Label>
        <Combobox
          options={(professions ?? []).map((p) => ({ value: p.id, label: p.name }))}
          value={formData.categoryId || ""}
          onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
          placeholder="Sélectionner une profession"
          emptyText="Aucune profession trouvée"
          maxHeight="300px"
          className="w-full"
          buttonClassName="w-full rounded-2xl border border-sable h-10 px-3 py-2 min-h-0 text-left"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="siret">Numéro SIRET</Label>
          {localIsVerified && !isEditingSiret && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onConfirm(
                  "Modifier le SIRET",
                  "Attention, modifier votre SIRET annulera votre statut vérifié jusqu'à la prochaine validation.",
                  () => {
                    setIsEditingSiret(true);
                    setLocalIsVerified(false);
                    setSiretVerification({ status: "idle" });
                    lastVerifiedSiretRef.current = null;
                    // Mettre à jour le cache pour refléter le changement local
                    queryClient.setQueryData<PractitionerProfile>(["practitionerProfile"], (old) => {
                      if (!old) return old;
                      return {
                        ...old,
                        isVerified: false,
                      };
                    });
                  },
                  "destructive"
                );
              }}
            >
              Modifier mon SIRET
            </Button>
          )}
        </div>
        <div className="relative">
          <Input
            id="siret"
            type="text"
            value={formData.siret}
            onChange={(e) => {
              // Ne garder que les chiffres, max 14
              const value = e.target.value.replace(/\D/g, '').slice(0, 14);
              setFormData({ ...formData, siret: value });
              // Réinitialiser l'état de vérification si on modifie le SIRET
              if (value.length !== 14) {
                setSiretVerification({ status: "idle" });
                lastVerifiedSiretRef.current = null;
              }
            }}
            disabled={updateProfile.isPending || (localIsVerified && !isEditingSiret)}
            readOnly={localIsVerified && !isEditingSiret}
            placeholder="12345678901234"
            maxLength={14}
            className={
              localIsVerified && !isEditingSiret
                ? "bg-sable/30 cursor-not-allowed"
                : siretVerification.status === "error"
                ? "border-red-500"
                : siretVerification.status === "success"
                ? "border-green-500"
                : ""
            }
          />
          {siretVerification.status === "loading" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 text-sauge animate-spin" />
            </div>
          )}
          {localIsVerified && !isEditingSiret && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Verified className="h-4 w-4 text-green-600" />
            </div>
          )}
        </div>
        <p className="text-xs text-anthracite/60 mt-1">
          {localIsVerified && !isEditingSiret
            ? "SIRET vérifié et validé"
            : "14 chiffres (sans espaces ni caractères spéciaux)"}
        </p>
        
        {/* Carte de succès */}
        {siretVerification.status === "success" && siretVerification.officialName && (
          <Card className="mt-3 bg-green-50 border-green-200 rounded-3xl shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">
                    Entreprise reconnue : {siretVerification.officialName}
                  </p>
                  {profile.isVerified && (
                    <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                      <Verified className="h-3 w-3" />
                      Profil vérifié
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message d'erreur */}
        {siretVerification.status === "error" && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">
                {siretVerification.errorMessage || "SIRET introuvable ou entreprise fermée. Veuillez vérifier les chiffres."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-4 border-t border-sable">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasRCPInsurance"
            checked={formData.hasRCPInsurance}
            onChange={(e) => setFormData({ ...formData, hasRCPInsurance: e.target.checked })}
            disabled={updateProfile.isPending}
            className="rounded border-sable"
          />
          <Label htmlFor="hasRCPInsurance" className="font-normal cursor-pointer">
            Je certifie avoir une assurance Responsabilité Civile Professionnelle (RCP)
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="acceptNewPatients"
            checked={formData.acceptNewPatients}
            onChange={(e) => setFormData({ ...formData, acceptNewPatients: e.target.checked })}
            disabled={updateProfile.isPending}
            className="rounded border-sable"
          />
          <Label htmlFor="acceptNewPatients" className="font-normal cursor-pointer">
            J&apos;accepte les nouveaux patients
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" disabled={updateProfile.isPending || !formData.title || !formData.locationCity}>
          <Save className="h-4 w-4 mr-2" />
          {updateProfile.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
        {updateProfile.isPending && (
          <span className="text-sm text-anthracite/70">Enregistrement en cours...</span>
        )}
      </div>
    </form>
  );
}

function MediaTab({ profile, onToast }: { profile: PractitionerProfile; onToast: (message: string, type: ToastType) => void }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const compressImage = async (file: File, maxSize: number = 1024): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = Math.min(img.width, img.height, maxSize);
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Impossible de créer le contexte canvas"));
            return;
          }
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;
          ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Échec de la compression"));
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/webp",
            0.85
          );
        };
        img.onerror = () => reject(new Error("Erreur lors du chargement de l'image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File, type: "photo" | "cover" | "gallery") => {
    setUploading(type);
    setUploadError(null);
    const loadingToastId = Math.random().toString(36).substring(7);
    onToast("Upload en cours...", "loading");
    try {
      let compressedFile = file;
      if (type === "photo") {
        compressedFile = await compressImage(file, 1024);
      } else {
        compressedFile = await compressImage(file, 1920);
      }
      const form = new FormData();
      form.append("image", compressedFile);
      form.append("practitionerId", profile.id);
      if (type === "gallery") {
        form.append("type", "gallery");
      } else if (type === "cover") {
        form.append("type", "cover");
      }
      const res = await fetch("/api/uploads/practitioner", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.details || "Échec de l'upload");
      }
      const data = await res.json();
      if (data?.url) {
        // Mettre à jour la base de données
        if (type === "photo") {
          const updated = await updateProfile.mutateAsync({ photoUrl: data.url });
          // Mettre à jour le cache immédiatement avec les données retournées
          if (updated) {
            queryClient.setQueryData(["practitionerProfile"], updated);
          }
        } else if (type === "cover") {
          const updated = await updateProfile.mutateAsync({ coverPhotoUrl: data.url });
          if (updated) {
            queryClient.setQueryData(["practitionerProfile"], updated);
          }
        } else {
          const currentGallery = profile.gallery || [];
          const updated = await updateProfile.mutateAsync({ gallery: [...currentGallery, data.url] });
          if (updated) {
            queryClient.setQueryData(["practitionerProfile"], updated);
          }
        }
        
        // Refetch pour s'assurer que tout est synchronisé
        queryClient.invalidateQueries({ queryKey: ["practitionerProfile"], exact: true });
        
        onToast("Image uploadée avec succès !", "success");
      } else {
        throw new Error("URL de l'image non retournée");
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Erreur d'upload";
      setUploadError(errorMsg);
      onToast(errorMsg, "error");
    } finally {
      setUploading(null);
    }
  };

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      console.log("=== FRONTEND: updateProfile.mutate ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Data being sent to API:", JSON.stringify(data, null, 2));
      
      // Récupérer les données actuelles du cache pour comparaison
      const currentCache = queryClient.getQueryData(["practitionerProfile"]) as PractitionerProfile | undefined;
      if (currentCache) {
        console.log("Current cache values (key fields):", JSON.stringify({
          photoUrl: currentCache.photoUrl,
          website: currentCache.website,
          instagramUrl: currentCache.instagramUrl,
          linkedInUrl: currentCache.linkedInUrl,
          categoryId: currentCache.categoryId,
        }, null, 2));
      }
      
      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("API Error:", error);
        throw new Error(error.message || "Failed to update profile");
      }
      const updatedData = await res.json();
      
      console.log("API Response (key fields):", JSON.stringify({
        photoUrl: updatedData.photoUrl,
        website: updatedData.website,
        instagramUrl: updatedData.instagramUrl,
        linkedInUrl: updatedData.linkedInUrl,
        categoryId: updatedData.categoryId,
      }, null, 2));
      
      // Vérifier si des champs ont été perdus
      if (currentCache) {
        const lostFields: string[] = [];
        if (currentCache.photoUrl && !updatedData.photoUrl) lostFields.push("photoUrl");
        if (currentCache.website && !updatedData.website) lostFields.push("website");
        if (currentCache.instagramUrl && !updatedData.instagramUrl) lostFields.push("instagramUrl");
        if (currentCache.linkedInUrl && !updatedData.linkedInUrl) lostFields.push("linkedInUrl");
        if (currentCache.categoryId && !updatedData.categoryId) lostFields.push("categoryId");
        
        if (lostFields.length > 0) {
          console.error("⚠️ FRONTEND WARNING: Fields lost in API response:", lostFields.join(", "));
        } else {
          console.log("✓ All fields preserved in API response");
        }
      }
      
      // Mettre à jour immédiatement le cache avec les données retournées
      console.log("Updating cache with API response...");
      queryClient.setQueryData(["practitionerProfile"], updatedData);
      
      // Vérifier le cache après mise à jour
      const afterCache = queryClient.getQueryData(["practitionerProfile"]) as PractitionerProfile | undefined;
      if (afterCache) {
        console.log("Cache after update (key fields):", JSON.stringify({
          photoUrl: afterCache.photoUrl,
          website: afterCache.website,
          instagramUrl: afterCache.instagramUrl,
          linkedInUrl: afterCache.linkedInUrl,
          categoryId: afterCache.categoryId,
        }, null, 2));
      }
      
      console.log("=== END FRONTEND: updateProfile.mutate ===");
      return updatedData;
    },
    onSuccess: async () => {
      console.log("=== FRONTEND: updateProfile.onSuccess ===");
      console.log("Refetching queries...");
      // Refetch pour s'assurer que toutes les données sont à jour
      await queryClient.refetchQueries({ queryKey: ["practitionerProfile"], exact: true });
      
      // Vérifier le cache après refetch
      const afterRefetch = queryClient.getQueryData(["practitionerProfile"]) as PractitionerProfile | undefined;
      if (afterRefetch) {
        console.log("Cache after refetch (key fields):", JSON.stringify({
          photoUrl: afterRefetch.photoUrl,
          website: afterRefetch.website,
          instagramUrl: afterRefetch.instagramUrl,
          linkedInUrl: afterRefetch.linkedInUrl,
          categoryId: afterRefetch.categoryId,
        }, null, 2));
      }
      console.log("=== END FRONTEND: updateProfile.onSuccess ===");
    },
  });

  const removeGalleryImage = async (index: number) => {
    const currentGallery = profile.gallery || [];
    const newGallery = currentGallery.filter((_, i) => i !== index);
    await updateProfile.mutateAsync({ gallery: newGallery });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-anthracite mb-6">Médias & Galerie</h2>

      {/* Photo de profil */}
      <div>
        <Label>Photo de profil (1:1)</Label>
        <div className="mt-2 flex items-start gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-sauge bg-sable/20 flex items-center justify-center relative">
            {profile.photoUrl ? (
              <Image
                src={profile.photoUrl}
                alt="Photo de profil"
                fill
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <User className="h-12 w-12 text-anthracite/30" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              disabled={uploading === "photo"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "photo");
              }}
            />
            <p className="text-sm text-anthracite/60 mt-1">
              Image carrée, convertie en WebP et redimensionnée à 1024x1024px
            </p>
          </div>
        </div>
      </div>

      {/* Photo de couverture */}
      <div>
        <Label>Photo de couverture (bannière)</Label>
        <div className="mt-2">
          <div className="w-full h-48 rounded-2xl overflow-hidden border border-sable bg-sable/20 flex items-center justify-center relative">
            {profile.coverPhotoUrl ? (
              <Image
                src={profile.coverPhotoUrl}
                alt="Photo de couverture"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <ImageIcon className="h-12 w-12 text-anthracite/30" />
            )}
          </div>
          <div className="mt-2">
            <input
              type="file"
              accept="image/*"
              disabled={uploading === "cover"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "cover");
              }}
            />
            <p className="text-sm text-anthracite/60 mt-1">
              Image large, convertie en WebP et redimensionnée à 1920px de largeur max
            </p>
          </div>
        </div>
      </div>

      {/* Galerie Cabinet */}
      <div>
        <Label>Galerie Cabinet (max 8 photos)</Label>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          {(profile.gallery || []).slice(0, 8).map((url, index) => (
            <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-sable">
              <Image
                src={url}
                alt={`Photo ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeGalleryImage(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(profile.gallery || []).length < 8 && (
            <div className="aspect-square rounded-2xl border-2 border-dashed border-sable flex items-center justify-center">
              <label className="cursor-pointer flex flex-col items-center gap-2 p-4">
                <Upload className="h-8 w-8 text-anthracite/50" />
                <span className="text-sm text-anthracite/70">Ajouter</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading === "gallery"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "gallery");
                  }}
                />
              </label>
            </div>
          )}
        </div>
        {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
      </div>
    </div>
  );
}

function ExpertiseTab({ profile, onToast, onConfirm }: { profile: PractitionerProfile; onToast: (message: string, type: ToastType) => void; onConfirm: (title: string, message: string, onConfirm: () => void, variant?: "default" | "destructive") => void }) {
  const queryClient = useQueryClient();
  const [bio, setBio] = useState(profile.bio || "");
  const [treatmentKeywords, setTreatmentKeywords] = useState<string[]>(profile.treatmentKeywords || []);

  // Synchroniser bio et treatmentKeywords avec profile quand profile change (après un refetch)
  useEffect(() => {
    setBio(profile.bio || "");
    setTreatmentKeywords(profile.treatmentKeywords || []);
  }, [profile]);
  const [editingQualification, setEditingQualification] = useState<Qualification | null>(null);
  const [newQualification, setNewQualification] = useState({
    title: "",
    institution: "",
    discipline: "",
    obtainedYear: "",
    duration: "",
    description: "",
    skills: [] as string[],
  });
  const [keywordSearch, setKeywordSearch] = useState("");

  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      console.log("=== FRONTEND: ExpertiseTab updateProfile.mutate ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Data being sent to API:", JSON.stringify(data, null, 2));
      
      // Récupérer les données actuelles du cache pour comparaison
      const currentCache = queryClient.getQueryData(["practitionerProfile"]) as PractitionerProfile | undefined;
      if (currentCache) {
        console.log("Current cache values (key fields):", JSON.stringify({
          photoUrl: currentCache.photoUrl,
          website: currentCache.website,
          instagramUrl: currentCache.instagramUrl,
          linkedInUrl: currentCache.linkedInUrl,
          categoryId: currentCache.categoryId,
        }, null, 2));
      }
      
      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        console.error("API Error:", error);
        throw new Error(error.message || "Failed to update profile");
      }
      const updatedData = await res.json();
      
      console.log("API Response (key fields):", JSON.stringify({
        photoUrl: updatedData.photoUrl,
        website: updatedData.website,
        instagramUrl: updatedData.instagramUrl,
        linkedInUrl: updatedData.linkedInUrl,
        categoryId: updatedData.categoryId,
      }, null, 2));
      
      // Vérifier si des champs ont été perdus
      if (currentCache) {
        const lostFields: string[] = [];
        if (currentCache.photoUrl && !updatedData.photoUrl) lostFields.push("photoUrl");
        if (currentCache.website && !updatedData.website) lostFields.push("website");
        if (currentCache.instagramUrl && !updatedData.instagramUrl) lostFields.push("instagramUrl");
        if (currentCache.linkedInUrl && !updatedData.linkedInUrl) lostFields.push("linkedInUrl");
        if (currentCache.categoryId && !updatedData.categoryId) lostFields.push("categoryId");
        
        if (lostFields.length > 0) {
          console.error("⚠️ FRONTEND WARNING: Fields lost in API response:", lostFields.join(", "));
        } else {
          console.log("✓ All fields preserved in API response");
        }
      }
      
      console.log("=== END FRONTEND: ExpertiseTab updateProfile.mutate ===");
      return updatedData;
    },
    onSuccess: async (updatedData) => {
      console.log("=== FRONTEND: ExpertiseTab updateProfile.onSuccess ===");
      console.log("Updated data received:", updatedData ? "yes" : "no");
      
      // Mettre à jour immédiatement le cache avec les données retournées
      if (updatedData) {
        console.log("Updating cache with API response...");
        queryClient.setQueryData(["practitionerProfile"], updatedData);
      }
      
      // Vérifier le cache après mise à jour
      const afterCache = queryClient.getQueryData(["practitionerProfile"]) as PractitionerProfile | undefined;
      if (afterCache) {
        console.log("Cache after update (key fields):", JSON.stringify({
          photoUrl: afterCache.photoUrl,
          website: afterCache.website,
          instagramUrl: afterCache.instagramUrl,
          linkedInUrl: afterCache.linkedInUrl,
          categoryId: afterCache.categoryId,
        }, null, 2));
      }
      
      // Refetch pour s'assurer que toutes les données sont à jour
      console.log("Refetching queries...");
      await queryClient.refetchQueries({ queryKey: ["practitionerProfile"], exact: true });
      
      // Vérifier le cache après refetch
      const afterRefetch = queryClient.getQueryData(["practitionerProfile"]) as PractitionerProfile | undefined;
      if (afterRefetch) {
        console.log("Cache after refetch (key fields):", JSON.stringify({
          photoUrl: afterRefetch.photoUrl,
          website: afterRefetch.website,
          instagramUrl: afterRefetch.instagramUrl,
          linkedInUrl: afterRefetch.linkedInUrl,
          categoryId: afterRefetch.categoryId,
        }, null, 2));
      }
      
      console.log("=== END FRONTEND: ExpertiseTab updateProfile.onSuccess ===");
      onToast("Profil mis à jour avec succès !", "success");
    },
    onError: (error: Error) => {
      console.error("=== FRONTEND: ExpertiseTab updateProfile.onError ===");
      console.error("Error:", error.message);
      console.log("=== END FRONTEND: ExpertiseTab updateProfile.onError ===");
      onToast(error.message || "Erreur lors de la mise à jour", "error");
    },
  });

  const createQualification = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/practitioners/qualifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create qualification");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["practitionerProfile"], exact: true });
      setNewQualification({
        title: "",
        institution: "",
        discipline: "",
        obtainedYear: "",
        duration: "",
        description: "",
        skills: [],
      });
      onToast("Qualification ajoutée avec succès !", "success");
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur", "error");
    },
  });

  const updateQualification = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/practitioners/qualifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update qualification");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["practitionerProfile"], exact: true });
      setEditingQualification(null);
      onToast("Qualification mise à jour !", "success");
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur", "error");
    },
  });

  const deleteQualification = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/practitioners/qualifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete qualification");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["practitionerProfile"], exact: true });
      onToast("Qualification supprimée", "success");
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur", "error");
    },
  });

  const filteredKeywords = ALL_KEYWORDS.filter(
    (kw) => kw.toLowerCase().includes(keywordSearch.toLowerCase()) && !treatmentKeywords.includes(kw)
  );

  const handleSaveBio = () => {
    updateProfile.mutate(
      { bio },
      {
        onSuccess: () => {
          onToast("Bio enregistrée avec succès !", "success");
        },
        onError: (error: Error) => {
          onToast(error.message || "Erreur", "error");
        },
      }
    );
  };

  const handleSaveKeywords = () => {
    updateProfile.mutate(
      { treatmentKeywords },
      {
        onSuccess: () => {
          onToast("Mots-clés enregistrés avec succès !", "success");
        },
        onError: (error: Error) => {
          onToast(error.message || "Erreur", "error");
        },
      }
    );
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-anthracite mb-6">Parcours & Expertise</h2>

      {/* Bio */}
      <div className="w-full">
        <Label htmlFor="bio">À propos *</Label>
        <RichEditor
          key={`bio-${profile.updatedAt ?? ""}-${(profile.bio ?? "").length}`}
          value={bio}
          onChange={setBio}
          placeholder="Décrivez votre approche, vos spécialités, votre parcours..."
          className="mt-2 w-full"
        />
        <p className="text-sm text-anthracite/60 mt-1">Limite 5000 caractères (texte et mise en forme). Le HTML est nettoyé à l&apos;enregistrement.</p>
        <Button onClick={handleSaveBio} size="sm" className="mt-2" disabled={updateProfile.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer la bio
        </Button>
      </div>

      {/* Mots-clés */}
      <div>
        <Label>Mots-clés de traitement</Label>
        <div className="mt-2">
          <Input
            placeholder="Rechercher un mot-clé..."
            value={keywordSearch}
            onChange={(e) => setKeywordSearch(e.target.value)}
            className="mb-2"
          />
          {keywordSearch && filteredKeywords.length > 0 && (
            <div className="border border-sable rounded-2xl p-2 max-h-40 overflow-y-auto">
              {filteredKeywords.slice(0, 10).map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => {
                    setTreatmentKeywords([...treatmentKeywords, kw]);
                    setKeywordSearch("");
                  }}
                  className="block w-full text-left px-2 py-1 hover:bg-[#f7f7f7] rounded text-sm"
                >
                  {kw}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {treatmentKeywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-2 py-1 bg-sauge/10 text-sauge rounded-2xl text-sm"
            >
              {kw}
              <button
                type="button"
                onClick={() => setTreatmentKeywords(treatmentKeywords.filter((k) => k !== kw))}
                className="hover:bg-sauge/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <Button onClick={handleSaveKeywords} size="sm" className="mt-2" disabled={updateProfile.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer les mots-clés
        </Button>
      </div>

      {/* Qualifications */}
      <div className="pt-4 border-t border-sable">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-anthracite">
            Diplômes et Formations ({profile.qualifications.length})
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingQualification(null);
              setNewQualification({
                title: "",
                institution: "",
                discipline: "",
                obtainedYear: "",
                duration: "",
                description: "",
                skills: [],
              });
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {profile.qualifications.length > 0 && (
          <div className="space-y-3 mb-4">
            {profile.qualifications.map((qual) => (
              <div key={qual.id} className="p-4 border border-gray-100 rounded-3xl bg-white shadow-sm">
                {editingQualification?.id === qual.id ? (
                  <QualificationForm
                    qualification={editingQualification}
                    onSave={(data) => {
                      updateQualification.mutate({ id: qual.id, data });
                    }}
                    onCancel={() => setEditingQualification(null)}
                    practitionerId={profile.id}
                  />
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-anthracite">{qual.title}</h4>
                          {(qual.certificateUrl || qual.isVerified) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sauge/10 text-sauge rounded-full text-xs font-medium">
                              <Verified className="h-3 w-3" />
                              Diplôme vérifié
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-anthracite">{qual.institution}</p>
                        {(qual.discipline || qual.obtainedYear) && (
                          <p className="text-sm text-anthracite/70">
                            {[qual.discipline, qual.obtainedYear ? `Année : ${qual.obtainedYear}` : null].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        {qual.duration && (
                          <p className="text-sm text-anthracite/70">Durée : {qual.duration}</p>
                        )}
                        {qual.description && (
                          <p className="text-sm text-anthracite/80 leading-relaxed">{qual.description}</p>
                        )}
                        {qual.skills && qual.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {qual.skills.map((skill, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-sauge/10 text-sauge text-xs font-medium rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingQualification(qual)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onConfirm(
                              "Supprimer le diplôme",
                              "Êtes-vous sûr de vouloir supprimer ce diplôme ? Cette action est irréversible.",
                              () => deleteQualification.mutate(qual.id),
                              "destructive"
                            );
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!editingQualification && (
          <div className="p-4 border border-gray-100 rounded-3xl bg-gray-50 shadow-sm">
            <QualificationForm
              qualification={newQualification}
              onSave={(data) => {
                createQualification.mutate(data);
              }}
              onCancel={() => {}}
              practitionerId={profile.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function QualificationForm({
  qualification,
  onSave,
  onCancel,
  practitionerId,
}: {
  qualification: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  practitionerId: string;
}) {
  const [formData, setFormData] = useState({
    title: qualification.title || "",
    institution: qualification.institution || "",
    discipline: qualification.discipline || "",
    obtainedYear: qualification.obtainedYear || "",
    duration: qualification.duration || "",
    description: qualification.description || "",
    skills: qualification.skills || [] as string[],
    certificateUrl: qualification.certificateUrl || "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

  const handleCertificateUpload = async (file: File) => {
    if (!practitionerId) return;
    setUploadingCertificate(true);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("practitionerId", practitionerId);
      form.append("type", "certificate");
      
      const res = await fetch("/api/uploads/practitioner", {
        method: "POST",
        body: form,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || err?.details || "Échec de l'upload");
      }
      
      const data = await res.json();
      if (data?.url) {
        setFormData({ ...formData, certificateUrl: data.url });
      }
    } catch (error: any) {
      console.error("Error uploading certificate:", error);
    } finally {
      setUploadingCertificate(false);
    }
  };

  const handleSave = () => {
    if (formData.title && formData.institution) {
      onSave({
        title: formData.title,
        institution: formData.institution,
        discipline: formData.discipline || null,
        obtainedYear: formData.obtainedYear ? parseInt(formData.obtainedYear) : null,
        duration: formData.duration || null,
        description: formData.description || null,
        skills: formData.skills,
        certificateUrl: formData.certificateUrl || null,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Titre *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Praticienne en naturopathie"
          />
        </div>
        <div>
          <Label>Établissement *</Label>
          <Input
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            placeholder="Ex: ISUPNAT"
          />
        </div>
        <div>
          <Label>Discipline</Label>
          <Input
            value={formData.discipline}
            onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
            placeholder="Ex: Massothérapie"
          />
        </div>
        <div>
          <Label>Année d&apos;obtention</Label>
          <Input
            type="number"
            value={formData.obtainedYear}
            onChange={(e) => setFormData({ ...formData, obtainedYear: e.target.value })}
            placeholder="Ex: 2018"
            min="1900"
            max="2100"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Durée</Label>
          <Input
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            placeholder="Ex: 2 Années"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description de la formation/diplôme..."
            rows={3}
            className="flex min-h-[80px] w-full rounded-2xl border border-sable bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Compétences acquises</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && skillInput.trim()) {
                  setFormData({
                    ...formData,
                    skills: [...formData.skills, skillInput.trim()],
                  });
                  setSkillInput("");
                }
              }}
              placeholder="Appuyez sur Entrée pour ajouter"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (skillInput.trim()) {
                  setFormData({
                    ...formData,
                    skills: [...formData.skills, skillInput.trim()],
                  });
                  setSkillInput("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 bg-sauge/10 text-sauge rounded-2xl text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      skills: formData.skills.filter((_skill: string, i: number) => i !== idx),
                    });
                  }}
                  className="hover:bg-sauge/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Certificat / Diplôme (PDF ou Image)</Label>
          <div className="mt-2">
            {formData.certificateUrl ? (
              <div className="flex items-center gap-3 p-3 border border-sable rounded-2xl bg-white">
                <FileText className="h-5 w-5 text-sauge" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-anthracite">Document uploadé</p>
                  <a
                    href={formData.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sauge hover:underline"
                  >
                    Voir le document
                  </a>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, certificateUrl: "" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 text-anthracite/50 mb-2" />
                  <p className="text-sm text-anthracite/70">
                    <span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez
                  </p>
                  <p className="text-xs text-anthracite/50 mt-1">PDF, PNG, JPG (MAX. 10MB)</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={uploadingCertificate}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        alert("Le fichier est trop volumineux (max 10MB)");
                        return;
                      }
                      handleCertificateUpload(file);
                    }
                  }}
                />
              </label>
            )}
            {uploadingCertificate && (
              <p className="text-sm text-anthracite/60 mt-2">Upload en cours...</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={!formData.title || !formData.institution}>
          Enregistrer
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}

function ServicesTab({ profile, services, onToast, onConfirm }: { profile: PractitionerProfile; services: Service[]; onToast: (message: string, type: ToastType) => void; onConfirm: (title: string, message: string, onConfirm: () => void, variant?: "default" | "destructive") => void }) {
  const queryClient = useQueryClient();
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState<{
    name: string;
    durationMin: string;
    priceEuros: string;
    description: string;
    locationType: "PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID";
  }>({
    name: "",
    durationMin: "",
    priceEuros: "",
    description: "",
    locationType: "PRESENTIAL_ONLY",
  });
  const [paymentMethods, setPaymentMethods] = useState<string[]>(profile.paymentMethods || []);
  const [showForm, setShowForm] = useState(false);
  const isCreatingRef = useRef(false);

  // Sauvegarder les moyens de paiement
  const updatePaymentMethods = useMutation({
    mutationFn: async (methods: string[]) => {
      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethods: methods }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update payment methods");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerProfile"] });
      onToast("Moyens de paiement mis à jour !", "success");
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur", "error");
    },
  });

  const createService = useMutation({
    mutationFn: async (data: any) => {
      // Protection contre les doubles appels avec useRef
      if (isCreatingRef.current) {
        console.warn("Service creation already in progress, ignoring duplicate call");
        throw new Error("Service creation already in progress");
      }
      isCreatingRef.current = true;
      console.log("Creating service:", data);
      try {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, practitionerId: profile.id }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to create service");
        }
        const result = await res.json();
        console.log("Service created:", result);
        return result;
      } finally {
        isCreatingRef.current = false;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerServices"] });
      setNewService({ name: "", durationMin: "", priceEuros: "", description: "", locationType: "PRESENTIAL_ONLY" });
      setShowForm(false);
      onToast("Service créé avec succès !", "success");
    },
    onError: (error: Error) => {
      console.error("Error creating service:", error);
      isCreatingRef.current = false; // Réinitialiser en cas d'erreur
      onToast(error.message || "Erreur lors de la création", "error");
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerServices"] });
      setEditingService(null);
      onToast("Service mis à jour !", "success");
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur", "error");
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerServices"] });
      onToast("Service supprimé", "success");
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur", "error");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-anthracite">Services & Tarifs</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une prestation
        </Button>
      </div>

      {/* Moyens de paiement */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Label>Moyens de paiement acceptés</Label>
            <div className="flex flex-wrap gap-2">
              {["Espèces", "Chèque", "Carte Bancaire sur place"].map((method) => (
                <label
                  key={method}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes(method)}
                    onChange={(e) => {
                      const newMethods = e.target.checked
                        ? [...paymentMethods, method]
                        : paymentMethods.filter((m) => m !== method);
                      setPaymentMethods(newMethods);
                      updatePaymentMethods.mutate(newMethods);
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{method}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && !editingService && (
        <Card>
          <CardContent className="p-4">
            <ServiceForm
              service={newService}
              onChange={setNewService}
              onSave={(data) => {
                // Protection contre les doubles appels
                if (createService.isPending) {
                  console.warn("Service creation already in progress, ignoring duplicate call");
                  return;
                }
                createService.mutate(data);
              }}
              onCancel={() => setShowForm(false)}
              isSaving={createService.isPending}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardContent className="p-4">
              {editingService?.id === service.id ? (
                <ServiceForm
                  service={{
                    name: editingService.name,
                    durationMin: editingService.durationMin.toString(),
                    priceEuros: (editingService.priceCents / 100).toFixed(2),
                    description: editingService.description || "",
                    locationType: (editingService as any).locationType || "PRESENTIAL_ONLY",
                  }}
                  onChange={(data) => setEditingService({ ...editingService, ...data } as Service)}
                  onSave={(data) => {
                    // Protection contre les doubles appels
                    if (updateService.isPending) {
                      console.warn("Service update already in progress, ignoring duplicate call");
                      return;
                    }
                    updateService.mutate({ id: service.id, data });
                  }}
                  onCancel={() => setEditingService(null)}
                  isSaving={updateService.isPending}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-anthracite">{service.name}</h3>
                      {((service as any).locationType === "VIDEO_ONLY" || (service as any).locationType === "HYBRID") && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          (service as any).locationType === "VIDEO_ONLY" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {(service as any).locationType === "VIDEO_ONLY" ? "Visio uniquement" : "Visio possible"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-anthracite/70">
                      <span>{service.durationMin} min</span>
                      <span className="text-lg font-bold text-sauge">
                        {service.priceCents && !isNaN(service.priceCents) 
                          ? (service.priceCents / 100).toFixed(2) 
                          : "0.00"} €
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-sm text-anthracite/60 mt-2">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingService(service)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onConfirm(
                          "Supprimer le service",
                          "Êtes-vous sûr de vouloir supprimer ce service ? Cette action est irréversible.",
                          () => deleteService.mutate(service.id),
                          "destructive"
                        );
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ServiceForm({
  service,
  onChange,
  onSave,
  onCancel,
  isSaving = false,
}: {
  service: { name: string; durationMin: string; priceEuros: string; description: string; locationType?: "PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID" };
  onChange: (data: any) => void;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSaving?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Nom du service *</Label>
        <Input
          value={service.name}
          onChange={(e) => onChange({ ...service, name: e.target.value })}
          placeholder="Ex: Consultation initiale"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Durée (minutes) *</Label>
          <Input
            type="number"
            value={service.durationMin}
            onChange={(e) => onChange({ ...service, durationMin: e.target.value })}
            placeholder="60"
            min="15"
          />
        </div>
        <div>
          <Label>Prix (€) *</Label>
          <Input
            type="number"
            step="0.01"
            value={service.priceEuros}
            onChange={(e) => onChange({ ...service, priceEuros: e.target.value })}
            placeholder="50.00"
            min="0"
          />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <textarea
          value={service.description}
          onChange={(e) => onChange({ ...service, description: e.target.value })}
          placeholder="Description du service..."
          rows={3}
          className="flex min-h-[80px] w-full rounded-2xl border border-sable bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <Label>Type de séance *</Label>
        <select
          value={service.locationType || "PRESENTIAL_ONLY"}
          onChange={(e) => onChange({ ...service, locationType: e.target.value as "PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID" })}
          className="flex h-10 w-full rounded-2xl border border-sable bg-white px-3 py-2 text-sm mt-2"
        >
          <option value="PRESENTIAL_ONLY">En cabinet uniquement</option>
          <option value="VIDEO_ONLY">En visio uniquement</option>
          <option value="HYBRID">Cabinet ou Visio (au choix du client)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Protection contre les doubles clics
            if ((e.currentTarget as HTMLButtonElement).disabled) return;
            onSave({
              name: service.name,
              durationMin: parseInt(service.durationMin),
              priceCents: Math.round(parseFloat(service.priceEuros) * 100),
              description: service.description || null,
              locationType: service.locationType || "PRESENTIAL_ONLY",
            });
          }}
          disabled={isSaving || !service.name || !service.durationMin || !service.priceEuros || isNaN(parseFloat(service.priceEuros))}
        >
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}

function HoursTab({ workingHours, onToast, onConfirm }: { workingHours: WorkingHours[]; onToast: (message: string, type: ToastType) => void; onConfirm: (title: string, message: string, onConfirm: () => void, variant?: "default" | "destructive") => void }) {
  const queryClient = useQueryClient();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [timeRangesByDay, setTimeRangesByDay] = useState<Record<number, Array<{ start: string; end: string }>>>({});

  const dayNames = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const saveWorkingHours = useMutation({
    mutationFn: async (data: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }) => {
      const res = await fetch("/api/practitioners/working-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || error.error || "Failed to save working hours");
      }
      return res.json();
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur", "error");
    },
  });

  const deleteWorkingHours = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/practitioners/working-hours/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete working hours");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workingHours"] });
      onToast("Horaire supprimé", "success");
    },
    onError: (error: Error) => {
      onToast(error.message || "Erreur", "error");
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-anthracite mb-6">Horaires & Dispos</h2>
      <p className="text-sm text-anthracite/60 mb-4">
        Définissez vos horaires de travail pour chaque jour de la semaine. Vous pouvez ajouter plusieurs plages horaires par jour.
      </p>
      <div className="space-y-4">
        {dayNames.slice(1).map((dayName, dayIndex) => {
          const dayOfWeek = dayIndex + 1;
          const existingHoursForDay = workingHours
            .filter((wh) => wh.dayOfWeek === dayOfWeek && wh.isActive)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isEditing = editingDay === dayOfWeek;
          const newTimeRanges =
            timeRangesByDay[dayOfWeek] ||
            (existingHoursForDay.length > 0
              ? existingHoursForDay.map((wh) => ({ start: wh.startTime, end: wh.endTime }))
              : [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }]);

          const setNewTimeRanges = (ranges: Array<{ start: string; end: string }>) => {
            setTimeRangesByDay({ ...timeRangesByDay, [dayOfWeek]: ranges });
          };

          return (
            <div key={dayOfWeek} className="p-4 border border-gray-100 rounded-3xl bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-24 font-medium text-anthracite">{dayName}</div>
                {!isEditing && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingDay(dayOfWeek);
                      const ranges =
                        existingHoursForDay.length > 0
                          ? existingHoursForDay.map((wh) => ({ start: wh.startTime, end: wh.endTime }))
                          : [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }];
                      setTimeRangesByDay({ ...timeRangesByDay, [dayOfWeek]: ranges });
                    }}
                  >
                    {existingHoursForDay.length > 0 ? (
                      <>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Modifier
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter
                      </>
                    )}
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  {newTimeRanges.map((range, rangeIndex) => (
                    <div key={rangeIndex} className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label>De</Label>
                        <Input
                          type="time"
                          value={range.start}
                          onChange={(e) => {
                            const updated = [...newTimeRanges];
                            updated[rangeIndex].start = e.target.value;
                            setNewTimeRanges(updated);
                          }}
                          className="w-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>À</Label>
                        <Input
                          type="time"
                          value={range.end}
                          onChange={(e) => {
                            const updated = [...newTimeRanges];
                            updated[rangeIndex].end = e.target.value;
                            setNewTimeRanges(updated);
                          }}
                          className="w-full"
                        />
                      </div>
                      {newTimeRanges.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewTimeRanges(newTimeRanges.filter((_, i) => i !== rangeIndex));
                          }}
                          className="mt-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewTimeRanges([...newTimeRanges, { start: "09:00", end: "12:00" }]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une plage
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Supprimer les anciennes plages horaires
                          for (const existing of existingHoursForDay) {
                            if (existing.id) {
                              await deleteWorkingHours.mutateAsync(existing.id);
                            }
                          }
                          // Créer les nouvelles plages horaires
                          for (const range of newTimeRanges) {
                            if (range.start && range.end && range.start < range.end) {
                              await saveWorkingHours.mutateAsync({
                                dayOfWeek,
                                startTime: range.start,
                                endTime: range.end,
                                isActive: true,
                              });
                            }
                          }
                          // Invalider les queries et afficher le message une seule fois
                          queryClient.invalidateQueries({ queryKey: ["workingHours"] });
                          setEditingDay(null);
                          onToast("Horaires enregistrés !", "success");
                        } catch (error) {
                          onToast(error instanceof Error ? error.message : "Erreur lors de l'enregistrement", "error");
                        }
                      }}
                      disabled={saveWorkingHours.isPending || deleteWorkingHours.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingDay(null);
                        const updated = { ...timeRangesByDay };
                        delete updated[dayOfWeek];
                        setTimeRangesByDay(updated);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {existingHoursForDay.length > 0 ? (
                    existingHoursForDay.map((wh) => (
                      <div key={wh.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-3xl">
                        <span className="text-anthracite">
                          {wh.startTime} - {wh.endTime}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onConfirm(
                              "Supprimer la plage horaire",
                              "Êtes-vous sûr de vouloir supprimer cette plage horaire ?",
                              () => deleteWorkingHours.mutate(wh.id),
                              "destructive"
                            );
                          }}
                          disabled={deleteWorkingHours.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-anthracite/50 italic text-sm">Aucun horaire défini</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
