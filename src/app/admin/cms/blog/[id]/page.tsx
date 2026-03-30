import { BlogPostForm } from "../blog-post-form";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Éditer l’article</h1>
      <BlogPostForm postId={id} />
    </div>
  );
}
