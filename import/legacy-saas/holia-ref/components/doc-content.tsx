"use client";

export function DocContent({ content }: { content: string }) {
  const html = content
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return "<h3 class=\"text-base font-semibold text-anthracite mt-4 mb-2\">" + line.slice(4) + "</h3>";
      if (line.startsWith("## ")) return "<h2 class=\"text-lg font-bold text-anthracite mt-6 mb-2\">" + line.slice(3) + "</h2>";
      if (/^\d+\. /.test(line)) {
        const inner = line.replace(/^\d+\. /, "")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-sauge hover:underline">$1</a>');
        return "<li>" + inner + "</li>";
      }
      const p = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-sauge hover:underline">$1</a>');
      return "<p class=\"my-2 text-anthracite/80\">" + p + "</p>";
    })
    .join("")
    .replace(/((?:<li>[\s\S]*?<\/li>)+)/g, '<ol class="list-decimal list-inside space-y-1 my-4 text-anthracite/80">$1</ol>');
  return <div className="doc-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
