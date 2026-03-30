"use client";

export const dynamic = 'force-dynamic';

import { Card, CardContent, Button, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, Check, CheckCheck, Trash2, Calendar, CreditCard, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toasts, success, error, removeToast } = useToast();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["userNotifications", filter],
    queryFn: async () => {
      const res = await fetch(
        `/api/user/notifications?unreadOnly=${filter === "unread"}&context=account`
      );
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!session,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, read: true }),
      });
      if (!res.ok) throw new Error("Failed to mark notification as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
      success("Notification marquée comme lue");
    },
    onError: (err: Error) => {
      error(err.message || "Erreur lors de la mise à jour");
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!notifications) return;
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((n) =>
          fetch("/api/user/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: n.id, read: true }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
      success("Toutes les notifications ont été marquées comme lues");
    },
    onError: (err: Error) => {
      error(err.message || "Erreur lors de la mise à jour");
    },
  });

  // Redirection si non connecté
  useEffect(() => {
    if (!session && typeof window !== "undefined") {
      router.push("/connexion");
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return Calendar;
      case "payment":
        return CreditCard;
      case "message":
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
            Notifications
          </h1>
          <p className="text-anthracite/70">
            Restez informé de vos activités
          </p>
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
              Notifications
            </h1>
            <p className="text-anthracite/70">
              Restez informé de vos activités
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white" : ""}
          >
            Toutes ({notifications?.length || 0})
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className={filter === "unread" ? "bg-[#9bb49b] hover:bg-[#8aa48a] text-white" : ""}
          >
            Non lues ({unreadCount})
          </Button>
        </div>
      </div>

      {!notifications || notifications.length === 0 ? (
        <Card className="bg-white rounded-3xl border border-[#f1f5f1]">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-[#9bb49b]/10 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-[#9bb49b]" />
              </div>
              <h3 className="text-xl font-semibold text-anthracite mb-2">
                Aucune notification
              </h3>
              <p className="text-anthracite/70">
                Vous n&apos;avez pas encore de notifications. Elles apparaîtront ici lorsqu&apos;il y aura des mises à jour concernant vos rendez-vous, messages ou paiements.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const content = (
              <div className="flex gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    notification.read
                      ? "bg-gray-100"
                      : "bg-[#9bb49b]/10"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      notification.read
                        ? "text-gray-400"
                        : "text-[#9bb49b]"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3
                        className={`font-semibold mb-1 ${
                          notification.read
                            ? "text-anthracite/70"
                            : "text-anthracite"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          notification.read
                            ? "text-anthracite/60"
                            : "text-anthracite/80"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <div className="mt-2 text-xs text-anthracite/50">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </div>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markAsRead.mutate(notification.id);
                        }}
                        disabled={markAsRead.isPending}
                        className="flex-shrink-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );

            return (
              <Card
                key={notification.id}
                className={`bg-white rounded-3xl border transition-all ${
                  notification.read
                    ? "border-[#f1f5f1] opacity-75"
                    : "border-[#9bb49b]/30 shadow-sm"
                }`}
              >
                <CardContent className="p-4">
                  {notification.link ? (
                    <Link href={notification.link} className="block">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
