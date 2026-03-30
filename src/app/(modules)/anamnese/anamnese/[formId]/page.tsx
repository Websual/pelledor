"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Field = {
  type: "text" | "textarea" | "select" | "checkbox";
  label: string;
  required?: boolean;
  options?: string[];
};

type Form = {
  id: string;
  title: string;
  fields: Field[];
};

export default function AnamnesePage() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/modules/anamnese/anamnese-forms/${formId}`)
      .then((r) => r.json())
      .then((d) => d.form && setForm(d.form));
  }, [formId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/modules/anamnese/anamnese-responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId, patientName, patientEmail, answers }),
    });
    const data = await res.json();
    if (data.ok) setSubmitted(true);
    else setError(data.error ?? "Erreur lors de l'envoi");
  }

  if (submitted)
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">Formulaire envoyé !</h1>
          <p className="text-gray-600">Votre praticien recevra vos réponses avant votre consultation.</p>
        </div>
      </div>
    );

  if (!form)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold mb-2">{form.title}</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Merci de remplir ce formulaire avant votre consultation. Vos réponses restent confidentielles.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Votre nom complet *</label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Votre email *</label>
            <input
              type="email"
              required
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {form.fields.map((field, i) => (
            <div key={i}>
              <label className="block text-sm font-medium mb-1">
                {field.label} {field.required && "*"}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  rows={3}
                  required={field.required}
                  value={answers[field.label] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [field.label]: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  value={answers[field.label] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [field.label]: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Sélectionner —</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required={field.required}
                  value={answers[field.label] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [field.label]: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Envoyer mes réponses
          </button>
        </form>
      </div>
    </div>
  );
}
