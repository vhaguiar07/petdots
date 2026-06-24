"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ApiError, type StoreProduct, type Promotion, type Store, type StoreReview } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { formatCurrency, getEffectiveUnitPrice, hasActiveDiscount } from "@/lib/pricing";
import { BUSINESS_HOURS_GROUPS, formatDaySchedule } from "@/lib/business-hours";

export default function StoreCatalogPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [highlightedCoupon, setHighlightedCoupon] = useState<Promotion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Store Reviews & Modal States
  const [activeTab, setActiveTab] = useState<"products" | "reviews">("products");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submittedReview, setSubmittedReview] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState<StoreReview[]>([]);

  // Redesign local filters & states
  const [localSearch, setLocalSearch] = useState("");
  const [selectedLocalCategory, setSelectedLocalCategory] = useState("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([apiClient.getStore(id), apiClient.listProducts({ storeId: id, pageSize: 100 })])
      .then(([storeData, productsData]) => {
        setStore(storeData);
        setProducts(productsData.items);
      })
      .catch(() => setError("Não foi possível carregar esta loja."));

    apiClient
      .listStoreReviews(id)
      .then(setReviews)
      .catch(() => undefined);

    apiClient
      .getHighlightedCoupon(id)
      .then(setHighlightedCoupon)
      .catch(() => undefined);
  }, [id]);

  const handleAddToCart = (product: StoreProduct) => {
    if (!store) return;
    const added = addItem(product, store);
    if (added) {
      setFeedback(`"${product.catalogProduct.name}" adicionado ao carrinho.`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const myReview = user ? reviews.find((r) => r.customerId === user.id) ?? null : null;

  const handleOpenReviewModal = () => {
    setRating(myReview?.rating ?? 5);
    setComment(myReview?.comment ?? "");
    setSubmittedReview(null);
    setReviewError(null);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setIsSubmittingReview(true);
    try {
      const updated = await apiClient.upsertStoreReview(id, { rating, comment: comment || undefined });
      setReviews((prev) => [updated, ...prev.filter((r) => r.id !== updated.id)]);
      const refreshedStore = await apiClient.getStore(id);
      setStore(refreshedStore);
      setSubmittedReview("Sua avaliação da loja foi enviada com sucesso! Obrigado.");
      setTimeout(() => {
        setShowReviewModal(false);
        setSubmittedReview(null);
        setActiveTab("reviews");
      }, 2000);
    } catch (err) {
      setReviewError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível enviar sua avaliação.",
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Dynamic calculations
  const avgRating = (store?.avgRating ?? 0).toFixed(1);
  const outOfStockCount = useMemo(() => {
    return products ? products.filter((p) => p.stock <= 0).length : 0;
  }, [products]);

  // Check if store is open (mock hours 08:00 - 19:00, Monday to Saturday)
  const isStoreOpen = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 6 is Saturday
    if (day === 0) return false; // Closed on Sunday
    const hours = now.getHours();
    return hours >= 8 && hours < 19;
  }, []);

  // Copy coupon action
  const copyCoupon = () => {
    if (!highlightedCoupon?.code) return;
    navigator.clipboard.writeText(highlightedCoupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const couponValueLabel = highlightedCoupon
    ? highlightedCoupon.discountType === "PERCENTAGE"
      ? `${Number(highlightedCoupon.value)}%`
      : formatCurrency(Number(highlightedCoupon.value))
    : "";

  // Dynamic represented categories from store products
  const representedCategories = useMemo(() => {
    if (!products) return [];
    const map = new Map();
    products.forEach((p) => {
      if (p.catalogProduct.category) {
        map.set(p.catalogProduct.category.id, p.catalogProduct.category);
      }
    });
    return Array.from(map.values());
  }, [products]);

  // Local products search and category filtering
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch =
        p.catalogProduct.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        (p.catalogProduct.description && p.catalogProduct.description.toLowerCase().includes(localSearch.toLowerCase()));
      const matchesCategory =
        selectedLocalCategory === "all" || p.catalogProduct.categoryId === selectedLocalCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, localSearch, selectedLocalCategory]);

  // Group filtered products by category for structured listing
  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: { name: string; list: StoreProduct[] } } = {};

    filteredProducts.forEach((p) => {
      const catId = p.catalogProduct.categoryId || "uncategorized";
      const catName = p.catalogProduct.category?.name || "Sem Categoria";
      if (!groups[catId]) {
        groups[catId] = { name: catName, list: [] };
      }
      groups[catId].list.push(p);
    });

    return groups;
  }, [filteredProducts]);

  if (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!store || !products) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 flex flex-col items-center justify-center gap-3">
        <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-ink-muted font-medium">Carregando detalhes do petshop...</p>
      </main>
    );
  }

  // Cover fallbacks & profile picture
  const coverBanner = store.coverUrl || "/hero_banner_1.png";
  const profileAvatar = store.logoUrl || "/logo.png";
  const storeBio = store.description || "Bem-vindo ao nosso petshop parceiro no PetDots! Aqui você encontra os melhores produtos com entrega expressa e toda a atenção que o seu pet merece.";

  return (
    <main className="flex flex-1 flex-col bg-zinc-50/40 select-none pb-12">
      {feedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-xs font-bold text-primary-700 shadow-md">
          {feedback}
        </div>
      )}

      {/* 1. Cover Photo Section */}
      <section className="relative w-full h-36 sm:h-48 md:h-56 bg-zinc-900 overflow-hidden">
        <img
          src={coverBanner}
          alt={`Capa de ${store.name}`}
          className="w-full h-full object-cover opacity-75"
        />
        {/* Dark bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </section>

      {/* 2. Store Identity & Metadata section */}
      <section className="mx-auto w-full max-w-7xl px-4 relative z-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-8 sm:-mt-12 pb-6 border-b border-border">
          {/* Avatar and Name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-3xl overflow-hidden border-4 border-white bg-white shadow-md flex items-center justify-center shrink-0">
              <img
                src={profileAvatar}
                alt={`Logo de ${store.name}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-1.5 md:pb-2">
              <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-ink tracking-tight leading-none">
                  {store.name}
                </h1>
                
                {/* Geolocation Status badging */}
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border ${
                  isStoreOpen 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                    : "bg-rose-50 text-rose-700 border-rose-100"
                }`}>
                  {isStoreOpen ? "Aberto agora" : "Fechado"}
                </span>

                {store.deliveryProvider === "SELF" && (
                  <span className="bg-primary-50 text-primary-700 border border-primary-100 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase">
                    🚚 Entrega Rápida
                  </span>
                )}
              </div>

              {/* Star details */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const val = Math.round(Number(avgRating));
                    return (
                      <svg key={star} className={`h-4 w-4 ${star <= val ? "text-amber-400" : "text-zinc-200"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    );
                  })}
                </div>
                <span className="text-xs font-extrabold text-ink">{avgRating}★ <span className="text-ink-muted/70 font-bold">({store.reviewCount} avaliações)</span></span>
              </div>
            </div>
          </div>

          {/* Action button */}
          {user?.role === "CUSTOMER" && (
            <button
              onClick={handleOpenReviewModal}
              className="self-center md:mb-2 flex items-center gap-1.5 rounded-xl border border-border hover:border-primary-500 hover:text-primary-600 bg-white px-4 py-2.5 text-xs font-extrabold text-ink-muted transition cursor-pointer select-none active:scale-95 duration-150"
            >
              <svg className="h-4 w-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {myReview ? "Editar avaliação" : "Avaliar Loja"}
            </button>
          )}
        </div>
      </section>

      {/* 3. Main Grid layout: Sidebar & Main Area */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Sidebar details */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Bio / Description Card */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-primary-500">Sobre a Loja</h3>
            <p className="text-xs text-ink-muted leading-relaxed whitespace-pre-wrap">{storeBio}</p>
          </div>

          {/* Contact and address Card */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-extrabold text-primary-500">Contato & Localização</h3>
            
            <div className="space-y-3 text-xs">
              {/* Phone */}
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <p className="font-bold text-ink">Telefone / WhatsApp</p>
                  <p className="text-ink-muted mt-0.5">{store?.phone || "(21) 98765-4321"}</p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-bold text-ink">Horário de Atendimento</p>
                  {store?.businessHours ? (
                    BUSINESS_HOURS_GROUPS.map(({ key, label }) => (
                      <p key={key} className="text-ink-muted mt-0.5">
                        {label}: {formatDaySchedule(store.businessHours?.[key])}
                      </p>
                    ))
                  ) : (
                    <>
                      <p className="text-ink-muted mt-0.5">Seg a Sáb - 08:00 às 19:00</p>
                      <p className="text-ink-muted/80">Domingos - Fechado</p>
                    </>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 pt-1.5 border-t border-border/60">
                <svg className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-bold text-ink">Endereço</p>
                  <p className="text-ink-muted mt-0.5">
                    {store.street ? `${store.street}, ${store.number}` : "Av. das Américas, 1500"}
                  </p>
                  <p className="text-ink-muted/80">
                    {store.neighborhood ? store.neighborhood : "Barra da Tijuca"}
                  </p>
                  <p className="text-ink-muted/80">
                    {store.city ? `${store.city} - ${store.state}` : "Rio de Janeiro - RJ"}
                  </p>
                </div>
              </div>

              {/* Raio máximo de entrega */}
              <div className="flex items-start gap-2 pt-1.5 border-t border-border/60">
                <span className="text-zinc-400 shrink-0 mt-0.5 text-xs">⚡</span>
                <div>
                  <p className="font-bold text-ink">Raio máximo de entrega</p>
                  <p className="text-ink-muted mt-0.5">
                    {store.deliveryRadiusKm != null ? `${store.deliveryRadiusKm} km` : "10 km"}
                  </p>
                </div>
              </div>
            </div>

            {/* Social Links buttons */}
            <div className="flex gap-2 pt-2">
              <a href={store?.instagram ? (store.instagram.startsWith("http") ? store.instagram : `https://instagram.com/${store.instagram.replace("@", "")}`) : "https://instagram.com"} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center p-2 rounded-xl border border-border hover:border-primary-400 hover:text-primary-600 transition bg-zinc-50/50 text-ink-muted font-bold text-xs select-none">
                Instagram
              </a>
              <a href={store?.whatsapp ? (store.whatsapp.startsWith("http") ? store.whatsapp : `https://wa.me/${store.whatsapp.replace(/\D/g, "")}`) : "https://whatsapp.com"} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center p-2 rounded-xl border border-border hover:border-emerald-400 hover:text-emerald-600 transition bg-zinc-50/50 text-ink-muted font-bold text-xs select-none">
                WhatsApp
              </a>
            </div>
          </div>
        </aside>

        {/* Right Column: Dynamic Tabs & Products */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Coupon Announcement Banner */}
          {highlightedCoupon && (
            <div className="relative rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50 to-primary-100/40 p-4.5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
              <div className="space-y-1">
                <span className="bg-primary-500 text-white rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase">
                  Cupom da Loja
                </span>
                <h4 className="text-sm sm:text-base font-extrabold text-ink mt-1.5">
                  {highlightedCoupon.name}
                </h4>
                <p className="text-xs text-ink-muted">
                  {highlightedCoupon.highlightMessage ||
                    `Ganhe ${couponValueLabel} de desconto. Copie o código abaixo e adicione no carrinho durante o checkout.`}
                </p>
              </div>

              <button
                onClick={copyCoupon}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 duration-100 border ${
                  copied
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-white text-primary-600 border-primary-200 hover:border-primary-400"
                }`}
              >
                {copied ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copiado!
                  </>
                ) : (
                  <>
                    <span className="font-mono tracking-wider">{highlightedCoupon.code}</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Premium Tab Selector */}
          <div className="flex border-b border-border bg-white rounded-2xl p-1 shadow-xs">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 py-3.5 text-xs sm:text-sm font-extrabold rounded-xl transition cursor-pointer select-none ${
                activeTab === "products"
                  ? "bg-primary-500 text-white shadow-xs"
                  : "text-ink-muted hover:text-ink hover:bg-zinc-50"
              }`}
            >
              Produtos ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 py-3.5 text-xs sm:text-sm font-extrabold rounded-xl transition cursor-pointer select-none ${
                activeTab === "reviews"
                  ? "bg-primary-500 text-white shadow-xs"
                  : "text-ink-muted hover:text-ink hover:bg-zinc-50"
              }`}
            >
              Avaliações ({store.reviewCount})
            </button>
          </div>

          {/* Tab 1: Products Listing with local search & categories filters */}
          {activeTab === "products" ? (
            <div className="space-y-6">
              
              {/* Local Search and Category Pills Filter Bar */}
              <div className="bg-white border border-border p-4 rounded-2xl shadow-xs space-y-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Pesquisar nos produtos desta loja..."
                    className="w-full rounded-xl border border-border bg-zinc-50/50 hover:bg-zinc-50 px-4 py-2.5 pl-10 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:bg-white placeholder-ink-muted/50"
                  />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {localSearch && (
                    <button
                      onClick={() => setLocalSearch("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-ink transition cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                {representedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setSelectedLocalCategory("all")}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase transition cursor-pointer border ${
                        selectedLocalCategory === "all"
                          ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                          : "bg-surface text-ink-muted border-border hover:border-zinc-300"
                      }`}
                    >
                      Todos
                    </button>
                    {representedCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedLocalCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase transition cursor-pointer border ${
                          selectedLocalCategory === cat.id
                            ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                            : "bg-surface text-ink-muted border-border hover:border-zinc-300"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Products content rendering */}
              {filteredProducts.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl p-10 text-center select-none space-y-2">
                  <svg className="h-10 w-10 text-ink-muted/30 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-bold text-ink">Nenhum produto correspondente</p>
                  <p className="text-xs text-ink-muted">Tente ajustar o termo de pesquisa ou remover o filtro de categoria.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Category structured grouping when listing "Todos" */}
                  {selectedLocalCategory === "all" ? (
                    Object.keys(groupedProducts).map((catId) => {
                      const group = groupedProducts[catId];
                      return (
                        <div key={catId} className="space-y-4">
                          <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
                            <h3 className="text-sm font-extrabold text-ink leading-tight uppercase tracking-wider">{group.name}</h3>
                            <span className="bg-zinc-100 text-ink-muted/80 px-2 py-0.5 rounded-full text-[9px] font-extrabold">
                              {group.list.length} {group.list.length === 1 ? "item" : "itens"}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {group.list.map((product) => {
                              const effectivePrice = getEffectiveUnitPrice(product);
                              const discounted = hasActiveDiscount(product);
                              const outOfStock = product.stock <= 0;

                              return (
                                <article
                                  key={product.id}
                                  className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-5 shadow-xs hover:shadow-md transition duration-200"
                                >
                                  <Link href={`/products/${product.id}`} className="group block space-y-2 select-none">
                                    <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-primary-50 text-3xl">
                                      {product.catalogProduct.images[0] ? (
                                        <img
                                          src={product.catalogProduct.images[0].url}
                                          alt={product.catalogProduct.name}
                                          className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                      ) : (
                                        <span className="group-hover:scale-110 transition duration-300">🐾</span>
                                      )}
                                    </div>

                                    {product.catalogProduct.category && (
                                      <div className="pt-1 select-none">
                                        <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                                          {product.catalogProduct.category.name}
                                        </span>
                                      </div>
                                    )}

                                    <h4 className="text-sm font-bold text-ink group-hover:text-primary-600 transition tracking-tight">{product.catalogProduct.name}</h4>
                                  </Link>
                                  {product.catalogProduct.description && (
                                    <p className="line-clamp-2 text-xs text-ink-muted leading-relaxed">{product.catalogProduct.description}</p>
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
                                  </div>

                                  <p className="text-[10px] text-ink-muted">
                                    {outOfStock ? "Sem estoque" : `${product.stock} unidades disponíveis`}
                                  </p>

                                  {user?.role === "CUSTOMER" || !user ? (
                                    <button
                                      onClick={() => handleAddToCart(product)}
                                      disabled={outOfStock}
                                      className="mt-2 rounded-full bg-primary-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs"
                                    >
                                      Adicionar ao carrinho
                                    </button>
                                  ) : null}
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Simple grid when specific category filter is active
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredProducts.map((product) => {
                        const effectivePrice = getEffectiveUnitPrice(product);
                        const discounted = hasActiveDiscount(product);
                        const outOfStock = product.stock <= 0;

                        return (
                          <article
                            key={product.id}
                            className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-5 shadow-xs hover:shadow-md transition duration-200"
                          >
                            <Link href={`/products/${product.id}`} className="group block space-y-2 select-none">
                              <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-primary-50 text-3xl">
                                {product.catalogProduct.images[0] ? (
                                  <img
                                    src={product.catalogProduct.images[0].url}
                                    alt={product.catalogProduct.name}
                                    className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                ) : (
                                  <span className="group-hover:scale-110 transition duration-300">🐾</span>
                                )}
                              </div>

                              {product.catalogProduct.category && (
                                <div className="pt-1 select-none">
                                  <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                                    {product.catalogProduct.category.name}
                                  </span>
                                </div>
                              )}

                              <h4 className="text-sm font-bold text-ink group-hover:text-primary-600 transition tracking-tight">{product.catalogProduct.name}</h4>
                            </Link>
                            {product.catalogProduct.description && (
                              <p className="line-clamp-2 text-xs text-ink-muted leading-relaxed">{product.catalogProduct.description}</p>
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
                            </div>

                            <p className="text-[10px] text-ink-muted">
                              {outOfStock ? "Sem estoque" : `${product.stock} unidades disponíveis`}
                            </p>

                            {user?.role === "CUSTOMER" || !user ? (
                              <button
                                onClick={() => handleAddToCart(product)}
                                disabled={outOfStock}
                                      className="mt-2 rounded-full bg-primary-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs"
                              >
                                Adicionar ao carrinho
                              </button>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Reviews List */
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-ink">Avaliações da Loja</h2>

              {/* Average Summary Header Card */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white border border-border rounded-2xl select-none shadow-xs">
                <div className="text-center sm:border-r sm:border-border sm:pr-8">
                  <h4 className="text-4xl font-black text-ink">{avgRating}</h4>
                  <p className="text-[9px] font-extrabold text-ink-muted uppercase tracking-wider mt-1">de 5.0 estrelas</p>
                </div>

                <div className="flex-1 space-y-1 w-full max-w-xs">
                  {[5, 4, 3, 2, 1].map((starVal) => {
                    const count = reviews.filter((r) => r.rating === starVal).length;
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={starVal} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-ink w-3 text-right">{starVal}</span>
                        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-ink-muted w-6">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews stream */}
              {reviews.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl p-10 text-center select-none text-xs text-ink-muted italic">
                  Esta loja ainda não recebeu avaliações.
                </div>
              ) : (
                <div className="bg-white border border-border rounded-2xl p-6 divide-y divide-border space-y-4 shadow-xs">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-ink">{rev.customer?.name ?? "Cliente"}</span>
                          <div className="flex text-amber-400 gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`h-3.5 w-3.5 ${star <= rev.rating ? "text-amber-400" : "text-zinc-200"}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-ink-muted">
                          {new Date(rev.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                      {rev.comment && (
                        <p className="text-xs text-ink-muted leading-relaxed whitespace-pre-wrap">{rev.comment}</p>
                      )}
                      {rev.ownerReply && (
                        <div className="mt-2 rounded-xl border border-primary-100 bg-primary-50 p-3">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600">
                            Resposta da loja
                          </p>
                          <p className="mt-1 text-xs text-ink-muted leading-relaxed">{rev.ownerReply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </section>

      {/* Review Store Modal */}
      {showReviewModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReviewModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-md w-full p-6 md:p-8 shadow-2xl relative space-y-5 select-none animate-in fade-in-50 zoom-in-95 duration-200 cursor-default">
            {/* Close Button */}
            <button
              onClick={() => setShowReviewModal(false)}
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
                    {myReview ? "Editar avaliação" : "Avaliar Loja"}
                  </h3>
                  <p className="text-xs text-ink-muted">Deixe sua opinião sobre seu atendimento e entrega com a {store.name}.</p>
                </div>

                {reviewError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                    {reviewError}
                  </div>
                )}

                {/* Interactive Star Rating */}
                <div className="space-y-2 text-center py-2">
                  <span className="text-xs font-bold text-ink-muted">Sua nota para o petshop</span>
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
                  <label htmlFor="comment" className="text-xs font-bold text-ink-muted">Sua experiência</label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Fale sobre o atendimento, rapidez de envio, qualidade dos produtos..."
                    className="rounded-xl border border-border px-4 py-3 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
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
