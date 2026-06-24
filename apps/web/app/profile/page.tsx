"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, type Address, type PriceAlert } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { FIXED_CITY, FIXED_STATE, formatCep } from "@/lib/masks";
import { PASSWORD_REQUIREMENTS_HINT, getPasswordStrengthError } from "@/lib/password";
import { formatCurrency } from "@/lib/pricing";

const emptyAddressForm = {
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

export default function ProfilePage() {
  const { user, isLoading: authLoading, updateLocalUser } = useAuth();
  const router = useRouter();

  // Navigation state
  const [activeTab, setActiveTab] = useState<"personal" | "security" | "addresses" | "alerts">("personal");
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);

  // Profile Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalSuccess, setPersonalSuccess] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Addresses Management States
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "alerts") {
        setActiveTab("alerts");
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      if (user.role !== "STORE_OWNER") {
        loadAddresses();
      }
      if (user.role === "CUSTOMER" && activeTab === "alerts") {
        loadPriceAlerts();
      }
    }
  }, [user, activeTab]);

  const loadPriceAlerts = () => {
    apiClient
      .listPriceAlerts()
      .then(setAlerts)
      .catch(() => undefined);
  };

  const loadAddresses = () => {
    apiClient
      .listAddresses()
      .then(setAddresses)
      .catch(() => setAddressError("Não foi possível carregar seus endereços."));
  };

  const handlePersonalSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPersonalError(null);
    setPersonalSuccess(false);
    setIsSavingPersonal(true);

    try {
      // Note: The backend update endpoint will be implemented later.
      // For now we simulate success and update the local AuthContext state.
      updateLocalUser({ name, email });
      setPersonalSuccess(true);
      setTimeout(() => setPersonalSuccess(false), 3000);
    } catch (err) {
      setPersonalError(err instanceof ApiError ? err.message : "Erro ao atualizar dados.");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSecuritySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(false);

    const passwordError = getPasswordStrengthError(newPassword);
    if (passwordError) {
      setSecurityError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError("A confirmação de senha não confere.");
      return;
    }

    setIsSavingSecurity(true);
    try {
      await apiClient.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirmation: confirmPassword,
      });
      setSecuritySuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSecuritySuccess(false), 3000);
    } catch (err) {
      setSecurityError(err instanceof ApiError ? err.message : "Erro ao atualizar senha.");
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleAddressSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddressFormError(null);
    setIsSavingAddress(true);

    try {
      await apiClient.createAddress({
        label: addressForm.label || undefined,
        street: addressForm.street,
        number: addressForm.number,
        complement: addressForm.complement || undefined,
        neighborhood: addressForm.neighborhood,
        city: addressForm.city,
        state: addressForm.state,
        zipCode: addressForm.zipCode,
        isDefault: addressForm.isDefault,
      });
      setAddressForm(emptyAddressForm);
      setShowAddressForm(false);
      loadAddresses();
    } catch (err) {
      setAddressFormError(err instanceof ApiError ? err.message : "Não foi possível salvar o endereço.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    await apiClient.updateAddress(id, { isDefault: true });
    loadAddresses();
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm("Remover este endereço?")) return;
    await apiClient.deleteAddress(id);
    loadAddresses();
  };

  const handleDeleteAlert = async (id: string) => {
    if (!window.confirm("Remover este alerta de preço?")) return;
    await apiClient.deletePriceAlert(id);
    loadPriceAlerts();
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 flex-1 flex flex-col">
      <div className="border-b border-border pb-4 mb-8">
        <h1 className="text-2xl font-black text-ink tracking-tight">Configurações da Conta</h1>
        <p className="text-xs text-ink-muted mt-1">
          Gerencie suas informações de perfil, configurações de segurança e endereços de entrega.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="bg-surface border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-1 md:col-span-1 select-none">
          <button
            onClick={() => setActiveTab("personal")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === "personal"
                ? "bg-primary-50 text-primary-600 border border-primary-100"
                : "text-ink-muted hover:text-ink hover:bg-zinc-50 border border-transparent"
            }`}
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Dados Pessoais
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${
              activeTab === "security"
                ? "bg-primary-550 bg-primary-550/5 text-primary-600 border border-primary-100"
                : "text-ink-muted hover:text-ink hover:bg-zinc-50 border border-transparent"
            }`}
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Segurança
          </button>

          {user.role !== "STORE_OWNER" && (
            <button
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === "addresses"
                  ? "bg-primary-50/50 text-primary-600 border border-primary-100"
                  : "text-ink-muted hover:text-ink hover:bg-zinc-50 border border-transparent"
              }`}
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Meus Endereços
            </button>
          )}

          {user.role === "CUSTOMER" && (
            <button
              onClick={() => setActiveTab("alerts")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === "alerts"
                  ? "bg-primary-50 text-primary-600 border border-primary-100"
                  : "text-ink-muted hover:text-ink hover:bg-zinc-50 border border-transparent"
              }`}
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Alertas de Preço
            </button>
          )}
        </aside>

        {/* Content Card */}
        <div className="md:col-span-3">
          
          {/* Tab 1: Personal Info */}
          {activeTab === "personal" && (
            <form onSubmit={handlePersonalSubmit} className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-5">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-ink">Dados Pessoais</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Atualize seu nome de exibição e seu endereço de e-mail.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-name" className="text-xs font-bold text-ink">Nome completo</label>
                <input
                  id="p-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-email" className="text-xs font-bold text-ink">E-mail</label>
                <input
                  id="p-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              {personalError && <p className="text-xs text-red-600">{personalError}</p>}
              {personalSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                  <svg className="h-4.5 w-4.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Perfil atualizado com sucesso.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingPersonal}
                className="self-start rounded-xl bg-primary-500 hover:bg-primary-600 px-5 py-3 text-xs font-extrabold text-white transition cursor-pointer disabled:opacity-55 active:scale-95 duration-150"
              >
                {isSavingPersonal ? "Salvando..." : "Salvar alterações"}
              </button>
            </form>
          )}

          {/* Tab 2: Security */}
          {activeTab === "security" && (
            <form onSubmit={handleSecuritySubmit} className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-5">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-ink">Segurança</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">Altere sua senha de acesso de forma segura.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="s-curr-pass" className="text-xs font-bold text-ink">Senha atual</label>
                <input
                  id="s-curr-pass"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="s-new-pass" className="text-xs font-bold text-ink">Nova senha</label>
                <input
                  id="s-new-pass"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/30"
                />
                <p className="text-[10px] text-ink-muted">{PASSWORD_REQUIREMENTS_HINT}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="s-conf-pass" className="text-xs font-bold text-ink">Confirmar nova senha</label>
                <input
                  id="s-conf-pass"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/30"
                />
              </div>

              {securityError && <p className="text-xs text-red-600">{securityError}</p>}
              {securitySuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                  <svg className="h-4.5 w-4.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Senha atualizada com sucesso.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingSecurity}
                className="self-start rounded-xl bg-primary-500 hover:bg-primary-600 px-5 py-3 text-xs font-extrabold text-white transition cursor-pointer disabled:opacity-55 active:scale-95 duration-150"
              >
                {isSavingSecurity ? "Salvando..." : "Atualizar senha"}
              </button>
            </form>
          )}

          {/* Tab 3: Addresses */}
          {activeTab === "addresses" && user.role !== "STORE_OWNER" && (
            <div className="space-y-6">
              
              {/* Header and Toggle Button */}
              <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4 select-none">
                <div>
                  <h3 className="text-sm font-bold text-ink">Endereços Salvos</h3>
                  <p className="text-[10px] text-ink-muted mt-0.5">Cadastre seus locais de entrega padrão.</p>
                </div>
                <button
                  onClick={() => setShowAddressForm((prev) => !prev)}
                  className="rounded-xl bg-primary-500 hover:bg-primary-600 px-4 py-2 text-xs font-extrabold text-white transition cursor-pointer select-none active:scale-95 duration-150"
                >
                  {showAddressForm ? "Cancelar" : "Novo Endereço"}
                </button>
              </div>

              {/* Add Address Form */}
              {showAddressForm && (
                <form onSubmit={handleAddressSubmit} className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-4">
                  <div className="border-b border-border pb-2">
                    <h4 className="text-xs font-bold text-ink">Adicionar Novo Endereço</h4>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="a-label" className="text-xs font-bold text-ink">Identificação (opcional)</label>
                    <input
                      id="a-label"
                      placeholder="Ex: Casa, Trabalho"
                      value={addressForm.label}
                      onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
                      className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label htmlFor="a-street" className="text-xs font-bold text-ink">Rua</label>
                      <input
                        id="a-street"
                        required
                        value={addressForm.street}
                        onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="a-number" className="text-xs font-bold text-ink">Número</label>
                      <input
                        id="a-number"
                        required
                        value={addressForm.number}
                        onChange={(e) => setAddressForm((f) => ({ ...f, number: e.target.value }))}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="a-comp" className="text-xs font-bold text-ink">Complemento (opcional)</label>
                    <input
                      id="a-conf"
                      placeholder="Apartamento, Bloco..."
                      value={addressForm.complement}
                      onChange={(e) => setAddressForm((f) => ({ ...f, complement: e.target.value }))}
                      className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="a-neigh" className="text-xs font-bold text-ink">Bairro</label>
                    <input
                      id="a-neigh"
                      required
                      value={addressForm.neighborhood}
                      onChange={(e) => setAddressForm((f) => ({ ...f, neighborhood: e.target.value }))}
                      className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label htmlFor="a-city" className="text-xs font-bold text-ink">Cidade</label>
                      <input
                        id="a-city"
                        required
                        value={addressForm.city}
                        disabled
                        readOnly
                        className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition bg-surface-muted cursor-not-allowed"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="a-state" className="text-xs font-bold text-ink">UF</label>
                      <input
                        id="a-state"
                        required
                        maxLength={2}
                        value={addressForm.state}
                        disabled
                        readOnly
                        className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition bg-surface-muted cursor-not-allowed uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="a-zip" className="text-xs font-bold text-ink">CEP</label>
                    <input
                      id="a-zip"
                      required
                      placeholder="00000-000"
                      value={addressForm.zipCode}
                      onChange={(e) => setAddressForm((f) => ({ ...f, zipCode: formatCep(e.target.value) }))}
                      maxLength={9}
                      className="rounded-xl border border-border px-4 py-2.5 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-ink-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))}
                      className="h-4 w-4 rounded border-border"
                    />
                    Definir como endereço padrão
                  </label>

                  {addressFormError && <p className="text-xs text-red-600">{addressFormError}</p>}

                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="self-start rounded-xl bg-primary-500 hover:bg-primary-600 px-5 py-3 text-xs font-extrabold text-white transition cursor-pointer disabled:opacity-55 active:scale-95 duration-150"
                  >
                    {isSavingAddress ? "Salvando..." : "Salvar endereço"}
                  </button>
                </form>
              )}

              {/* Addresses List */}
              <div className="flex flex-col gap-3">
                {addressError && <p className="text-xs text-red-600">{addressError}</p>}
                {addresses === null && <p className="text-xs text-ink-muted">Carregando endereços...</p>}
                {addresses?.length === 0 && (
                  <div className="bg-surface border border-border rounded-2xl p-6 text-center select-none">
                    <p className="text-xs font-bold text-ink">Nenhum endereço cadastrado</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">Cadastre seus endereços de entrega clicando no botão acima.</p>
                  </div>
                )}

                {addresses?.map((address) => (
                  <div
                    key={address.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
                  >
                    <div>
                      <p className="text-xs font-bold text-ink flex items-center">
                        {address.label ?? "Endereço"}
                        {address.isDefault && (
                          <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-extrabold text-primary-600 border border-primary-100">
                            Padrão
                          </span>
                        )}
                      </p>
                      <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                        {address.street}, {address.number}
                        {address.complement ? ` - ${address.complement}` : ""} — {address.neighborhood},{" "}
                        {address.city}/{address.state} — {address.zipCode}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col gap-2 text-xs font-bold select-none">
                      {!address.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(address.id)}
                          className="rounded-lg border border-border px-3 py-1.5 text-ink-muted hover:text-primary-600 hover:border-primary-500 transition cursor-pointer bg-white"
                        >
                          Tornar padrão
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-rose-600 hover:border-rose-300 transition cursor-pointer bg-white"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Tab 4: Price Alerts */}
          {activeTab === "alerts" && user.role === "CUSTOMER" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm select-none">
                <h3 className="text-sm font-bold text-ink">Meus Alertas de Preço</h3>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  Acompanhe os alertas de preços configurados nos produtos do catálogo global.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {alerts === null && <p className="text-xs text-ink-muted">Carregando alertas...</p>}
                {alerts?.length === 0 && (
                  <div className="bg-surface border border-border rounded-2xl p-6 text-center select-none">
                    <p className="text-xs font-bold text-ink">Nenhum alerta cadastrado</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      Você pode criar alertas de preço na página de detalhes de qualquer produto.
                    </p>
                  </div>
                )}

                {alerts?.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm animate-in fade-in duration-200"
                  >
                    <div>
                      <p className="text-xs font-bold text-ink">
                        {alert.catalogProduct?.name || "Produto do Catálogo"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                        <span>Preço-alvo: <strong className="text-primary-600 font-extrabold">{formatCurrency(Number(alert.targetPrice))}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          Status:
                          {alert.notifiedAt ? (
                            <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-extrabold border border-emerald-100 uppercase tracking-wider animate-pulse">
                              Alerta Disparado!
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-50 text-zinc-500 px-2 py-0.5 text-[9px] font-extrabold border border-zinc-100 uppercase tracking-wider">
                              Aguardando baixa de preço
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2 select-none">
                      <Link
                        href={`/products?search=${encodeURIComponent(alert.catalogProduct?.name || "")}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-ink hover:text-primary-500 hover:border-primary-200 transition cursor-pointer bg-white"
                      >
                        Ver ofertas
                      </Link>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-rose-600 hover:border-rose-300 transition cursor-pointer bg-white"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
