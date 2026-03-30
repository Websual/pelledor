import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content", "aide");

export type DocTarget = "pro" | "patient";

export interface DocFrontmatter {
  title: string;
  description: string;
  target: DocTarget;
  category: string;
}

export interface DocArticle {
  slug: string;
  categoryId: string;
  content: string;
  frontmatter: DocFrontmatter;
}

export interface DocCategory {
  id: string;
  label: string;
  articles: { slug: string; frontmatter: DocFrontmatter }[];
}

/** Liste toutes les catégories et articles d'un profil */
export function listArticlesByProfile(profile: DocTarget): DocCategory[] {
  const profileDir = path.join(CONTENT_DIR, profile);
  if (!fs.existsSync(profileDir)) return [];

  const categories: DocCategory[] = [];
  const categoryDirs = fs.readdirSync(profileDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const catDir of categoryDirs) {
    const catPath = path.join(profileDir, catDir.name);
    const files = fs.readdirSync(catPath).filter((f) => f.endsWith(".mdx"));
    const articles: { slug: string; frontmatter: DocFrontmatter }[] = [];
    let categoryLabel = catDir.name;

    for (const file of files) {
      const slug = file.replace(/\.mdx$/, "");
      const filePath = path.join(catPath, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(raw);
      const frontmatter = data as DocFrontmatter;
      if (frontmatter.category) categoryLabel = frontmatter.category;
      articles.push({ slug, frontmatter });
    }

    if (articles.length > 0) {
      categories.push({
        id: catDir.name,
        label: categoryLabel,
        articles,
      });
    }
  }

  return categories;
}

/** Lit le contenu d'un article spécifique */
export function getArticle(profile: DocTarget, categoryId: string, slug: string): DocArticle | null {
  const filePath = path.join(CONTENT_DIR, profile, categoryId, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const frontmatter = data as DocFrontmatter;

  if (frontmatter.target !== profile) return null;

  return {
    slug,
    categoryId,
    content: content.trim(),
    frontmatter,
  };
}

/** Liste tous les articles (pour recherche) */
export function getAllArticles(): { profile: DocTarget; category: DocCategory; article: { slug: string; frontmatter: DocFrontmatter } }[] {
  const result: { profile: DocTarget; category: DocCategory; article: { slug: string; frontmatter: DocFrontmatter } }[] = [];
  const profiles: DocTarget[] = ["pro", "patient"];

  for (const profile of profiles) {
    const categories = listArticlesByProfile(profile);
    for (const category of categories) {
      for (const article of category.articles) {
        result.push({ profile, category, article });
      }
    }
  }

  return result;
}

/** Recherche d'articles par mot-clé (titre, description, contenu) */
export function searchArticles(
  query: string,
  profile?: DocTarget
): { profile: DocTarget; category: DocCategory; article: { slug: string; frontmatter: DocFrontmatter }; content: string }[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const items = getAllArticles();
  const filtered = profile ? items.filter((i) => i.profile === profile) : items;
  const results: { profile: DocTarget; category: DocCategory; article: { slug: string; frontmatter: DocFrontmatter }; content: string }[] = [];

  for (const { profile: p, category, article } of filtered) {
    const doc = getArticle(p, category.id, article.slug);
    if (!doc) continue;

    const searchable =
      `${doc.frontmatter.title} ${doc.frontmatter.description} ${doc.content}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({ profile: p, category, article, content: doc.content });
    }
  }

  return results;
}
