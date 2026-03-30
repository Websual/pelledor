import { auth } from "@/auth";
import { bootstrapServer } from "@/core/bootstrap-server";
import { Hooks } from "@/core/events/hooks";

bootstrapServer();
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSignOut } from "./sign-out";
import { ThemeStyle } from "./theme-style";

export default async function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const menuLinks = await Hooks.applyFilters("admin_sidebar_menu", [] as { title: string; url: string }[]);

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--color-background, #fafafa)" }}
    >
      <ThemeStyle />
      <aside
        className="w-56 shrink-0 border-r bg-white px-3 py-4"
        style={{
          borderColor: "var(--color-border, #e5e5e5)",
        }}
      >
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Admin
          </span>
          <Link
            href="/"
            className="text-xs text-neutral-400 hover:text-neutral-700"
            title="Voir le site"
          >
            ← Site
          </Link>
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          {menuLinks.map((link) => (
            <Link
              key={link.url}
              href={link.url}
              className="rounded-md px-2 py-1.5 text-sm text-neutral-800 hover:bg-neutral-100"
            >
              {link.title}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-neutral-100 pt-4 px-2">
          <p className="truncate text-xs text-neutral-500">{session.user.email}</p>
          <AdminSignOut />
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-8">{children}</div>
    </div>
  );
}
