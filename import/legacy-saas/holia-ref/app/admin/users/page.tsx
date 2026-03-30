"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery } from "@tanstack/react-query";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
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
          Patients
        </h1>
        <p className="text-anthracite/70">
          Liste de tous les utilisateurs de la plateforme
        </p>
      </div>

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Utilisateurs ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user: any) => (
                <div key={user.id} className="p-3 border border-gray-200 rounded-2xl">
                  <p className="font-medium text-anthracite">{user.name || user.email}</p>
                  <p className="text-sm text-anthracite/70">{user.email}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-anthracite/60 text-center py-4">
              Aucun utilisateur
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

