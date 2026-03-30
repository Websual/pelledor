"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Mail, MapPin, MessageCircle, Send, CheckCircle2, Instagram, Linkedin, UserCircle, User, Phone, MessageSquare } from "lucide-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

const Turnstile = dynamic(
  () => import("react-turnstile").then((mod) => mod.Turnstile),
  { ssr: false }
);

// Email stocké en parties pour éviter le scraping (assemblé côté client)
const CONTACT_EMAIL_PARTS = ["contact", "holia", "me"];

const PROFILE_OPTIONS = [
  { value: "practitioner", label: "Un praticien (Professionnel)" },
  { value: "patient", label: "Un patient (Particulier)" },
  { value: "partner", label: "Un partenaire / Presse" },
] as const;

const SUBJECT_OPTIONS = [
  { value: "reclamation", label: "Demande de réclamation de profil" },
  { value: "technical", label: "Problème technique / Bug" },
  { value: "subscription", label: "Question sur mon abonnement" },
  { value: "partnership", label: "Partenariat" },
  { value: "other", label: "Autre" },
] as const;

const FAQ_ITEMS = [
  {
    q: "Comment annuler ?",
    a: "Depuis votre espace, rendez-vous dans Mes rendez-vous, sélectionnez le rendez-vous et utilisez le bouton Annuler. Consultez nos CGU pour les conditions.",
  },
  {
    q: "Ma sécurité",
    a: "Vos messages sont chiffrés (AES-256). Vos données restent dans l'UE. Consultez notre Politique de confidentialité pour plus de détails.",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    profile: "" as "" | (typeof PROFILE_OPTIONS)[number]["value"],
    name: "",
    email: "",
    phone: "",
    subject: "" as "" | (typeof SUBJECT_OPTIONS)[number]["value"],
    message: "",
    website: "", // honeypot
  });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [emailRevealed, setEmailRevealed] = useState(false);

  const contactEmail = emailRevealed
    ? `${CONTACT_EMAIL_PARTS[0]}@${CONTACT_EMAIL_PARTS[1]}.${CONTACT_EMAIL_PARTS[2]}`
    : null;

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileEnabled = !!siteKey;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.profile || !form.subject) {
      setErrorMsg("Veuillez sélectionner votre profil et le sujet de votre message.");
      return;
    }
    if (turnstileEnabled && !turnstileToken) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: form.profile,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          subject: SUBJECT_OPTIONS.find((o) => o.value === form.subject)?.label ?? form.subject,
          message: form.message,
          website: form.website,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Une erreur est survenue");
        return;
      }

      setStatus("success");
      setForm({ profile: "", name: "", email: "", phone: "", subject: "", message: "", website: "" });
      setTurnstileToken(null);
    } catch {
      setStatus("error");
      setErrorMsg("Impossible d'envoyer le message. Réessayez plus tard.");
    }
  };

  return (
    <main className="min-h-screen bg-[#fafaf9] py-16 pt-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-anthracite mb-2">Contact</h1>
          <p className="text-anthracite/70">
            Une question ? Nous sommes là pour vous aider.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Formulaire — gauche */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
              {status === "success" ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#9bb49b]/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-10 w-10 text-[#9bb49b]" />
                  </div>
                  <h2 className="text-xl font-semibold text-anthracite mb-2">
                    Message envoyé
                  </h2>
                  <p className="text-anthracite/70 mb-6 max-w-sm">
                    Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.
                  </p>
                  <Button
                    variant="outline"
                    className="border-[#9bb49b] text-[#9bb49b] hover:bg-[#9bb49b]/5"
                    onClick={() => {
                      setStatus("idle");
                      setTurnstileToken(null);
                      setTurnstileKey((k) => k + 1);
                    }}
                  >
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="profile" className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-[#9bb49b]" />
                      Vous êtes
                    </Label>
                    <div className="relative mt-1.5">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9bb49b] z-10" />
                      <Select
                        value={form.profile}
                        onValueChange={(v) => setForm((f) => ({ ...f, profile: v as typeof form.profile }))}
                      >
                        <SelectTrigger id="profile" className="rounded-xl pl-10">
                          <SelectValue placeholder="Sélectionnez votre profil" />
                        </SelectTrigger>
                      <SelectContent>
                        {PROFILE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#9bb49b]" />
                      Nom
                    </Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9bb49b] z-10" />
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Votre nom"
                        className="rounded-xl pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#9bb49b]" />
                      Email
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9bb49b] z-10" />
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="votre@email.fr"
                        className="rounded-xl pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#9bb49b]" />
                      Téléphone{" "}
                      <span className="text-anthracite/50 font-normal">(optionnel)</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9bb49b] z-10" />
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="06 12 34 56 78"
                        className="rounded-xl pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subject" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[#9bb49b]" />
                      Sujet
                    </Label>
                    <div className="relative mt-1.5">
                      <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9bb49b] z-10" />
                      <Select
                        value={form.subject}
                        onValueChange={(v) => setForm((f) => ({ ...f, subject: v as typeof form.subject }))}
                      >
                        <SelectTrigger id="subject" className="rounded-xl pl-10">
                          <SelectValue placeholder="Choisissez une catégorie" />
                        </SelectTrigger>
                      <SelectContent>
                        {SUBJECT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="message" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-[#9bb49b]" />
                      Message
                    </Label>
                    <div className="relative mt-1.5">
                      <MessageCircle className="absolute left-3 top-4 h-4 w-4 text-[#9bb49b] z-10" />
                      <textarea
                        id="message"
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder="Votre message..."
                        rows={4}
                        className="flex w-full rounded-xl border border-sable bg-white pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-anthracite/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bb49b]/20 focus-visible:border-[#9bb49b] disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      />
                    </div>
                  </div>
                  {/* Honeypot — masqué, non visible pour les humains */}
                  <div
                    className="absolute -left-[9999px] opacity-0 pointer-events-none"
                    aria-hidden="true"
                  >
                    <Label htmlFor="website">Site web (ne pas remplir)</Label>
                    <Input
                      id="website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                  {turnstileEnabled && (
                    <div className="flex justify-center">
                      <Turnstile
                        key={turnstileKey}
                        sitekey={siteKey}
                        onVerify={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken(null)}
                        theme="light"
                        size="normal"
                      />
                    </div>
                  )}
                  {errorMsg && (
                    <p className="text-sm text-red-600">{errorMsg}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={
                      status === "loading" ||
                      (turnstileEnabled && !turnstileToken)
                    }
                    className="w-full rounded-xl bg-[#9bb49b] hover:bg-[#8aa48a] text-white h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === "loading" ? (
                      "Envoi en cours..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Infos + FAQ — droite */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-anthracite mb-4">
                Nos coordonnées
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <div>
                    {emailRevealed && contactEmail ? (
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-anthracite/80 hover:text-[#9bb49b] transition-colors break-all"
                      >
                        {contactEmail}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEmailRevealed(true)}
                        className="text-left text-[#9bb49b] hover:text-[#8aa48a] font-medium transition-colors underline underline-offset-2"
                      >
                        Afficher l&apos;email
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 text-anthracite/80 text-sm">
                  <MapPin className="h-5 w-5 text-[#9bb49b] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>Holia est fièrement propulsé par Websual.</p>
                    <p>Siège social : Idron, Nouvelle-Aquitaine, France.</p>
                    <p className="italic text-anthracite/70">
                      Support 100% digital pour une réactivité maximale.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-sm text-anthracite/70">Nous suivre :</span>
                  {/* TODO: remplacer href="#" par les URLs Instagram/LinkedIn quand créés */}
                  <a
                    href="#"
                    className="p-2 rounded-2xl text-anthracite/60 hover:text-[#9bb49b] hover:bg-[#9bb49b]/5 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a
                    href="#"
                    className="p-2 rounded-2xl text-anthracite/60 hover:text-[#9bb49b] hover:bg-[#9bb49b]/5 transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-anthracite mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#9bb49b]" />
                FAQ rapide
              </h2>
              <div className="space-y-4">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i}>
                    <p className="font-medium text-anthracite text-sm">
                      {item.q}
                    </p>
                    <p className="text-anthracite/60 text-sm mt-0.5">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}