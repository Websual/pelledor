"use client";
export const dynamic = 'force-dynamic';

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Gift, CheckCircle, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function GiftCardSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const giftCardId = params.id as string;
  const sessionId = searchParams.get("session_id");
  const [confirmed, setConfirmed] = useState(false);

  // Confirmer le paiement
  const confirmPayment = useMutation({
    mutationFn: async () => {
      if (!sessionId) return;
      const res = await fetch(`/api/gift-cards/${giftCardId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
      return res.json();
    },
    onSuccess: () => {
      setConfirmed(true);
    },
  });

  // Charger la carte cadeau
  const { data: giftCard } = useQuery({
    queryKey: ["giftCard", giftCardId],
    queryFn: async () => {
      const res = await fetch(`/api/gift-cards?practitionerId=${giftCardId}`);
      if (!res.ok) return null;
      const cards = await res.json();
      return cards.find((c: any) => c.id === giftCardId);
    },
    enabled: !!giftCardId,
  });

  useEffect(() => {
    if (sessionId && !confirmed) {
      confirmPayment.mutate();
    }
  }, [sessionId, confirmed, confirmPayment]);

  const downloadPDF = async () => {
    try {
      const res = await fetch(`/api/gift-cards/${giftCardId}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const data = await res.json();
      // TODO: Générer et télécharger le PDF côté client avec react-pdf
      alert("PDF à générer (fonctionnalité à venir)");
    } catch (error) {
      alert("Erreur lors de la génération du PDF");
    }
  };

  if (!giftCard) {
    return <PageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-2xl">
        <Card className="bg-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-anthracite">
              Carte cadeau créée avec succès !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-3xl p-">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="h-6 w-6 text-pink-600" />
                <h3 className="font-semibold text-anthracite">Détails de la carte cadeau</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-anthracite/70">Code :</span>
                  <span className="font-mono font-bold text-anthracite">{giftCard.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-anthracite/70">Montant :</span>
                  <span className="font-bold text-anthracite">
                    {(giftCard.amount_cents / 100).toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-anthracite/70">Pour :</span>
                  <span className="font-medium text-anthracite">
                    {giftCard.practitioners?.title || "Praticien"}
                  </span>
                </div>
                {giftCard.recipient_name && (
                  <div className="flex justify-between">
                    <span className="text-anthracite/70">Bénéficiaire :</span>
                    <span className="font-medium text-anthracite">{giftCard.recipient_name}</span>
                  </div>
                )}
              </div>
            </div>

            {giftCard.message && (
              <div className="bg-sauge/10 border border-sauge/20 rounded-3xl p-">
                <p className="text-sm font-medium text-anthracite mb-1">Message :</p>
                <p className="text-sm text-anthracite/80 italic">"{giftCard.message}"</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={downloadPDF}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le PDF
              </Button>
              <Button
                asChild
                className="flex-1 bg-sauge hover:bg-sauge-dark text-white"
              >
                <Link href="/">
                  Retour à l'accueil
                </Link>
              </Button>
            </div>

            <div className="text-center text-sm text-anthracite/60">
              <p>Le code cadeau peut être utilisé lors de la réservation d'un rendez-vous.</p>
              {giftCard.recipient_email && (
                <p className="mt-2">
                  Un email avec le code a été envoyé à {giftCard.recipient_email}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

