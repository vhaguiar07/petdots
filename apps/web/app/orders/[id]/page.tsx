"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiError, OrderStatus, type Order, type StoreProduct, type ProductReview } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/pricing";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, isOrderCancellable } from "@/lib/order-status";
import { useOrdersSocket } from "@/lib/use-orders-socket";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // States for review modal preview
  const [reviewingProduct, setReviewingProduct] = useState<StoreProduct | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submittedReview, setSubmittedReview] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [myReviews, setMyReviews] = useState<Record<string, ProductReview>>({});

  const handleOpenReviewModal = (product: StoreProduct | undefined) => {
    if (!product) return;
    const existing = myReviews[product.id];
    setReviewingProduct(product);
    setRating(existing?.rating ?? 5);
    setHoverRating(null);
    setComment(existing?.comment ?? "");
    setSubmittedReview(null);
    setReviewError(null);
  };

  const handleCloseReviewModal = () => {
    setReviewingProduct(null);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingProduct) return;

    setReviewError(null);
    setIsSubmittingReview(true);
    try {
      const review = await apiClient.upsertProductReview(reviewingProduct.id, {
        rating,
        comment: comment || undefined,
      });
      setMyReviews((prev) => ({ ...prev, [reviewingProduct.id]: review }));
      setSubmittedReview("Avaliação enviada com sucesso! Obrigado por compartilhar sua opinião.");
      setTimeout(() => {
        handleCloseReviewModal();
      }, 2200);
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : "Não foi possível enviar a avaliação.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const loadOrder = () => {
    apiClient
      .getOrder(id)
      .then(setOrder)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar o pedido."),
      );
  };

  useEffect(() => {
    if (user) loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  useOrdersSocket({
    onOrderUpdated: (updated) => {
      if (updated.id === id) setOrder(updated);
    },
  });

  useEffect(() => {
    if (!order || !user || order.status !== OrderStatus.DELIVERED) return;

    const productIds = Array.from(
      new Set(order.items.map((item) => item.storeProduct?.id).filter((id): id is string => Boolean(id))),
    );

    Promise.all(
      productIds.map((productId) =>
        apiClient
          .listProductReviews(productId)
          .then((reviews) => [productId, reviews.find((r) => r.customerId === user.id)] as const)
          .catch(() => [productId, undefined] as const),
      ),
    ).then((results) => {
      setMyReviews((prev) => {
        const next = { ...prev };
        for (const [productId, review] of results) {
          if (review) next[productId] = review;
        }
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status, user]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await apiClient.cancelOrder(id);
      setShowCancelConfirm(false);
      loadOrder();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível cancelar o pedido.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <p className="text-sm text-ink-muted">Carregando pedido...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pedido</h1>
          <p className="text-sm text-ink-muted">{order.store?.name ?? "Loja"}</p>
          <p className="text-xs text-ink-muted">
            {new Date(order.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_STYLES[order.status]}`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-50 text-xl">
              {item.storeProduct?.catalogProduct?.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.storeProduct.catalogProduct.images[0].url}
                  alt={item.storeProduct.catalogProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{item.storeProduct?.catalogProduct?.name ?? "Produto"}</p>
              <p className="text-sm text-ink-muted">
                {item.quantity} x {formatCurrency(Number(item.unitPrice))}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <p className="text-sm font-semibold text-ink">
                {formatCurrency(Number(item.unitPrice) * item.quantity)}
              </p>
              {item.storeProduct && order.status === OrderStatus.DELIVERED && (
                <button
                  onClick={() => handleOpenReviewModal(item.storeProduct)}
                  className="text-[10px] font-extrabold uppercase tracking-wider text-primary-500 hover:text-primary-600 border border-primary-500/20 rounded-lg px-2.5 py-1 hover:bg-primary-50 transition cursor-pointer select-none active:scale-95"
                >
                  {myReviews[item.storeProduct.id] ? "Editar avaliação" : "Avaliar"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {order.address && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Endereço de entrega</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {order.address.street}, {order.address.number}
            {order.address.complement ? ` - ${order.address.complement}` : ""} —{" "}
            {order.address.neighborhood}, {order.address.city}/{order.address.state} —{" "}
            {order.address.zipCode}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">Subtotal</span>
          <span className="text-ink">{formatCurrency(Number(order.subtotal))}</span>
        </div>
        {Number(order.discountTotal) > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Descontos</span>
            <span className="text-primary-600">-{formatCurrency(Number(order.discountTotal))}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">Entrega</span>
          <span className="text-ink">{formatCurrency(Number(order.deliveryFee))}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-bold">
          <span className="text-ink">Total</span>
          <span className="text-ink">{formatCurrency(Number(order.total))}</span>
        </div>
      </div>

      {isOrderCancellable(order.status) && (
        <button
          onClick={() => setShowCancelConfirm(true)}
          disabled={isCancelling}
          className="mt-6 w-full rounded-full border border-red-300 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 cursor-pointer"
        >
          {isCancelling ? "Cancelando..." : "Cancelar pedido"}
        </button>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelConfirm && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancelling) {
              setShowCancelConfirm(false);
            }
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-sm w-full p-6 md:p-8 shadow-2xl relative space-y-5 select-none animate-in fade-in-50 zoom-in-95 duration-200 cursor-default">
            {/* Close Button */}
            <button
              onClick={() => !isCancelling && setShowCancelConfirm(false)}
              disabled={isCancelling}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-ink hover:bg-zinc-100 transition cursor-pointer disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              {/* Warning/Alert Icon */}
              <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 animate-pulse">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-ink tracking-tight">Cancelar Pedido</h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Tem certeza que deseja cancelar este pedido? Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
                className="flex-1 py-3 border border-border rounded-xl text-xs font-bold text-ink-muted hover:bg-zinc-50 transition cursor-pointer select-none disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm select-none active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isCancelling ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Cancelando...</span>
                  </>
                ) : (
                  <span>Sim, cancelar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Dialog Preview Modal */}
      {reviewingProduct && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseReviewModal();
            }
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-md w-full p-6 md:p-8 shadow-2xl relative space-y-5 select-none animate-in fade-in-50 zoom-in-95 duration-200 cursor-default">
            {/* Close Button */}
            <button
              onClick={handleCloseReviewModal}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-ink hover:bg-zinc-100 transition cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {submittedReview ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-ink">Avaliação Enviada!</h3>
                <p className="text-xs text-ink-muted leading-relaxed px-4">{submittedReview}</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-ink tracking-tight">
                    {myReviews[reviewingProduct.id] ? "Editar Avaliação" : "Avaliar Produto"}
                  </h3>
                  <p className="text-xs text-ink-muted">Compartilhe sua experiência de compra com outros clientes.</p>
                </div>

                {reviewError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                    {reviewError}
                  </div>
                )}

                {/* Product Detail Mini-Card */}
                <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200/60 rounded-2xl">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white flex items-center justify-center">
                    {reviewingProduct.catalogProduct?.images?.[0]?.url ? (
                      <img src={reviewingProduct.catalogProduct.images[0].url} alt={reviewingProduct.catalogProduct.name} className="h-full w-full object-cover" />
                    ) : (
                      <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-bold text-ink truncate flex-1">{reviewingProduct.catalogProduct.name}</span>
                </div>

                {/* Interactive Star Rating */}
                <div className="space-y-2 text-center py-2">
                  <span className="text-xs font-bold text-ink-muted">Sua nota para o produto</span>
                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const isActive = hoverRating !== null ? starValue <= hoverRating : starValue <= rating;
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setRating(starValue)}
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="text-zinc-200 hover:scale-110 active:scale-95 transition cursor-pointer focus:outline-none"
                        >
                          <svg
                            className={`h-8 w-8 transition-colors duration-150 ${isActive ? "text-amber-400" : "text-zinc-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment Text Area */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="comment" className="text-xs font-bold text-ink-muted">Opinião sobre o produto</label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escreva sua experiência (ex: qualidade, tamanho, preferência do pet...)"
                    className="rounded-xl border border-border px-4 py-3 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseReviewModal}
                    disabled={isSubmittingReview}
                    className="flex-1 py-3 border border-border rounded-xl text-xs font-bold text-ink-muted hover:bg-zinc-50 transition cursor-pointer select-none disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm select-none active:scale-[0.98] disabled:opacity-60"
                  >
                    {isSubmittingReview ? "Enviando..." : "Enviar Avaliação"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
