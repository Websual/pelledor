"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageSkeleton } from "@/components/page-skeleton";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type LogLevel = "INFO" | "WARN" | "ERROR";

interface Log {
  id: string;
  level: LogLevel;
  message: string;
  context: Record<string, unknown> | null;
  createdAt: string;
}

const LEVEL_OPTIONS: { value: "all" | LogLevel; label: string }[] = [
  { value: "all", label: "Tous les niveaux" },
  { value: "INFO", label: "INFO" },
  { value: "WARN", label: "WARN" },
  { value: "ERROR", label: "ERROR" },
];

function LevelBadge({ level }: { level: LogLevel }) {
  const styles: Record<LogLevel, string> = {
    INFO: "bg-blue-100 text-blue-800",
    WARN: "bg-amber-100 text-amber-800",
    ERROR: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {level}
    </span>
  );
}

export default function AdminLogsPage() {
  const [levelFilter, setLevelFilter] = useState<"" | LogLevel>("");
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["adminLogs", levelFilter],
    queryFn: async () => {
      const url = levelFilter ? `/api/admin/logs?level=${levelFilter}` : "/api/admin/logs";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json() as Promise<Log[]>;
    },
  });

  const purgeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/logs", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to purge logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLogs"] });
    },
  });

  const handlePurge = () => {
    if (window.confirm("Supprimer tous les logs ? Cette action est irréversible.")) {
      purgeMutation.mutate();
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading text-anthracite mb-2">
          Logs
        </h1>
        <p className="text-anthracite/70">
          Les 100 derniers logs applicatifs (emails, webhooks Stripe, etc.)
        </p>
      </div>

      <Card className="bg-white rounded-3xl shadow-sm border border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold text-anthracite">
            Logs système
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select
              value={levelFilter || "all"}
              onValueChange={(v) => setLevelFilter(v === "all" ? "" : (v as LogLevel))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par niveau" />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePurge}
              disabled={purgeMutation.isPending || logs.length === 0}
            >
              {purgeMutation.isPending ? "Suppression…" : "Purger les logs"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-anthracite/60 text-center py-8">
              Aucun log pour le moment. Les envois d&apos;emails et les webhooks Stripe alimenteront cette liste.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-anthracite/80 w-24">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-anthracite/80 w-20">Niveau</th>
                    <th className="text-left py-3 px-2 font-medium text-anthracite/80">Message</th>
                    <th className="text-left py-3 px-2 font-medium text-anthracite/80 w-32">Contexte</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2 text-anthracite/70 whitespace-nowrap">
                        {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                      </td>
                      <td className="py-2.5 px-2">
                        <LevelBadge level={log.level} />
                      </td>
                      <td className="py-2.5 px-2 text-anthracite max-w-md truncate" title={log.message}>
                        {log.message}
                      </td>
                      <td className="py-2.5 px-2">
                        {log.context && Object.keys(log.context).length > 0 ? (
                          <pre className="text-xs text-anthracite/70 bg-gray-100 rounded p-1.5 max-w-xs overflow-x-auto truncate" title={JSON.stringify(log.context)}>
                            {JSON.stringify(log.context)}
                          </pre>
                        ) : (
                          <span className="text-anthracite/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
