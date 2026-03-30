"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, Suspense, useRef } from "react";
import { 
  MessageSquare, 
  Search, 
  Send,
  Calendar,
  Clock,
  Paperclip,
  Smile,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ToastContainer, ToastType } from "@/components/toast";

interface Conversation {
  id: string;
  appointmentId: string;
  patient: {
    id: string;
    name: string | null;
    email: string;
  };
  appointment: {
    id: string;
    startsAt: string;
    service: {
      name: string;
    };
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  isArchived: boolean;
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

interface NextAppointment {
  id: string;
  starts_at: string;
  services: {
    name: string;
  };
}

function MessagesPageContent() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentParam = searchParams.get("appointment");
  const chatParam = searchParams.get("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["practitionerConversations", data?.user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/practitioners/messages`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Priorité : appointment= puis chat= (patient userId)
  const selectedConversation = conversations?.find(
    (conv) =>
      conv.appointmentId === appointmentParam ||
      (chatParam && conv.patient?.id === chatParam)
  );
  const selectedAppointmentId = selectedConversation?.appointmentId;

  // Get next appointment for the selected patient
  const { data: nextAppointment } = useQuery<NextAppointment | null>({
    queryKey: ["nextAppointment", selectedConversation?.patient.id],
    queryFn: async () => {
      if (!selectedConversation) return null;
      const res = await fetch(`/api/appointments?userId=${selectedConversation.patient.id}`);
      if (!res.ok) return null;
      const appointments = await res.json();
      const upcoming = appointments
        .filter((apt: any) => new Date(apt.starts_at) > new Date())
        .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
      return upcoming || null;
    },
    enabled: !!selectedConversation,
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
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedAppointmentId) throw new Error("No appointment selected");
      const res = await fetch(`/api/appointments/${selectedAppointmentId}/messages`, {
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
      queryClient.invalidateQueries({ queryKey: ["practitionerConversations"] });
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur lors de l'envoi", "error");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  const filteredConversations = conversations?.filter((conv) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.patient.name?.toLowerCase().includes(query) ||
        conv.patient.email.toLowerCase().includes(query) ||
        conv.appointment.service.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return "À l'instant";
      } else if (diffInHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
      } else {
        return format(date, "d MMM", { locale: fr });
      }
    } catch {
      return "";
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-[#faf8f4] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sauge" />
          </div>
        </div>
      </div>
    );
  }

  if (session.status === 'loading') return <Skeleton />

  return (
    <div className="h-[calc(100vh-6rem)] bg-[#faf8f4] flex">
      {/* Left Sidebar - Conversation List */}
      <div className="w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-anthracite mb-4">Messagerie</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-anthracite/40" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations && filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const isSelected = conversation.appointmentId === selectedAppointmentId;
              return (
                <button
                  key={conversation.id}
                  onClick={() =>
                    router.push(`/pro/messages?appointment=${conversation.appointmentId}`)
                  }
                  className={`w-full text-left p-4 hover:bg-[#f9fafb] transition-colors border-l-4 ${
                    isSelected 
                      ? "bg-[#9bb49b]/10 border-[#9bb49b]" 
                      : "border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#9bb49b] font-semibold text-sm">
                        {conversation.patient.name?.charAt(0).toUpperCase() || "P"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-anthracite truncate">
                          {conversation.patient.name || conversation.patient.email}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-[#9bb49b] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-anthracite/60 truncate mb-1">
                        {conversation.appointment.service.name}
                      </p>
                      {conversation.lastMessage && (
                        <>
                          <p className="text-xs text-anthracite/50 truncate">
                            {conversation.lastMessage.content}
                          </p>
                          <p className="text-xs text-anthracite/40 mt-1">
                            {getTimeAgo(conversation.lastMessage.createdAt)}
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
              Aucune conversation
            </div>
          )}
        </div>
      </div>

      {/* Right Area - Active Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* Top Bar */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#9bb49b]/10 rounded-full flex items-center justify-center">
                    <span className="text-[#9bb49b] font-semibold">
                      {selectedConversation.patient.name?.charAt(0).toUpperCase() || "P"}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-anthracite">
                      {selectedConversation.patient.name || selectedConversation.patient.email}
                    </h2>
                    {nextAppointment && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-[#9bb49b]/10 text-[#9bb49b] text-xs font-medium rounded-full">
                          Prochain RDV : {format(new Date(nextAppointment.starts_at), "d MMM", { locale: fr })} à {format(new Date(nextAppointment.starts_at), "HH:mm", { locale: fr })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#f9fafb] space-y-4">
              {messages && messages.length > 0 ? (
                messages.map((message) => {
                  const isFromPractitioner = message.user_id === data?.user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromPractitioner ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isFromPractitioner
                            ? "bg-[#9bb49b] text-white rounded-br-sm"
                            : "bg-white text-anthracite rounded-bl-sm shadow-sm"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isFromPractitioner ? "text-white/70" : "text-anthracite/50"
                          }`}
                        >
                          {format(new Date(message.created_at), "HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-anthracite/60 text-sm">Aucun message pour le moment</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="rounded-full">
                  <Paperclip className="h-4 w-4" />
                </Button>
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
                <Button variant="ghost" size="sm" className="rounded-full">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => {
                    if (messageContent.trim() && !sendMessage.isPending) {
                      sendMessage.mutate(messageContent);
                    }
                  }}
                  disabled={!messageContent.trim() || sendMessage.isPending}
                  className="bg-[#9bb49b] hover:bg-[#8aa48a] text-white rounded-full px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-anthracite/30 mx-auto mb-4" />
              <p className="text-anthracite/60 text-lg mb-2">Sélectionnez une conversation</p>
              <p className="text-anthracite/40 text-sm">
                Choisissez une conversation dans la liste pour commencer à échanger
              </p>
            </div>
          </div>
        )}
      </div>
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="p-8 bg-[#faf8f4] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sauge" />
          </div>
        </div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
