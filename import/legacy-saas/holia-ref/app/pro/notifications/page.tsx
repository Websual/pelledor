"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday, startOfDay, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CreditCard,
  Calendar,
  MessageSquare,
  Star,
  FileCheck,
  AlertTriangle,
  Info,
  Bell,
  CheckCheck,
  X,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui";
import { useEffect, useRef, useState, useMemo } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  metadata: any;
  created_at: string;
  read_at: string | null;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "PAYMENT_RECEIVED":
      return CreditCard;
    case "BOOKING_NEW":
    case "BOOKING_CONFIRMED":
    case "BOOKING_CANCELED":
      return Calendar;
    case "MESSAGE_RECEIVED":
      return MessageSquare;
    case "REVIEW_RECEIVED":
      return Star;
    case "DOCUMENT_VERIFIED":
      return FileCheck;
    case "SUBSCRIPTION_ISSUE":
      return AlertTriangle;
    case "SYSTEM_INFO":
      return Info;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "PAYMENT_RECEIVED":
      return "bg-[#9bb49b]/10 text-[#9bb49b]";
    case "BOOKING_NEW":
      return "bg-blue-100 text-blue-700";
    case "BOOKING_CONFIRMED":
      return "bg-green-100 text-green-700";
    case "BOOKING_CANCELED":
      return "bg-red-100 text-red-700";
    case "MESSAGE_RECEIVED":
      return "bg-purple-100 text-purple-700";
    case "REVIEW_RECEIVED":
      return "bg-yellow-100 text-yellow-700";
    case "DOCUMENT_VERIFIED":
      return "bg-green-100 text-green-700";
    case "SUBSCRIPTION_ISSUE":
      return "bg-orange-100 text-orange-700";
    case "SYSTEM_INFO":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

// Fonction pour transformer le titre selon le type
const getDisplayTitle = (notification: Notification): string => {
  if (notification.type === "PAYMENT_RECEIVED") {
    return "Nouveau rendez-vous confirmé";
  }
  if (notification.type === "BOOKING_CANCELED") {
    return "Séance annulée";
  }
  return notification.title;
};

// Fonction pour extraire le contexte depuis le message ou metadata
const getContextLine = (notification: Notification): string | null => {
  const metadata = notification.metadata;
  if (metadata) {
    // Pour PAYMENT_RECEIVED et BOOKING_CANCELED, on a clientName et serviceName
    if (metadata.clientName && metadata.serviceName) {
      return `Rendez-vous avec ${metadata.clientName} pour une séance de ${metadata.serviceName}`;
    }
    // Pour BOOKING_NEW, on peut avoir clientName dans le message
    if (metadata.serviceName) {
      // Essayer d'extraire le nom du client depuis le message
      const messageMatch = notification.message.match(/(.+?) a réservé/);
      if (messageMatch) {
        return `Rendez-vous avec ${messageMatch[1]} pour une séance de ${metadata.serviceName}`;
      }
    }
    if (metadata.practitionerName && metadata.serviceName) {
      return `Rendez-vous avec ${metadata.practitionerName} pour une séance de ${metadata.serviceName}`;
    }
  }
  return null;
};

// Fonction pour déterminer la catégorie de filtre
const getNotificationCategory = (type: string): string => {
  if (type === "BOOKING_NEW" || type === "BOOKING_CONFIRMED" || type === "BOOKING_CANCELED") {
    return "Rendez-vous";
  }
  if (type === "PAYMENT_RECEIVED") {
    return "Paiements";
  }
  if (type === "MESSAGE_RECEIVED") {
    return "Messages";
  }
  return "Autres";
};

