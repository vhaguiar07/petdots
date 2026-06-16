"use client";

import { useEffect, useState } from "react";
import { ApiError, type AuditLog, type PaginatedResult } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";

const ENTITY_FILTERS = [
  { value: "", label: "Todas" },
  { value: "Store", label: "Loja" },
  { value: "Product", label: "Produto" },
  { value: "Promotion", label: "Promoção" },
  { value: "Category", label: "Categoria" },
  { value: "Address", label: "Endereço" },
  { value: "Order", label: "Pedido" },
  { value: "User", label: "Usuário" },
];

const PAGE_SIZE = 20;

export default function AdminAuditLogsPage() {
  const [result, setResult] = useState<PaginatedResult<AuditLog> | null>(null);
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .adminListAuditLogs({ entity: entityFilter || undefined, page, pageSize: PAGE_SIZE })
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar os logs."));
  }, [entityFilter, page]);

  const handleEntityChange = (value: string) => {
    setEntityFilter(value);
    setPage(1);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ENTITY_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleEntityChange(filter.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              entityFilter === filter.value
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-border text-ink-muted hover:border-primary-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {result === null && !error && <p className="mt-4 text-sm text-ink-muted">Carregando...</p>}
      {result?.items.length === 0 && <p className="mt-4 text-sm text-ink-muted">Nenhum log encontrado.</p>}

      <div className="mt-4 flex flex-col gap-2">
        {result?.items.map((log) => (
          <div key={log.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-ink">
                {log.action} <span className="text-ink-muted">{log.entity}</span>
                {log.entityId && <span className="text-ink-muted"> #{log.entityId}</span>}
              </p>
              <p className="text-xs text-ink-muted">
                {new Date(log.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {log.user ? `${log.user.name} (${log.user.email})` : "Sistema"}
            </p>
          </div>
        ))}
      </div>

      {result && result.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border border-border px-3 py-1.5 text-ink-muted transition hover:border-primary-500 hover:text-primary-600 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-ink-muted">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full border border-border px-3 py-1.5 text-ink-muted transition hover:border-primary-500 hover:text-primary-600 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
