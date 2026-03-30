"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminAppointmentsPage() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["adminAppointments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/appointments");
      if (!res.ok) throw new Error("Failed to fetch appointments");
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
          Réservations
        </h1>
        <p className="text-anthracite/70">
          Vue globale de tous les rendez-vous de la plateforme
        </p>
      </div>

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Tous les rendez-vous ({appointments?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt: any) => (
                <div key={apt.id} className="p-4 border border-gray-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-anthracite">
                        {apt.practitioner?.title || "Praticien"}
                      </p>
                      <p className="text-sm text-anthracite/70">
                        {apt.user?.name || apt.user?.email || "Client"}
                      </p>
                      <p className="text-xs text-anthracite/60 mt-1">
                        {format(new Date(apt.startsAt), "d MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      apt.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                      apt.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      apt.status === "CANCELED" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-anthracite/60 text-center py-4">
              Aucun rendez-vous
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

