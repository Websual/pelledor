"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery } from "@tanstack/react-query";
import { Euro } from "lucide-react";

export default function AdminFinancePage() {
  const { data: finance, isLoading } = useQuery({
    queryKey: ["adminFinance"],
    queryFn: async () => {
      const res = await fetch("/api/admin/finance");
      if (!res.ok) throw new Error("Failed to fetch finance data");
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
          Revenus Holia
        </h1>
        <p className="text-anthracite/70">
          Commissions et abonnements de la plateforme
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-anthracite flex items-center gap-2">
              <Euro className="h-4 w-4" />
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {finance?.mrr?.toFixed(0) || "0"} €
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              Revenu récurrent mensuel
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-anthracite">
              Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {finance?.commissions?.toFixed(2) || "0.00"} €
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              Total des commissions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-anthracite">
              GMV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-anthracite">
              {finance?.gmv?.toFixed(0) || "0"} €
            </div>
            <p className="text-xs text-anthracite/60 mt-1">
              Volume d&apos;affaires total
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

