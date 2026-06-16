"use client";

import { useEffect, useState } from "react";
import { ApiError, type Store, type StoreReview } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";

export default function DashboardReviewsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getMyStore()
      .then((result) => {
        if (!result) return;
        setStore(result);
        return apiClient.listStoreReviews(result.id).then(setReviews);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar as informações da loja."));
  }, []);

  const avgRating = (store?.avgRating ?? 0).toFixed(1);

  const handleStartReply = (review: StoreReview) => {
    setReplyError(null);
    setEditingReplyId(review.id);
    setReplyDrafts((prev) => ({ ...prev, [review.id]: review.ownerReply ?? "" }));
  };

  const handleCancelReply = (reviewId: string) => {
    setEditingReplyId(null);
    setReplyDrafts((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!store) return;
    const reply = (replyDrafts[reviewId] ?? "").trim();
    if (!reply) return;

    setReplyError(null);
    setSubmittingReplyId(reviewId);
    try {
      const updated = await apiClient.replyToStoreReview(store.id, reviewId, { reply });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setEditingReplyId(null);
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : "Não foi possível enviar a resposta.");
    } finally {
      setSubmittingReplyId(null);
    }
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!store) {
    return <p className="text-sm text-ink-muted">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Row */}
      <div className="bg-surface border border-border p-5 rounded-2xl shadow-xs select-none">
        <h2 className="text-sm font-bold text-ink">Avaliações Recebidas</h2>
        <p className="text-[10px] text-ink-muted mt-0.5">
          Monitore a satisfação dos clientes em relação aos pedidos e atendimento da sua petshop.
        </p>
      </div>

      {replyError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
          {replyError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rating statistics card */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm select-none flex flex-col justify-between h-48">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted/80">Nota Geral</span>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-5xl font-black text-ink">{avgRating}</h3>
              <span className="text-sm font-bold text-ink-muted">/ 5.0</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => {
                const val = Math.round(Number(avgRating));
                return (
                  <svg key={star} className={`h-5 w-5 ${star <= val ? "text-amber-500" : "text-zinc-200"}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                );
              })}
            </div>
            <span className="text-xs font-bold text-ink-muted">({store.reviewCount} depoimentos)</span>
          </div>
        </div>

        {/* Stars distribution card */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm select-none md:col-span-2 space-y-2 flex flex-col justify-center min-h-48">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted/80 mb-2 block">Distribuição de Estrelas</span>
          {[5, 4, 3, 2, 1].map((starVal) => {
            const count = reviews.filter((r) => r.rating === starVal).length;
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={starVal} className="flex items-center gap-3">
                <span className="text-xs font-bold text-ink w-3 text-right">{starVal}</span>
                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-ink-muted w-6">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews list card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-ink pb-4 border-b border-border">Histórico de Depoimentos</h3>

        {reviews.length === 0 ? (
          <p className="text-sm text-ink-muted mt-4">Sua loja ainda não tem avaliações registradas.</p>
        ) : (
          <div className="divide-y divide-border space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="pt-4 first:pt-0 space-y-2 select-none">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-100 border border-zinc-200 text-primary-500 font-extrabold flex items-center justify-center text-sm">
                      {(rev.customer?.name ?? "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-ink block">{rev.customer?.name ?? "Cliente"}</span>
                      <div className="flex text-amber-500 gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`h-3 w-3 ${star <= rev.rating ? "text-amber-500" : "text-zinc-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    {new Date(rev.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                {rev.comment && (
                  <p className="text-xs text-ink-muted leading-relaxed pl-12 whitespace-pre-wrap">{rev.comment}</p>
                )}

                {/* Owner reply */}
                {editingReplyId === rev.id ? (
                  <div className="pl-12 space-y-2">
                    <textarea
                      rows={2}
                      value={replyDrafts[rev.id] ?? ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [rev.id]: e.target.value }))}
                      placeholder="Escreva uma resposta para este cliente..."
                      className="w-full rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCancelReply(rev.id)}
                        disabled={submittingReplyId === rev.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-bold text-ink-muted hover:bg-zinc-50 transition cursor-pointer disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitReply(rev.id)}
                        disabled={submittingReplyId === rev.id || !(replyDrafts[rev.id] ?? "").trim()}
                        className="rounded-lg bg-primary-500 hover:bg-primary-600 px-3 py-1.5 text-[10px] font-bold text-white transition cursor-pointer disabled:opacity-60"
                      >
                        {submittingReplyId === rev.id ? "Enviando..." : "Enviar resposta"}
                      </button>
                    </div>
                  </div>
                ) : rev.ownerReply ? (
                  <div className="pl-12">
                    <div className="rounded-xl border border-primary-100 bg-primary-50 p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600">Sua resposta</p>
                      <p className="mt-1 text-xs text-ink-muted leading-relaxed whitespace-pre-wrap">{rev.ownerReply}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartReply(rev)}
                      className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-primary-500 hover:text-primary-600 transition cursor-pointer"
                    >
                      Editar resposta
                    </button>
                  </div>
                ) : (
                  <div className="pl-12">
                    <button
                      type="button"
                      onClick={() => handleStartReply(rev)}
                      className="text-[10px] font-extrabold uppercase tracking-wider text-primary-500 hover:text-primary-600 border border-primary-500/20 rounded-lg px-2.5 py-1 hover:bg-primary-50 transition cursor-pointer select-none active:scale-95"
                    >
                      Responder
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
