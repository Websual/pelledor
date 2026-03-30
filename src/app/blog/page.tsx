import Link from "next/link";

export default async function BlogPage() {
  const base = process.env.AUTH_URL || "http://localhost:3000";
  const r = await fetch(`${base}/api/modules/blog/posts`, { cache: "no-store" });
  const { posts = [] } = r.ok ? await r.json() : {};

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Blog</h1>
      <ul className="mt-6 space-y-3">
        {posts.map(
          (p: { slug: string; title: string; createdAt: string }) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="text-lg hover:underline">
                {p.title}
              </Link>
              <div className="text-xs text-neutral-500">
                {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </li>
          )
        )}
      </ul>
    </main>
  );
}
