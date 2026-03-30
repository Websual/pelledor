"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery } from "@tanstack/react-query";

export default function AdminCategoriesPage() {
  const { data: professions, isLoading } = useQuery({
    queryKey: ["adminCategories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/professions");
      if (!res.ok) throw new Error("Failed to fetch categories");
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
          Catégories
        </h1>
        <p className="text-anthracite/70">
          Gérer les catégories de praticiens
        </p>
      </div>

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Professions ({professions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {professions && professions.length > 0 ? (
            <div className="space-y-2">
              {professions.map((profession: any) => (
                <div key={profession.id} className="p-3 border border-gray-200 rounded-2xl">
                  <p className="font-semibold text-anthracite">{profession.name}</p>
                  <p className="text-sm text-anthracite/70">{profession.slug}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-anthracite/60 text-center py-4">
              Aucune catégorie
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

