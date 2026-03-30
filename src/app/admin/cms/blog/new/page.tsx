import { BlogPostForm } from "../blog-post-form";

export default function NewBlogPostPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Nouvel article</h1>
      <BlogPostForm />
    </div>
  );
}
