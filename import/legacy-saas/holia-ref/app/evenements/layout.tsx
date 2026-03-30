import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conférences & ateliers bien-être | Holia",
  description:
    "Découvrez les prochains événements, conférences et ateliers bien-être partout en France. Réservez votre place en quelques clics.",
  openGraph: {
    title: "Conférences & ateliers bien-être | Holia",
    description: "Découvrez les prochains événements bien-être partout en France.",
  },
};

export default function EvenementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
