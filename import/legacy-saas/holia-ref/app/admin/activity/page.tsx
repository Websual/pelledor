"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminActivityPage() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["adminActivity"],
    queryFn: async () => {
      const res = await fetch("/api/admin/activity");
      if (!res.ok) throw new Error("Failed to fetch activity");
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
          Live Feed
        </h1>
        <p className="text-anthracite/70">
          Activité en temps réel de la plateforme
        </p>
      </div>

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-3xl"
                >
                  <div className="w-2 h-2 rounded-full bg-[#9bb49b] mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-anthracite">{activity.message}</p>
                    <p className="text-xs text-anthracite/60 mt-1">
                      {format(new Date(activity.timestamp), "d MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-anthracite/60 text-center py-4">
              Aucune activité récente
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

