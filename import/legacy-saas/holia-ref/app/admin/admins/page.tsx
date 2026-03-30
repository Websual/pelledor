"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery } from "@tanstack/react-query";

export default function AdminAdminsPage() {
  const { data: admins, isLoading } = useQuery({
    queryKey: ["adminAdmins"],
    queryFn: async () => {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) throw new Error("Failed to fetch admins");
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
          Administrateurs
        </h1>
        <p className="text-anthracite/70">
          Gérer l&apos;équipe Holia
        </p>
      </div>

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Administrateurs ({admins?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admins && admins.length > 0 ? (
            <div className="space-y-2">
              {admins.map((admin: any) => (
                <div key={admin.id} className="p-3 border border-gray-200 rounded-2xl">
                  <p className="font-semibold text-anthracite">{admin.name || admin.email}</p>
                  <p className="text-sm text-anthracite/70">{admin.email}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-anthracite/60 text-center py-4">
              Aucun administrateur
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

