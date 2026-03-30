"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Skeleton } from "@/components/ui";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  ArrowLeft, 
  Euro,
  Banknote,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  History,
  Video,
  Upload,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import { ToastContainer, ToastType } from "@/components/toast";

interface Appointment {
  id: string;
  starts_at: string;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "DONE" | "NO_SHOW";
  payment_status?: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "OFFLINE";
  location_choice?: "PRESENTIAL" | "VIDEO" | null;
  services: {
    id: string;
    name: string;
    duration_min: number;
    price_cents: number;
    location_type?: "PRESENTIAL_ONLY" | "VIDEO_ONLY" | "HYBRID";
  };
  users: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
  };
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    id: string;
    name: string | null;
    email: string;
  };
}

function getStatusBadge(status: string) {
  const badges = {
    PENDING: { label: "En attente", color: "bg-orange-100 text-orange-700 border-orange-300" },
    CONFIRMED: { label: "Confirmé", color: "bg-green-100 text-green-700 border-green-300" },
    DONE: { label: "Terminé", color: "bg-gray-100 text-gray-700 border-gray-300" },
    CANCELED: { label: "Annulé", color: "bg-red-100 text-red-700 border-red-300" },
    NO_SHOW: { label: "Absence", color: "bg-red-100 text-red-700 border-red-300" },
  };
  const badge = badges[status as keyof typeof badges] || badges.PENDING;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
      {badge.label}
    </span>
  );
}

