"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type Store, type StoreProduct } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { formatCurrency, getEffectiveUnitPrice, hasActiveDiscount } from "@/lib/pricing";

const FILTER_TITLES: Record<string, string> = {
  nearby:  "Lojas Próximas",
  rating:  "Melhor Avaliadas",
  fast:    "Entrega Rápida",
  newest:  "Novidades",
};

const FILTER_DESCRIPTIONS: Record<string, string> = {
  nearby:  "Os melhores petshops pertinho do seu endereço, ordenados por distância.",
  rating:  "Os queridinhos da comunidade com as melhores avaliações dos clientes.",
  fast:    "Precisa com urgência? Conheça os petshops com entrega estimada em até 45 minutos.",
  newest:  "Lojas recém-cadastradas na PetDots para você explorar novos produtos.",
};

interface FilterHeaderConfig {
  badgeText: string;
  badgeBg: string;
  badgeTextColor: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
  subSectionTitle: string;
  subSectionDesc: string;
}

const FILTER_HEADER_CONFIGS: Record<string, FilterHeaderConfig> = {
  nearby: {
    badgeText: "Mais Próximos",
    badgeBg: "bg-blue-50 border border-blue-200",
    badgeTextColor: "text-blue-700",
    gradientFrom: "from-blue-500/10",
    gradientTo: "to-indigo-500/5",
    icon: "📍",
    subSectionTitle: "🔥 Produtos em Destaque Perto de Você",
    subSectionDesc: "Confira os itens mais vendidos e disponíveis para entrega rápida nos petshops próximos.",
  },
  rating: {
    badgeText: "Melhor Avaliados",
    badgeBg: "bg-amber-50 border border-amber-200",
    badgeTextColor: "text-amber-700",
    gradientFrom: "from-amber-500/10",
    gradientTo: "to-orange-500/5",
    icon: "⭐",
    subSectionTitle: "💖 Os Produtos Favoritos dos Clientes",
    subSectionDesc: "Veja os itens com as melhores avaliações e avaliados de forma excelente no marketplace.",
  },
  fast: {
    badgeText: "Entrega Expressa",
    badgeBg: "bg-emerald-50 border border-emerald-200",
    badgeTextColor: "text-emerald-700",
    gradientFrom: "from-emerald-500/10",
    gradientTo: "to-teal-500/5",
    icon: "⚡",
    subSectionTitle: "🚀 Receba Hoje: Itens Prontos para Envio",
    subSectionDesc: "Produtos com disponibilidade imediata para entrega expressa na sua casa.",
  },
  newest: {
    badgeText: "Recém-Chegados",
    badgeBg: "bg-purple-50 border border-purple-200",
    badgeTextColor: "text-purple-700",
    gradientFrom: "from-purple-500/10",
    gradientTo: "to-pink-500/5",
    icon: "✨",
    subSectionTitle: "🆕 Novidades Fresquinhas para seu Pet",
    subSectionDesc: "Os lançamentos e novos produtos recém-adicionados pelos nossos lojistas parceiros.",
  },
  default: {
    badgeText: "Parceiros PetDots",
    badgeBg: "bg-primary-50 border border-primary-100",
    badgeTextColor: "text-primary-700",
    gradientFrom: "from-primary-500/10",
    gradientTo: "to-orange-500/5",
    icon: "🐾",
    subSectionTitle: "🛍️ Produtos Recomendados",
    subSectionDesc: "Dê uma olhada nos itens especiais que separamos para você explorar hoje.",
  }
};

