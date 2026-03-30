import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos | Holia - Réinventer l'accès au bien-être",
  description:
    "Découvrez l'histoire de Holia, conçu à Idron par Websual. Une plateforme française pour une santé holistique, transparente et accessible.",
  openGraph: {
    title: "À propos | Holia - Réinventer l'accès au bien-être",
    description:
      "Découvrez l'histoire de Holia, conçu à Idron par Websual. Une plateforme française pour une santé holistique, transparente et accessible.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
