"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Input, Button } from "@/components/ui";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  users: {
    id: string;
    name: string | null;
    email: string;
    role: "CLIENT" | "PRACTITIONER" | "ADMIN";
  };
}

interface ChatThreadProps {
  appointmentId: string;
}

export function ChatThread({ appointmentId }: ChatThreadProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const currentUserId = session?.user?.id;

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["messages", appointmentId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}/messages`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: false as any,
  });

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
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", appointmentId] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length]);

  // SSE subscription for live updates and typing
  useEffect(() => {
    const es = new EventSource(`/api/appointments/${appointmentId}/messages/stream`);
    es.addEventListener("typing", (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setPeerTyping(Boolean(data.typing));
      } catch {}
    });
    es.addEventListener("ping", () => {
      // keep-alive
    });
    es.onmessage = () => {};
    es.onerror = () => {
      // retry handled by browser automatically
    };
    const revalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["messages", appointmentId] });
    };
    es.addEventListener("message", revalidate as any);
    es.addEventListener("typing", revalidate as any);
    return () => {
      es.close();
    };
  }, [appointmentId, queryClient]);

  // Send typing indicator with debounce
  useEffect(() => {
    if (!isTyping) return;
    const ctrl = new AbortController();
    fetch(`/api/appointments/${appointmentId}/messages/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typing: true }),
      signal: ctrl.signal,
    }).catch(() => {});
    const t = setTimeout(() => {
      fetch(`/api/appointments/${appointmentId}/messages/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: false }),
      }).catch(() => {});
      setIsTyping(false);
    }, 1500);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [isTyping, appointmentId]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    
    const groups: Array<{ date: string; messages: ChatMessage[] }> = [];
    let currentGroup: { date: string; messages: ChatMessage[] } | null = null;

    messages.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), "d MMMM yyyy", { locale: fr });
      
      if (!currentGroup || currentGroup.date !== msgDate) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { date: msgDate, messages: [msg] };
      } else {
        currentGroup.messages.push(msg);
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [messages]);

  const isOwnMessage = (msg: ChatMessage) => {
    return msg.users.id === currentUserId;
  };

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
    <div className="w-full h-[500px] rounded-3xl border border-gray-100 bg-white flex flex-col shadow-sm">
      <div className="p-4 border-b border-gray-100 bg-[#9bb49b]/5 flex-shrink-0">
        <h3 className="text-sm font-semibold text-anthracite">Messages</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-anthracite/60 text-sm">Chargement…</p>
          </div>
        ) : groupedMessages.length > 0 ? (
          groupedMessages.map((group) => (
            <div key={group.date} className="space-y-4">
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="px-3 py-1 bg-gray-100 rounded-full">
                  <span className="text-xs font-medium text-anthracite/60">
                    {group.date}
                  </span>
                </div>
              </div>

              {/* Messages */}
              {group.messages.map((msg, idx) => {
                const own = isOwnMessage(msg);
                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                const showAvatar = !prevMsg || prevMsg.users.id !== msg.users.id || 
                  new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000; // 5 minutes
                
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${own ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar - only show if needed */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      showAvatar ? "" : "invisible"
                    } ${own ? "bg-[#9bb49b] order-2" : "bg-gray-200 order-1"}`}>
                      <span className={`text-xs font-medium ${
                        own ? "text-white" : "text-anthracite"
                      }`}>
                        {getInitials(msg.users.name, msg.users.email)}
                      </span>
                    </div>

                    {/* Message bubble */}
                    <div className={`flex flex-col max-w-[75%] ${own ? "items-end" : "items-start"} ${own ? "order-1" : "order-2"}`}>
                      <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                        own
                          ? "bg-[#9bb49b] text-white rounded-br-sm"
                          : "bg-white text-anthracite border border-gray-200 rounded-bl-sm"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                      <span className={`text-[10px] text-anthracite/40 mt-1 px-2 ${own ? "text-right" : "text-left"}`}>
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-anthracite/60 text-sm mb-2">
                Aucun message pour l'instant.
              </p>
              <p className="text-anthracite/40 text-xs">
                Commencez la conversation avec votre praticien
              </p>
            </div>
          </div>
        )}
        
        {peerTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-anthracite">…</span>
            </div>
            <div className="px-4 py-2 bg-gray-100 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-anthracite/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-anthracite/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-anthracite/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <form
        className="flex items-center gap-2 p-4 border-t border-gray-100 bg-gray-50/50"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = message.trim();
          if (!trimmed) return;
          sendMessage.mutate(trimmed);
        }}
      >
        <Input
          value={message}
          onChange={(e: any) => {
            setMessage(e.target.value);
            if (!isTyping) setIsTyping(true);
          }}
          placeholder="Tapez votre message…"
          className="flex-1 bg-white border-gray-200 focus:border-[#9bb49b]"
        />
        <Button
          type="submit"
          disabled={sendMessage.isPending || !message.trim()}
          className="bg-[#9bb49b] hover:bg-[#9bb49b]/90 text-white"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
