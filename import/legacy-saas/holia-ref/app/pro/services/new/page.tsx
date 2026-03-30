"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Skeleton } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";

export default function NewServicePage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [priceCents, setPriceCents] = useState(5000); // 50€ en centimes

  const createService = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      durationMin: number;
      priceCents: number;
    }) => {
      const res = await fetch("/api/practitioners/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerServices"] });
      router.push("/pro/services");
    },
  });

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || durationMin < 15 || priceCents < 0) {
      alert("Veuillez remplir tous les champs correctement");
      return;
    }

    createService.mutate({
      name,
      description: description || undefined,
      durationMin,
      priceCents,
    });
  };

  if (session.status === 'loading') return <Skeleton />

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-2xl">
        <div className="mb-8">
          <Link
            href="/pro/services"
            className="text-sauge hover:text-sauge/80 transition-colors"
          >
            ← Retour aux services
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nouveau service</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Nom du service *</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={createService.isPending}
                  placeholder="Ex: Consultation individuelle"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={createService.isPending}
                  placeholder="Décrivez votre service..."
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-2xl border border-sable bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-anthracite/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="durationMin">Durée (minutes) *</Label>
                  <Input
                    id="durationMin"
                    type="number"
                    min="15"
                    step="15"
                    value={durationMin}
                    onChange={(e) => setDurationMin(parseInt(e.target.value) || 15)}
                    required
                    disabled={createService.isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="priceCents">Prix (€) *</Label>
                  <Input
                    id="priceCents"
                    type="number"
                    min="0"
                    step="0.01"
                    value={(priceCents / 100).toFixed(2)}
                    onChange={(e) =>
                      setPriceCents(Math.round(parseFloat(e.target.value) * 100) || 0)
                    }
                    required
                    disabled={createService.isPending}
                  />
                </div>
              </div>

              {createService.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-600">
                    {createService.error instanceof Error
                      ? createService.error.message
                      : "Une erreur est survenue"}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={createService.isPending || !name || durationMin < 15}
                >
                  {createService.isPending ? "Création..." : "Créer le service"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/pro/services")}
                  disabled={createService.isPending}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

