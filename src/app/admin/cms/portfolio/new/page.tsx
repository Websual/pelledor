import { PortfolioProjectForm } from "../portfolio-project-form";

export default function NewPortfolioProjectPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Nouveau projet</h1>
      <PortfolioProjectForm />
    </div>
  );
}
