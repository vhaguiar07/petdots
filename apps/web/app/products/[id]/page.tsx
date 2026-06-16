"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Product, ProductReview, Store } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { formatCurrency, getEffectiveUnitPrice, hasActiveDiscount } from "@/lib/pricing";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"desc" | "reviews">("desc");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient
      .getProduct(id)
      .then((prodData) => {
        setProduct(prodData);
        return apiClient.getStore(prodData.storeId);
      })
      .then((storeData) => {
        setStore(storeData);
      })
      .catch(() => {
        setError("Não foi possível carregar as informações do produto.");
      });

    apiClient
      .listProductReviews(id)
      .then(setReviews)
      .catch(() => undefined);
  }, [id]);

  const handleAddToCart = () => {
    if (!product || !store) return;
    let added = false;
    for (let i = 0; i < quantity; i++) {
      added = addItem(product, { id: store.id, name: store.name });
    }
    if (added) {
      setFeedback(`"${product.name}" (${quantity}x) adicionado ao carrinho.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  if (error) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 select-none">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-xs font-bold text-primary-500 hover:underline cursor-pointer"
          >
            Voltar para a página anterior
          </button>
        </div>
      </main>
    );
  }

  if (!product || !store) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 flex flex-col items-center justify-center gap-3">
        <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-medium text-ink-muted">Carregando detalhes do produto...</p>
      </main>
    );
  }

  const effectivePrice = getEffectiveUnitPrice(product);
  const discounted = hasActiveDiscount(product);
  const outOfStock = product.stock <= 0;

  const allImages = product.images.length > 0 ? product.images : [{ url: "" }];

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % allImages.length);
  };

  return (
    <main className="flex-1 bg-zinc-50/50 py-8 md:py-12 select-none">
      <div className="mx-auto max-w-5xl px-4 space-y-8">
        
        {/* Breadcrumb Trail */}
        <nav className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-ink-muted/80 flex flex-wrap items-center gap-1.5">
          <Link href="/" className="hover:text-primary-500 transition">Marketplace</Link>
          <span className="text-zinc-300">/</span>
          <Link href={`/stores/${store.id}`} className="hover:text-primary-500 transition">{store.name}</Link>
          <span className="text-zinc-300">/</span>
          <span className="text-primary-500 truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Feedback Banner */}
        {feedback && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{feedback}</span>
          </div>
        )}

        {/* Product Meta Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
          
          {/* Left Column: Image Gallery */}
          <div className="space-y-4">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-white shadow-sm group">
              {allImages[activeImageIndex]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={allImages[activeImageIndex].url}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-300 font-medium">
                  <svg className="h-16 w-16 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="text-xs">Sem foto cadastrada</span>
                </div>
              )}

              {discounted && (
                <span className="absolute top-4 left-4 bg-primary-500 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs z-10">
                  Oferta
                </span>
              )}

              {/* Controls - Chevron Arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-25 h-10 w-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/55 text-white border border-white/10 transition cursor-pointer select-none focus:outline-none opacity-0 group-hover:opacity-100 duration-200"
                    aria-label="Imagem anterior"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-25 h-10 w-10 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/55 text-white border border-white/10 transition cursor-pointer select-none focus:outline-none opacity-0 group-hover:opacity-100 duration-200"
                    aria-label="Próxima imagem"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            {allImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                {allImages.map((image, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 bg-white transition cursor-pointer ${
                      activeImageIndex === idx ? "border-primary-500 shadow-sm" : "border-border hover:border-zinc-400"
                    }`}
                  >
                    <img src={image.url} alt={`${product.name} - foto ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Operations */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-500 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
                {product.category?.name || "Geral"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight mt-2">{product.name}</h1>
              
              {/* Stars Rating */}
              <div className="flex items-center gap-1.5 pt-1.5">
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-4 w-4 ${star <= Math.round(product.avgRating) ? "text-amber-500" : "text-zinc-200"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs font-bold text-ink-muted">
                  {product.avgRating.toFixed(1)} ({product.reviewCount}{" "}
                  {product.reviewCount === 1 ? "avaliação" : "avaliações"})
                </span>
              </div>
            </div>

            {/* Price display with discount badge */}
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-xs space-y-1">
              <div className="flex items-baseline gap-2.5">
                {discounted && (
                  <span className="text-sm font-semibold text-zinc-400 line-through">
                    {formatCurrency(Number(product.price))}
                  </span>
                )}
                <span className="text-3xl font-black text-primary-600">
                  {formatCurrency(effectivePrice)}
                </span>
              </div>
              <p className="text-[10px] text-ink-muted">Preço válido apenas para compras no marketplace.</p>
            </div>

            {/* Quantity Selector and Cart Button */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-ink">Quantidade:</span>
                <div className="flex items-center border border-border rounded-xl bg-white shadow-xs">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || outOfStock}
                    className="px-3 py-1.5 text-ink-muted hover:text-ink disabled:opacity-40 font-bold transition text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 text-sm font-bold text-ink min-w-[30px] text-center select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={outOfStock}
                    className="px-3 py-1.5 text-ink-muted hover:text-ink disabled:opacity-40 font-bold transition text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
                
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                  outOfStock ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                }`}>
                  {outOfStock ? "Sem estoque" : `${product.stock} unidades disponíveis`}
                </span>
              </div>

              {user?.role === "CUSTOMER" || !user ? (
                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 px-6 font-bold text-white shadow-md hover:bg-primary-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Adicionar ao carrinho
                </button>
              ) : (
                <div className="bg-zinc-100 border border-zinc-200 text-zinc-500 rounded-xl px-4 py-3 text-xs font-semibold text-center select-none">
                  Apenas contas de Cliente podem realizar compras.
                </div>
              )}
            </div>

            {/* Vendor Store Card (Parceiro) */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted/70">Vendido e entregue por</p>
                  <h3 className="text-sm font-bold text-ink mt-0.5">{store.name}</h3>
                </div>
                <Link
                  href={`/stores/${store.id}`}
                  className="text-xs font-bold text-primary-500 hover:text-primary-600 transition hover:underline"
                >
                  Ir para loja
                </Link>
              </div>
              {store.description && (
                <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">{store.description}</p>
              )}
            </div>

          </div>
        </div>

        {/* Lower Section: Tabs for Description & Mock Reviews */}
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
          
          {/* Tab Header Selector */}
          <div className="flex border-b border-border bg-zinc-50/50">
            <button
              onClick={() => setActiveTab("desc")}
              className={`flex-1 py-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === "desc"
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Descrição do Produto
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 py-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === "reviews"
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Avaliações ({product.reviewCount})
            </button>
          </div>

          {/* Tab Body */}
          <div className="p-6 md:p-8">
            
            {/* Description Tab */}
            {activeTab === "desc" && (
              <div className="space-y-4">
                {product.description ? (
                  <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                ) : (
                  <p className="text-sm text-ink-muted italic">
                    Nenhuma descrição adicional foi fornecida para este produto.
                  </p>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-6">

                {/* Total Average Summary Card */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-zinc-50 border border-border rounded-2xl select-none">
                  <div className="text-center sm:border-r sm:border-border sm:pr-8">
                    <h4 className="text-4xl font-black text-ink">{product.avgRating.toFixed(1)}</h4>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mt-1">de 5.0 estrelas</p>
                  </div>
                  <div className="space-y-1.5 flex-1 w-full">
                    {[5, 4, 3, 2, 1].map((starVal) => {
                      const count = reviews.filter((r) => r.rating === starVal).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={starVal} className="flex items-center gap-2 text-xs">
                          <span className="w-16 text-ink-muted font-semibold">{starVal} estrelas</span>
                          <div className="h-2 flex-1 rounded-full bg-zinc-200 overflow-hidden">
                            <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-right font-bold text-ink-muted">{Math.round(pct)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reviews List */}
                {reviews.length === 0 ? (
                  <p className="text-sm text-ink-muted">Este produto ainda não recebeu avaliações.</p>
                ) : (
                  <div className="divide-y divide-border pt-2">
                    {reviews.map((review) => (
                      <div key={review.id} className="py-5 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 text-primary-500 font-extrabold text-xs flex items-center justify-center select-none">
                              {(review.customer?.name ?? "C").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-ink">{review.customer?.name ?? "Cliente"}</h5>
                              <div className="flex text-amber-400 pt-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    className={`h-3 w-3 ${star <= review.rating ? "text-amber-400" : "text-zinc-200"}`}
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
                            {new Date(review.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-xs text-ink-muted leading-relaxed pl-11">{review.comment}</p>
                        )}
                        {review.ownerReply && (
                          <div className="ml-11 mt-2 rounded-xl border border-primary-100 bg-primary-50 p-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600">
                              Resposta da loja
                            </p>
                            <p className="mt-1 text-xs text-ink-muted leading-relaxed">{review.ownerReply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}
            
          </div>
        </div>
        
      </div>
    </main>
  );
}
