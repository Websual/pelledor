"use client";

export function MarkRead({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-blue-600 underline"
      onClick={() =>
        fetch("/api/modules/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }).then(() => window.location.reload())
      }
    >
      Marquer lu
    </button>
  );
}
