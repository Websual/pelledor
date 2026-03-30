"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, Skeleton } from "@/components/ui";
import { ShoppingBag } from "lucide-react";

export default function BoutiquePage() {
  const session = useSession();
  const router = useRouter();
  const data = session?.data;

  if (!data || data.user.role !== "PRACTITIONER") {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  if (session.status === "loading") return <Skeleton />;

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <h1 className="text-2xl font-bold text-anthracite mb-8">Boutique</h1>
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto mb-6 text-anthracite/30" />
            <p className="text-anthracite/70 text-lg">Bientôt disponible</p>
            <p className="text-anthracite/60 text-sm mt-2 max-w-md mx-auto">
              Gérez vos produits (ebooks, guides, accessoires…) et proposez-les directement aux patients depuis votre profil.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
