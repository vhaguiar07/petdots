"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, DeliveryProviderType } from "@petdots/shared";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { lookupCep } from "@/lib/viacep";
import { FIXED_CITY, FIXED_STATE, formatCep } from "@/lib/masks";

export default function NewStorePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProviderType>(DeliveryProviderType.SELF);
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city] = useState(FIXED_CITY);
  const [state] = useState(FIXED_STATE);
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    } else if (!isLoading && user && user.role !== "STORE_OWNER") {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "STORE_OWNER") return;
    apiClient
      .getMyStore()
      .then((store) => {
        if (store) router.replace("/dashboard");
      })
      .catch(() => undefined);
  }, [user, router]);

  const handleZipCodeBlur = async () => {
    if (!zipCode) return;
    setIsSearchingCep(true);
    try {
      const result = await lookupCep(zipCode);
      if (result) {
        setStreet((prev) => result.street || prev);
        setNeighborhood((prev) => result.neighborhood || prev);
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.createStore({
        name,
        description: description || undefined,
        deliveryProvider,
        street,
        number,
        neighborhood,
        city,
        state,
        zipCode,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a loja.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user || user.role !== "STORE_OWNER") {
    return null;
  }

  if (success) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-ink">Loja criada!</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sua loja foi cadastrada e está aguardando aprovação da nossa equipe antes de ficar
            visível no marketplace.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
          >
            Ir para o painel da loja
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Criar minha loja</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Conte um pouco sobre o seu petshop para começar.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-ink">
              Nome da loja
            </label>
            <input
              id="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium text-ink">
              Descrição <span className="text-ink-muted">(opcional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="deliveryProvider" className="text-sm font-medium text-ink">
              Tipo de entrega
            </label>
            <select
              id="deliveryProvider"
              value={deliveryProvider}
              onChange={(e) => setDeliveryProvider(e.target.value as DeliveryProviderType)}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              <option value={DeliveryProviderType.SELF}>Entrega própria</option>
              <option value={DeliveryProviderType.EXTERNAL}>Entrega externa (em breve)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="zipCode" className="text-sm font-medium text-ink">
              CEP
            </label>
            <div className="relative">
              <input
                id="zipCode"
                required
                placeholder="00000-000"
                value={zipCode}
                onChange={(e) => setZipCode(formatCep(e.target.value))}
                onBlur={handleZipCodeBlur}
                maxLength={9}
                className="w-full rounded-lg border border-border px-3 py-2 pr-20 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              {isSearchingCep && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-zinc-400">
                  <svg className="animate-spin h-3.5 w-3.5 text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-[10px] font-bold text-primary-500 animate-pulse">Buscando...</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label htmlFor="street" className="text-sm font-medium text-ink">
                Rua
              </label>
              <input
                id="street"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="number" className="text-sm font-medium text-ink">
                Número
              </label>
              <input
                id="number"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="neighborhood" className="text-sm font-medium text-ink">
              Bairro
            </label>
            <input
              id="neighborhood"
              required
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label htmlFor="city" className="text-sm font-medium text-ink">
                Cidade
              </label>
              <input
                id="city"
                required
                value={city}
                disabled
                readOnly
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none bg-surface-muted cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="state" className="text-sm font-medium text-ink">
                UF
              </label>
              <input
                id="state"
                required
                maxLength={2}
                value={state}
                disabled
                readOnly
                className="rounded-lg border border-border px-3 py-2 text-sm uppercase outline-none bg-surface-muted cursor-not-allowed"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
          >
            {isSubmitting ? "Criando..." : "Criar loja"}
          </button>
        </form>
      </div>
    </main>
  );
}