function StoresContent() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? undefined;       // nearby | rating | fast | newest

  const { user } = useAuth();
  const { addItem } = useCart();

  const [stores, setStores] = useState<Store[] | null>(null);
  const [popularStores, setPopularStores] = useState<Store[] | null>(null);
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fetch popular stores for fallback/empty states
  useEffect(() => {
    apiClient.listStores({ sort: "rating", limit: 3 })
      .then(setPopularStores)
      .catch(() => undefined);
  }, []);

  const fetchProductsForFilter = useCallback(async (activeStores: Store[]) => {
    setProductsLoading(true);
    try {
      const allProdsData = await apiClient.listProducts({ pageSize: 100 });
      const allProds = allProdsData.items;
      let filteredProds = [...allProds];

      if (filter === "nearby") {
        if (activeStores.length > 0) {
          const storeIds = new Set(activeStores.map(s => s.id));
          filteredProds = allProds.filter(p => storeIds.has(p.storeId));
        } else {
          filteredProds = allProds.filter(p => p.avgRating >= 4);
        }
      } else if (filter === "rating") {
        filteredProds = allProds.filter(p => p.avgRating >= 4).sort((a, b) => b.avgRating - a.avgRating);
      } else if (filter === "fast") {
        const fastStoreIds = new Set(activeStores.map(s => s.id));
        filteredProds = allProds.filter(p => fastStoreIds.has(p.storeId) || (p.store?.deliveryTimeMinutes && p.store.deliveryTimeMinutes <= 45));
      } else if (filter === "newest") {
        filteredProds = [...allProds].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        filteredProds = allProds.filter(p => hasActiveDiscount(p) || p.avgRating >= 4);
      }

      setProducts(filteredProds.slice(0, 6));
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setProductsLoading(false);
    }
  }, [filter]);

  const fetchStores = useCallback(async (lat?: number, lng?: number) => {
    try {
      const query =
        filter === "rating" ? { sort: "rating" as const } :
        filter === "newest" ? { sort: "newest" as const } :
        filter === "fast"   ? { fastDelivery: true } :
        filter === "nearby" ? { lat, lng } :
        {};
      const data = await apiClient.listStores(query);
      setStores(data);
      fetchProductsForFilter(data);
    } catch {
      setError("Não foi possível carregar as lojas no momento.");
    }
  }, [filter, fetchProductsForFilter]);

  useEffect(() => {
    setStores(null);
    setError(null);
    setLocationDenied(false);

    if (filter === "nearby") {
      if (!navigator.geolocation) {
        setLocationDenied(true);
        fetchStores();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchStores(pos.coords.latitude, pos.coords.longitude),
        () => { setLocationDenied(true); fetchStores(); },
      );
    } else {
      fetchStores();
    }
  }, [filter, fetchStores]);

  const handleAddToCart = (product: StoreProduct) => {
    const storeName = product.store?.name || "Petshop";
    const added = addItem(product, {
      id: product.storeId,
      name: storeName,
      latitude: product.store?.latitude,
      longitude: product.store?.longitude,
      deliveryRadiusKm: product.store?.deliveryRadiusKm,
    });
    if (added) {
      setFeedback(`"${product.catalogProduct.name}" adicionado ao carrinho.`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const title =
    filter && FILTER_TITLES[filter]
      ? FILTER_TITLES[filter]
      : "Todas as Lojas";

  const description =
    filter && FILTER_DESCRIPTIONS[filter]
      ? FILTER_DESCRIPTIONS[filter]
      : "Explore todos os petshops disponíveis na plataforma.";

  const activeKey = (filter && FILTER_HEADER_CONFIGS[filter]) ? filter : "default";
  const config = FILTER_HEADER_CONFIGS[activeKey];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12 relative flex flex-col min-h-screen">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-xs font-bold text-primary-700 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          {feedback}
        </div>
      )}

      {/* Hero Banner Header */}
      <div className={`mb-8 p-6 md:p-8 rounded-3xl border border-border bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden`}>
        <div className="space-y-3 relative z-10 max-w-2xl">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${config.badgeBg} ${config.badgeTextColor}`}>
            <span>{config.icon}</span> {config.badgeText}
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-ink tracking-tight">{title}</h1>
          <p className="text-xs md:text-sm text-ink-muted leading-relaxed font-medium">{description}</p>
          
          {locationDenied && filter === "nearby" && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 max-w-md">
              ⚠️ Permissão de localização negada — exibindo todas as lojas disponíveis.
            </p>
          )}
        </div>
        
        {/* Abstract floating design element */}
        <div className="hidden md:flex text-6xl opacity-20 pointer-events-none select-none">
          {config.icon}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Primary Loader */}
      {stores === null && !error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <p className="text-xs text-ink-muted font-bold">Encontrando os melhores petshops...</p>
        </div>
      )}

      {/* Empty State */}
      {stores?.length === 0 && (
        <div className="space-y-12">
          {/* Creative Empty State Card */}
          <div className="rounded-3xl border border-border bg-zinc-50/40 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs select-none">
            <div className="text-5xl mb-4 animate-bounce">🐶🐾</div>
            <h2 className="text-lg font-black text-ink">Nenhuma loja ativa encontrada</h2>
            <p className="mt-2 text-xs text-ink-muted leading-relaxed max-w-md mx-auto">
              {filter === "fast"
                ? "No momento não temos lojas com entrega rápida (até 45 minutos) abertas ou cadastradas na sua localidade."
                : "Ainda não temos parceiros correspondentes a este filtro por aqui."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/" className="rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-black text-white transition hover:bg-primary-600 shadow-md">
                Voltar ao Início
              </Link>
              <button
                onClick={() => window.location.href = "/stores"}
                className="rounded-xl border border-border bg-white px-5 py-2.5 text-xs font-black text-ink hover:bg-zinc-50 hover:text-primary-500 transition shadow-xs cursor-pointer"
              >
                Ver Todas as Lojas
              </button>
            </div>
          </div>

          {/* Popular Stores Recommendations */}
          {popularStores && popularStores.length > 0 && (
            <div className="space-y-5 pt-8 border-t border-border/80">
              <div>
                <h3 className="text-lg font-black text-ink">Lojas Populares Recomendadas</h3>
                <p className="text-xs text-ink-muted mt-0.5">Confira estes parceiros muito bem avaliados no nosso app.</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {popularStores.map((store) => (
                  <Link
                    key={store.id}
                    href={`/stores/${store.id}`}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition duration-300 hover:-translate-y-1 hover:border-primary-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    <div className="flex gap-4 items-start">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover border border-border group-hover:scale-105 transition duration-300 shadow-xs"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-3xl group-hover:scale-105 transition duration-300 shadow-xs border border-primary-100">
                          🐾
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-base text-ink group-hover:text-primary-600 transition">
                          {store.name}
                        </h3>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                          <span className="text-amber-400 font-bold">★</span>
                          <span className="font-extrabold text-ink">{store.avgRating.toFixed(1)}</span>
                          <span className="text-zinc-400">({store.reviewCount} avaliações)</span>
                        </div>
                      </div>
                    </div>

                    {store.description && (
                      <p className="mt-3 text-xs text-ink-muted line-clamp-2 leading-relaxed">
                        {store.description}
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {store.deliveryTimeMinutes && (
                          <span className="rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-[10px] font-bold text-green-700 flex items-center gap-1">
                            <span>⚡</span> ~{store.deliveryTimeMinutes} min
                          </span>
                        )}
                        {store.distanceKm !== undefined && (
                          <span className="rounded-full bg-primary-50 border border-primary-100 px-2.5 py-0.5 text-[10px] font-bold text-primary-600 flex items-center gap-1">
                            <span>📍</span> {store.distanceKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      
                      <span className="text-xs font-bold text-primary-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition duration-200 select-none">
                        Visitar <span className="text-sm">→</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stores List Grid */}
      {stores && stores.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition duration-300 hover:-translate-y-1 hover:border-primary-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <div className="flex gap-4 items-start">
                {store.logoUrl ? (
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover border border-border group-hover:scale-105 transition duration-300 shadow-xs"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-3xl group-hover:scale-105 transition duration-300 shadow-xs border border-primary-100">
                    🐾
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100 mb-1.5">
                    Petshop
                  </span>
                  <h3 className="truncate font-bold text-base text-ink group-hover:text-primary-600 transition">
                    {store.name}
                  </h3>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className="text-amber-400 font-bold">★</span>
                    <span className="font-extrabold text-ink">{store.avgRating.toFixed(1)}</span>
                    <span className="text-zinc-400">({store.reviewCount} avaliações)</span>
                  </div>
                </div>
              </div>

              {store.description && (
                <p className="mt-3 text-xs text-ink-muted line-clamp-2 leading-relaxed">
                  {store.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {store.deliveryTimeMinutes && (
                    <span className="rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-[10px] font-bold text-green-700 flex items-center gap-1">
                      <span>⚡</span> ~{store.deliveryTimeMinutes} min
                    </span>
                  )}
                  {store.distanceKm !== undefined && (
                    <span className="rounded-full bg-primary-50 border border-primary-100 px-2.5 py-0.5 text-[10px] font-bold text-primary-600 flex items-center gap-1">
                      <span>📍</span> {store.distanceKm.toFixed(1)} km
                    </span>
                  )}
                </div>
                
                <span className="text-xs font-bold text-primary-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition duration-200 select-none">
                  Visitar <span className="text-sm">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Suggested Products Loading Indicator */}
      {productsLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 border-t border-border/60 mt-16 animate-pulse">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-[10px] text-ink-muted font-bold">Buscando produtos recomendados...</p>
        </div>
      )}

      {/* Products Suggestions Section */}
      {!productsLoading && products && products.length > 0 && (
        <section className="mt-16 pt-10 border-t border-border animate-in fade-in duration-500">
          <div className="mb-6">
            <h2 className="text-lg font-black text-ink flex items-center gap-2">
              <span>{config.icon}</span> {config.subSectionTitle}
            </h2>
            <p className="text-xs text-ink-muted mt-1">{config.subSectionDesc}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            {products.map((product) => {
              const effectivePrice = getEffectiveUnitPrice(product);
              const discounted = hasActiveDiscount(product);
              const outOfStock = product.stock <= 0;

              return (
                <article
                  key={product.id}
                  className="relative flex flex-col justify-between gap-3 rounded-2xl border border-border bg-surface p-4.5 shadow-xs hover:shadow-md transition duration-200 group"
                >
                  {discounted && (
                    <span className="absolute top-3.5 left-3.5 bg-rose-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full z-10 shadow-xs">
                      % OFF
                    </span>
                  )}

                  <div className="space-y-3">
                    <Link href={`/products/${product.id}`} className="group block space-y-2 select-none">
                      <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-50 border border-zinc-100 text-3xl relative">
                        {product.catalogProduct.images?.[0] ? (
                          <img
                            src={product.catalogProduct.images[0].url}
                            alt={product.catalogProduct.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <span className="group-hover:scale-110 transition duration-300">🐾</span>
                        )}

                        {product.avgRating > 0 && (
                          <span className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-xs text-ink text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                            ⭐ {product.avgRating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {product.catalogProduct.category && (
                        <div className="pt-1 select-none">
                          <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                            {product.catalogProduct.category.name}
                          </span>
                        </div>
                      )}

                      <h4 className="text-sm font-bold text-ink group-hover:text-primary-600 transition line-clamp-1 tracking-tight">
                        {product.catalogProduct.name}
                      </h4>
                    </Link>

                    {product.catalogProduct.description && (
                      <p className="line-clamp-2 text-xs text-ink-muted leading-relaxed">
                        {product.catalogProduct.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/60 space-y-2.5">
                    <div className="flex items-baseline gap-1.5">
                      {discounted && (
                        <span className="text-[10px] text-zinc-400 line-through">
                          {formatCurrency(Number(product.price))}
                        </span>
                      )}
                      <span className="text-base font-extrabold text-primary-600">
                        {formatCurrency(effectivePrice)}
                      </span>

                      {discounted && (
                        <span className="text-[9px] text-rose-500 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 ml-auto">
                          -{Math.round(((Number(product.price) - effectivePrice) / Number(product.price)) * 100)}%
                        </span>
                      )}
                    </div>

                    {product.store && (
                      <div className="text-[10px] text-ink-muted">
                        Vendido por:{" "}
                        <Link href={`/stores/${product.storeId}`} className="font-extrabold text-primary-500 hover:underline">
                          {product.store.name}
                        </Link>
                      </div>
                    )}

                    {user?.role === "CUSTOMER" || !user ? (
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={outOfStock}
                        className="w-full rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs active:scale-95 duration-100"
                      >
                        {outOfStock ? "Sem estoque" : "Adicionar ao carrinho"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

export default function StoresPage() {
  return (
    <Suspense fallback={null}>
      <StoresContent />
    </Suspense>
  );
}
