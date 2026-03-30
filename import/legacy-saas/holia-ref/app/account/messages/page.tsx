"use client";

export const dynamic = "force-dynamic";

import { Button, Input, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, Suspense } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";

interface Conversation {
  id: string;
  appointmentId: string;
  practitionerUserId: string | null;
  practitioner: {
    id: string;
    userId: string | null;
    slug: string;
    title: string;
    photoUrl: string | null;
    name: string | null;
    email: string | null;
  } | null;
  appointment: {
    id: string;
    startsAt: string;
    service: { id: string; name: string } | null;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  users: { id: string; name: string | null; email: string };
}

function MessagesPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatParam = searchParams.get("chat");
  const eventParam = searchParams.get("event");
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [ensuredConversation, setEnsuredConversation] = useState<Conversation | null>(null);
  const [eventTitleFromEvent, setEventTitleFromEvent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["userConversations", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user/messages");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!session?.user?.id && status === "authenticated",
  });

  const selectedConversation = conversations?.find(
    (c) => c.practitionerUserId === chatParam || c.appointmentId === chatParam
  );
  const effectiveConversation = selectedConversation ?? ensuredConversation;
  const selectedAppointmentId = effectiveConversation?.appointmentId;

  const ensureConversationMutation = useMutation({
    mutationFn: async () => {
      if (!chatParam) throw new Error("No chat param");
      const res = await fetch("/api/user/messages/ensure-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerUserId: chatParam,
          eventSlug: eventParam || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to ensure conversation");
      }
      return res.json();
    },
    onSuccess: (data: { conversation: Conversation; eventTitle?: string }) => {
      setEnsuredConversation(data.conversation);
      if (data.eventTitle) setEventTitleFromEvent(data.eventTitle);
      queryClient.invalidateQueries({ queryKey: ["userConversations"] });
    },
  });

  const { data: eventTitleData } = useQuery<{ title: string }>({
    queryKey: ["eventTitle", eventParam],
    queryFn: async () => {
      const res = await fetch(`/api/events/by-slug/${encodeURIComponent(eventParam!)}`);
      if (!res.ok) throw new Error("Event not found");
      return res.json();
    },
    enabled: !!eventParam && !!effectiveConversation,
  });

