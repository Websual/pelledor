import Link from "next/link";
import { notFound } from "next/navigation";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const base = process.env.AUTH_URL || "http://localhost:3000";
  const r = await fetch(`${base}/api/modules/blog/posts?slug=${slug}`, {
    cache: "no-store",
  });
  if (!r.ok) notFound();
  const { post } = await r.json();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/blog" className="text-sm underline">
        Blog
      </Link>
      <article className="mt-6">
        <h1 className="text-2xl font-semibold">{post.title}</h1>
        <div className="prose mt-6 whitespace-pre-wrap">{post.body}</div>
      </article>
    </main>
  );
}
