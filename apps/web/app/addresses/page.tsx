"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, type Address } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { lookupCep } from "@/lib/viacep";
import { FIXED_CITY, FIXED_STATE, formatCep } from "@/lib/masks";

const emptyForm = {
  label: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: FIXED_CITY,
  state: FIXED_STATE,
  zipCode: "",
  isDefault: false,
};

export default function AddressesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const loadAddresses = () => {
    apiClient
      .listAddresses()
      .then(setAddresses)
      .catch(() => setError("Não foi possível carregar seus endereços."));
  };

  useEffect(() => {
    if (user) loadAddresses();
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.createAddress({
        label: form.label || undefined,
        street: form.street,
        number: form.number,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        isDefault: form.isDefault,
      });
      setForm(emptyForm);
      setShowForm(false);
      loadAddresses();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar o endereço.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleZipCodeBlur = async () => {
    if (!form.zipCode) return;
    setIsSearchingCep(true);
    try {
      const result = await lookupCep(form.zipCode);
      if (result) {
        setForm((f) => ({
          ...f,
          street: result.street || f.street,
          neighborhood: result.neighborhood || f.neighborhood,
        }));
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    await apiClient.updateAddress(id, { isDefault: true });
    loadAddresses();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remover este endereço?")) return;
    await apiClient.deleteAddress(id);
    loadAddresses();
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Meus endereços</h1>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          {showForm ? "Cancelar" : "Adicionar endereço"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="label" className="text-sm font-medium text-ink">
              Identificação <span className="text-ink-muted">(opcional)</span>
            </label>
            <input
              id="label"
              placeholder="Ex: Casa, Trabalho"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label htmlFor="street" className="text-sm font-medium text-ink">
                Rua
              </label>
              <input
                id="street"
                required
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
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
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="complement" className="text-sm font-medium text-ink">
              Complemento <span className="text-ink-muted">(opcional)</span>
            </label>
            <input
              id="complement"
              value={form.complement}
              onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="neighborhood" className="text-sm font-medium text-ink">
              Bairro
            </label>
            <input
              id="neighborhood"
              required
              value={form.neighborhood}
              onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
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
                value={form.city}
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
                value={form.state}
                disabled
                readOnly
                className="rounded-lg border border-border px-3 py-2 text-sm uppercase outline-none bg-surface-muted cursor-not-allowed"
              />
            </div>
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
                value={form.zipCode}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: formatCep(e.target.value) }))}
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

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            Definir como endereço padrão
          </label>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
          >
            {isSubmitting ? "Salvando..." : "Salvar endereço"}
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {addresses === null && <p className="text-sm text-ink-muted">Carregando endereços...</p>}
        {addresses?.length === 0 && (
          <p className="text-sm text-ink-muted">Você ainda não tem endereços cadastrados.</p>
        )}

        {addresses?.map((address) => (
          <div
            key={address.id}
            className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-semibold text-ink">
                {address.label ?? "Endereço"}
                {address.isDefault && (
                  <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                    Padrão
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {address.street}, {address.number}
                {address.complement ? ` - ${address.complement}` : ""} — {address.neighborhood},{" "}
                {address.city}/{address.state} — {address.zipCode}
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-2 text-sm">
              {!address.isDefault && (
                <button
                  onClick={() => handleSetDefault(address.id)}
                  className="rounded-full border border-border px-3 py-1 text-ink-muted transition hover:border-primary-500 hover:text-primary-600"
                >
                  Tornar padrão
                </button>
              )}
              <button
                onClick={() => handleDelete(address.id)}
                className="rounded-full border border-border px-3 py-1 text-red-600 transition hover:border-red-300"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