  const { data: messages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["conversationMessages", selectedAppointmentId],
    queryFn: async () => {
      if (!selectedAppointmentId) return [];
      const res = await fetch(`/api/appointments/${selectedAppointmentId}/messages`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedAppointmentId,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedAppointmentId) throw new Error("No conversation selected");
      const res = await fetch(`/api/appointments/${selectedAppointmentId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessageContent("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["userConversations"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    if (
      chatParam &&
      !isLoading &&
      conversations !== undefined &&
      !selectedConversation &&
      !ensuredConversation &&
      !ensureConversationMutation.isPending &&
      !ensureConversationMutation.isSuccess
    ) {
      ensureConversationMutation.mutate();
    }
  }, [chatParam, isLoading, conversations, selectedConversation, ensuredConversation, ensureConversationMutation.isPending, ensureConversationMutation.isSuccess]);

  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.practitioner?.title?.toLowerCase().includes(q) ||
      conv.practitioner?.name?.toLowerCase().includes(q) ||
      conv.practitioner?.email?.toLowerCase().includes(q) ||
      conv.appointment?.service?.name?.toLowerCase().includes(q)
    );
  });

  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      if (diffInHours < 1) return "À l'instant";
      if (diffInHours < 24) return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      return format(date, "d MMM", { locale: fr });
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user && typeof window !== "undefined") {
      router.push("/connexion");
    }
  }, [session, status, router]);

  if (status === "loading") return <Skeleton className="h-64 w-full rounded-3xl" />;
  if (!session?.user) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-anthracite mb-2">Mes messages</h1>
        <p className="text-anthracite/70 text-sm">
          Vos conversations avec les praticiens
        </p>
      </div>

      <div className="flex-1 flex bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-0">
        {/* Col Gauche 35% - Liste des praticiens */}
        <div className="w-full lg:w-[35%] border-r border-gray-100 flex flex-col min-w-0">
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-anthracite/40" />
              <Input
                placeholder="Rechercher un praticien..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations && filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = conv.appointmentId === (effectiveConversation?.appointmentId ?? selectedAppointmentId);
                const linkUserId = conv.practitionerUserId || conv.appointmentId;
                return (
                  <button
                    key={conv.id}
                    onClick={() =>
                      router.push(`/account/messages?chat=${encodeURIComponent(linkUserId)}`)
                    }
                    className={`w-full text-left p-4 hover:bg-[#f7f7f7] transition-colors border-l-4 ${
                      isSelected
                        ? "bg-[#9bb49b]/10 border-[#9bb49b]"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {conv.practitioner?.photoUrl ? (
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={conv.practitioner.photoUrl}
                            alt={conv.practitioner.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[#9bb49b] font-semibold text-sm">
                            {conv.practitioner?.title?.charAt(0) || "P"}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-anthracite truncate">
                          {conv.practitioner?.title || "Praticien"}
                        </p>
                        {conv.lastMessage && (
                          <>
                            <p className="text-xs text-anthracite/50 truncate mt-0.5">
                              {conv.lastMessage.content}
                            </p>
                            <p className="text-[11px] text-anthracite/40 mt-1">
                              {getTimeAgo(conv.lastMessage.createdAt)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-anthracite/60">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-anthracite/30" />
                <p>Aucune conversation</p>
                <p className="text-sm mt-1">
                  Vos échanges avec les praticiens apparaîtront ici.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Col Droite 65% - Fenêtre de chat */}
        <div className="flex-1 flex flex-col min-w-0 lg:w-[65%]">
          {effectiveConversation ? (
            <>
              {/* Bandeau "Vos échanges sont privés et sécurisés" */}
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-[#9bb49b]/5 border-b border-gray-100">
                <ShieldCheck className="h-4 w-4 text-[#9bb49b]" />
                <span className="text-xs text-anthracite/70">
                  Vos échanges sont privés et sécurisés
                </span>
              </div>

              {/* Contexte événement : message système discret */}
              {(eventTitleFromEvent ?? eventTitleData?.title) && (
                <div className="px-4 py-2 bg-anthracite/5 border-b border-gray-100">
                  <p className="text-xs text-anthracite/60 italic">
                    Vous contactez ce praticien à propos de l&apos;événement : {eventTitleFromEvent ?? eventTitleData?.title}
                  </p>
                </div>
              )}

              {/* Header de chat : nom + lien Voir sa fiche */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  {effectiveConversation.practitioner?.photoUrl ? (
                    <div className="relative w-11 h-11 rounded-full overflow-hidden">
                      <Image
                        src={selectedConversation.practitioner.photoUrl}
                        alt={selectedConversation.practitioner.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 bg-[#9bb49b]/10 rounded-full flex items-center justify-center">
                      <span className="text-[#9bb49b] font-semibold">
                        {effectiveConversation.practitioner?.title?.charAt(0) || "P"}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-anthracite">
                      {effectiveConversation.practitioner?.title || "Praticien"}
                    </h2>
                    <p className="text-xs text-anthracite/60">
                      {effectiveConversation.appointment?.service?.name || "Conversation"}
                    </p>
                  </div>
                </div>
                {effectiveConversation.practitioner?.slug && (
                  <Link
                    href={`/praticien/${effectiveConversation.practitioner.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm text-[#9bb49b] hover:text-[#8aa48a] font-medium transition-colors"
                  >
                    Voir sa fiche
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {/* Zone des messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#f9fafb] space-y-3">
                {messages && messages.length > 0 ? (
                  messages.map((msg) => {
                    const isFromMe = msg.sender_id === session?.user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-3xl px-4 py-2.5 ${
                            isFromMe
                              ? "bg-[#9bb49b] text-white rounded-br-md"
                              : "bg-gray-100 text-anthracite rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p
                            className={`text-[11px] mt-1 ${
                              isFromMe ? "text-white/80" : "text-anthracite/50"
                            }`}
                          >
                            {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-anthracite/50 text-sm">Aucun message</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input arrondi-full avec icône Send à droite */}
              <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <div className="relative flex items-center">
                  <Input
                    placeholder="Votre message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && messageContent.trim() && !sendMessage.isPending) {
                        sendMessage.mutate(messageContent);
                      }
                    }}
                    className="pl-4 pr-12 rounded-full h-12 border-gray-200 focus:border-[#9bb49b] focus:ring-[#9bb49b]/20"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (messageContent.trim() && !sendMessage.isPending) {
                        sendMessage.mutate(messageContent);
                      }
                    }}
                    disabled={!messageContent.trim() || sendMessage.isPending}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0 bg-[#9bb49b] hover:bg-[#8aa48a] text-white flex items-center justify-center"
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State : aucune conversation sélectionnée */
            <div className="flex-1 flex items-center justify-center bg-[#fafaf9]">
              <div className="text-center max-w-xs px-6">
                <div className="w-20 h-20 rounded-full bg-[#9bb49b]/10 flex items-center justify-center mx-auto mb-5">
                  <MessageSquare className="h-10 w-10 text-[#9bb49b]/60" />
                </div>
                <p className="text-anthracite/70 font-medium mb-1">
                  Sélectionnez une conversation pour commencer
                </p>
                <p className="text-anthracite/50 text-sm">
                  Choisissez un praticien dans la liste pour voir vos échanges
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-3xl" />
        </div>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
