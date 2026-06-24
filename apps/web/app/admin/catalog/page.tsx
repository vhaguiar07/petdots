"use client";

import { useEffect, useState } from "react";
import { ApiError, CatalogProductStatus, type CatalogProduct, type PaginatedResult } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";

type FilterStatus = "PENDING_REVIEW" | "ACTIVE" | "REJECTED";

const TABS: { value: FilterStatus; label: string }[] = [
  { value: "PENDING_REVIEW", label: "Pendentes" },
  { value: "ACTIVE", label: "Aprovados" },
  { value: "REJECTED", label: "Rejeitados" },
];

const STATUS_BADGE: Record<FilterStatus, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

const PAGE_SIZE = 10;

export default function AdminCatalogPage() {
  const [tab, setTab] = useState<FilterStatus>("PENDING_REVIEW");
  const [result, setResult] = useState<PaginatedResult<CatalogProduct> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    load(page);
  }, [tab, page]);

  async function load(currentPage: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.adminListCatalogProducts({
        status: tab,
        page: currentPage,
        pageSize: PAGE_SIZE,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }

  const handleTabChange = (value: FilterStatus) => {
    setTab(value);
    setPage(1);
  };

  async function updateStatus(id: string, status: "ACTIVE" | "REJECTED") {
    setActionLoading(id);
    try {
      await apiClient.adminUpdateCatalogProductStatus(id, { status });
      if (result) {
        setResult({
          ...result,
          items: result.items.filter((p) => p.id !== id),
          total: result.total - 1,
        });
      }
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Erro ao atualizar status");
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Catálogo Global de Produtos</h2>
        <p className="text-sm text-ink-muted mt-1">
          Produtos criados por lojistas que aguardam aprovação para serem reutilizados no catálogo global.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t.value
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-ink-muted hover:text-primary-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-muted text-sm">
          Carregando...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : !result || result.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-ink-muted text-sm gap-2">
          <span className="text-3xl">✓</span>
          <span>Nenhum produto {tab === "PENDING_REVIEW" ? "pendente" : tab === "ACTIVE" ? "aprovado" : "rejeitado"}</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-3">
            {result.items.map((product) => (
              <div
                key={product.id}
                className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4"
              >
                {/* Image */}
                <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-surface-muted">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-ink-muted text-xs">
                      Sem foto
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink text-sm">{product.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[product.status as FilterStatus] ?? ""}`}
                    >
                      {product.status === CatalogProductStatus.PENDING_REVIEW
                        ? "Pendente"
                        : product.status === CatalogProductStatus.ACTIVE
                        ? "Aprovado"
                        : "Rejeitado"}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
                    {product.brand?.name && <span>Marca: <strong className="text-ink">{product.brand.name}</strong></span>}
                    {product.barcode && <span>Cód. barras: <strong className="text-ink">{product.barcode}</strong></span>}
                    {product.category && <span>Categoria: <strong className="text-ink">{product.category.name}</strong></span>}
                    {product.petType && <span>Pet: <strong className="text-ink">{product.petType.name}</strong></span>}
                  </div>

                  {product.description && (
                    <p className="mt-1 text-xs text-ink-muted line-clamp-2">{product.description}</p>
                  )}
                </div>

                {/* Actions */}
                {tab === "PENDING_REVIEW" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus(product.id, "ACTIVE")}
                      disabled={actionLoading === product.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => updateStatus(product.id, "REJECTED")}
                      disabled={actionLoading === product.id}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                    >
                      Rejeitar
                    </button>
                  </div>
                )}

                {tab === "REJECTED" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus(product.id, "ACTIVE")}
                      disabled={actionLoading === product.id}
                      className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition"
                    >
                      Aprovar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {result.total > 0 && (
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
      )}
    </div>
  );
}
