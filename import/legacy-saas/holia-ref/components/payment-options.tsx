"use client";

import { useState } from "react";
import { CreditCard, Wallet, Info, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

interface PaymentOptionsProps {
  isPremium: boolean;
  allowDeferredPayment: boolean;
  price: number;
  onPayNow: () => void;
  onPayLater: () => void;
  isLoading?: boolean;
}

export function PaymentOptions({
  isPremium,
  allowDeferredPayment,
  price,
  onPayNow,
  onPayLater,
  isLoading = false,
}: PaymentOptionsProps) {
  const [selectedMethod, setSelectedMethod] = useState<"now" | "later">("now");

  // Cas 1 : Freemium → Paiement obligatoire
  if (!isPremium) {
    return (
      <div className="bg-white border border-anthracite/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-sauge/10 p-2 rounded-2xl">
            <Lock className="h-5 w-5 text-sauge" />
          </div>
          <div>
            <h3 className="font-semibold text-anthracite">Paiement en ligne</h3>
            <p className="text-sm text-anthracite/60">Sécurisé par Stripe</p>
          </div>
        </div>

        <div className="bg-anthracite/5 rounded-3xl p- space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-anthracite/70">Montant</span>
            <span className="font-semibold text-anthracite">{price}€</span>
          </div>
          <p className="text-xs text-anthracite/50">
            Le paiement en ligne est requis pour confirmer votre réservation.
          </p>
        </div>

        <Button
          onClick={onPayNow}
          disabled={isLoading}
          className="w-full bg-sauge hover:bg-sauge/90 text-white font-medium"
          size="lg"
        >
          {isLoading ? (
            "Redirection..."
          ) : (
            <>
              <CreditCard className="h-5 w-5 mr-2" />
              Payer {price}€
            </>
          )}
        </Button>

        <div className="flex items-start gap-2 text-xs text-anthracite/50">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Paiement 100% sécurisé. Vos données bancaires ne sont jamais stockées sur nos serveurs.
          </p>
        </div>
      </div>
    );
  }

  // Cas 2 : Premium avec paiement au RDV autorisé
  if (isPremium && allowDeferredPayment) {
    return (
      <div className="bg-white border border-anthracite/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-sauge/10 p-2 rounded-2xl">
            <Wallet className="h-5 w-5 text-sauge" />
          </div>
          <div>
            <h3 className="font-semibold text-anthracite">Mode de paiement</h3>
            <p className="text-sm text-anthracite/60">Choisissez votre préférence</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Option 1 : Payer maintenant */}
          <button
            onClick={() => setSelectedMethod("now")}
            className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
              selectedMethod === "now"
                ? "border-sauge bg-sauge/5"
                : "border-anthracite/10 hover:border-anthracite/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${selectedMethod === "now" ? "text-sauge" : "text-anthracite/40"}`}>
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-anthracite">Payer maintenant</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Recommandé
                  </span>
                </div>
                <p className="text-sm text-anthracite/60">
                  Paiement en ligne sécurisé par Stripe
                </p>
                <p className="text-xs text-anthracite/50 mt-1">
                  Confirmation immédiate • Facture automatique
                </p>
              </div>
              <div className="text-right">
                <div className="font-semibold text-anthracite">{price}€</div>
              </div>
            </div>
          </button>

          {/* Option 2 : Payer au rendez-vous */}
          <button
            onClick={() => setSelectedMethod("later")}
            className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
              selectedMethod === "later"
                ? "border-sauge bg-sauge/5"
                : "border-anthracite/10 hover:border-anthracite/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${selectedMethod === "later" ? "text-sauge" : "text-anthracite/40"}`}>
                <Wallet className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-anthracite block mb-1">
                  Payer au rendez-vous
                </span>
                <p className="text-sm text-anthracite/60">
                  Espèces, chèque ou CB sur place
                </p>
                <p className="text-xs text-anthracite/50 mt-1">
                  Paiement directement au praticien
                </p>
              </div>
              <div className="text-right">
                <div className="font-semibold text-anthracite">{price}€</div>
              </div>
            </div>
          </button>
        </div>

        <Button
          onClick={selectedMethod === "now" ? onPayNow : onPayLater}
          disabled={isLoading}
          className="w-full bg-sauge hover:bg-sauge/90 text-white font-medium"
          size="lg"
        >
          {isLoading ? (
            "Traitement..."
          ) : selectedMethod === "now" ? (
            <>
              <CreditCard className="h-5 w-5 mr-2" />
              Payer {price}€
            </>
          ) : (
            <>
              <Wallet className="h-5 w-5 mr-2" />
              Confirmer la réservation
            </>
          )}
        </Button>

        <div className="flex items-start gap-2 text-xs text-anthracite/50">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            {selectedMethod === "now"
              ? "Paiement 100% sécurisé. Vos données bancaires ne sont jamais stockées."
              : "Vous devrez régler le montant directement auprès du praticien lors du rendez-vous."}
          </p>
        </div>
      </div>
    );
  }

  // Cas 3 : Premium sans paiement au RDV
  return (
    <div className="bg-white border border-anthracite/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-sauge/10 p-2 rounded-2xl">
          <Sparkles className="h-5 w-5 text-sauge" />
        </div>
        <div>
          <h3 className="font-semibold text-anthracite">Paiement en ligne</h3>
          <p className="text-sm text-anthracite/60">Praticien Premium</p>
        </div>
      </div>

      <div className="bg-anthracite/5 rounded-3xl p- space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-anthracite/70">Montant</span>
          <span className="font-semibold text-anthracite">{price}€</span>
        </div>
        <p className="text-xs text-anthracite/50">
          Le paiement en ligne est requis pour confirmer votre réservation.
        </p>
      </div>

      <Button
        onClick={onPayNow}
        disabled={isLoading}
        className="w-full bg-sauge hover:bg-sauge/90 text-white font-medium"
        size="lg"
      >
        {isLoading ? (
          "Redirection..."
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Payer {price}€
          </>
        )}
      </Button>

      <div className="flex items-start gap-2 text-xs text-anthracite/50">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          Paiement 100% sécurisé. Vos données bancaires ne sont jamais stockées sur nos serveurs.
        </p>
      </div>
    </div>
  );
}

