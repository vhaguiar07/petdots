"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, DiscountType, type Address, type Promotion } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/pricing";

export default function CartPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { cart, subtotal, updateQuantity, removeItem, clear } = useCart();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Promotion | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient
      .listAddresses()
      .then((data) => {
        setAddresses(data);
        const def = data.find((a) => a.isDefault) ?? data[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => setError("Não foi possível carregar seus endereços."));
  }, [user]);

  const handleCheckout = async () => {
    if (!cart || !selectedAddressId) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const order = await apiClient.createOrder({
        storeId: cart.storeId,
        addressId: selectedAddressId,
        items: cart.items.map((item) => ({
          storeProductId: item.storeProductId,
          quantity: item.quantity,
        })),
        couponCode: appliedCoupon?.code ?? undefined,
      });
      clear();
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!cart || !couponInput.trim()) return;
    setCouponError(null);
    setIsApplyingCoupon(true);

    try {
      const promotion = await apiClient.validateCoupon(cart.storeId, couponInput.trim());
      setAppliedCoupon(promotion);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : "Cupom inválido ou expirado.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const estimatedCouponDiscount = (() => {
    if (!appliedCoupon || !cart) return 0;
    let total = 0;
    for (const item of cart.items) {
      if (appliedCoupon.storeProductId !== null && appliedCoupon.storeProductId !== item.storeProductId) continue;
      const discountPerUnit =
        appliedCoupon.discountType === DiscountType.PERCENTAGE
          ? item.unitPrice * (Number(appliedCoupon.value) / 100)
          : Number(appliedCoupon.value);
      total += Math.min(discountPerUnit, item.unitPrice) * item.quantity;
    }
    return total;
  })();

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-ink">Seu carrinho</h1>
        <p className="mt-4 text-sm text-ink-muted">
          Você precisa entrar para ver o carrinho e finalizar um pedido.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          Entrar
        </Link>
      </main>
    );
  }

  if (user.role !== "CUSTOMER") {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-ink">Seu carrinho</h1>
        <p className="mt-4 text-sm text-ink-muted">
          Apenas contas de Cliente podem fazer pedidos e usar o carrinho.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          Voltar para a home
        </Link>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-ink">Seu carrinho</h1>
        <p className="mt-4 text-sm text-ink-muted">Seu carrinho está vazio.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          Ver lojas
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Seu carrinho</h1>
      <p className="mt-1 text-sm text-ink-muted">Loja: {cart.storeName}</p>

      <div className="mt-6 flex flex-col gap-3">
        {cart.items.map((item) => (
          <div
            key={item.storeProductId}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-50 text-xl">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                "🐾"
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{item.name}</p>
              <p className="text-sm text-ink-muted">{formatCurrency(item.unitPrice)}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.storeProductId, item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink transition hover:border-primary-500 hover:text-primary-600"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-medium text-ink">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.storeProductId, item.quantity + 1)}
                disabled={item.quantity >= item.stock}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink transition hover:border-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              onClick={() => removeItem(item.storeProductId)}
              className="text-sm text-red-600 transition hover:underline"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Endereço de entrega</h2>

        {addresses === null && <p className="mt-2 text-sm text-ink-muted">Carregando...</p>}

        {addresses?.length === 0 && (
          <p className="mt-2 text-sm text-ink-muted">
            Você ainda não tem endereços cadastrados.{" "}
            <Link href="/addresses" className="font-medium text-primary-600 hover:underline">
              Adicionar endereço
            </Link>
          </p>
        )}

        {addresses && addresses.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {addresses.map((address) => (
              <label
                key={address.id}
                className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm transition hover:border-primary-300"
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === address.id}
                  onChange={() => setSelectedAddressId(address.id)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="font-medium text-ink">{address.label ?? "Endereço"}</span>
                  <br />
                  <span className="text-ink-muted">
                    {address.street}, {address.number} — {address.neighborhood}, {address.city}/
                    {address.state}
                  </span>
                </span>
              </label>
            ))}
            <Link href="/addresses" className="text-sm font-medium text-primary-600 hover:underline">
              Gerenciar endereços
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Cupom de desconto</h2>

        {appliedCoupon ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
            <span className="text-sm font-medium text-primary-700">
              Cupom <strong>{appliedCoupon.code}</strong> aplicado
            </span>
            <button
              onClick={handleRemoveCoupon}
              className="text-sm font-medium text-red-600 transition hover:underline"
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Digite o código do cupom"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={isApplyingCoupon || !couponInput.trim()}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplyingCoupon ? "Aplicando..." : "Aplicar"}
            </button>
          </div>
        )}

        {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-muted">Subtotal</span>
          <span className="text-lg font-bold text-ink">{formatCurrency(subtotal)}</span>
        </div>
        {appliedCoupon && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-muted">Desconto do cupom (estimado)</span>
            <span className="text-sm font-bold text-emerald-600">
              -{formatCurrency(estimatedCouponDiscount)}
            </span>
          </div>
        )}
        {appliedCoupon && (
          <p className="text-[10px] text-ink-muted">
            O valor final do desconto é confirmado no fechamento do pedido.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={isSubmitting || !selectedAddressId}
        className="mt-6 w-full rounded-full bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Finalizando..." : "Finalizar pedido"}
      </button>
    </main>
  );
}
