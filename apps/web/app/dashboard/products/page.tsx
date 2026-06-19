"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, type Category, type PetType, type Product, type Store } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/pricing";

interface ProductFormState {
  id: string | null;
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  petTypeId: string;
  images: string[];
}

const EMPTY_FORM: ProductFormState = {
  id: null,
  name: "",
  description: "",
  price: "",
  stock: "",
  categoryId: "",
  petTypeId: "",
  images: [],
};

export default function DashboardProductsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  useEffect(() => {
    apiClient
      .getMyStore()
      .then((result) => setStore(result))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar sua loja."));
    apiClient.listCategories().then(setCategories).catch(() => undefined);
    apiClient.listPetTypes().then(setPetTypes).catch(() => undefined);
  }, []);

  const loadProducts = (storeId: string) => {
    apiClient
      .listMyProducts(storeId)
      .then(setProducts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar os produtos."));
  };

  useEffect(() => {
    if (store) loadProducts(store.id);
  }, [store]);

  const openNewForm = (preselectedCategoryId?: string) => {
    setFormError(null);
    let defaultCatId = "";
    if (preselectedCategoryId) {
      defaultCatId = preselectedCategoryId;
    } else if (selectedFilter !== "all" && selectedFilter !== "uncategorized") {
      defaultCatId = selectedFilter;
    }
    setForm({
      ...EMPTY_FORM,
      categoryId: defaultCatId,
    });
  };

  const openEditForm = (product: Product) => {
    setFormError(null);
    setForm({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      price: product.price,
      stock: String(product.stock),
      categoryId: product.categoryId ?? "",
      petTypeId: product.petTypeId ?? "",
      images: product.images.map((img) => img.url),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !store) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (form.id) {
        await apiClient.updateProduct(form.id, {
          name: form.name,
          description: form.description || undefined,
          price: Number(form.price),
          stock: Number(form.stock),
          categoryId: form.categoryId || undefined,
          petTypeId: form.petTypeId || undefined,
          images: form.images,
        });
      } else {
        await apiClient.createProduct({
          storeId: store.id,
          name: form.name,
          description: form.description || undefined,
          price: Number(form.price),
          stock: Number(form.stock),
          categoryId: form.categoryId || undefined,
          petTypeId: form.petTypeId || undefined,
          images: form.images,
        });
      }
      setForm(null);
      loadProducts(store.id);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0 || !form) return;

    const filesToUpload = Array.from(fileList);
    event.target.value = "";

    setFormError(null);
    setIsUploadingImage(true);
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        try {
          const { url } = await apiClient.uploadProductImage(file, file.name);
          return url;
        } catch (err) {
          return null;
        }
      });
      const results = await Promise.all(uploadPromises);
      const successfulUrls = results.filter((url): url is string => url !== null);

      if (successfulUrls.length === 0) {
        setFormError("Não foi possível enviar nenhuma das imagens.");
      } else {
        if (successfulUrls.length < filesToUpload.length) {
          setFormError("Algumas imagens não puderam ser enviadas.");
        }
        setForm((prev) => (prev ? { ...prev, images: [...prev.images, ...successfulUrls] } : prev));
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível enviar as imagens.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => (prev ? { ...prev, images: prev.images.filter((_, i) => i !== index) } : prev));
  };

  const handleToggleActive = async (product: Product) => {
    if (!store) return;
    setUpdatingId(product.id);
    setError(null);
    try {
      await apiClient.updateProduct(product.id, { isActive: !product.isActive });
      loadProducts(store.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o produto.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Group products by category ID
  const getGroupedProducts = () => {
    if (!products) return {};
    const groups: { [key: string]: Product[] } = {};
    products.forEach((product) => {
      const catId = product.categoryId || "uncategorized";
      if (!groups[catId]) {
        groups[catId] = [];
      }
      groups[catId].push(product);
    });
    return groups;
  };

  const groupedProducts = getGroupedProducts();

  // Partition of categories for the registration form visual selector
  const petCategories = categories.filter((c) => {
    const name = c.name.toLowerCase();
    return name.includes("cão") || name.includes("cães") || name.includes("cachorro") || 
           name.includes("gato") || 
           name.includes("ave") || name.includes("pássaro") || name.includes("passaro") || 
           name.includes("peixe");
  });

  const segmentCategories = categories.filter((c) => {
    return !petCategories.some((pc) => pc.id === c.id);
  });

  const renderProductCard = (product: Product) => {
    const isOutOfStock = product.stock === 0;
    const isLowStock = product.stock > 0 && product.stock < 5;

    return (
      <div
        key={product.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:shadow-md transition duration-200"
      >
        {/* Product Thumbnail and Info */}
        <div className="flex items-center gap-4">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0].url}
              alt={product.name}
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
            <p className="text-sm font-bold text-ink leading-snug">{product.name}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-primary-600">
                {formatCurrency(Number(product.price))}
              </span>
              <span className="text-[10px] text-ink-muted/50">•</span>
              {product.category && (
                <>
                  <span className="text-xs font-medium text-ink-muted">
                    {product.category.name}
                  </span>
                  <span className="text-[10px] text-ink-muted/50">•</span>
                </>
              )}
              {/* Stock level badge */}
              {isOutOfStock ? (
                <span className="bg-rose-50 text-rose-700 border border-rose-100 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  Sem estoque
                </span>
              ) : isLowStock ? (
                <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  Estoque baixo ({product.stock})
                </span>
              ) : (
                <span className="bg-zinc-100 text-ink-muted border border-border rounded-full px-2 py-0.5 text-[10px] font-medium">
                  Estoque: {product.stock}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status and Action Buttons */}
        <div className="flex items-center gap-2.5 sm:self-center">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
              product.isActive 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : "bg-rose-50 text-rose-700 border-rose-100"
            }`}
          >
            {product.isActive ? "Ativo" : "Inativo"}
          </span>
          
          <button
            onClick={() => openEditForm(product)}
            className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-bold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 bg-surface cursor-pointer"
          >
            Editar
          </button>
          <button
            onClick={() => handleToggleActive(product)}
            disabled={updatingId === product.id}
            className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-bold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 bg-surface disabled:opacity-60 cursor-pointer"
          >
            {product.isActive ? "Desativar" : "Ativar"}
          </button>
        </div>
      </div>
    );
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!store) {
    return <p className="text-sm text-ink-muted">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Top action row */}
      {!form && (
        <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-xl shadow-xs select-none">
          <div>
            <h2 className="text-sm font-bold text-ink">Seus Produtos</h2>
            <p className="text-[10px] text-ink-muted mt-0.5">Cadastre, edite e controle o estoque dos itens da sua loja.</p>
          </div>
          <button
            onClick={() => openNewForm()}
            className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary-600 cursor-pointer shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo produto
          </button>
        </div>
      )}

      {/* Product Form Card */}
      {form && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-md w-full"
        >
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-ink">
              {form.id ? "Editar Produto" : "Novo Produto"}
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Preencha os detalhes do produto para exibição no marketplace.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-semibold text-ink">
              Nome do produto
            </label>
            <input
              id="name"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Ração Golden Special Cães Adultos 15kg"
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-semibold text-ink">
              Descrição <span className="text-ink-muted font-normal">(opcional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Fale sobre as características, benefícios e indicação do produto..."
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="price" className="text-sm font-semibold text-ink">
                Preço (R$)
              </label>
              <input
                id="price"
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="stock" className="text-sm font-semibold text-ink">
                Quantidade em estoque
              </label>
              <input
                id="stock"
                required
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
              />
            </div>
          </div>

          {/* Visual Category Selector partitioned into sections */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-ink">Categoria do Produto</span>
            
            <div className="space-y-4 rounded-xl border border-border p-4 bg-zinc-50/50">
              {/* Pet Categories Section */}
              {petCategories.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary-500 block">Por Pet</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {petCategories.map((category) => {
                      const isSelected = form.categoryId === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setForm({ ...form, categoryId: category.id })}
                          className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${
                            isSelected
                              ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs"
                              : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"
                          }`}
                        >
                          <span>{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Segment/Type Categories Section */}
              {segmentCategories.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary-500 block">Por Segmento</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {segmentCategories.map((category) => {
                      const isSelected = form.categoryId === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setForm({ ...form, categoryId: category.id })}
                          className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${
                            isSelected
                              ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs"
                              : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"
                          }`}
                        >
                          <span>{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Uncategorized option / clean choice */}
              <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[10px] font-bold text-ink-muted">Nenhuma das opções acima se aplica?</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, categoryId: "" })}
                  className={`flex items-center justify-center px-4 py-2 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${
                    form.categoryId === ""
                      ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs"
                      : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"
                  }`}
                >
                  <span>Sem Categoria</span>
                </button>
              </div>
            </div>
          </div>


          {/* Pet Type Selector */}
          {petTypes.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-ink">Tipo de Pet <span className="text-ink-muted font-normal">(opcional)</span></span>
              <div className="rounded-xl border border-border p-4 bg-zinc-50/50">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, petTypeId: "" })}
                    className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${
                      form.petTypeId === ""
                        ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs"
                        : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"
                    }`}
                  >
                    Nenhum
                  </button>
                  {petTypes.map((pt) => {
                    const isSelected = form.petTypeId === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => setForm({ ...form, petTypeId: pt.id })}
                        className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${
                          isSelected
                            ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs"
                            : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"
                        }`}
                      >
                        {pt.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Product Image Upload Area */}
          <div className="flex flex-col gap-2 bg-surface-muted p-4 rounded-xl border border-border select-none">
            <label className="text-sm font-bold text-ink">
              Imagens do produto
            </label>

            {form.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.images.map((url, index) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt={`Imagem ${index + 1}`}
                      className="h-16 w-16 rounded-lg border border-border object-cover bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      aria-label="Remover imagem"
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-xs cursor-pointer hover:bg-rose-700 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Styled Upload Zone */}
            <div className="relative border-2 border-dashed border-border hover:border-primary-300 rounded-xl p-4 transition bg-surface flex flex-col items-center justify-center text-center cursor-pointer">
              <input
                id="images"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <svg className="h-6 w-6 text-ink-muted/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2.5 2.5 0 013.414 0L16 16m-2-2l1.586-1.586a2.5 2.5 0 013.414 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold text-ink">Clique para enviar imagens</span>
              <span className="text-[10px] text-ink-muted mt-0.5">Formatos suportados: JPG, PNG, WEBP (Seleção múltipla ativada)</span>
            </div>
            {isUploadingImage && <p className="text-xs text-primary-600 font-bold animate-pulse mt-1">Enviando imagens...</p>}
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex gap-2.5 pt-2 border-t border-border mt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center py-2.5 px-5 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : null}
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-xl border border-border px-5 py-2.5 text-xs font-bold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 bg-surface cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {products?.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center select-none">
          <svg className="h-10 w-10 text-ink-muted/40 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm font-semibold text-ink">Nenhum produto cadastrado ainda</p>
          <p className="text-xs text-ink-muted mt-1">Comece cadastrando seu primeiro item clicando no botão acima.</p>
        </div>
      )}

      {/* Category Filter Tabs */}
      {!form && products && products.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-1.5 border-b border-border select-none">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer border ${
              selectedFilter === "all"
                ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                : "bg-surface text-ink-muted border-border hover:border-primary-300 hover:text-ink"
            }`}
          >
            <span>Todos ({products.length})</span>
          </button>
          
          {categories.map((category) => {
            const count = products.filter((p) => p.categoryId === category.id).length;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedFilter(category.id)}
                className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer border ${
                  selectedFilter === category.id
                    ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                    : "bg-surface text-ink-muted border-border hover:border-primary-300 hover:text-ink"
                }`}
              >
                <span>{category.name} ({count})</span>
              </button>
            );
          })}

          {products.some((p) => !p.categoryId) && (
            <button
              onClick={() => setSelectedFilter("uncategorized")}
              className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer border ${
                selectedFilter === "uncategorized"
                  ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                  : "bg-surface text-ink-muted border-border hover:border-primary-300 hover:text-ink"
              }`}
            >
              <span>Sem Categoria ({products.filter((p) => !p.categoryId).length})</span>
            </button>
          )}
        </div>
      )}

      {/* Grouped Products Listing */}
      {!form && products && products.length > 0 && (
        <div className="space-y-8 select-none">
          {selectedFilter === "all" ? (
            <>
              {categories.map((category) => {
                const categoryProducts = groupedProducts[category.id] || [];
                if (categoryProducts.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
                      <h3 className="text-sm font-bold text-ink">{category.name}</h3>
                      <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {categoryProducts.length} {categoryProducts.length === 1 ? "produto" : "produtos"}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {categoryProducts.map((product) => renderProductCard(product))}
                    </div>
                  </div>
                );
              })}

              {/* Uncategorized products group */}
              {groupedProducts["uncategorized"] && groupedProducts["uncategorized"].length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
                    <h3 className="text-sm font-bold text-ink">Sem Categoria</h3>
                    <span className="bg-zinc-100 text-ink-muted px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {groupedProducts["uncategorized"].length} {groupedProducts["uncategorized"].length === 1 ? "produto" : "produtos"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {groupedProducts["uncategorized"].map((product) => renderProductCard(product))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Specific filter tab active
            (() => {
              const activeProducts = selectedFilter === "uncategorized" 
                ? (groupedProducts["uncategorized"] || [])
                : (groupedProducts[selectedFilter] || []);
              
              const isUncat = selectedFilter === "uncategorized";
              const catObj = categories.find((c) => c.id === selectedFilter);
              const title = isUncat ? "Sem Categoria" : catObj ? catObj.name : "Todos";

              if (activeProducts.length === 0) {
                return (
                  <div className="bg-surface border border-border rounded-2xl p-10 text-center select-none space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">Nenhum produto cadastrado na categoria "{title}"</p>
                      <p className="text-xs text-ink-muted mt-1">Cadastre um produto diretamente nessa categoria clicando no botão abaixo.</p>
                    </div>
                    <button
                      onClick={() => openNewForm(selectedFilter === "uncategorized" ? "" : selectedFilter)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-600 cursor-pointer shadow-sm mx-auto"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Cadastrar produto em {title}
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
                    <h3 className="text-sm font-bold text-ink">{title}</h3>
                    <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {activeProducts.length} {activeProducts.length === 1 ? "produto" : "produtos"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {activeProducts.map((product) => renderProductCard(product))}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
