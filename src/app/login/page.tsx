import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  if (session?.user) {
    redirect(sp.callbackUrl ?? "/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-xl font-semibold">Connexion</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Compte administrateur cree a l installation.
      </p>
      <LoginForm callbackUrl={sp.callbackUrl ?? "/admin"} />
    </main>
  );
}
