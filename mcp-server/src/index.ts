import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Variable d'environnement requise : ${name}`);
  return v;
}

function apiBase(): string {
  return requireEnv("PELLEDOR_MCP_BASE_URL").replace(/\/$/, "");
}

function bearer(): string {
  return requireEnv("PELLEDOR_AGENT_TOKEN");
}

async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${bearer()}`);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function toolText(data: unknown, isError?: boolean) {
  const text =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text" as const, text }],
    ...(isError ? { isError: true as const } : {}),
  };
}

const server = new McpServer({
  name: "saas-os-cms",
  version: "0.1.0",
});

server.registerTool(
  "cms_get_bundle",
  {
    description:
      "Exporte le thème résolu (tokens) et toutes les pages builder du praticien configuré par PELLEDOR_AGENT_PRACTITIONER_ID côté serveur.",
    inputSchema: {},
  },
  async () => {
    const r = await apiFetch("/api/modules/page-builder/cms-bundle");
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

server.registerTool(
  "cms_list_pages",
  {
    description:
      "Liste les entrées page_blocks (brut JSON) du praticien agent.",
    inputSchema: {},
  },
  async () => {
    const r = await apiFetch("/api/modules/page-builder/pages");
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

server.registerTool(
  "cms_upsert_page",
  {
    description:
      "Crée ou met à jour une page du builder (document v1 ou liste de blocs). Champs SEO optionnels : metaTitle, metaDescription, canonicalUrl, og*, noindex, targetKeyword.",
    inputSchema: {
      pageSlug: z.string().describe("Slug de page, ex. home, contact"),
      document: z
        .unknown()
        .optional()
        .describe("PageDocumentV1 { version: 1, rows: [...] }"),
      blocks: z.unknown().optional().describe("Alias de document / liste plate"),
      publish: z
        .boolean()
        .optional()
        .describe("Si true, définit publishedAt à maintenant"),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      canonicalUrl: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      ogImageUrl: z.string().optional(),
      noindex: z.boolean().optional(),
      targetKeyword: z.string().optional(),
    },
  },
  async (args) => {
    const body: Record<string, unknown> = {
      pageSlug: args.pageSlug,
      publish: args.publish === true,
    };
    if (args.document !== undefined) body.document = args.document;
    if (args.blocks !== undefined) body.blocks = args.blocks;
    const seoKeys = [
      "metaTitle",
      "metaDescription",
      "canonicalUrl",
      "ogTitle",
      "ogDescription",
      "ogImageUrl",
      "noindex",
      "targetKeyword",
    ] as const;
    for (const k of seoKeys) {
      const v = args[k];
      if (v !== undefined) body[k] = v;
    }
    const r = await apiFetch("/api/modules/page-builder/pages", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

server.registerTool(
  "cms_import_pages",
  {
    description:
      "POST cms-bundle : importe un tableau de pages. La clé theme est ignorée sauf si le serveur a PELLEDOR_AGENT_ALLOW_THEME=true.",
    inputSchema: {
      pages: z
        .array(
          z.object({
            pageSlug: z.string(),
            document: z.unknown().optional(),
            blocks: z.unknown().optional(),
            publish: z.boolean().optional(),
          })
        )
        .describe("Pages à fusionner"),
    },
  },
  async ({ pages }) => {
    const r = await apiFetch("/api/modules/page-builder/cms-bundle", {
      method: "POST",
      body: JSON.stringify({ pages }),
    });
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

server.registerTool(
  "blog_list_posts",
  {
    description: "Liste les articles blog du praticien agent.",
    inputSchema: {},
  },
  async () => {
    const r = await apiFetch("/api/modules/cms/blog/posts");
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

server.registerTool(
  "blog_get_post",
  {
    description: "Charge un article par id UUID.",
    inputSchema: { id: z.string().uuid() },
  },
  async ({ id }) => {
    const r = await apiFetch(`/api/modules/cms/blog/posts/${id}`);
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

server.registerTool(
  "blog_create_post",
  {
    description:
      "Crée un article (title requis). Voir OpenAPI pour les champs SEO et bodyDocument.",
    inputSchema: {
      title: z.string(),
      slug: z.string().optional(),
      excerpt: z.string().optional(),
      bodyHtml: z.string().optional(),
      bodyDocument: z.unknown().optional(),
      coverImageUrl: z.string().nullable().optional(),
      categoryId: z.string().nullable().optional(),
      publish: z.boolean().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      canonicalUrl: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      ogImageUrl: z.string().optional(),
      noindex: z.boolean().optional(),
      targetKeyword: z.string().optional(),
    },
  },
  async (args) => {
    const r = await apiFetch("/api/modules/cms/blog/posts", {
      method: "POST",
      body: JSON.stringify(args),
    });
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

server.registerTool(
  "blog_update_post",
  {
    description:
      "Met à jour un article existant (PATCH). Passer patchJson : objet JSON stringifié des champs à modifier.",
    inputSchema: {
      id: z.string().uuid(),
      patchJson: z
        .string()
        .describe(
          "Corps JSON, ex. {\"title\":\"...\",\"publish\":true,\"metaTitle\":\"...\"}"
        ),
    },
  },
  async ({ id, patchJson }) => {
    let patch: unknown;
    try {
      patch = JSON.parse(patchJson) as unknown;
    } catch {
      return toolText({ error: "patchJson n'est pas du JSON valide" }, true);
    }
    const r = await apiFetch(`/api/modules/cms/blog/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

server.registerTool(
  "blog_list_categories",
  {
    description: "Liste les catégories blog du praticien.",
    inputSchema: {},
  },
  async () => {
    const r = await apiFetch("/api/modules/cms/blog/categories");
    if (!r.ok) return toolText(r.data ?? { status: r.status }, true);
    return toolText(r.data);
  }
);

async function main() {
  void apiBase();
  void bearer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
