"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Store, Product } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { formatCurrency, getEffectiveUnitPrice, hasActiveDiscount } from "@/lib/pricing";

const TOP_RATED_LIMIT = 6;
const GEOLOCATION_TIMEOUT_MS = 5000;

const CAROUSEL_SLIDES = [
  {
    image: "/hero_banner_1.png",
    title: "Tudo para o seu Pet",
    description: "Brinquedos, rações premium e acessórios exclusivos das melhores marcas do mercado.",
  },
  {
    image: "/hero_banner_2.png",
    title: "Acessórios e Conforto",
    description: "Encontre camas aconchegantes, arranhadores modernos e itens para a qualidade de vida do seu pet.",
  },
  {
    image: "/hero_banner_3.png",
    title: "Entrega no Mesmo Dia",
    description: "Receba tudo no conforto da sua casa em poucas horas através dos petshops da sua região.",
  },
];

// Reusable Store Card Component
function StoreCard({ store, isNew }: { store: Store; isNew?: boolean }) {
  return (
    <Link
      href={`/stores/${store.id}`}
      className="relative flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary-300 hover:shadow-md group"
    >
      {isNew && (
        <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full z-10 animate-pulse">
          Novo
        </span>
      )}
      
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-2xl group-hover:scale-110 transition duration-300">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover rounded-full" />
        ) : (
          "🐾"
        )}
      </div>
      <h3 className="text-lg font-semibold text-ink group-hover:text-primary-600 transition">{store.name}</h3>
      {store.description && (
        <p className="line-clamp-2 text-sm text-ink-muted leading-relaxed">{store.description}</p>
      )}
      {store.distanceKm !== undefined && (
        <p className="text-xs font-semibold text-primary-600">
          {store.distanceKm.toFixed(1)} km de você
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex text-amber-400">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg key={star} className={`h-4 w-4 ${star <= Math.round(store.avgRating) ? "text-amber-400" : "text-zinc-300"}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="text-xs font-bold text-ink-muted">
          {store.avgRating.toFixed(1)} ({store.reviewCount} avaliações)
        </span>
      </div>
    </Link>
  );
}

