import { PortfolioProjectForm } from "../portfolio-project-form";

export default async function EditPortfolioProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Éditer le projet</h1>
      <PortfolioProjectForm projectId={id} />
    </div>
  );
}
