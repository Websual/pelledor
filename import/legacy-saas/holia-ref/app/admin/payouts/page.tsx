"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { useQuery } from "@tanstack/react-query";

export default function AdminPayoutsPage() {
  const { data: payouts, isLoading } = useQuery({
    queryKey: ["adminPayouts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payouts");
      if (!res.ok) throw new Error("Failed to fetch payouts");
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
          Payouts
        </h1>
        <p className="text-anthracite/70">
          Suivi des virements vers les praticiens
        </p>
      </div>

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-anthracite">
            Virements ({payouts?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payouts && payouts.length > 0 ? (
            <div className="space-y-3">
              {payouts.map((payout: any) => (
                <div key={payout.id} className="p-4 border border-gray-200 rounded-2xl">
                  <p className="font-semibold text-anthracite">{payout.practitioner}</p>
                  <p className="text-sm text-anthracite/70">{payout.amount} €</p>
                  <p className="text-xs text-anthracite/60 mt-1">{payout.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-anthracite/60 text-center py-4">
              Aucun virement
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

