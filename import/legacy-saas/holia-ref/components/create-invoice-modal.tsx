"use client";

import { useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label } from "@/components/ui";
import { X } from "lucide-react";

import { useSession } from "next-auth/react";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateInvoiceModal({ isOpen, onClose }: CreateInvoiceModalProps) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    userId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    description: "",
    amountCents: "",
    paymentMethod: "cash" as "cash" | "check" | "bank_transfer" | "other",
    sendEmail: true,
  });

  const createInvoice = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.userId || undefined,
          description: data.description,
          amountCents: Math.round(parseFloat(data.amountCents) * 100),
          paymentMethod: data.paymentMethod,
          sendEmail: data.sendEmail,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerFinance"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
      setFormData({
        userId: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        description: "",
        amountCents: "",
        paymentMethod: "cash",
        sendEmail: true,
      });
      alert("Facture créée avec succès !");
    },
    onError: (error: Error) => {
      alert(error.message || "Erreur lors de la création de la facture");
    },
  });

  // Récupérer la liste des clients
  const { data: clients } = useQuery({
    queryKey: ["practitionerClients"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: isOpen && !!session,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Créer une facture libre</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="client-select">Client (optionnel)</Label>
            <select
              id="client-select"
              className="w-full p-2 border border-gray-300 rounded-2xl mt-2"
              value={formData.userId}
              onChange={(e) => {
                const selectedClient = clients?.find((c: any) => c.id === e.target.value);
                setFormData({
                  ...formData,
                  userId: e.target.value,
                  clientName: selectedClient?.name || "",
                  clientEmail: selectedClient?.email || "",
                  clientPhone: selectedClient?.phone || "",
                });
              }}
            >
              <option value="">Nouveau client</option>
              {clients?.map((client: any) => (
                <option key={client.id} value={client.id}>
                  {client.name || client.email}
                </option>
              ))}
            </select>
          </div>

          {!formData.userId && (
            <>
              <div>
                <Label htmlFor="client-name">Nom du client</Label>
                <Input
                  id="client-name"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="mt-2"
                  placeholder="Nom complet"
                />
              </div>
              <div>
                <Label htmlFor="client-email">Email du client</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="mt-2"

                />
              </div>
              <div>
                <Label htmlFor="client-phone">Téléphone (optionnel)</Label>
                <Input
                  id="client-phone"
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="mt-2"
                  placeholder="06 12 34 56 78"
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="description">Description de la prestation</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2"
              placeholder="Ex: Séance d'ostéopathie"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Montant (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amountCents}
              onChange={(e) => setFormData({ ...formData, amountCents: e.target.value })}
              className="mt-2"
              placeholder="60.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="payment-method">Moyen de paiement</Label>
            <select
              id="payment-method"
              className="w-full p-2 border border-gray-300 rounded-2xl mt-2"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
            >
              <option value="cash">Espèces</option>
              <option value="check">Chèque</option>
              <option value="bank_transfer">Virement</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="send-email"
              checked={formData.sendEmail}
              onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="send-email">Envoyer la facture par email au client</Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => createInvoice.mutate(formData)}
              disabled={createInvoice.isPending || !formData.description || !formData.amountCents}
              className="bg-sauge hover:bg-sauge-dark text-white flex-1"
            >
              {createInvoice.isPending ? "Création..." : "Créer la facture"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={createInvoice.isPending}>
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