export default function AppointmentDetailPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState("");
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "check" | "bank_transfer" | "other">("cash");
  const [sendEmail, setSendEmail] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "history">("details");
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<{ video_link?: string | null } | null>(null);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const { data: appointment, isLoading, refetch } = useQuery<Appointment>({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const appointments = await res.json();
      return appointments.find((apt: Appointment) => apt.id === appointmentId);
    },
    enabled: !!appointmentId && !!session,
    refetchInterval: false,
    staleTime: 0, // Toujours considérer les données comme périmées pour forcer le refresh
  });
  
  // Forcer le refresh quand le composant monte pour synchroniser le payment_status
  useEffect(() => {
    if (appointmentId && session) {
      refetch();
    }
  }, [appointmentId, session, refetch]);

  const { data: messages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["appointmentMessages", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}/messages`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!appointmentId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Charger les settings du praticien
  const { data: practitionerSettings } = useQuery({
    queryKey: ["practitionerSettings"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/settings");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!appointmentId,
  });

  // Mettre à jour les settings quand ils sont chargés
  useEffect(() => {
    if (practitionerSettings) {
      setSettings(practitionerSettings);
    }
  }, [practitionerSettings]);

  // Charger les notes
  const { data: notesData } = useQuery({
    queryKey: ["appointmentNotes", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}/notes`);
      if (!res.ok) return { notes: "" };
      return res.json();
    },
    enabled: !!appointmentId && activeTab === "notes",
  });

  // Charger les documents
  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ["appointmentDocuments", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}/documents`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!appointmentId && activeTab === "notes",
  });

  // Mettre à jour les notes quand les données changent
  useEffect(() => {
    if (notesData) {
      setNotes(notesData.notes || "");
    }
  }, [notesData]);

  // Mettre à jour les documents quand les données changent
  useEffect(() => {
    if (documentsData) {
      setDocuments(documentsData || []);
    }
  }, [documentsData]);

  // Charger l'historique
  const { data: historyData } = useQuery({
    queryKey: ["appointmentHistory", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}/history`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!appointmentId && activeTab === "history",
  });

  // Mettre à jour l'historique quand les données changent
  useEffect(() => {
    if (historyData) {
      setHistory(historyData || []);
    }
  }, [historyData]);

  // Sauvegarder les notes
  const saveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      addToast("Notes sauvegardées", "success");
    } catch (error) {
      addToast("Erreur lors de la sauvegarde", "error");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/appointments/${appointmentId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessageContent("");
      refetchMessages();
      addToast("Message envoyé", "success");
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur lors de l'envoi", "error");
    },
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async (status: "PENDING" | "CONFIRMED" | "CANCELED" | "DONE" | "NO_SHOW") => {
      // Si on marque comme DONE, utiliser l'API complete qui envoie l'email
      if (status === "DONE") {
        const res = await fetch(`/api/appointments/${appointmentId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to complete appointment");
        }
        return res.json();
      }
      
      // Pour les autres statuts, utiliser l'API status normale
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
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
      queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["practitionerAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["practitionerDashboard"] });
      addToast("Statut mis à jour", "success");
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur lors de la mise à jour", "error");
    },
  });

  const processRefund = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to process refund");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["practitionerAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["practitionerDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["practitionerFinance"] });
      addToast("Remboursement effectué avec succès", "success");
      setShowCancelModal(false);
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur lors du remboursement", "error");
    },
  });

  const collectPayment = useMutation({
    mutationFn: async (data: { paymentMethod: string; sendEmail: boolean }) => {
      const res = await fetch(`/api/appointments/${appointmentId}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to collect payment");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowCollectModal(false);
      queryClient.invalidateQueries({ queryKey: ["appointment", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["practitionerAppointments"] });
      queryClient.invalidateQueries({ queryKey: ["practitionerFinance"] });
      addToast("Paiement enregistré et facture générée avec succès !", "success");
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur lors de l'encaissement", "error");
    },
  });

  if (session.status === 'loading') return <Skeleton />

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sauge" />
          </div>
        </div>
      </main>
    );
  }

  if (!appointment) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-anthracite/70">Rendez-vous introuvable</p>
          <Button asChild className="mt-4">
            <Link href="/pro/appointments">Retour aux rendez-vous</Link>
          </Button>
        </div>
      </main>
    );
  }

  const isFromPractitioner = (message: Message) => message.user_id === data?.user?.id;

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="container mx-auto px-6 2xl:px-16 py-8 pt-24 max-w-[1600px]">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Button asChild variant="ghost" className="text-anthracite/70 hover:bg-white/50">
            <Link href="/pro/appointments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            {getStatusBadge(appointment.status)}
            <div className="text-right">
              <p className="text-2xl font-bold text-anthracite">
                {format(new Date(appointment.starts_at), "EEEE d MMMM", { locale: fr })}
              </p>
              <p className="text-lg text-anthracite/70">
                {format(new Date(appointment.starts_at), "HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: 2/3 - 1/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("details")}
                className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "details"
                    ? "text-sauge border-b-2 border-sauge"
                    : "text-anthracite/70 hover:text-anthracite"
                }`}
              >
                <User className="h-4 w-4" />
                Détails
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "notes"
                    ? "text-sauge border-b-2 border-sauge"
                    : "text-anthracite/70 hover:text-anthracite"
                }`}
              >
                <FileText className="h-4 w-4" />
                Notes de séance
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === "history"
                    ? "text-sauge border-b-2 border-sauge"
                    : "text-anthracite/70 hover:text-anthracite"
                }`}
              >
                <History className="h-4 w-4" />
                Historique
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "details" && (
              <>
            {/* Patient Profile Card */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-sauge/10 rounded-full flex items-center justify-center flex-shrink-0">
                    {appointment.users.image ? (
                      <Image 
                        src={appointment.users.image} 
                        alt={appointment.users.name || "Patient"}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sauge font-bold text-2xl">
                        {appointment.users.name?.charAt(0).toUpperCase() || "P"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-anthracite mb-2">
                      {appointment.users.name || appointment.users.email}
                    </h3>
                    <div className="space-y-2">
                      {appointment.users.phone && (
                        <div className="flex items-center gap-2 text-anthracite/70">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{appointment.users.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-anthracite/70">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{appointment.users.email}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Voir dossier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Session Details Card */}
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-sauge/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-sauge" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-anthracite mb-1">
                      {appointment.services.name}
                    </h3>
                    <p className="text-sm text-anthracite/60 mb-3">
                      Durée: {appointment.services.duration_min} minutes
                    </p>
                    <p className="text-2xl font-bold text-anthracite">
                      {(appointment.services.price_cents / 100).toFixed(2)} €
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment/Status Card */}
            {appointment.status === "CONFIRMED" && (
              <>
                {appointment.payment_status === "PAID" ? (
                  <Card className="bg-[#9bb49b]/10 rounded-3xl shadow-sm border border-[#9bb49b]/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="h-5 w-5 text-[#9bb49b]" />
                        <h3 className="text-lg font-semibold text-[#9bb49b]">
                          Payé (Stripe ou encaissé)
                        </h3>
                      </div>
                      <p className="text-sm text-anthracite/70 mb-4">
                        Le paiement a été effectué avec succès.
                      </p>
                    </CardContent>
                  </Card>
                ) : appointment.payment_status === "OFFLINE" ? (
                  <Card className="bg-amber-50 rounded-3xl shadow-sm border border-amber-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Banknote className="h-5 w-5 text-amber-700" />
                        <h3 className="text-lg font-semibold text-amber-900">
                          Paiement sur place
                        </h3>
                      </div>
                      <p className="text-sm text-amber-800 mb-4">
                        Le client paiera en espèces ou par chèque au cabinet. Cliquez sur &quot;Encaisser&quot; une fois le paiement reçu pour générer la facture finale.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-yellow-50 rounded-3xl shadow-sm border border-yellow-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Euro className="h-5 w-5 text-yellow-700" />
                        <h3 className="text-lg font-semibold text-yellow-900">
                          Paiement en attente
                        </h3>
                      </div>
                      <p className="text-sm text-yellow-800 mb-4">
                        Ce rendez-vous n'a pas encore été payé.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Video Link Card */}
            {(appointment.location_choice === "VIDEO" || appointment.services?.location_type === "VIDEO_ONLY" || appointment.services?.location_type === "HYBRID") && (
              <Card className="bg-blue-50 rounded-3xl shadow-sm border border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Video className="h-5 w-5 text-blue-700" />
                    <h3 className="text-lg font-semibold text-blue-900">
                      Téléconsultation
                    </h3>
                  </div>
                  <p className="text-sm text-blue-800 mb-4">
                    Ce rendez-vous se déroule en visioconférence.
                  </p>
                  {settings?.video_link ? (
                    <Button
                      asChild
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <a
                        href={settings.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Lancer la visio
                      </a>
                    </Button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Le praticien n'a pas encore configuré son lien de visioconférence.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap gap-3 pt-4">
              {appointment.status === "PENDING" && (
                <>
                  <Button
                    onClick={() => updateAppointmentStatus.mutate("CONFIRMED")}
                    disabled={updateAppointmentStatus.isPending}
                    className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accepter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRefuseModal(true)}
                    disabled={updateAppointmentStatus.isPending}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Refuser
                  </Button>
                </>
              )}
              {appointment.status === "CONFIRMED" && (
                <>
                  {/* Bouton Encaisser - masqué si déjà payé via Stripe (paiement manuel uniquement) */}
                  {appointment.payment_status !== "PAID" && (
                    <Button
                      onClick={() => setShowCollectModal(true)}
                      disabled={collectPayment.isPending}
                      className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                    >
                      <Euro className="h-4 w-4 mr-2" />
                      Encaisser
                    </Button>
                  )}
                  <Button
                    onClick={() => updateAppointmentStatus.mutate("DONE")}
                    disabled={updateAppointmentStatus.isPending}
                    variant="outline"
                  >
                    Marquer terminé
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelModal(true)}
                    disabled={updateAppointmentStatus.isPending}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Annuler
                  </Button>
                </>
              )}
              {appointment.status === "DONE" && (
                <>
                  {/* Bouton Encaisser - masqué si déjà payé via Stripe (paiement manuel uniquement) */}
                  {appointment.payment_status !== "PAID" && (
                    <Button
                      onClick={() => setShowCollectModal(true)}
                      disabled={collectPayment.isPending}
                      className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white"
                    >
                      <Euro className="h-4 w-4 mr-2" />
                      Encaisser
                    </Button>
                  )}
                </>
              )}
            </div>
              </>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div className="space-y-6">
                <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-anthracite">
                      Notes privées de séance
                    </CardTitle>
                    <p className="text-sm text-anthracite/60 mt-1">
                      Ces notes sont privées et ne sont pas visibles par le patient.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Douleurs épaule droite, a mieux dormi, exercices donnés : respiration..."
                      className="w-full min-h-[300px] p-4 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-sauge focus:border-transparent"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={saveNotes}
                        disabled={isSavingNotes}
                        className="bg-sauge hover:bg-sauge-dark text-white"
                      >
                        {isSavingNotes ? "Sauvegarde..." : "Enregistrer les notes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Documents partagés */}
                <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-anthracite">
                      Documents partagés
                    </CardTitle>
                    <p className="text-sm text-anthracite/60 mt-1">
                      Documents que le patient peut consulter dans son espace.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="document-upload"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const formData = new FormData();
                          formData.append("file", file);
                          
                          try {
                            const res = await fetch(`/api/appointments/${appointmentId}/documents`, {
                              method: "POST",
                              body: formData,
                            });
                            if (!res.ok) throw new Error("Failed to upload");
                            refetchDocuments();
                            addToast("Document uploadé avec succès", "success");
                          } catch (error) {
                            addToast("Erreur lors de l'upload", "error");
                          }
                        }}
                      />
                      <Button
                        onClick={() => document.getElementById("document-upload")?.click()}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Ajouter un document
                      </Button>
                    </div>
                    {documents.length > 0 ? (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-[#f7f7f7] rounded-3xl"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-sauge" />
                              <div>
                                <p className="font-medium text-anthracite">{doc.file_name}</p>
                                {doc.description && (
                                  <p className="text-sm text-anthracite/60">{doc.description}</p>
                                )}
                              </div>
                            </div>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sauge hover:text-sauge-dark"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-anthracite/60 text-center py-4">
                        Aucun document partagé pour le moment
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
              <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-anthracite">
                    Historique des rendez-vous
                  </CardTitle>
                  <p className="text-sm text-anthracite/60 mt-1">
                    Tous les rendez-vous passés avec {appointment.users.name || appointment.users.email}
                  </p>
                </CardHeader>
                <CardContent>
                  {history.length > 0 ? (
                    <div className="space-y-4">
                      {history.map((apt) => (
                        <div
                          key={apt.id}
                          className="p-4 border border-gray-200 rounded-3xl hover:bg-[#f7f7f7] transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Calendar className="h-4 w-4 text-sauge" />
                                <span className="font-semibold text-anthracite">
                                  {format(new Date(apt.starts_at), "EEEE d MMMM yyyy à HH:mm", { locale: fr })}
                                </span>
                              </div>
                              <p className="text-anthracite/70 mb-2">{apt.services.name}</p>
                              {apt.appointment_notes?.notes && (
                                <div className="mt-2 p-3 bg-sauge/10 rounded-3xl">
                                  <p className="text-sm text-anthracite/80 font-medium mb-1">Notes :</p>
                                  <p className="text-sm text-anthracite/70 whitespace-pre-wrap">
                                    {apt.appointment_notes.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-anthracite">
                                {(apt.services.price_cents / 100).toFixed(2)} €
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-anthracite/60 text-center py-8">
                      Aucun rendez-vous passé pour le moment
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column (1/3) - Embedded Chat */}
          <div className="lg:col-span-1">
            <Card className="bg-white rounded-3xl shadow-sm border border-gray-100 h-[calc(100vh-12rem)] flex flex-col sticky top-24">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-anthracite">
                  Discussion avec {appointment.users.name || appointment.users.email.split("@")[0]}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f9fafb]">
                  {messages && messages.length > 0 ? (
                    messages.map((message, idx) => {
                      const isPractitioner = isFromPractitioner(message);
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showAvatar = !prevMsg || prevMsg.user_id !== message.user_id || 
                        new Date(message.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000; // 5 minutes
                      
                      const getInitials = (name: string | null, email: string) => {
                        if (name) {
                          const parts = name.split(" ");
                          if (parts.length >= 2) {
                            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                          }
                          return name.substring(0, 2).toUpperCase();
                        }
                        return email.substring(0, 2).toUpperCase();
                      };
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex items-end gap-2 ${isPractitioner ? "flex-row-reverse" : ""}`}
                        >
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            showAvatar ? "" : "invisible"
                          } ${isPractitioner ? "bg-[#9bb49b] order-2" : "bg-gray-200 order-1"}`}>
                            <span className={`text-xs font-medium ${
                              isPractitioner ? "text-white" : "text-anthracite"
                            }`}>
                              {getInitials(message.users.name, message.users.email)}
                            </span>
                          </div>

                          {/* Message bubble */}
                          <div className={`flex flex-col max-w-[75%] ${isPractitioner ? "items-end order-1" : "items-start order-2"}`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                isPractitioner
                                  ? "bg-[#9bb49b] text-white rounded-br-sm"
                                  : "bg-white text-anthracite border border-gray-200 rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {message.content}
                              </p>
                            </div>
                            <span className={`text-[10px] text-anthracite/40 mt-1 px-2 ${isPractitioner ? "text-right" : "text-left"}`}>
                              {format(new Date(message.created_at), "HH:mm", { locale: fr })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-anthracite/60 text-sm mb-2">
                          Aucun message pour le moment.
                        </p>
                        <p className="text-anthracite/40 text-xs">
                          Commencez la conversation avec votre patient
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tapez votre message..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && messageContent.trim() && !sendMessage.isPending) {
                          sendMessage.mutate(messageContent);
                        }
                      }}
                      className="flex-1 rounded-full"
                    />
                    <Button
                      onClick={() => {
                        if (messageContent.trim() && !sendMessage.isPending) {
                          sendMessage.mutate(messageContent);
                        }
                      }}
                      disabled={!messageContent.trim() || sendMessage.isPending}
                      className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-full px-4"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Collect Payment Modal */}
      {showCollectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white max-w-md w-full mx-4 rounded-3xl">
            <CardHeader>
              <CardTitle>Encaisser le paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-anthracite/70 mb-2">Montant:</p>
                <p className="text-2xl font-bold text-anthracite">
                  {(appointment.services.price_cents / 100).toFixed(2)} €
                </p>
              </div>
              <div>
                <p className="text-sm text-anthracite/70 mb-2">Moyen de paiement:</p>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-2xl"
                >
                  <option value="cash">Espèces</option>
                  <option value="check">Chèque</option>
                  <option value="bank_transfer">Virement</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="sendEmail" className="text-sm text-anthracite/70">
                  Envoyer la facture par email au client
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => collectPayment.mutate({ paymentMethod, sendEmail })}
                  disabled={collectPayment.isPending}
                  className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white flex-1"
                >
                  {collectPayment.isPending ? "Enregistrement..." : "Valider et Clôturer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCollectModal(false)}
                  disabled={collectPayment.isPending}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white max-w-md w-full mx-4 rounded-3xl">
            <CardHeader>
              <CardTitle>Annuler le rendez-vous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-anthracite/70">
                Êtes-vous sûr de vouloir annuler ce rendez-vous ?
              </p>
              {appointment.payment_status === "PAID" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <p className="text-sm text-yellow-800 font-semibold mb-1">
                    ⚠️ Attention
                  </p>
                  <p className="text-sm text-yellow-700">
                    Les frais de transaction Stripe (env. 1,88€) resteront à votre charge et ne seront pas remboursés au client.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    if (appointment.payment_status === "PAID") {
                      // Si le rendez-vous est payé, créer un remboursement
                      processRefund.mutate();
                    } else {
                      // Sinon, juste annuler
                      updateAppointmentStatus.mutate("CANCELED");
                      setShowCancelModal(false);
                    }
                  }}
                  disabled={updateAppointmentStatus.isPending || processRefund.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                >
                  {processRefund.isPending ? "Traitement..." : "Oui, annuler"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(false)}
                  disabled={updateAppointmentStatus.isPending || processRefund.isPending}
                >
                  Non
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refuse Modal */}
      {showRefuseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-white max-w-md w-full mx-4 rounded-3xl">
            <CardHeader>
              <CardTitle>Refuser le rendez-vous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-anthracite/70">
                Êtes-vous sûr de vouloir refuser ce rendez-vous ?
              </p>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    updateAppointmentStatus.mutate("CANCELED");
                    setShowRefuseModal(false);
                  }}
                  disabled={updateAppointmentStatus.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                >
                  Oui, refuser
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRefuseModal(false)}
                  disabled={updateAppointmentStatus.isPending}
                >
                  Non
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </main>
  );
}
