"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  type Brand,
  type CatalogProduct,
  type Category,
  type PetType,
  type Store,
  type StoreProduct,
} from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/pricing";

// ---- form types ----

type Step =
  | { mode: "list" }
  | { mode: "catalog-search" }
  | { mode: "add-from-catalog"; catalogProduct: CatalogProduct }
  | { mode: "create-new" }
  | { mode: "edit"; storeProduct: StoreProduct };

interface NewProductForm {
  name: string;
  brandId: string;
  barcode: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  petTypeId: string;
  images: string[];
}

interface PriceStockForm {
  price: string;
  stock: string;
  customDescription: string;
}

interface EditForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  images: string[];
}

const EMPTY_NEW: NewProductForm = {
  name: "",
  brandId: "",
  barcode: "",
  description: "",
  price: "",
  stock: "",
  categoryId: "",
  petTypeId: "",
  images: [],
};

const EMPTY_PRICE_STOCK: PriceStockForm = { price: "", stock: "", customDescription: "" };

// ---- helpers ----

function spName(sp: StoreProduct) {
  return sp.catalogProduct.name;
}
function spCategoryId(sp: StoreProduct) {
  return sp.catalogProduct.categoryId;
}
function spImages(sp: StoreProduct) {
  return sp.catalogProduct.images;
}