// Reusable Product Card Component with alternating designs
function ProductCard({
  product,
  isFeatured,
  isNew,
  onAddToCart,
  userRole,
}: {
  product: Product;
  isFeatured?: boolean;
  isNew?: boolean;
  onAddToCart: (p: Product) => void;
  userRole?: string;
}) {
  const effectivePrice = getEffectiveUnitPrice(product);
  const discounted = hasActiveDiscount(product);
  const outOfStock = product.stock <= 0;

  // Premium Spotlight UI/UX design (Design Type 2)
  if (isFeatured) {
    return (
      <article className="relative p-[1.5px] rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-xl hover:scale-[1.02] transition duration-300 group">
        <div className="bg-zinc-900 rounded-[15px] p-5 flex flex-col justify-between h-full text-white space-y-4">
          <Link href={`/products/${product.id}`} className="block space-y-3 select-none">
            <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-zinc-800 text-3xl">
              {product.images[0] ? (
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                />
              ) : (
                <span className="group-hover:scale-110 transition duration-300">🐾</span>
              )}
              {/* Star badge */}
              <span className="absolute top-2.5 right-2.5 bg-amber-400 text-zinc-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full z-10 shadow-md flex items-center gap-1">
                ⭐ {product.avgRating.toFixed(1)}
              </span>
              {/* Spotlight Badge */}
              <span className="absolute bottom-2.5 left-2.5 bg-primary-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md">
                Destaque
              </span>
            </div>

            {product.category && (
              <div className="pt-1 select-none">
                <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  {product.category.name}
                </span>
              </div>
            )}

            <h4 className="text-base font-extrabold text-white tracking-tight line-clamp-1 group-hover:text-amber-400 transition">
              {product.name}
            </h4>
          </Link>

          {product.description && (
            <p className="line-clamp-2 text-xs text-zinc-400 leading-relaxed italic">
              "{product.description}"
            </p>
          )}

          <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-zinc-400">Preço Premium</span>
              <div className="flex items-baseline gap-1.5">
                {discounted && (
                  <span className="text-[10px] text-zinc-500 line-through">
                    {formatCurrency(Number(product.price))}
                  </span>
                )}
                <span className="text-lg font-black text-amber-400">
                  {formatCurrency(effectivePrice)}
                </span>
              </div>
            </div>

            {product.store && (
              <div className="text-[10px] text-zinc-500">
                Vendido por: <span className="font-extrabold text-amber-400">{product.store.name}</span>
              </div>
            )}

            {userRole === "CUSTOMER" || !userRole ? (
              <button
                onClick={() => onAddToCart(product)}
                disabled={outOfStock}
                className="mt-1 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-zinc-950 font-black text-xs py-2.5 transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-md active:scale-95 duration-100"
              >
                Comprar Agora
              </button>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  // General Design Type 1 (Discount/Offers) & Design Type 3 (Minimalist / New)
  return (
    <article className="relative flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm hover:shadow-md transition duration-200 group">
      {discounted && (
        <span className="absolute top-3 left-3 bg-rose-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full z-10 shadow-sm animate-pulse">
          % OFF
        </span>
      )}
      
      {isNew && (
        <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full z-10 shadow-sm">
          Novo
        </span>
      )}

      <Link href={`/products/${product.id}`} className="group block space-y-2 select-none">
        <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-primary-50 text-3xl relative">
          {product.images[0] ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <span className="group-hover:scale-110 transition duration-300">🐾</span>
          )}
          
          {product.avgRating > 0 && (
            <span className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs text-ink text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
              ⭐ {product.avgRating.toFixed(1)}
            </span>
          )}
        </div>

        {product.category && (
          <div className="pt-1 select-none">
            <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
              {product.category.name}
            </span>
          </div>
        )}

        <h4 className="text-sm font-bold text-ink group-hover:text-primary-600 transition line-clamp-1 tracking-tight">
          {product.name}
        </h4>
      </Link>

      {product.description && (
        <p className="line-clamp-2 text-xs text-ink-muted leading-relaxed">{product.description}</p>
      )}

      <div className="mt-1 flex items-baseline gap-1.5">
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
            Economize {formatCurrency(Number(product.price) - effectivePrice)}
          </span>
        )}
      </div>

      {product.store && (
        <div className="text-[10px] text-ink-muted">
          Vendido por: <Link href={`/stores/${product.storeId}`} className="font-extrabold text-primary-500 hover:underline">{product.store.name}</Link>
        </div>
      )}

      <p className="text-[10px] text-ink-muted">
        {outOfStock ? "Sem estoque" : `${product.stock} unidades disponíveis`}
      </p>

      {userRole === "CUSTOMER" || !userRole ? (
        <button
          onClick={() => onAddToCart(product)}
          disabled={outOfStock}
          className="mt-2 rounded-full bg-primary-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs active:scale-95 duration-100"
        >
          Adicionar ao carrinho
        </button>
      ) : null}
    </article>
  );
}

function HomeContent() {
  const { user } = useAuth();
  const { addItem } = useCart();
  
  const [stores, setStores] = useState<Store[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topRatedStores, setTopRatedStores] = useState<Store[] | null>(null);
  const [allProducts, setAllProducts] = useState<Product[] | null>(null);
  const [newestStores, setNewestStores] = useState<Store[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Search Results States
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [filteredStores, setFilteredStores] = useState<Store[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Search Params
  const searchParams = useSearchParams();
  const search = searchParams?.get("search") || "";
  const category = searchParams?.get("category") || "";
  const categoryName = searchParams?.get("categoryName") || "";
  const pet = searchParams?.get("pet") || "";
  const storeFilter = searchParams?.get("storeFilter") || "";
  const onSale = searchParams?.get("onSale") === "true";

  const hasActiveFilter = !!(search || category || pet || storeFilter || onSale);

  useEffect(() => {
    const resolveCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          () => resolve(null),
          { timeout: GEOLOCATION_TIMEOUT_MS },
        );
      });
    };

    const loadNearbyStores = async () => {
      let coords = await resolveCoordinates();

      if (!coords && user) {
        try {
          const addresses = await apiClient.listAddresses();
          const defaultAddress = addresses.find(
            (address) => address.isDefault && address.latitude !== null && address.longitude !== null,
          );
          if (defaultAddress) {
            coords = { lat: defaultAddress.latitude as number, lng: defaultAddress.longitude as number };
          }
        } catch {
          // sem endereço padrão disponível, segue sem coordenadas
        }
      }

      apiClient
        .listStores(coords ? { lat: coords.lat, lng: coords.lng } : {})
        .then(setStores)
        .catch(() => setError("Não foi possível carregar as lojas."));
    };

    loadNearbyStores();
  }, [user]);

  useEffect(() => {
    apiClient
      .listStores({ sort: "rating", limit: TOP_RATED_LIMIT })
      .then(setTopRatedStores)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    apiClient
      .listProducts()
      .then(setAllProducts)
      .catch(() => undefined);

    apiClient
      .listStores({ sort: "newest", limit: 6 })
      .then(setNewestStores)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Backend Search & Convenience Filters Integration
  useEffect(() => {
    if (!hasActiveFilter) {
      setSearchResults(null);
      setFilteredStores(null);
      return;
    }

    setIsSearching(true);

    const fetchSearchData = async () => {
      try {
        const productQuery: any = {};
        if (search) productQuery.search = search;
        if (category) productQuery.categoryId = category;
        if (onSale) productQuery.onSale = true;

        // Geolocation for nearby stores
        let coords: { lat: number; lng: number } | null = null;
        if (storeFilter === "nearby") {
          coords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 3000 }
            );
          });
        }

        const storesParams: any = {};
        if (coords) {
          storesParams.lat = coords.lat;
          storesParams.lng = coords.lng;
        }
        if (storeFilter === "rating") {
          storesParams.sort = "rating";
        } else if (storeFilter === "newest") {
          storesParams.sort = "newest";
        } else if (storeFilter === "delivery") {
          storesParams.deliveryProvider = "SELF";
        }

        const [productsData, storesData] = await Promise.all([
          apiClient.listProducts(productQuery),
          apiClient.listStores(storesParams)
        ]);

        setSearchResults(productsData);

        if (search) {
          const term = search.toLowerCase();
          setFilteredStores(
            storesData.filter(
              (s) =>
                s.name.toLowerCase().includes(term) ||
                (s.description && s.description.toLowerCase().includes(term))
            )
          );
        } else {
          setFilteredStores(storesData);
        }
      } catch (err) {
        console.error("Erro ao carregar dados de busca:", err);
      } finally {
        setIsSearching(false);
      }
    };

    fetchSearchData();
  }, [search, category, pet, storeFilter, onSale, hasActiveFilter]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  const handleAddToCart = (product: Product) => {
    const storeName = product.store?.name || "Petshop";
    const added = addItem(product, { id: product.storeId, name: storeName });
    if (added) {
      setFeedback(`"${product.name}" adicionado ao carrinho.`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  // Segmented products and stores for home blocks
  const productsOnSale = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter((p) => hasActiveDiscount(p)).slice(0, 8);
  }, [allProducts]);

  const productsTopRated = useMemo(() => {
    if (!allProducts) return [];
    return [...allProducts]
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 3);
  }, [allProducts]);

  const productsNewest = useMemo(() => {
    if (!allProducts) return [];
    return [...allProducts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [allProducts]);

  const storesNewestList = useMemo(() => {
    if (!newestStores) return [];
    return newestStores;
  }, [newestStores]);

  // Check if current filter is only for products (category or pet)
  const isProductFilterOnly = !!(category || pet);

  // Group search result products when a product filter is active
  const filteredCategoryProducts = useMemo(() => {
    if (!searchResults) return { topRated: [], onSale: [], others: [] };
    
    const topRated: Product[] = [];
    const onSale: Product[] = [];
    const others: Product[] = [];

    searchResults.forEach((product) => {
      const discounted = hasActiveDiscount(product);
      const isTop = product.avgRating >= 4.0;

      if (discounted) {
        onSale.push(product);
      } else if (isTop) {
        topRated.push(product);
      } else {
        others.push(product);
      }
    });

    return { topRated, onSale, others };
  }, [searchResults]);

  // Get active search label
  const getSearchLabel = () => {
    if (search) return `Produtos correspondentes a "${search}"`;
    if (categoryName) return `Produtos na categoria "${categoryName}"`;
    if (pet) {
      const petNames: Record<string, string> = { DOG: "Cães", CAT: "Gatos", BIRD: "Aves", FISH: "Peixes" };
      return `Produtos recomendados para ${petNames[pet] || pet}`;
    }
    if (onSale) return "Ofertas Especiais";
    if (storeFilter) {
      const filters: Record<string, string> = {
        nearby: "Petshops mais próximos de você",
        rating: "Petshops melhores avaliados",
        delivery: "Petshops com entrega rápida",
        newest: "Petshops novidades na plataforma",
      };
      return filters[storeFilter] || "Lojas filtradas";
    }
    return "Resultados da Busca";
  };

  return (
    <main className="flex flex-1 flex-col">
      {feedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-xs font-bold text-primary-700 shadow-md">
          {feedback}
        </div>
      )}

      {/* Show search results if filter is active */}
      {hasActiveFilter ? (
        <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <h2 className="text-xl font-bold text-ink">{getSearchLabel()}</h2>
              <p className="text-xs text-ink-muted mt-1">Veja abaixo os resultados encontrados no marketplace.</p>
            </div>
            <Link
              href="/"
              className="self-start sm:self-center inline-flex items-center gap-1.5 text-xs font-extrabold text-primary-500 hover:text-primary-600 transition border border-primary-100 hover:border-primary-300 bg-primary-50/50 hover:bg-primary-50 px-4 py-2.5 rounded-xl cursor-pointer"
            >
              Limpar filtros
            </Link>
          </div>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs font-semibold text-ink-muted">Buscando itens no banco de dados...</p>
            </div>
          ) : (
            <div className="space-y-12">
              {isProductFilterOnly ? (
                <>
                  {/* Category Filter Products Grouped */}
                  {filteredCategoryProducts.onSale.length > 0 && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <span className="text-sm font-extrabold text-primary-500 uppercase tracking-wider">🔥 Ofertas Imperdíveis</span>
                        <span className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold border border-primary-100">
                          {filteredCategoryProducts.onSale.length} {filteredCategoryProducts.onSale.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCategoryProducts.onSale.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={handleAddToCart}
                            userRole={user?.role}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredCategoryProducts.topRated.length > 0 && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <span className="text-sm font-extrabold text-amber-500 uppercase tracking-wider">⭐ Melhores Avaliados</span>
                        <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold border border-amber-100">
                          {filteredCategoryProducts.topRated.length} {filteredCategoryProducts.topRated.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCategoryProducts.topRated.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            isFeatured
                            onAddToCart={handleAddToCart}
                            userRole={user?.role}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredCategoryProducts.others.length > 0 && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <span className="text-sm font-extrabold text-ink uppercase tracking-wider">Todos os Produtos</span>
                        <span className="bg-zinc-100 text-ink-muted/80 px-2 py-0.5 rounded-full text-[9px] font-extrabold">
                          {filteredCategoryProducts.others.length} {filteredCategoryProducts.others.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCategoryProducts.others.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={handleAddToCart}
                            userRole={user?.role}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredCategoryProducts.onSale.length === 0 &&
                    filteredCategoryProducts.topRated.length === 0 &&
                    filteredCategoryProducts.others.length === 0 && (
                      <div className="bg-surface border border-border rounded-2xl p-16 text-center select-none space-y-3">
                        <svg className="h-12 w-12 text-ink-muted/30 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-base font-bold text-ink">Nenhum produto encontrado nesta categoria</p>
                        <p className="text-xs text-ink-muted max-w-sm mx-auto">Não encontramos produtos correspondentes a este filtro no momento.</p>
                      </div>
                    )}
                </>
              ) : (
                <>
                  {/* Standard Search Results (Products and Stores) */}
                  {searchResults && searchResults.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm uppercase tracking-wider font-extrabold text-primary-500">Produtos Encontrados ({searchResults.length})</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {searchResults.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={handleAddToCart}
                            userRole={user?.role}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredStores && filteredStores.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm uppercase tracking-wider font-extrabold text-primary-500">Petshops Encontrados ({filteredStores.length})</h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredStores.map((store) => (
                          <StoreCard key={store.id} store={store} />
                        ))}
                      </div>
                    </div>
                  )}

                  {(!searchResults || searchResults.length === 0) && (!filteredStores || filteredStores.length === 0) && (
                    <div className="bg-surface border border-border rounded-2xl p-16 text-center select-none space-y-3">
                      <svg className="h-12 w-12 text-ink-muted/30 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-base font-bold text-ink">Nenhum resultado encontrado</p>
                      <p className="text-xs text-ink-muted max-w-sm mx-auto">Não encontramos produtos ou petshops com estes critérios. Experimente buscar termos diferentes ou limpar os filtros.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      ) : (
        /* Default Home Page View */
        <>
          {/* Hero Banner Carousel */}
          <section className="relative w-full h-[200px] sm:h-[240px] md:h-[280px] overflow-hidden bg-zinc-950 select-none">
            {/* Slides */}
            <div className="absolute inset-0 w-full h-full">
              {CAROUSEL_SLIDES.map((slide, index) => {
                const isActive = index === activeIndex;
                return (
                  <div
                    key={index}
                    className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out ${
                      isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-[1.02] pointer-events-none"
                    }`}
                  >
                    {/* Background Image */}
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30 flex items-center justify-start px-6 sm:px-12 md:px-20 text-left" />

                    {/* Text Content Container */}
                    <div className="absolute inset-0 flex flex-col justify-center items-start px-8 sm:px-16 md:px-24 max-w-2xl text-white space-y-3 z-20 animate-in fade-in slide-in-from-left-6 duration-700">
                      <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-none drop-shadow-sm">
                        {slide.title}
                      </h1>
                      <p className="text-xs sm:text-base text-zinc-200/90 leading-relaxed font-medium drop-shadow-xs">
                        {slide.description}
                      </p>
                      <button
                        onClick={() => {
                          document.getElementById("stores-section")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="mt-1 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs px-4.5 py-2.5 tracking-wide transition shadow-md active:scale-95 duration-150 cursor-pointer"
                      >
                        Explorar Lojas
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Controls - Chevron Arrows */}
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/10 transition cursor-pointer select-none focus:outline-none"
              aria-label="Slide anterior"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/10 transition cursor-pointer select-none focus:outline-none"
              aria-label="Próximo slide"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {CAROUSEL_SLIDES.map((_, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive ? "w-6 bg-primary-500" : "w-2.5 bg-white/40 hover:bg-white/70"
                    }`}
                    aria-label={`Ir para slide ${index + 1}`}
                  />
                );
              })}
            </div>
          </section>

          {/* Block 1: Stores - Nearby */}
          <section id="stores-section" className="mx-auto w-full max-w-7xl px-4 py-10">
            <div className="flex flex-col gap-1 pb-4 border-b border-border">
              <h2 className="text-xl font-bold text-ink">Petshops em Destaque</h2>
              <p className="text-xs text-ink-muted">As melhores opções próximas de você para cuidar do seu pet.</p>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            {!error && stores === null && (
              <p className="mt-4 text-sm text-ink-muted">Carregando lojas...</p>
            )}
            {stores?.length === 0 && (
              <p className="mt-4 text-sm text-ink-muted">Nenhuma loja disponível ainda.</p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores?.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          </section>

          {/* Block 2: Products - On Sale (Horizontal Carousel scroll) */}
          {productsOnSale.length > 0 && (
            <section className="bg-primary-50/20 border-y border-primary-100/40 w-full py-12">
              <div className="mx-auto w-full max-w-7xl px-4 space-y-6">
                <div className="flex flex-col gap-1 select-none">
                  <h2 className="text-xl font-bold text-ink flex items-center gap-1.5">
                    <span>🔥</span> Ofertas Imperdíveis
                  </h2>
                  <p className="text-xs text-ink-muted">Aproveite os maiores descontos especiais do dia em nossos parceiros.</p>
                </div>

                <div className="flex overflow-x-auto gap-5 scrollbar-none pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {productsOnSale.map((product) => (
                    <div key={product.id} className="w-[280px] shrink-0">
                      <ProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        userRole={user?.role}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Block 3: Stores - Top Rated */}
          {topRatedStores && topRatedStores.length > 0 && (
            <section className="mx-auto w-full max-w-7xl px-4 py-10">
              <div className="flex flex-col gap-1 pb-4 border-b border-border">
                <h2 className="text-xl font-bold text-ink">Petshops Melhores Avaliados</h2>
                <p className="text-xs text-ink-muted">Os estabelecimentos mais elogiados pelos tutores da comunidade.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topRatedStores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            </section>
          )}

          {/* Block 4: Products - Spotlight Design (Type 2 UI/UX - Glow / Dark theme) */}
          {productsTopRated.length > 0 && (
            <section className="bg-zinc-950 py-12 w-full select-none">
              <div className="mx-auto w-full max-w-7xl px-4 space-y-8">
                <div className="text-center space-y-1.5 max-w-md mx-auto">
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
                    👑 Premium Choice
                  </span>
                  <h2 className="text-2xl font-black text-white tracking-tight">Destaques da Semana</h2>
                  <p className="text-xs text-zinc-400">Produtos premium com as avaliações máximas e recomendação absoluta.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {productsTopRated.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isFeatured
                      onAddToCart={handleAddToCart}
                      userRole={user?.role}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Block 5: Stores - New Arrivals (Circular Logo list) */}
          {storesNewestList.length > 0 && (
            <section className="mx-auto w-full max-w-7xl px-4 py-10 space-y-6">
              <div className="flex flex-col gap-1 select-none">
                <h2 className="text-xl font-bold text-ink">Novidades na Área</h2>
                <p className="text-xs text-ink-muted">Novos parceiros que acabaram de chegar ao PetDots.</p>
              </div>

              <div className="flex overflow-x-auto gap-8 scrollbar-none py-2 -mx-4 px-4 sm:mx-0 sm:px-0 items-center justify-start">
                {storesNewestList.map((store) => (
                  <Link
                    key={store.id}
                    href={`/stores/${store.id}`}
                    className="flex flex-col items-center shrink-0 group select-none relative"
                  >
                    <div className="relative">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-primary-200 bg-white hover:border-primary-500 hover:scale-105 transition duration-300 shadow-sm flex items-center justify-center">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl">🐾</span>
                        )}
                      </div>
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border-2 border-white shadow-xs animate-pulse">
                        Novo
                      </span>
                    </div>
                    <span className="text-xs font-bold text-ink mt-2.5 truncate w-20 sm:w-24 text-center group-hover:text-primary-600 transition">
                      {store.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Block 6: Products - Newest Arrivals (Type 3 Minimalist Grid) */}
          {productsNewest.length > 0 && (
            <section className="mx-auto w-full max-w-7xl px-4 py-10 border-t border-border">
              <div className="flex flex-col gap-1 pb-4">
                <h2 className="text-xl font-bold text-ink">Recém-Chegados do Mês</h2>
                <p className="text-xs text-ink-muted">Confira as novidades mais recentes inseridas em nosso catálogo.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {productsNewest.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isNew
                    onAddToCart={handleAddToCart}
                    userRole={user?.role}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex items-center justify-center p-20">
        <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
