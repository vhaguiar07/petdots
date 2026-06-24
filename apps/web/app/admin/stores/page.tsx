"use client";

import { useEffect, useState } from "react";
import { ApiError, type Store, type StoreStatus, type PaginatedResult } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";

const STATUS_FILTERS: { value: StoreStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDING_APPROVAL", label: "Pendentes" },
  { value: "ACTIVE", label: "Ativas" },
  { value: "SUSPENDED", label: "Suspensas" },
];

const STATUS_LABELS: Record<StoreStatus, string> = {
  PENDING_APPROVAL: "Pendente",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
};

const STATUS_STYLES: Record<StoreStatus, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 10;

export default function AdminStoresPage() {
  const [result, setResult] = useState<PaginatedResult<Store> | null>(null);
  const [statusFilter, setStatusFilter] = useState<StoreStatus | "">("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadStores = (status: StoreStatus | "", currentPage: number) => {
    apiClient
      .adminListStores({
        status: status || undefined,
        page: currentPage,
        pageSize: PAGE_SIZE,
      })
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar as lojas."));
  };

  useEffect(() => {
    loadStores(statusFilter, page);
  }, [statusFilter, page]);

  const handleFilterChange = (value: StoreStatus | "") => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleStatusChange = async (id: string, status: StoreStatus) => {
    setUpdatingId(id);
    setError(null);
    try {
      await apiClient.adminUpdateStoreStatus(id, { status });
      loadStores(statusFilter, page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar a loja.");
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleFilterChange(filter.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === filter.value
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
      {result?.items.length === 0 && <p className="mt-4 text-sm text-ink-muted">Nenhuma loja encontrada.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {result?.items.map((store) => (
          <div
            key={store.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{store.name}</p>
              <p className="text-xs text-ink-muted">
                Dono: {store.owner?.name} ({store.owner?.email})
              </p>
              {store.description && (
                <p className="mt-1 max-w-md text-sm text-ink-muted">{store.description}</p>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[store.status]}`}>
                {STATUS_LABELS[store.status]}
              </span>

              {store.status !== "ACTIVE" && (
                <button
                  onClick={() => handleStatusChange(store.id, "ACTIVE")}
                  disabled={updatingId === store.id}
                  className="rounded-full bg-primary-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
                >
                  Aprovar
                </button>
              )}
              {store.status !== "SUSPENDED" && (
                <button
                  onClick={() => handleStatusChange(store.id, "SUSPENDED")}
                  disabled={updatingId === store.id}
                  className="rounded-full border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Suspender
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {result && result.total > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm">
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
