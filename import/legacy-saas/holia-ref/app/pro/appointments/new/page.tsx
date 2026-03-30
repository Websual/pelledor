"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewAppointmentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to calendar page where user can select a date to create appointment
    router.push("/pro/calendar");
  }, [router]);

  return (
    <div className="p-6 lg:ml-[280px]">
      <div className="max-w-4xl mx-auto">
        <p className="text-anthracite/70">Redirection vers le calendrier...</p>
      </div>
    </div>
  );
}


