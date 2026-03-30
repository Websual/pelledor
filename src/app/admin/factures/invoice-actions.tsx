"use client";

export function InvoiceActions({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-xs text-emerald-700 underline"
      onClick={async () => {
        await fetch(`/api/modules/billing/invoices/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "paid" }),
        });
        window.location.reload();
      }}
    >
      Marquer payee
    </button>
  );
}
