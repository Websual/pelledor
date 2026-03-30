"use client";

export const dynamic = 'force-dynamic';

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Skeleton, Switch } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Lock, Bell, Trash2, Eye, EyeOff, Mail } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/toast";

// Schéma de validation pour le changement de mot de passe
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof changePasswordSchema>;

export default function AccountSettingsPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toasts, success, error, removeToast } = useToast();

  // État pour le mot de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // État pour les préférences de notifications
  const [emailReminders, setEmailReminders] = useState(true);
  const [emailOffers, setEmailOffers] = useState(true);

  // État pour la suppression de compte
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Récupérer les préférences
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const res = await fetch("/api/user/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!session,
  });

  useEffect(() => {
    if (settings) {
      setEmailReminders(settings.emailReminders ?? true);
      setEmailOffers(settings.emailOffers ?? true);
    }
  }, [settings]);

  // Mutation pour changer le mot de passe
  const changePassword = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const validationResult = changePasswordSchema.safeParse(data);
      if (!validationResult.success) {
        const errors: Record<string, string> = {};
        validationResult.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        throw new Error(JSON.stringify(errors));
      }

      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      success("Mot de passe modifié avec succès !");
    },
    onError: (err: Error) => {
      try {
        const errors = JSON.parse(err.message);
        setPasswordErrors(errors);
        error("Veuillez corriger les erreurs dans le formulaire");
      } catch {
        error(err.message || "Erreur lors du changement de mot de passe");
      }
    },
  });

  // Mutation pour mettre à jour les préférences de notifications
  const updateNotificationPreferences = useMutation({
    mutationFn: async (preferences: { emailReminders: boolean; emailOffers: boolean }) => {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update preferences");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      success("Préférences de notifications mises à jour !");
    },
    onError: (err: Error) => {
      error(err.message || "Erreur lors de la mise à jour des préférences");
    },
  });

  // Mutation pour supprimer le compte
  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (deleteConfirmText !== "SUPPRIMER") {
        throw new Error("Vous devez taper 'SUPPRIMER' pour confirmer");
      }

      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmEmail: deleteConfirmEmail,
          confirmText: deleteConfirmText,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => {
      success("Compte supprimé avec succès");
      // Déconnexion et redirection
      setTimeout(() => {
        router.push("/");
        window.location.reload();
      }, 2000);
    },
    onError: (err: Error) => {
      error(err.message || "Erreur lors de la suppression du compte");
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    changePassword.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  const handleNotificationToggle = (type: "reminders" | "offers", value: boolean) => {
    if (type === "reminders") {
      setEmailReminders(value);
    } else {
      setEmailOffers(value);
    }
    updateNotificationPreferences.mutate({
      emailReminders: type === "reminders" ? value : emailReminders,
      emailOffers: type === "offers" ? value : emailOffers,
    });
  };

  if (!session) {
    return <PageSkeleton />;
  }

  if (session.status === 'loading' || isLoadingSettings) return <Skeleton className="h-64" />

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
          Paramètres
        </h1>
        <p className="text-anthracite/70">
          Gérez vos préférences de compte
        </p>
      </div>

      {/* Gestion du mot de passe */}
      <Card className="bg-white rounded-3xl border border-[#f1f5f1] mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordErrors.currentPassword) {
                      setPasswordErrors((prev) => ({ ...prev, currentPassword: "" }));
                    }
                  }}
                  className={passwordErrors.currentPassword ? "border-red-500 pr-10" : "pr-10"}
                  disabled={changePassword.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordErrors.newPassword) {
                      setPasswordErrors((prev) => ({ ...prev, newPassword: "" }));
                    }
                  }}
                  className={passwordErrors.newPassword ? "border-red-500 pr-10" : "pr-10"}
                  disabled={changePassword.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Au moins 8 caractères, une majuscule, une minuscule et un chiffre
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordErrors.confirmPassword) {
                      setPasswordErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  className={passwordErrors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                  disabled={changePassword.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={changePassword.isPending}
              className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
            >
              {changePassword.isPending ? "Modification..." : "Modifier le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Préférences de notifications */}
      <Card className="bg-white rounded-3xl border border-[#f1f5f1] mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Préférences de notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="emailReminders" className="text-base font-medium">
                Recevoir les rappels par email
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Recevez des rappels par email avant vos rendez-vous
              </p>
            </div>
            <Switch
              id="emailReminders"
              checked={emailReminders}
              onCheckedChange={(checked) => handleNotificationToggle("reminders", checked)}
              disabled={updateNotificationPreferences.isPending}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="emailOffers" className="text-base font-medium">
                Recevoir les offres des praticiens favoris
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Recevez des offres et promotions de vos praticiens favoris
              </p>
            </div>
            <Switch
              id="emailOffers"
              checked={emailOffers}
              onCheckedChange={(checked) => handleNotificationToggle("offers", checked)}
              disabled={updateNotificationPreferences.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppression de compte */}
      <Card className="bg-white rounded-3xl border border-red-200 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Zone de danger
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <div>
              <p className="text-sm text-gray-700 mb-4">
                La suppression de votre compte est définitive. Toutes vos données seront supprimées et cette action ne peut pas être annulée.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer mon compte
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-600 mb-4">
                Cette action est irréversible. Veuillez confirmer pour supprimer votre compte.
              </p>

              <div>
                <Label htmlFor="deleteConfirmEmail">
                  Tapez votre email pour confirmer: <span className="font-mono text-sm">{data?.user?.email}</span>
                </Label>
                <Input
                  id="deleteConfirmEmail"
                  type="email"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder="Votre email"
                  className="mt-2"
                  disabled={deleteAccount.isPending}
                />
              </div>

              <div>
                <Label htmlFor="deleteConfirmText">
                  Tapez &quot;SUPPRIMER&quot; pour confirmer:
                </Label>
                <Input
                  id="deleteConfirmText"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="SUPPRIMER"
                  className="mt-2 font-mono"
                  disabled={deleteAccount.isPending}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmEmail("");
                    setDeleteConfirmText("");
                  }}
                  variant="outline"
                  disabled={deleteAccount.isPending}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => deleteAccount.mutate()}
                  disabled={
                    deleteAccount.isPending ||
                    deleteConfirmEmail !== data?.user?.email ||
                    deleteConfirmText !== "SUPPRIMER"
                  }
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteAccount.isPending ? "Suppression..." : "Supprimer définitivement"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
