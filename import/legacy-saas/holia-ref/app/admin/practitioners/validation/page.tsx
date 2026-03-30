"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery } from "@tanstack/react-query";

export default function AdminValidationPage() {
  const { data: practitioners, isLoading } = useQuery({
    queryKey: ["adminPractitioners", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/practitioners?status=pending");
      if (!res.ok) throw new Error("Failed to fetch practitioners");
      return res.json();
    },
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
          Queue de Validation
        </h1>
        <p className="text-anthracite/70">
          Valider les diplômes des praticiens en attente
        </p>
      </div>

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Praticiens en attente ({practitioners?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {practitioners && practitioners.length > 0 ? (
            <div className="space-y-4">
              {practitioners.map((p: any) => (
                <div key={p.id} className="p-4 border border-gray-200 rounded-2xl">
                  <p className="font-semibold text-anthracite">{p.title}</p>
                  <p className="text-sm text-anthracite/70">{p.locationCity}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-anthracite/60 text-center py-4">
              Aucun praticien en attente de validation
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

