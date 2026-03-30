"use client";

export const dynamic = 'force-dynamic';

import { useRef } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { User, Mail, Phone, Save, Calendar, UserCircle, Camera, BadgeCheck } from "lucide-react";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/toast";

// Schéma de validation Zod
const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis").max(50, "Le prénom est trop long"),
  lastName: z.string().min(1, "Le nom est requis").max(50, "Le nom est trop long"),
  email: z.string().email("Email invalide"),
  phone: z.string()
    .min(1, "Le téléphone est requis")
    .regex(/^(\+33|0)[1-9](\d{2}){4}$/, "Format de téléphone invalide (ex: 0612345678)"),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z
    .union([z.enum(["MALE", "FEMALE", "OTHER", "NONE"]), z.literal("")])
    .transform((v) => (v === "" ? "NONE" : v))
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type ProfileFormValues = z.input<typeof profileSchema>;

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  hasHonoredAppointment?: boolean;
  practitioner?: {
    id: string;
    title: string;
  } | null;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toasts, success, error, removeToast } = useToast();

  // Extraire prénom et nom du champ name
  const parseName = (name: string | null): { firstName: string; lastName: string } => {
    if (!name) return { firstName: "", lastName: "" };
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  };

  // Format date pour input type="date" (YYYY-MM-DD)
  const formatDateForInput = (date: string | null | undefined): string => {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!session,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "NONE",
    },
  });

  // Initialiser le formulaire avec les données du profil
  useEffect(() => {
    if (profile) {
      const { firstName, lastName } = parseName(profile.name);
      reset({
        firstName,
        lastName,
        email: profile.email || "",
        phone: profile.phone || "",
        dateOfBirth: formatDateForInput(profile.dateOfBirth),
        gender: (profile.gender as "MALE" | "FEMALE" | "OTHER" | "NONE") || "NONE",
      });
    }
  }, [profile, reset]);

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender === "NONE" ? null : data.gender || null,
      }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      await update({
        ...data,
        user: {
          ...data?.user,
          name: data.name,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      success("Profil mis à jour avec succès !");
    },
    onError: (err: Error) => {
      error(err.message || "Erreur lors de la mise à jour du profil");
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/uploads/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Échec de l'upload");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      await update({ user: { ...session?.user, image: data.url } });
      success("Photo de profil mise à jour !");
    },
    onError: (err: Error) => {
      error(err.message || "Erreur lors de l'upload");
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
    e.target.value = "";
  };

  const avatarUrl = profile?.image
    ? profile.image.startsWith("http")
      ? profile.image
      : profile.image
    : null;

  // Redirection si non connecté (attendre la fin du chargement de la session)
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user && typeof window !== "undefined") {
      router.push("/connexion");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <Skeleton className="h-64 w-full rounded-3xl" />;
  }
  if (!session?.user) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
          Mon profil
        </h1>
        <p className="text-anthracite/70">
          Gérez vos informations personnelles
        </p>
      </div>

      <Card className="bg-white rounded-3xl border border-[#f1f5f1]">
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Zone avatar - rond 100px */}
            <div className="flex items-center gap-4">
              <label
                htmlFor="avatar-upload"
                className="relative w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-gray-100 cursor-pointer hover:border-[#9bb49b] transition-colors flex-shrink-0 group"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Photo de profil"
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <UserCircle className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                  <Camera className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </label>
              <input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploadAvatar.isPending}
              />
              <div>
                <p className="font-medium text-anthracite">Photo de profil</p>
                <p className="text-sm text-anthracite/60 mt-0.5">
                  Cliquez pour modifier (JPG, PNG, WebP — max 5 Mo)
                </p>
                {uploadAvatar.isPending && (
                  <p className="text-sm text-[#9bb49b] mt-1">Upload en cours...</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Votre prénom"
                    className={`pl-10 ${errors.firstName ? "border-red-500" : ""}`}
                    disabled={updateProfile.isPending}
                    {...register("firstName")}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Votre nom"
                    className={`pl-10 ${errors.lastName ? "border-red-500" : ""}`}
                    disabled={updateProfile.isPending}
                    {...register("lastName")}
                  />
                </div>
                {errors.lastName && (
                  <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="pl-10 bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                L&apos;email ne peut pas être modifié
              </p>
            </div>

            <div>
              <Label htmlFor="phone">Téléphone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0612345678"
                  className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                  disabled={updateProfile.isPending}
                  {...register("phone", {
                    onChange: (e) => {
                      // Formatage automatique du numéro
                      const value = e.target.value.replace(/\s/g, "");
                      setValue("phone", value, { shouldValidate: true });
                    },
                  })}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Indispensable pour les rappels SMS futurs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date de naissance</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    className={`pl-10 ${errors.dateOfBirth ? "border-red-500" : ""}`}
                    disabled={updateProfile.isPending}
                    max={new Date().toISOString().split("T")[0]} // Pas de date future
                    {...register("dateOfBirth")}
                  />
                </div>
                {errors.dateOfBirth && (
                  <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Optionnel - Pour personnaliser votre expérience
                </p>
              </div>

              <div>
                <Label htmlFor="gender">Genre</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <Select
                    value={watch("gender") || "NONE"}
                    onValueChange={(value) => setValue("gender", value as "MALE" | "FEMALE" | "OTHER" | "NONE", { shouldValidate: true })}
                    disabled={updateProfile.isPending}
                  >
                    <SelectTrigger className={`pl-10 ${errors.gender ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Sélectionner un genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Non renseigné</SelectItem>
                      <SelectItem value="MALE">Homme</SelectItem>
                      <SelectItem value="FEMALE">Femme</SelectItem>
                      <SelectItem value="OTHER">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.gender && (
                  <p className="text-xs text-red-500 mt-1">{errors.gender.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Optionnel - Pour compléter votre profil santé
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={updateProfile.isPending || !isValid || !isDirty}
                className="flex items-center gap-2 bg-[#9bb49b] hover:bg-[#8aa48a] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {updateProfile.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (profile) {
                    const { firstName, lastName } = parseName(profile.name);
                    reset({
                      firstName,
                      lastName,
                      email: profile.email || "",
                      phone: profile.phone || "",
                      dateOfBirth: formatDateForInput(profile.dateOfBirth),
                      gender: (profile.gender as "MALE" | "FEMALE" | "OTHER" | "NONE") || "NONE",
                    });
                  }
                }}
                disabled={updateProfile.isPending || !isDirty}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {profile?.practitioner && (
        <Card className="mt-6 bg-white rounded-3xl border border-[#f1f5f1]">
          <CardHeader>
            <CardTitle>Profil praticien</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-anthracite/70 mb-4">
              Vous avez un profil praticien associé à ce compte.
            </p>
            <Button asChild variant="outline">
              <a href="/pro/profile">Gérer mon profil praticien</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Infos de fidélité */}
      <Card className="mt-6 bg-white rounded-3xl border border-[#f1f5f1]">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#9bb49b]" />
              <span className="text-anthracite/70">
                Membre depuis :{" "}
                <strong className="text-anthracite">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </strong>
              </span>
            </div>
            {profile?.hasHonoredAppointment && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#9bb49b]/10 text-[#9bb49b]">
                <BadgeCheck className="h-4 w-4" />
                <span className="text-sm font-medium">Patient vérifié</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
