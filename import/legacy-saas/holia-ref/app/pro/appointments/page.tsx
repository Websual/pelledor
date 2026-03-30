"use client";

import { Card, CardContent, Button, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertCircle,
  Settings,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { format, isPast, isToday, isFuture } from "date-fns";
import { fr } from "date-fns/locale";
import { ChatDrawer } from "@/components/chat-drawer";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ToastContainer, ToastType } from "@/components/toast";

interface Appointment {
  id: string;
  starts_at: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "DONE";
  services: {
    id: string;
    name: string;
    duration_min: number;
    price_cents: number;
  };
  users: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

type TabType = "upcoming" | "pending" | "completed" | "canceled";

export default function PractitionerAppointmentsPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [chatDrawerOpen, setChatDrawerOpen] = useState<string | null>(null);
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
  });
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch practitioner profile for auto-accept setting
  const { data: profile } = useQuery<{ autoAcceptAppointments: boolean }>({
    queryKey: ["practitionerProfile"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  // S'assurer que la valeur est bien booléenne (pas null/undefined)
  const autoAcceptEnabled = profile?.autoAcceptAppointments === true;

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["practitionerAppointments"],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  // Toggle auto-accept
  const updateAutoAccept = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch("/api/practitioners/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoAcceptAppointments: enabled }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || error.message || error.error || "Failed to update setting");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Mettre à jour le cache avec les données complètes retournées par l'API
      queryClient.setQueryData(["practitionerProfile"], data);
      addToast(
        data.autoAcceptAppointments
          ? "L'acceptation automatique est activée. Vous recevrez une notification pour chaque nouveau RDV."
          : "L'acceptation automatique est désactivée.",
        "success"
      );
    },
    onError: (error: Error) => {
      // En cas d'erreur, recharger depuis le serveur pour avoir l'état réel
      queryClient.invalidateQueries({ queryKey: ["practitionerProfile"] });
      addToast(error.message || "Erreur lors de la mise à jour", "error");
    },
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "PENDING" | "CONFIRMED" | "CANCELED" | "DONE";
    }) => {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update appointment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["practitionerDashboard"] });
    },
  });

  // Process appointments: mark confirmed past appointments as completed for display
  const processedAppointments = useMemo(() => {
    if (!appointments) return [];
    const now = new Date();
    return appointments.map((apt) => {
      const startDate = new Date(apt.starts_at);
      // If confirmed and past, treat as completed for display (but keep status in DB)
      if (apt.status === "CONFIRMED" && isPast(startDate) && !isToday(startDate)) {
        return { ...apt, _displayStatus: "DONE" as const };
      }
      return { ...apt, _displayStatus: apt.status };
    });
  }, [appointments]);

  // Categorize appointments
  const categorized = useMemo(() => {
    const now = new Date();
    return {
      pending: processedAppointments.filter((apt) => apt.status === "PENDING"),
      upcoming: processedAppointments.filter(
        (apt) =>
          apt.status === "CONFIRMED" &&
          (isFuture(new Date(apt.starts_at)) || isToday(new Date(apt.starts_at)))
      ),
      completed: processedAppointments.filter(
        (apt) => apt.status === "DONE" || apt._displayStatus === "DONE"
      ),
      canceled: processedAppointments.filter((apt) => apt.status === "CANCELED"),
    };
  }, [processedAppointments]);

  // Get appointments for active tab
  const displayedAppointments = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return categorized.pending;
      case "upcoming":
        return categorized.upcoming;
      case "completed":
        return categorized.completed;
      case "canceled":
        return categorized.canceled;
      default:
        return [];
    }
  }, [activeTab, categorized]);

  // Get selected appointment for chat
  const selectedAppointment = useMemo(() => {
    if (!chatDrawerOpen) return null;
    return processedAppointments.find((apt) => apt.id === chatDrawerOpen);
  }, [chatDrawerOpen, processedAppointments]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: "default" | "destructive" = "default"
  ) => {
    setConfirmDialog({ open: true, title, message, onConfirm, variant });
  };

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  const getStatusColor = (status: Appointment["status"] | "DONE") => {
    switch (status) {
      case "PENDING":
        return "bg-orange-500";
      case "CONFIRMED":
        return "bg-[#9bb49b]";
      case "DONE":
        return "bg-gray-400";
      case "CANCELED":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusBadge = (status: Appointment["status"] | "DONE") => {
    switch (status) {
      case "PENDING":
        return { label: "En attente", color: "bg-orange-100 text-orange-700" };
      case "CONFIRMED":
        return { label: "Confirmé", color: "bg-green-100 text-green-700" };
      case "DONE":
        return { label: "Terminé", color: "bg-gray-100 text-gray-700" };
      case "CANCELED":
        return { label: "Annulé", color: "bg-red-100 text-red-700" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-700" };
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (session.status === 'loading') return <Skeleton />

  return (
    <main className="min-h-screen bg-[#f8f8f8]">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
              Mes rendez-vous
            </h1>
            {categorized.pending.length > 0 && (
              <p className="text-sm text-anthracite/70">
              {categorized.pending.length} rendez-vous en attente de validation
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-anthracite/70">Acceptation automatique</span>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="text-anthracite/40 hover:text-anthracite/60 transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
                {showTooltip && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white border border-gray-200 rounded-2xl shadow-lg z-50">
                    <p className="text-xs text-anthracite/80">
                      Si désactivé, vous avez 24h pour valider le RDV. En cas de refus, le patient est remboursé (frais de transaction Stripe à votre charge).
                    </p>
                  </div>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAcceptEnabled}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    updateAutoAccept.mutate(newValue);
                  }}
                  disabled={updateAutoAccept.isPending || profile === undefined}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                  autoAcceptEnabled ? 'bg-sauge' : 'bg-gray-200'
                } ${updateAutoAccept.isPending || profile === undefined ? 'opacity-50 cursor-not-allowed' : 'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sauge'}`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-100">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === "upcoming"
                ? "text-anthracite border-b-2 border-[#9bb49b]"
                : "text-anthracite/60 hover:text-anthracite"
            }`}
          >
            À venir
            {categorized.upcoming.length > 0 && (
              <span className="ml-2 text-xs">({categorized.upcoming.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === "pending"
                ? "text-anthracite border-b-2 border-orange-500"
                : "text-anthracite/60 hover:text-anthracite"
            }`}
          >
            En attente
            {categorized.pending.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {categorized.pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === "completed"
                ? "text-anthracite border-b-2 border-gray-400"
                : "text-anthracite/60 hover:text-anthracite"
            }`}
          >
            Terminés
            {categorized.completed.length > 0 && (
              <span className="ml-2 text-xs">({categorized.completed.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("canceled")}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === "canceled"
                ? "text-anthracite border-b-2 border-red-500"
                : "text-anthracite/60 hover:text-anthracite"
            }`}
          >
            Annulés
            {categorized.canceled.length > 0 && (
              <span className="ml-2 text-xs">({categorized.canceled.length})</span>
            )}
          </button>
        </div>

        {/* Appointments List */}
        {displayedAppointments.length > 0 ? (
          <div className="space-y-4">
            {displayedAppointments.map((appointment) => {
              const startDate = new Date(appointment.starts_at);
              const isPastAppointment = isPast(startDate) && !isToday(startDate);
              const displayStatus = appointment._displayStatus || appointment.status;
              const statusBadge = getStatusBadge(displayStatus);
              const needsCompletionConfirmation =
                appointment.status === "CONFIRMED" && isPastAppointment;

              return (
                <Card
                  key={appointment.id}
                  className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex">
                    {/* Colored border indicator */}
                    <div
                      className={`w-1 ${getStatusColor(displayStatus)}`}
                    />

                    <CardContent className="flex-1 p-6">
                      <div className="flex items-start justify-between">
                        {/* Left: Time and Patient Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div>
                              <div className="text-2xl font-bold text-anthracite">
                                {format(startDate, "HH:mm")}
                              </div>
                              <div className="text-xs text-anthracite/60">
                                {format(startDate, "EEEE d MMMM", { locale: fr })}
                              </div>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-[#9bb49b]/20 flex items-center justify-center">
                              <User className="h-6 w-6 text-[#9bb49b]" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-anthracite">
                                {appointment.users.name || appointment.users.email || "Client"}
                              </div>
                              <div className="text-sm text-anthracite/70">
                                {appointment.services.name}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-anthracite/60">
                                <span>{appointment.services.duration_min} min</span>
                                <span>•</span>
                                <span>{(appointment.services.price_cents / 100).toFixed(2)} €</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2 mt-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                            >
                              {statusBadge.label}
                            </span>
                            {needsCompletionConfirmation && (
                              <span className="text-xs text-orange-600 italic">
                                (À confirmer)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {appointment.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setChatDrawerOpen(appointment.id)}
                                className="hover:bg-gray-50"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  showConfirm(
                                    "Refuser le rendez-vous",
                                    "Êtes-vous sûr de vouloir refuser ce rendez-vous ?",
                                    () =>
                                      updateAppointmentStatus.mutate({
                                        id: appointment.id,
                                        status: "CANCELED",
                                      }),
                                    "destructive"
                                  )
                                }
                                className="text-red-600 hover:bg-red-50 border-red-200"
                              >
                                Refuser
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateAppointmentStatus.mutate({
                                    id: appointment.id,
                                    status: "CONFIRMED",
                                  })
                                }
                                disabled={updateAppointmentStatus.isPending}
                                className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                              >
                                Accepter
                              </Button>
                            </>
                          )}

                          {appointment.status === "CONFIRMED" && !isPastAppointment && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setChatDrawerOpen(appointment.id)}
                                className="hover:bg-gray-50"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <Link href={`/pro/appointments/${appointment.id}`}>
                                  Voir détails
                                </Link>
                              </Button>
                            </>
                          )}

                          {needsCompletionConfirmation && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  showConfirm(
                                    "Le patient s'est présenté ?",
                                    "Confirmez que le rendez-vous s'est bien déroulé.",
                                    () =>
                                      updateAppointmentStatus.mutate({
                                        id: appointment.id,
                                        status: "DONE",
                                      })
                                  )
                                }
                                className="text-green-600 hover:bg-green-50 border-green-200"
                              >
                                Oui, clôturer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  showConfirm(
                                    "Déclarer une absence",
                                    "Le patient ne s'est pas présenté. Le rendez-vous sera marqué comme annulé.",
                                    () =>
                                      updateAppointmentStatus.mutate({
                                        id: appointment.id,
                                        status: "CANCELED",
                                      }),
                                    "destructive"
                                  )
                                }
                                className="text-red-600 hover:bg-red-50 border-red-200"
                              >
                                Absence
                              </Button>
                            </>
                          )}

                          {appointment.status === "DONE" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  showConfirm(
                                    "Marquer comme annulé",
                                    "Êtes-vous sûr de vouloir changer ce rendez-vous terminé en annulé ?",
                                    () =>
                                      updateAppointmentStatus.mutate({
                                        id: appointment.id,
                                        status: "CANCELED",
                                      }),
                                    "destructive"
                                  )
                                }
                                className="text-red-600 hover:bg-red-50 border-red-200"
                              >
                                Marquer annulé
                              </Button>
                            </>
                          )}

                          {appointment.status === "CANCELED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                            >
                              <Link href={`/pro/appointments/${appointment.id}`}>
                                Voir détails
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
            <CardContent className="py-12">
              <p className="text-center text-anthracite/70">
                {activeTab === "pending" && "Aucun rendez-vous en attente"}
                {activeTab === "upcoming" && "Aucun rendez-vous à venir"}
                {activeTab === "completed" && "Aucun rendez-vous terminé"}
                {activeTab === "canceled" && "Aucun rendez-vous annulé"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Chat Drawer */}
        {selectedAppointment && (
          <ChatDrawer
            appointmentId={selectedAppointment.id}
            patientName={
              selectedAppointment.users.name ||
              selectedAppointment.users.email ||
              "Client"
            }
            isOpen={chatDrawerOpen === selectedAppointment.id}
            onClose={() => setChatDrawerOpen(null)}
          />
        )}

        {/* Confirm Dialog */}
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

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </div>
    </main>
  );
}