type FilterType = "Toutes" | "Rendez-vous" | "Paiements" | "Messages";

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasMarkedAsReadRef = useRef(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("Toutes");

  // Rediriger si non connecté ou non praticien
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/connexion");
    } else if (status === "authenticated" && session?.user?.role !== "PRACTITIONER") {
      router.push("/");
    }
  }, [status, session, router]);

  // Récupérer les notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });

  // Marquer toutes les notifications comme lues
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark all notifications as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Marquer automatiquement les notifications comme lues quand on arrive sur la page (une seule fois)
  useEffect(() => {
    if (
      notifications.length > 0 &&
      status === "authenticated" &&
      !isLoading &&
      !hasMarkedAsReadRef.current
    ) {
      const unreadNotifications = notifications.filter((n) => !n.read);
      if (unreadNotifications.length > 0) {
        hasMarkedAsReadRef.current = true;
        // Marquer toutes les notifications non lues comme lues en une seule requête
        markAllAsReadMutation.mutate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isLoading, notifications.length]);

  // Marquer une notification comme lue
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark notification as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Filtrer les notifications selon le filtre actif
  const filteredNotifications = useMemo(() => {
    if (activeFilter === "Toutes") {
      return notifications;
    }
    return notifications.filter((notification) => {
      const category = getNotificationCategory(notification.type);
      return category === activeFilter;
    });
  }, [notifications, activeFilter]);

  // Grouper les notifications filtrées par date
  const groupedNotifications = useMemo(() => {
    return filteredNotifications.reduce((acc, notification) => {
      const date = new Date(notification.created_at);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = "Aujourd'hui";
      } else if (isYesterday(date)) {
        groupKey = "Hier";
      } else {
        const daysDiff = differenceInDays(new Date(), date);
        if (daysDiff < 7) {
          groupKey = format(date, "EEEE d MMMM", { locale: fr });
        } else {
          groupKey = "Plus ancien";
        }
      }

      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(notification);
      return acc;
    }, {} as Record<string, Notification[]>);
  }, [filteredNotifications]);

  // Grouper les notifications par date dans l'ordre souhaité
  const orderedGroups = [
    "Aujourd'hui",
    "Hier",
    ...Object.keys(groupedNotifications)
      .filter((key) => key !== "Aujourd'hui" && key !== "Hier")
      .sort((a, b) => {
        if (a === "Plus ancien") return 1;
        if (b === "Plus ancien") return -1;
        return 0;
      }),
  ];

  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lue si pas déjà lue
    if (!notification.read) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Rediriger vers le lien si disponible
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="rounded-3xl p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="rounded-3xl p-8 shadow-sm border border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#9bb49b] rounded-3xl flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-anthracite">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-anthracite/70 mt-1">
                    {unreadCount} notification{unreadCount > 1 ? "s" : ""} non lue{unreadCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-xl"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {markAllAsReadMutation.isPending ? "En cours..." : "Tout marquer comme lu"}
              </Button>
            )}
          </div>

          {/* Barre de filtres */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 overflow-x-auto">
            {(["Toutes", "Rendez-vous", "Paiements", "Messages"] as FilterType[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`
                  px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                  ${activeFilter === filter
                    ? "bg-[#9bb49b] text-white"
                    : "bg-gray-100 text-anthracite/70 hover:bg-gray-200"
                  }
                `}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Liste des notifications */}
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucune notification</p>
              <p className="text-gray-400 text-sm mt-2">
                {activeFilter === "Toutes"
                  ? "Vous serez notifié des nouveaux événements ici"
                  : `Aucune notification de type "${activeFilter}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orderedGroups.map((groupKey) => {
                const groupNotifications = groupedNotifications[groupKey];
                if (!groupNotifications || groupNotifications.length === 0) return null;

                return (
                  <div key={groupKey}>
                    <h2 className="text-sm font-semibold text-anthracite/70 uppercase tracking-wide mb-3">
                      {groupKey}
                    </h2>
                    <div className="space-y-2">
                      {groupNotifications.map((notification) => {
                        const Icon = getNotificationIcon(notification.type);
                        const iconColor = getNotificationColor(notification.type);
                        const displayTitle = getDisplayTitle(notification);
                        const contextLine = getContextLine(notification);

                        return (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`
                              relative p-3 rounded-xl border transition-all cursor-pointer
                              ${notification.read 
                                ? "bg-white border-gray-100 hover:bg-slate-50 hover:border-gray-200" 
                                : "bg-white border-blue-200 hover:bg-slate-50 hover:border-blue-300"
                              }
                            `}
                          >
                            {/* Pastille bleue pour les non lues */}
                            {!notification.read && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500 rounded-r-full"></div>
                            )}
                            
                            <div className="flex items-start gap-3 pl-2">
                              {/* Icône */}
                              <div className={`w-9 h-9 ${iconColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                <Icon className="h-4 w-4" />
                              </div>

                              {/* Contenu */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-semibold text-anthracite text-sm">
                                        {displayTitle}
                                      </h3>
                                      {notification.type === "PAYMENT_RECEIVED" && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                          Paiement validé
                                        </span>
                                      )}
                                    </div>
                                    {contextLine && (
                                      <p className="text-xs text-anthracite/60 mt-1 leading-relaxed">
                                        {contextLine}
                                      </p>
                                    )}
                                    <p className="text-sm text-anthracite/70 leading-relaxed mt-1">
                                      {notification.message}
                                    </p>
                                  </div>
                                  <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                                    {format(new Date(notification.created_at), "HH:mm", { locale: fr })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
