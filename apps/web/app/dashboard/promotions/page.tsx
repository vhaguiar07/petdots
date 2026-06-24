"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, DiscountType, type StoreProduct, type Promotion, type Store } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/pricing";

interface PromotionFormState {
  id: string | null;
  name: string;
  scope: "store" | "product";
  productId: string;
  discountType: DiscountType;
  value: string;
  startsAt: string;
  endsAt: string;
  code: string;
  highlighted: boolean;
  highlightMessage: string;
}

const EMPTY_FORM: PromotionFormState = {
  id: null,
  name: "",
  scope: "store",
  productId: "",
  discountType: DiscountType.PERCENTAGE,
  value: "",
  startsAt: "",
  endsAt: "",
  code: "",
  highlighted: false,
  highlightMessage: "",
};

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function DashboardPromotionsPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [form, setForm] = useState<PromotionFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getMyStore()
      .then((result) => setStore(result))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar sua loja."));
  }, []);

  const loadPromotions = (storeId: string) => {
    apiClient
      .listMyPromotions(storeId)
      .then(setPromotions)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar as promoções."));
  };

  useEffect(() => {
    if (!store) return;
    loadPromotions(store.id);
    apiClient.listMyProducts(store.id).then(setProducts).catch(() => undefined);
  }, [store]);

  const openNewForm = () => {
    setFormError(null);
    setForm({ ...EMPTY_FORM });
  };

  const openEditForm = (promo: Promotion) => {
    setFormError(null);
    setForm({
      id: promo.id,
      name: promo.name,
      scope: promo.storeProductId ? "product" : "store",
      productId: promo.storeProductId ?? "",
      discountType: promo.discountType,
      value: promo.value,
      startsAt: toDatetimeLocal(promo.startsAt),
      endsAt: toDatetimeLocal(promo.endsAt),
      code: promo.code ?? "",
      highlighted: promo.highlighted,
      highlightMessage: promo.highlightMessage ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !store) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name,
        storeProductId: form.scope === "product" ? form.productId || undefined : undefined,
        discountType: form.discountType,
        value: Number(form.value),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        code: form.code.trim() || "",
        highlighted: form.code.trim() ? form.highlighted : false,
        highlightMessage: form.code.trim() && form.highlighted ? form.highlightMessage.trim() : "",
      };

      if (form.id) {
        await apiClient.updatePromotion(form.id, payload);
      } else {
        await apiClient.createPromotion({ storeId: store.id, ...payload });
      }
      setForm(null);
      loadPromotions(store.id);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível salvar a promoção.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    if (!store) return;
    setUpdatingId(promo.id);
    setError(null);
    try {
      await apiClient.updatePromotion(promo.id, { isActive: !promo.isActive });
      loadPromotions(store.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar a promoção.");
    } finally {
      setUpdatingId(null);
    }
  };

  const renderPromotionCard = (promo: Promotion) => {
    const scopeLabel = promo.storeProduct ? `Produto: ${promo.storeProduct.catalogProduct.name}` : "Loja inteira";
    const valueLabel =
      promo.discountType === DiscountType.PERCENTAGE
        ? `${Number(promo.value)}%`
        : formatCurrency(Number(promo.value));

    return (
      <div
        key={promo.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:shadow-md transition duration-200"
      >
        <div className="space-y-1">
          <p className="text-sm font-bold text-ink leading-snug">{promo.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-primary-600">{valueLabel} de desconto</span>
            <span className="text-[10px] text-ink-muted/50">•</span>
            <span className="text-xs font-medium text-ink-muted">{scopeLabel}</span>
            <span className="text-[10px] text-ink-muted/50">•</span>
            <span className="text-xs font-medium text-ink-muted">
              {formatDate(promo.startsAt)} até {formatDate(promo.endsAt)}
            </span>
            {promo.code && (
              <>
                <span className="text-[10px] text-ink-muted/50">•</span>
                <span className="bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  Cupom: {promo.code}
                </span>
              </>
            )}
            {promo.highlighted && (
              <>
                <span className="text-[10px] text-ink-muted/50">•</span>
                <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[10px] font-bold">
                  Destacado na loja
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:self-center">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
              promo.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-rose-50 text-rose-700 border-rose-100"
            }`}
          >
            {promo.isActive ? "Ativo" : "Inativo"}
          </span>

          <button
            onClick={() => openEditForm(promo)}
            className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-bold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 bg-surface cursor-pointer"
          >
            Editar
          </button>
          <button
            onClick={() => handleToggleActive(promo)}
            disabled={updatingId === promo.id}
            className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-bold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 bg-surface disabled:opacity-60 cursor-pointer"
          >
            {promo.isActive ? "Desativar" : "Ativar"}
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

  const discounts = promotions?.filter((p) => !p.code) ?? [];
  const coupons = promotions?.filter((p) => p.code) ?? [];

  return (
    <div className="space-y-6">
      {!form && (
        <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-xl shadow-xs select-none">
          <div>
            <h2 className="text-sm font-bold text-ink">Cupons e Descontos</h2>
            <p className="text-[10px] text-ink-muted mt-0.5">
              Crie descontos automáticos para a loja ou produtos, ou cupons que exigem código no checkout.
            </p>
          </div>
          <button
            onClick={openNewForm}
            className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary-600 cursor-pointer shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova promoção
          </button>
        </div>
      )}

      {form && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-md w-full"
        >
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-ink">
              {form.id ? "Editar Promoção" : "Nova Promoção"}
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Configure um desconto automático ou um cupom com código para o checkout.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-semibold text-ink">
              Nome da promoção
            </label>
            <input
              id="name"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Black Friday"
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 w-full"
            />
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-ink">Escopo</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, scope: "store", productId: "" })}
                className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${
                  form.scope === "store"
                    ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs"
                    : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"
                }`}
              >
                Loja inteira
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, scope: "product" })}
                className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-200 select-none cursor-pointer ${
                  form.scope === "product"
                    ? "border-primary-500 bg-primary-50 text-primary-700 shadow-xs"
                    : "border-border bg-surface text-ink-muted hover:border-primary-300 hover:text-ink"
                }`}
              >
                Produto específico
              </button>
            </div>
            {form.scope === "product" && (
              <select
                required
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Selecione um produto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.catalogProduct.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="discountType" className="text-sm font-semibold text-ink">
                Tipo de desconto
              </label>
              <select
                id="discountType"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType })}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                <option value={DiscountType.PERCENTAGE}>Percentual (%)</option>
                <option value={DiscountType.FIXED_AMOUNT}>Valor fixo (R$)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="value" className="text-sm font-semibold text-ink">
                Valor do desconto
              </label>
              <input
                id="value"
                required
                type="number"
                min="0"
                step="0.01"
                max={form.discountType === DiscountType.PERCENTAGE ? 100 : undefined}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.discountType === DiscountType.PERCENTAGE ? "Ex: 10" : "Ex: 5.00"}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="startsAt" className="text-sm font-semibold text-ink">
                Início
              </label>
              <input
                id="startsAt"
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="endsAt" className="text-sm font-semibold text-ink">
                Término
              </label>
              <input
                id="endsAt"
                required
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className="text-sm font-semibold text-ink">
              Código do cupom <span className="text-ink-muted font-normal">(opcional)</span>
            </label>
            <input
              id="code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="Ex: BLACKFRIDAY10"
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 uppercase"
            />
            <p className="text-[10px] text-ink-muted">
              Se preenchido, o desconto só é aplicado quando o cliente digitar este código no
              carrinho. Se deixado em branco, o desconto é aplicado automaticamente.
            </p>
          </div>

          {form.code.trim() && (
            <label className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.highlighted}
                onChange={(e) => setForm({ ...form, highlighted: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <span>
                <span className="font-semibold text-ink">Destacar este cupom na página da loja</span>
                <span className="block text-[10px] text-ink-muted mt-0.5">
                  Apenas um cupom por vez pode ficar destacado. Ativar este desfaz o destaque de
                  outro cupom, se houver.
                </span>
              </span>
            </label>
          )}

          {form.code.trim() && form.highlighted && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="highlightMessage" className="text-sm font-semibold text-ink">
                Mensagem de destaque <span className="text-ink-muted font-normal">(opcional)</span>
              </label>
              <textarea
                id="highlightMessage"
                rows={2}
                maxLength={140}
                value={form.highlightMessage}
                onChange={(e) => setForm({ ...form, highlightMessage: e.target.value })}
                placeholder="Ex: Válido só hoje! Aproveite e leve seu pet para passear com desconto 🐾"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 resize-none"
              />
              <p className="text-[10px] text-ink-muted">
                Essa mensagem aparece junto com o cupom destacado na página da loja. Se deixada em
                branco, é usado um texto padrão. ({form.highlightMessage.length}/140)
              </p>
            </div>
          )}

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

      {!form && promotions?.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center select-none">
          <svg className="h-10 w-10 text-ink-muted/40 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5.586a1 1 0 01.707.293l7.414 7.414a1 1 0 010 1.414l-7.586 7.586a1 1 0 01-1.414 0L4.293 12.293A1 1 0 014 11.586V5a2 2 0 012-2z" />
          </svg>
          <p className="text-sm font-semibold text-ink">Nenhuma promoção cadastrada ainda</p>
          <p className="text-xs text-ink-muted mt-1">Crie um desconto automático ou um cupom clicando no botão acima.</p>
        </div>
      )}

      {!form && discounts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
            <h3 className="text-sm font-bold text-ink">Descontos automáticos</h3>
            <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {discounts.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">{discounts.map(renderPromotionCard)}</div>
        </div>
      )}

      {!form && coupons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
            <h3 className="text-sm font-bold text-ink">Cupons</h3>
            <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {coupons.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">{coupons.map(renderPromotionCard)}</div>
        </div>
      )}
    </div>
  );
}
