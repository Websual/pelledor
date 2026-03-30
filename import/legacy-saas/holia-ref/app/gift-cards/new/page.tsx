"use client";
export const dynamic = 'force-dynamic';

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Gift, Euro, ChevronLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ToastContainer, ToastType } from "@/components/toast";

function NewGiftCardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const practitionerId = searchParams.get("practitionerId");
  
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Charger les infos du praticien
  const { data: practitioner } = useQuery({
    queryKey: ["practitioner", practitionerId],
    queryFn: async () => {
      if (!practitionerId) return null;
      const res = await fetch(`/api/practitioners/${practitionerId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!practitionerId,
  });

  // Créer la carte cadeau
  const createGiftCard = useMutation({
    mutationFn: async (data: {
      practitionerId: string;
      amountCents: number;
      recipientEmail?: string;
      recipientName?: string;
      message?: string;
    }) => {
      const res = await fetch("/api/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create gift card");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Rediriger vers Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/gift-cards/${data.giftCard.id}/success`);
      }
    },
    onError: (error: Error) => {
      addToast(error.message || "Erreur lors de la création", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      router.push(`/connexion?callbackUrl=/gift-cards/new?practitionerId=${practitionerId}`);
      return;
    }

    if (!practitionerId || !amount) {
      addToast("Veuillez remplir tous les champs", "error");
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (amountCents < 100) {
      addToast("Le montant minimum est de 1€", "error");
      return;
    }

    createGiftCard.mutate({
      practitionerId,
      amountCents,
      recipientEmail: recipientEmail || undefined,
      recipientName: recipientName || undefined,
      message: message || undefined,
    });
  };

  const presetAmounts = [25, 50, 75, 100, 200];

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Layout Split-Screen */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-screen">
        {/* Gauche : Formulaire */}
        <div className="flex-1 flex items-center justify-center p-12 lg:p-16 bg-white">
          <div className="w-full max-w-md">
            {/* Bouton Retour */}
            <Link
              href={practitioner?.slug ? `/praticien/${practitioner.slug}` : "/"}
              className="flex items-center gap-2 text-anthracite/60 hover:text-anthracite transition-colors text-sm mb-6"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour au profil
            </Link>

            <Card className="bg-white border-0 shadow-none rounded-3xl">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-[#9bb49b] flex items-center justify-center">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-anthracite">
                    Offrir une carte cadeau
                  </CardTitle>
                </div>
                {practitioner && (
                  <p className="text-anthracite/70 text-sm ml-[60px]">
                    Pour {practitioner.title}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Montant */}
                  <div>
                    <Label htmlFor="amount" className="text-sm font-medium text-anthracite mb-2 block">
                      Montant (€)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="50.00"
                      required
                      className="mt-2 rounded-xl border-sable focus:border-[#9bb49b] focus:ring-[#9bb49b]"
                    />
                    <div className="flex flex-nowrap lg:grid lg:grid-cols-5 gap-2 mt-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                      {presetAmounts.map((preset) => {
                        const isSelected = amount === preset.toString();
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(preset.toString())}
                            className={`flex-1 lg:flex-none px-4 py-2 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
                              isSelected
                                ? "bg-[#9bb49b] text-white border-[#9bb49b]"
                                : "bg-white text-anthracite border-sable hover:border-[#9bb49b]/50"
                            }`}
                          >
                            {preset}€
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bénéficiaire */}
                  <div>
                    <Label htmlFor="recipientName" className="text-sm font-medium text-anthracite mb-2 block">
                      Nom du bénéficiaire (optionnel)
                    </Label>
                    <Input
                      id="recipientName"
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Sophie Martin"
                      className="mt-2 rounded-xl border-sable focus:border-[#9bb49b] focus:ring-[#9bb49b]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="recipientEmail" className="text-sm font-medium text-anthracite mb-2 block">
                      Email du bénéficiaire (optionnel)
                    </Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="sophie@example.com"
                      className="mt-2 rounded-xl border-sable focus:border-[#9bb49b] focus:ring-[#9bb49b]"
                    />
                    <p className="text-xs text-anthracite/60 mt-1.5">
                      Si renseigné, le code cadeau sera envoyé par email
                    </p>
                  </div>

                  {/* Message */}
                  <div>
                    <Label htmlFor="message" className="text-sm font-medium text-anthracite mb-2 block">
                      Message personnalisé (optionnel)
                    </Label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Joyeux anniversaire ! Profite bien de ce moment de détente..."
                      className="w-full min-h-[100px] p-3 border border-sable rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#9bb49b] focus:border-transparent mt-2"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={createGiftCard.isPending}
                    className="w-full bg-[#9bb49b] hover:bg-[#8aa483] text-white rounded-xl py-6 text-base font-semibold transition-colors"
                  >
                    {createGiftCard.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <Euro className="h-4 w-4 mr-2" />
                        Payer et créer la carte cadeau
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Droite : Image */}
        <div className="hidden lg:block flex-1 relative">
          <Image
            src="/images/gift-card-zen.webp"
            alt="Carte cadeau zen"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </main>
  );
}




function GiftCardNewPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewGiftCardPage />
    </Suspense>
  );
}

export default GiftCardNewPageWrapper;
