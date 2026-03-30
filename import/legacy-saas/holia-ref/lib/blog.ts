import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogFrontmatter {
  title: string;
  description: string;
  date: string; // ISO date YYYY-MM-DD
  category: string;
  readingTime: number; // minutes
  image?: string; // path e.g. /images/blog/xxx.webp
  excerpt?: string;
  published?: boolean; // default true si absent
}

export interface BlogPost {
  slug: string;
  content: string;
  frontmatter: BlogFrontmatter;
}

function normalizeFrontmatter(data: Record<string, unknown>): BlogFrontmatter {
  return {
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    date: String(data.date ?? ""),
    category: String(data.category ?? ""),
    readingTime: typeof data.readingTime === "number" ? data.readingTime : 0,
    image: data.image != null ? String(data.image) : undefined,
    excerpt: data.excerpt != null ? String(data.excerpt) : undefined,
    published: data.published === false ? false : true,
  };
}

function readAllPosts(): { slug: string; frontmatter: BlogFrontmatter }[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));
  const posts: { slug: string; frontmatter: BlogFrontmatter }[] = [];

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const filePath = path.join(BLOG_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    posts.push({ slug, frontmatter: normalizeFrontmatter(data as Record<string, unknown>) });
  }

  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );
}

/** Liste tous les articles publiés, triés par date (plus récent en premier) */
export function listBlogPosts(): { slug: string; frontmatter: BlogFrontmatter }[] {
  return readAllPosts().filter((p) => p.frontmatter.published !== false);
}

/**
 * Récupère les derniers articles publiés.
 * @param limit - Nombre max d'articles à retourner
 * @param category - Filtre optionnel par catégorie (ex. "Conseils Pro")
 */
export function getLatestPosts(
  limit: number,
  category?: string
): { slug: string; frontmatter: BlogFrontmatter }[] {
  let posts = readAllPosts().filter((p) => p.frontmatter.published !== false);
  if (category != null && category !== "") {
    posts = posts.filter(
      (p) => p.frontmatter.category?.toLowerCase() === category.toLowerCase()
    );
  }
  return posts.slice(0, limit);
}

/** Lit un article du blog par son slug */
export function getBlogPost(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const frontmatter = normalizeFrontmatter(data as Record<string, unknown>);

  return {
    slug,
    content: content.trim(),
    frontmatter,
  };
}

/** Liste les slugs pour generateStaticParams */
export function getAllBlogSlugs(): string[] {
  return listBlogPosts().map((p) => p.slug);
}

/** Article précédent et suivant pour la navigation "Lire aussi" */
export function getPrevNextPost(
  currentSlug: string
): {
  prev: { slug: string; frontmatter: BlogFrontmatter } | null;
  next: { slug: string; frontmatter: BlogFrontmatter } | null;
} {
  const posts = listBlogPosts();
  const index = posts.findIndex((p) => p.slug === currentSlug);
  if (index === -1) return { prev: null, next: null };

  return {
    prev: index < posts.length - 1 ? posts[index + 1]! : null,
    next: index > 0 ? posts[index - 1]! : null,
  };
}
