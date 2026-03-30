"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { FavoriteButton } from "@/components/favorite-button";



interface PractitionerSidebarProps {
  practitionerId: string;
  services: Array<{
    id: string;
    name: string;
  }>;
}

export function PractitionerSidebar({
  practitionerId,
  services,
}: PractitionerSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Réserver</CardTitle>
      </CardHeader>
      <CardContent>
        {services.length > 0 ? (
          <div className="space-y-3">
            {services.map((service) => (
              <Button key={service.id} asChild className="w-full" variant="outline">
                <Link href={`/book/${service.id}`}>
                  Réserver {service.name}
                </Link>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-anthracite/70 text-sm">
            Aucun service disponible pour le moment.
          </p>
        )}
        <div className="mt-4 pt-4 border-t border-sable">
          <FavoriteButton practitionerId={practitionerId} className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

