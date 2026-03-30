"use client";
import Link from "next/link";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import { Bell, MessageSquare, CheckCircle, AlertCircle, Info, X, DollarSign, FileCheck, CreditCard } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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

interface NotificationCenterProps {
  variant?: "user" | "pro";
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "MESSAGE_RECEIVED":
      return MessageSquare;
    case "BOOKING_NEW":
    case "BOOKING_CONFIRMED":
      return CheckCircle;
    case "BOOKING_CANCELED":
      return AlertCircle;
    case "REVIEW_RECEIVED":
      return CheckCircle;
    case "PAYMENT_RECEIVED":
      return DollarSign;
    case "DOCUMENT_VERIFIED":
      return FileCheck;
    case "SUBSCRIPTION_ISSUE":
      return CreditCard;
    default:
      return Info;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "MESSAGE_RECEIVED":
      return "border-l-blue-500";
    case "BOOKING_NEW":
    case "BOOKING_CONFIRMED":
      return "border-l-green-500";
    case "BOOKING_CANCELED":
      return "border-l-red-500";
    case "REVIEW_RECEIVED":
      return "border-l-yellow-500";
    case "PAYMENT_RECEIVED":
      return "border-l-green-500";
    case "DOCUMENT_VERIFIED":
      return "border-l-blue-500";
    case "SUBSCRIPTION_ISSUE":
      return "border-l-red-500";
    default:
      return "border-l-gray-500";
  }
};

export function NotificationCenter({ variant = "user" }: NotificationCenterProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!session?.user?.id,
    refetchInterval: 30000, // Refetch toutes les 30 secondes
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  // If not authenticated, don't render notifications
  if (status === 'loading' || !session) {
    return null;
  }

  const recentNotifications = notifications?.slice(0, 5) || [];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-2xl hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-anthracite" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-anthracite">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="text-sm text-sauge hover:text-sauge/80"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-anthracite/60">
                  Chargement...
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-anthracite/60">
                  Aucune notification
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const colorClass = getNotificationColor(notification.type);
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          !notification.read ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                              !notification.read
                                ? "bg-sauge/10 text-sauge"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm font-medium ${
                                  !notification.read
                                    ? "text-anthracite"
                                    : "text-anthracite/70"
                                }`}
                              >
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500" />
                              )}
                            </div>
                            <p className="text-xs text-anthracite/60 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-anthracite/40 mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200">
              <Link
                href={variant === "pro" ? "/pro/notifications" : "/user/notifications"}
                className="block text-center text-sm text-sauge hover:text-sauge/80 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Voir toutes les notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

