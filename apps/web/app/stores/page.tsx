"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreType, type Store } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";

const STORE_TYPE_LABELS: Record<string, string> = {
  [StoreType.PETSHOP]: "Petshops Tradicionais",
  [StoreType.VET_CLINIC]: "Clínicas Veterinárias",
  [StoreType.GROOMING]: "Estética & Tosa",
  [StoreType.SPECIALTY]: "Lojas Especializadas",
};

function StoresContent() {
  const searchParams = useSearchParams();
  const storeType = searchParams.get("type") ?? undefined;

  const [stores, setStores] = useState<Store[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .listStores({ storeType: storeType as StoreType | undefined })
      .then(setStores)
      .catch(() => setError("Não foi possível carregar as lojas."));
  }, [storeType]);

  const title = storeType ? STORE_TYPE_LABELS[storeType] ?? "Lojas" : "Todas as lojas";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-xl font-bold text-ink">{title}</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!error && stores === null && (
        <p className="mt-4 text-sm text-ink-muted">Carregando lojas...</p>
      )}
      {stores?.length === 0 && (
        <p className="mt-4 text-sm text-ink-muted">Nenhuma loja encontrada.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores?.map((store) => (
          <Link
            key={store.id}
            href={`/stores/${store.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary-300 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-2xl">
              🐾
            </div>
            <h3 className="text-lg font-semibold text-ink">{store.name}</h3>
            {store.description && (
              <p className="line-clamp-2 text-sm text-ink-muted">{store.description}</p>
            )}
            {store.distanceKm !== undefined && (
              <p className="text-xs font-semibold text-primary-600">
                {store.distanceKm.toFixed(1)} km de você
              </p>
            )}
          </Link>
        ))}
      </div>
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
