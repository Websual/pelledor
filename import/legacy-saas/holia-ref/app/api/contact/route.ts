import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendContactFormEmail } from "@/lib/emails";
import {
  checkContactRateLimit,
  incrementContactRateLimit,
} from "@/lib/contact-rate-limit";

const PROFILE_LABELS: Record<string, string> = {
  practitioner: "Praticien (Professionnel)",
  patient: "Patient (Particulier)",
  partner: "Partenaire / Presse",
};

const contactSchema = z.object({
  profile: z.enum(["practitioner", "patient", "partner"]),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  subject: z.string().min(3, "Le sujet doit contenir au moins 3 caractères"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
  website: z.string().optional(),
  turnstileToken: z.string().optional(),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Skip si non configuré

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // 1. Rate limiting
    const { allowed } = checkContactRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de messages envoyés. Réessayez dans 1 heure." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Données invalides";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 2. Honeypot — rejeter si rempli (bot)
    if (parsed.data.website && parsed.data.website.trim().length > 0) {
      return NextResponse.json({ ok: true }); // Fausse réussite pour berner le bot
    }

    // 3. Turnstile
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (siteKey && secretKey) {
      if (!parsed.data.turnstileToken) {
        return NextResponse.json(
          { error: "Vérification de sécurité requise. Actualisez la page." },
          { status: 400 }
        );
      }
      const valid = await verifyTurnstileToken(parsed.data.turnstileToken);
      if (!valid) {
        return NextResponse.json(
          { error: "Vérification de sécurité échouée. Réessayez." },
          { status: 400 }
        );
      }
    }

    await sendContactFormEmail({
      profile: PROFILE_LABELS[parsed.data.profile] || parsed.data.profile,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });

    incrementContactRateLimit(ip);

    return NextResponse.json({ ok: true, message: "Message envoyé avec succès" });
  } catch (error) {
    console.error("[Contact] Error sending contact form:", error);
    return NextResponse.json(
      { error: "Impossible d'envoyer le message. Réessayez plus tard." },
      { status: 500 }
    );
  }
}
