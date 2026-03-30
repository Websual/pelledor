"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
}

export default function EditServicePage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const serviceId = params?.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [priceCents, setPriceCents] = useState(5000);

  const { data: service, isLoading } = useQuery<Service>({
    queryKey: ["practitionerService", serviceId],
    queryFn: async () => {
      const res = await fetch(`/api/practitioners/services/${serviceId}`);
      if (!res.ok) throw new Error("Failed to fetch service");
      return res.json();
    },
    enabled: !!serviceId && !!data && data.user.role === "PRACTITIONER",
  });

  useEffect(() => {
    if (service) {
      setName(service.name);
      setDescription(service.description || "");
      setDurationMin(service.durationMin);
      setPriceCents(service.priceCents);
    }
  }, [service]);

  const updateService = useMutation({
    mutationFn: async (data: {
      name?: string;
      description?: string;
      durationMin?: number;
      priceCents?: number;
    }) => {
      const res = await fetch(`/api/practitioners/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerServices"] });
      queryClient.invalidateQueries({ queryKey: ["practitionerService", serviceId] });
      router.push("/pro/services");
    },
  });

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") {
      router.push("/");
    }
    return null;
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!service) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-center text-anthracite/70">Service non trouvé</p>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || durationMin < 15 || priceCents < 0) {
      alert("Veuillez remplir tous les champs correctement");
      return;
    }

    updateService.mutate({
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
            <CardTitle>Modifier le service</CardTitle>
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
                  disabled={updateService.isPending}
                  placeholder="Ex: Consultation individuelle"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={updateService.isPending}
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
                    disabled={updateService.isPending}
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
                    disabled={updateService.isPending}
                  />
                </div>
              </div>

              {updateService.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-600">
                    {updateService.error instanceof Error
                      ? updateService.error.message
                      : "Une erreur est survenue"}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={updateService.isPending || !name || durationMin < 15}
                >
                  {updateService.isPending ? "Mise à jour..." : "Enregistrer les modifications"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/pro/services")}
                  disabled={updateService.isPending}
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

