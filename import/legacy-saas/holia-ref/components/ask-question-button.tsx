"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";

interface AskQuestionButtonProps {
  practitionerUserId: string;
  eventSlug: string;
  className?: string;
}

export function AskQuestionButton({
  practitionerUserId,
  eventSlug,
  className = "",
}: AskQuestionButtonProps) {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  const messagesUrl = `/account/messages?chat=${encodeURIComponent(practitionerUserId)}${eventSlug ? `&event=${encodeURIComponent(eventSlug)}` : ""}`;
  const href =
    session?.user
      ? messagesUrl
      : `/connexion?callbackUrl=${encodeURIComponent(`/account/messages?chat=${practitionerUserId}${eventSlug ? `&event=${eventSlug}` : ""}`)}`;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sauge/10 text-sauge font-medium text-sm hover:bg-sauge/20 transition-colors ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      Poser une question
    </Link>
  );
}
