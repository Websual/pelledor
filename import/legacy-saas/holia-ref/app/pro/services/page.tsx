"use client";

import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Clock, Euro } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
}

export default function ServicesPage() {
  const session = useSession();
  const data = session?.data;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["practitionerServices"],
    queryFn: async () => {
      const res = await fetch("/api/practitioners/services");
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    enabled: !!data && data.user.role === "PRACTITIONER",
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/practitioners/services/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitionerServices"] });
      setErrorMessage(null);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      // Clear error after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Gérer la redirection si l'utilisateur n'est pas praticien
  useEffect(() => {
    if (data && data.user.role !== "PRACTITIONER") {
      router.push("/");
    }
  }, [data, router]);

  if (!data || data.user.role !== "PRACTITIONER") {
    return null;
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2) + "€";
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (session.status === 'loading') return <Skeleton />

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-heading text-anthracite">
            Mes services
          </h1>
          <Button asChild>
            <Link href="/pro/services/new">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un service
            </Link>
          </Button>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800">
            {errorMessage}
          </div>
        )}

        {services && services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {service.description && (
                    <p className="text-sm text-anthracite/70 mb-4">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mb-4 text-sm text-anthracite/60">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(service.durationMin)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Euro className="h-4 w-4" />
                      <span>{formatPrice(service.priceCents)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/pro/services/${service.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Êtes-vous sûr de vouloir supprimer ce service ?"
                          )
                        ) {
                          deleteService.mutate(service.id);
                        }
                      }}
                      disabled={deleteService.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Aucun service</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-anthracite/70 mb-4">
                Vous n&apos;avez pas encore de services.
              </p>
              <Button asChild>
                <Link href="/pro/services/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre premier service
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

