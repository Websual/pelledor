"use client";

import { Button } from "@/components/ui";
import { Calendar } from "lucide-react";

export function ScrollToBooking() {
  const handleClick = () => {
    const bookingElement = document.getElementById("booking-widget");
    if (bookingElement) {
      bookingElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Button
      onClick={handleClick}
      className="bg-sauge hover:bg-sauge-dark text-white"
    >
      <Calendar className="h-4 w-4 mr-2" />
      Prendre rendez-vous
    </Button>
  );
}

