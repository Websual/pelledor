import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Holia",
  description: "Contactez l'équipe Holia pour toute question. Formulaire de contact, coordonnées et FAQ.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
