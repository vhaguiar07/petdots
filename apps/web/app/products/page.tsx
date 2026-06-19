"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type Category, type PetType, type Product } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useCart } from "@/lib/cart-context";
import { formatCurrency, getEffectiveUnitPrice, hasActiveDiscount } from "@/lib/pricing";

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const petTypeId = searchParams.get("petTypeId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const onSale = searchParams.get("onSale") === "true";

  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .listProducts({ categoryId, petTypeId, search, onSale: onSale || undefined })
      .then(setProducts)
      .catch(() => setError("Não foi possível carregar os produtos."));
  }, [categoryId, petTypeId, search, onSale]);

  useEffect(() => {
    apiClient.listCategories().then(setCategories).catch(() => undefined);
    apiClient.listPetTypes().then(setPetTypes).catch(() => undefined);
  }, []);

  const handleAddToCart = (product: Product) => {
    const added = addItem(product, { id: product.storeId, name: product.store?.name ?? "" });
    if (added) {
      setFeedback(`"${product.name}" adicionado ao carrinho.`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const activeCategory = categories.find((c) => c.id === categoryId);
  const activePetType = petTypes.find((p) => p.id === petTypeId);

  let title = "Todos os produtos";
  if (onSale) title = "🔥 Ofertas";
  else if (activeCategory) title = activeCategory.name;
  else if (activePetType) title = activePetType.name;
  else if (search) title = `Resultados para "${search}"`;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-xl font-bold text-ink">{title}</h1>

      {feedback && (
        <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700">
          {feedback}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!error && products === null && (
        <p className="mt-4 text-sm text-ink-muted">Carregando produtos...</p>
      )}
      {products?.length === 0 && (
        <p className="mt-4 text-sm text-ink-muted">Nenhum produto encontrado.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => {
          const effectivePrice = getEffectiveUnitPrice(product);
          const discounted = hasActiveDiscount(product);
          const outOfStock = product.stock <= 0;

          return (
            <article
              key={product.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm hover:shadow-md transition duration-200"
            >
              <Link href={`/products/${product.id}`} className="group block space-y-2 select-none">
                <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-primary-50 text-3xl">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <span className="group-hover:scale-110 transition duration-300">🐾</span>
                  )}
                </div>

                {product.category && (
                  <div className="pt-1 select-none">
                    <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                      {product.category.name}
                    </span>
                  </div>
                )}

                <h3 className="text-base font-semibold text-ink group-hover:text-primary-600 transition">
                  {product.name}
                </h3>
              </Link>
              {product.description && (
                <p className="line-clamp-2 text-sm text-ink-muted">{product.description}</p>
              )}

              <div className="mt-1 flex items-baseline gap-2">
                {discounted && (
                  <span className="text-xs text-ink-muted line-through">
                    {formatCurrency(Number(product.price))}
                  </span>
                )}
                <span className="text-lg font-bold text-primary-600">
                  {formatCurrency(effectivePrice)}
                </span>
              </div>

              <p className="text-xs text-ink-muted">
                {outOfStock ? "Sem estoque" : `${product.stock} em estoque`}
              </p>

              <button
                onClick={() => handleAddToCart(product)}
                disabled={outOfStock}
                className="mt-2 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                Adicionar ao carrinho
              </button>
            </article>
          );
        })}
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  );
}