export default function DashboardProductsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [step, setStep] = useState<Step>({ mode: "list" });

  const [newForm, setNewForm] = useState<NewProductForm>(EMPTY_NEW);
  const [priceStockForm, setPriceStockForm] = useState<PriceStockForm>(EMPTY_PRICE_STOCK);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiClient
      .getMyStore()
      .then((result) => setStore(result))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar sua loja."));
    apiClient.listCategories().then(setCategories).catch(() => undefined);
    apiClient.listPetTypes().then(setPetTypes).catch(() => undefined);
    apiClient.listBrands().then(setBrands).catch(() => undefined);
  }, []);

  const loadProducts = (storeId: string) => {
    apiClient
      .listMyProducts(storeId)
      .then(setStoreProducts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar os produtos."));
  };

  useEffect(() => {
    if (store) loadProducts(store.id);
  }, [store]);

  // catalog search with debounce
  useEffect(() => {
    if (step.mode !== "catalog-search") return;
    if (!catalogSearch.trim()) {
      setCatalogResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await apiClient.searchCatalog(catalogSearch.trim());
        setCatalogResults(results);
      } catch {
        setCatalogResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [catalogSearch, step.mode]);

  // ---- submit handlers ----

  const handleSubmitFromCatalog = async (e: FormEvent) => {
    e.preventDefault();
    if (!store || step.mode !== "add-from-catalog") return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient.createProduct({
        storeId: store.id,
        catalogProductId: step.catalogProduct.id,
        price: Number(priceStockForm.price),
        stock: Number(priceStockForm.stock),
        customDescription: priceStockForm.customDescription || undefined,
      });
      setStep({ mode: "list" });
      loadProducts(store.id);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível adicionar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitNew = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient.createProduct({
        storeId: store.id,
        name: newForm.name,
        brandId: newForm.brandId || undefined,
        barcode: newForm.barcode || undefined,
        description: newForm.description || undefined,
        price: Number(newForm.price),
        stock: Number(newForm.stock),
        categoryId: newForm.categoryId || undefined,
        petTypeId: newForm.petTypeId || undefined,
        images: newForm.images.length > 0 ? newForm.images : undefined,
      });
      setStep({ mode: "list" });
      loadProducts(store.id);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível criar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store || step.mode !== "edit" || !editForm) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient.updateProduct(step.storeProduct.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
        images: editForm.images,
      });
      setStep({ mode: "list" });
      loadProducts(store.id);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (fn: (prev: string[]) => string[]) => void,
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    e.target.value = "";
    setIsUploadingImage(true);
    setFormError(null);
    try {
      const results = await Promise.all(
        files.map((f) =>
          apiClient.uploadProductImage(f, f.name).then((r) => r.url).catch(() => null),
        ),
      );
      const urls = results.filter((u): u is string => u !== null);
      if (urls.length === 0) setFormError("Nenhuma imagem pôde ser enviada.");
      else setter((prev) => [...prev, ...urls]);
    } catch {
      setFormError("Erro ao enviar imagens.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleActive = async (sp: StoreProduct) => {
    if (!store) return;
    setUpdatingId(sp.id);
    setError(null);
    try {
      await apiClient.updateProduct(sp.id, { isActive: !sp.isActive });
      loadProducts(store.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o produto.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openEdit = (sp: StoreProduct) => {
    setFormError(null);
    setEditForm({
      name: sp.catalogProduct.name,
      description: sp.catalogProduct.description ?? "",
      price: sp.price,
      stock: String(sp.stock),
      images: sp.catalogProduct.images.map((img) => img.url),
    });
    setStep({ mode: "edit", storeProduct: sp });
  };

  // ---- grouping ----

  const groupedProducts = (() => {
    if (!storeProducts) return {};
    const groups: Record<string, StoreProduct[]> = {};
    storeProducts.forEach((sp) => {
      const catId = spCategoryId(sp) || "uncategorized";
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(sp);
    });
    return groups;
  })();


  // ---- render helpers ----

  const renderProductCard = (sp: StoreProduct) => {
    const isOutOfStock = sp.stock === 0;
    const isLowStock = sp.stock > 0 && sp.stock < 5;
    const img = spImages(sp)[0];
    return (
      <div
        key={sp.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:shadow-md transition duration-200"
      >
        <div className="flex items-center gap-4">
          {img ? (
            <img
              src={img.url}
              alt={spName(sp)}
              className="h-16 w-16 rounded-xl object-cover border border-border bg-surface-muted"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm font-bold text-ink leading-snug">{spName(sp)}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-primary-600">{formatCurrency(Number(sp.price))}</span>
              <span className="text-[10px] text-ink-muted/50">•</span>
              {sp.catalogProduct.category && (
                <>
                  <span className="text-xs font-medium text-ink-muted">{sp.catalogProduct.category.name}</span>
                  <span className="text-[10px] text-ink-muted/50">•</span>
                </>
              )}
              {isOutOfStock ? (
                <span className="bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2 py-0.5 text-[10px] font-bold">Sem estoque</span>
              ) : isLowStock ? (
                <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  Estoque baixo ({sp.stock})
                </span>
              ) : (
                <span className="bg-zinc-100 text-ink-muted border border-border rounded-full px-2 py-0.5 text-[10px] font-medium">
                  Estoque: {sp.stock}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:self-center">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${sp.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
            {sp.isActive ? "Ativo" : "Inativo"}
          </span>
          <button onClick={() => openEdit(sp)} className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-bold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 bg-surface cursor-pointer">
            Editar
          </button>
          <button
            onClick={() => handleToggleActive(sp)}
            disabled={updatingId === sp.id}
            className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-bold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 bg-surface disabled:opacity-60 cursor-pointer"
          >
            {sp.isActive ? "Desativar" : "Ativar"}
          </button>
        </div>
      </div>
    );
  };

  const renderImageUploader = (
    images: string[],
    onRemove: (i: number) => void,
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  ) => (
    <div className="flex flex-col gap-2 bg-surface-muted p-4 rounded-xl border border-border select-none">
      <label className="text-sm font-bold text-ink">Imagens do produto</label>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((url, i) => (
            <div key={url} className="relative group">
              <img src={url} alt={`Imagem ${i + 1}`} className="h-16 w-16 rounded-lg border border-border object-cover bg-white" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-xs cursor-pointer hover:bg-rose-700 transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="relative border-2 border-dashed border-border hover:border-primary-300 rounded-xl p-4 transition bg-surface flex flex-col items-center justify-center text-center cursor-pointer">
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={onUpload} disabled={isUploadingImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <svg className="h-6 w-6 text-ink-muted/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2.5 2.5 0 013.414 0L16 16m-2-2l1.586-1.586a2.5 2.5 0 013.414 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs font-semibold text-ink">Clique para enviar imagens</span>
        <span className="text-[10px] text-ink-muted mt-0.5">JPG, PNG, WEBP</span>
      </div>
      {isUploadingImage && <p className="text-xs text-primary-600 font-bold animate-pulse mt-1">Enviando imagens...</p>}
    </div>
  );

  const renderCategorySelector = (value: string, onChange: (v: string) => void) => (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-ink">Categoria do Produto</span>
      <div className="rounded-xl border border-border p-4 bg-zinc-50/50 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => onChange(c.id)}
              className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${value === c.id ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs" : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"}`}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-ink-muted">Nenhuma se aplica?</span>
          <button type="button" onClick={() => onChange("")}
            className={`flex items-center justify-center px-4 py-2 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${value === "" ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs" : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"}`}>
            Sem Categoria
          </button>
        </div>
      </div>
    </div>
  );

  const renderPetTypeSelector = (value: string, onChange: (v: string) => void) => (
    petTypes.length > 0 ? (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-ink">Tipo de Pet <span className="text-ink-muted font-normal">(opcional)</span></span>
        <div className="rounded-xl border border-border p-4 bg-zinc-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button type="button" onClick={() => onChange("")}
              className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${value === "" ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs" : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"}`}>
              Nenhum
            </button>
            {petTypes.map((pt) => (
              <button key={pt.id} type="button" onClick={() => onChange(pt.id)}
                className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${value === pt.id ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs" : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"}`}>
                {pt.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : null
  );

  const renderFormError = () =>
    formError ? (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
        <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>{formError}</span>
      </div>
    ) : null;

  const renderFormActions = (label: string) => (
    <div className="flex gap-2.5 pt-2 border-t border-border mt-1">
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center py-2.5 px-5 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {isSubmitting ? "Salvando..." : label}
      </button>
      <button
        type="button"
        onClick={() => { setStep({ mode: "list" }); setFormError(null); }}
        className="rounded-xl border border-border px-5 py-2.5 text-xs font-bold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 bg-surface cursor-pointer"
      >
        Cancelar
      </button>
    </div>
  );

  // ---- guards ----

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!store) return <p className="text-sm text-ink-muted">Carregando...</p>;

  // ---- STEP: catalog search ----

  if (step.mode === "catalog-search") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-md w-full">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-ink">Buscar no catálogo global</h2>
            <p className="text-xs text-ink-muted mt-1">
              Reutilize produtos já cadastrados por outros lojistas. Você define apenas o preço e o estoque.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">Nome do produto</label>
            <input
              autoFocus
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Ex: Ração Golden, Coleira Nylon..."
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 w-full"
            />
          </div>

          {isSearching && <p className="text-xs text-primary-600 animate-pulse">Buscando...</p>}

          {catalogResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink-muted">{catalogResults.length} resultado(s) encontrado(s)</p>
              {catalogResults.map((cp) => (
                <div key={cp.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-3">
                  <div className="flex items-center gap-3">
                    {cp.images[0] ? (
                      <img src={cp.images[0].url} alt={cp.name} className="h-12 w-12 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-ink">{cp.name}</p>
                      {cp.brand?.name && <p className="text-xs text-ink-muted">{cp.brand.name}</p>}
                      {cp.category && <p className="text-[10px] text-ink-muted/70">{cp.category.name}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPriceStockForm(EMPTY_PRICE_STOCK);
                      setFormError(null);
                      setStep({ mode: "add-from-catalog", catalogProduct: cp });
                    }}
                    className="shrink-0 rounded-xl bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600 transition cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}

          {catalogSearch.trim() && !isSearching && catalogResults.length === 0 && (
            <p className="text-xs text-ink-muted">Nenhum resultado encontrado para "{catalogSearch}".</p>
          )}

          <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs text-ink-muted">Não encontrou o produto?</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setNewForm({ ...EMPTY_NEW }); setFormError(null); setStep({ mode: "create-new" }); }}
                className="rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-white hover:bg-primary-600 transition cursor-pointer"
              >
                Criar produto novo
              </button>
              <button
                onClick={() => { setCatalogSearch(""); setCatalogResults([]); setStep({ mode: "list" }); }}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-ink-muted hover:border-primary-500 hover:text-primary-600 transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- STEP: add from catalog ----

  if (step.mode === "add-from-catalog") {
    const cp = step.catalogProduct;
    return (
      <div className="space-y-6">
        <form onSubmit={handleSubmitFromCatalog} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-md w-full">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-ink">Adicionar à sua loja</h2>
            <p className="text-xs text-ink-muted mt-1">Defina o preço e o estoque para este produto na sua loja.</p>
          </div>

          {/* Catalog product preview */}
          <div className="flex items-center gap-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
            {cp.images[0] ? (
              <img src={cp.images[0].url} alt={cp.name} className="h-14 w-14 rounded-lg object-cover border border-border" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-ink">{cp.name}</p>
              {cp.brand?.name && <p className="text-xs text-ink-muted">{cp.brand.name}</p>}
              {cp.description && <p className="text-xs text-ink-muted/70 mt-0.5 line-clamp-2">{cp.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Preço (R$)</label>
              <input
                required type="number" min="0" step="0.01"
                value={priceStockForm.price}
                onChange={(e) => setPriceStockForm({ ...priceStockForm, price: e.target.value })}
                placeholder="0.00"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Quantidade em estoque</label>
              <input
                required type="number" min="0" step="1"
                value={priceStockForm.stock}
                onChange={(e) => setPriceStockForm({ ...priceStockForm, stock: e.target.value })}
                placeholder="0"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">
              Descrição personalizada <span className="text-ink-muted font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={priceStockForm.customDescription}
              onChange={(e) => setPriceStockForm({ ...priceStockForm, customDescription: e.target.value })}
              placeholder="Complemento ou detalhe específico da sua loja..."
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none"
            />
          </div>

          {renderFormError()}
          {renderFormActions("Adicionar à minha loja")}
        </form>
      </div>
    );
  }

  // ---- STEP: create new ----

  if (step.mode === "create-new") {
    return (
      <div className="space-y-6">
        <form onSubmit={handleSubmitNew} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-md w-full">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-ink">Novo Produto</h2>
            <p className="text-xs text-ink-muted mt-1">Preencha as informações. Este produto ficará disponível no catálogo global para outros lojistas também utilizarem.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-ink">Nome do produto</label>
              <input required minLength={2} value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="Ex: Ração Golden Special Cães Adultos 15kg"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 w-full"
              />
            </div>
            {brands.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-ink">Marca <span className="text-ink-muted font-normal">(opcional)</span></span>
                <div className="rounded-xl border border-border p-4 bg-zinc-50/50 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {brands.map((b) => (
                      <button key={b.id} type="button" onClick={() => setNewForm({ ...newForm, brandId: newForm.brandId === b.id ? "" : b.id })}
                        className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${newForm.brandId === b.id ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs" : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"}`}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Código de barras <span className="text-ink-muted font-normal">(opcional)</span></label>
              <input value={newForm.barcode}
                onChange={(e) => setNewForm({ ...newForm, barcode: e.target.value })}
                placeholder="EAN / código de barras"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">Descrição <span className="text-ink-muted font-normal">(opcional)</span></label>
            <textarea rows={3} value={newForm.description}
              onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              placeholder="Características, benefícios e indicação do produto..."
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Preço (R$)</label>
              <input required type="number" min="0" step="0.01" value={newForm.price}
                onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
                placeholder="0.00"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Quantidade em estoque</label>
              <input required type="number" min="0" step="1" value={newForm.stock}
                onChange={(e) => setNewForm({ ...newForm, stock: e.target.value })}
                placeholder="0"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          {renderCategorySelector(newForm.categoryId, (v) => setNewForm({ ...newForm, categoryId: v }))}
          {renderPetTypeSelector(newForm.petTypeId, (v) => setNewForm({ ...newForm, petTypeId: v }))}
          {renderImageUploader(
            newForm.images,
            (i) => setNewForm((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) })),
            (e) => handleImageUpload(e, (fn) => setNewForm((prev) => ({ ...prev, images: fn(prev.images) }))),
          )}

          {renderFormError()}
          {renderFormActions("Criar produto")}
        </form>
      </div>
    );
  }

  // ---- STEP: edit ----

  if (step.mode === "edit" && editForm) {
    return (
      <div className="space-y-6">
        <form onSubmit={handleSubmitEdit} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-md w-full">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-ink">Editar Produto</h2>
            <p className="text-xs text-ink-muted mt-1">Alterações no nome, descrição e imagens impactam o catálogo global do produto.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">Nome do produto</label>
            <input required minLength={2} value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">Descrição <span className="text-ink-muted font-normal">(opcional)</span></label>
            <textarea rows={3} value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Preço (R$)</label>
              <input required type="number" min="0" step="0.01" value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">Quantidade em estoque</label>
              <input required type="number" min="0" step="1" value={editForm.stock}
                onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          {renderImageUploader(
            editForm.images,
            (i) => setEditForm((prev) => prev ? { ...prev, images: prev.images.filter((_, idx) => idx !== i) } : prev),
            (e) => handleImageUpload(e, (fn) => setEditForm((prev) => prev ? { ...prev, images: fn(prev.images) } : prev)),
          )}

          {renderFormError()}
          {renderFormActions("Salvar")}
        </form>
      </div>
    );
  }

  // ---- STEP: list (default) ----

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-xl shadow-xs select-none">
        <div>
          <h2 className="text-sm font-bold text-ink">Seus Produtos</h2>
          <p className="text-[10px] text-ink-muted mt-0.5">Cadastre, edite e controle o estoque dos itens da sua loja.</p>
        </div>
        <button
          onClick={() => { setCatalogSearch(""); setCatalogResults([]); setStep({ mode: "catalog-search" }); }}
          className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary-600 cursor-pointer shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo produto
        </button>
      </div>

      {storeProducts?.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center select-none">
          <svg className="h-10 w-10 text-ink-muted/40 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm font-semibold text-ink">Nenhum produto cadastrado ainda</p>
          <p className="text-xs text-ink-muted mt-1">Clique em "Novo produto" para começar.</p>
        </div>
      )}

      {/* Category filter tabs */}
      {storeProducts && storeProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-1.5 border-b border-border select-none">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer border ${selectedFilter === "all" ? "bg-primary-500 text-white border-primary-500 shadow-sm" : "bg-surface text-ink-muted border-border hover:border-primary-300 hover:text-ink"}`}
          >
            Todos ({storeProducts.length})
          </button>
          {categories.map((cat) => {
            const count = storeProducts.filter((sp) => spCategoryId(sp) === cat.id).length;
            if (count === 0) return null;
            return (
              <button key={cat.id} onClick={() => setSelectedFilter(cat.id)}
                className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer border ${selectedFilter === cat.id ? "bg-primary-500 text-white border-primary-500 shadow-sm" : "bg-surface text-ink-muted border-border hover:border-primary-300 hover:text-ink"}`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
          {storeProducts.some((sp) => !spCategoryId(sp)) && (
            <button onClick={() => setSelectedFilter("uncategorized")}
              className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer border ${selectedFilter === "uncategorized" ? "bg-primary-500 text-white border-primary-500 shadow-sm" : "bg-surface text-ink-muted border-border hover:border-primary-300 hover:text-ink"}`}
            >
              Sem Categoria ({storeProducts.filter((sp) => !spCategoryId(sp)).length})
            </button>
          )}
        </div>
      )}

      {/* Product listing */}
      {storeProducts && storeProducts.length > 0 && (
        <div className="space-y-8 select-none">
          {selectedFilter === "all" ? (
            <>
              {categories.map((cat) => {
                const group = groupedProducts[cat.id] || [];
                if (group.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
                      <h3 className="text-sm font-bold text-ink">{cat.name}</h3>
                      <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {group.length} {group.length === 1 ? "produto" : "produtos"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">{group.map(renderProductCard)}</div>
                  </div>
                );
              })}
              {groupedProducts["uncategorized"]?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
                    <h3 className="text-sm font-bold text-ink">Sem Categoria</h3>
                    <span className="bg-zinc-100 text-ink-muted px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {groupedProducts["uncategorized"].length} {groupedProducts["uncategorized"].length === 1 ? "produto" : "produtos"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">{groupedProducts["uncategorized"].map(renderProductCard)}</div>
                </div>
              )}
            </>
          ) : (() => {
            const active = selectedFilter === "uncategorized"
              ? (groupedProducts["uncategorized"] || [])
              : (groupedProducts[selectedFilter] || []);
            const isUncat = selectedFilter === "uncategorized";
            const catObj = categories.find((c) => c.id === selectedFilter);
            const title = isUncat ? "Sem Categoria" : catObj?.name ?? "Todos";

            if (active.length === 0) {
              return (
                <div className="bg-surface border border-border rounded-2xl p-10 text-center select-none space-y-4">
                  <p className="text-sm font-semibold text-ink">Nenhum produto na categoria "{title}"</p>
                  <button
                    onClick={() => { setCatalogSearch(""); setCatalogResults([]); setStep({ mode: "catalog-search" }); }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-white hover:bg-primary-600 cursor-pointer"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Cadastrar produto
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
                  <h3 className="text-sm font-bold text-ink">{title}</h3>
                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {active.length} {active.length === 1 ? "produto" : "produtos"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4">{active.map(renderProductCard)}</div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
