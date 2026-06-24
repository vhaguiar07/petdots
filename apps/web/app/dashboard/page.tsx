"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, DeliveryProviderType, type BusinessHours, type DaySchedule, type Store, type StoreStatus } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { lookupCep } from "@/lib/viacep";
import { formatCurrency } from "@/lib/pricing";
import { BUSINESS_HOURS_GROUPS, TIME_OPTIONS } from "@/lib/business-hours";
import { FIXED_CITY, FIXED_STATE, formatCep, formatPhone } from "@/lib/masks";

const EMPTY_BUSINESS_HOURS: BusinessHours = {
  weekdays: null,
  saturday: null,
  sunday: null,
};

const DEFAULT_DAY_SCHEDULE: DaySchedule = { open: "08:00", close: "18:00" };

const STATUS_LABELS: Record<StoreStatus, string> = {
  PENDING_APPROVAL: "Pendente de aprovação",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
};

const STATUS_STYLES: Record<StoreStatus, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export default function DashboardStorePage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
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

  // Profile and Cover photo URLs
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // Contact and schedule information
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(EMPTY_BUSINESS_HOURS);
  const [deliveryTimeMinutes, setDeliveryTimeMinutes] = useState<string>("");
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<string>("10");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  useEffect(() => {
    apiClient
      .getMyStore()
      .then((result) => {
        if (!result) {
          router.replace("/stores/new");
          return;
        }
        setStore(result);
        setName(result.name);
        setDescription(result.description ?? "");
        setDeliveryProvider(result.deliveryProvider);
        setStreet(result.street ?? "");
        setNumber(result.number ?? "");
        setNeighborhood(result.neighborhood ?? "");
        setZipCode(result.zipCode ?? "");
        setLogoUrl(result.logoUrl ?? "");
        setCoverUrl(result.coverUrl ?? "");
        setPhone(result.phone ?? "");
        setWhatsapp(result.whatsapp ?? "");
        setInstagram(result.instagram ?? "");
        setBusinessHours(result.businessHours ?? EMPTY_BUSINESS_HOURS);
        setDeliveryTimeMinutes(result.deliveryTimeMinutes != null ? String(result.deliveryTimeMinutes) : "");
        setDeliveryRadiusKm(result.deliveryRadiusKm != null ? String(result.deliveryRadiusKm) : "10");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar sua loja."));
  }, [router]);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const file = e.target.files[0];
      const { url } = await apiClient.uploadProductImage(file, file.name);
      setLogoUrl(url);
    } catch (err) {
      setError("Falha ao carregar a imagem do logotipo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingCover(true);
    setError(null);
    try {
      const file = e.target.files[0];
      const { url } = await apiClient.uploadProductImage(file, file.name);
      setCoverUrl(url);
    } catch (err) {
      setError("Falha ao carregar a imagem de capa.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!store) return;

    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    try {
      const updated = await apiClient.updateStore(store.id, {
        name,
        description: description || undefined,
        deliveryProvider,
        street,
        number,
        neighborhood,
        city,
        state,
        zipCode,
        logoUrl: logoUrl || undefined,
        coverUrl: coverUrl || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        instagram: instagram || undefined,
        businessHours,
        deliveryTimeMinutes: deliveryTimeMinutes ? Number(deliveryTimeMinutes) : undefined,
        deliveryRadiusKm: deliveryRadiusKm ? Number(deliveryRadiusKm) : undefined,
      });
      setStore(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar a loja.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!store) {
    return error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-ink-muted">Carregando...</p>;
  }

  return (
    <div className="space-y-6">

      <div className="w-full bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm">
      {/* Store Status Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-muted border border-border rounded-xl select-none">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-ink">Status da Loja:</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[store.status]}`}>
            {STATUS_LABELS[store.status]}
          </span>
        </div>
        {store.status === "PENDING_APPROVAL" && (
          <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold bg-amber-50/50 border border-amber-100 rounded-lg p-2 max-w-sm">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Sua loja só aparece no marketplace após aprovação.</span>
          </div>
        )}
      </div>

      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-lg font-bold text-ink">Configurações da Loja</h2>
        <p className="text-xs text-ink-muted mt-1">
          Atualize as informações que são exibidas publicamente para seus clientes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Imagens da Loja (Logo e Capa) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border border-border/80 bg-zinc-50/30 rounded-2xl">
          {/* Logo da Loja */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-ink">Foto de Perfil (Logo)</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl overflow-hidden border border-border bg-white flex items-center justify-center shrink-0 shadow-sm">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logotipo da loja" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl">🐾</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                  id="logo-upload-input"
                />
                <label
                  htmlFor="logo-upload-input"
                  className="inline-flex items-center justify-center px-4 py-2 bg-white border border-border rounded-xl text-xs font-bold text-ink hover:bg-zinc-50 transition cursor-pointer select-none active:scale-[0.98] duration-100 disabled:opacity-50"
                >
                  {uploadingLogo ? "Enviando..." : "Alterar Foto"}
                </label>
                <p className="text-[10px] text-ink-muted font-medium">JPG ou PNG. Quadrado recomendado.</p>
              </div>
            </div>
          </div>

          {/* Capa da Loja */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-ink">Foto de Capa (Banner)</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-36 rounded-2xl overflow-hidden border border-border bg-white flex items-center justify-center shrink-0 shadow-sm">
                {coverUrl ? (
                  <img src={coverUrl} alt="Capa da loja" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-zinc-300 font-bold text-xs">Sem capa</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                  className="hidden"
                  id="cover-upload-input"
                />
                <label
                  htmlFor="cover-upload-input"
                  className="inline-flex items-center justify-center px-4 py-2 bg-white border border-border rounded-xl text-xs font-bold text-ink hover:bg-zinc-50 transition cursor-pointer select-none active:scale-[0.98] duration-100 disabled:opacity-50"
                >
                  {uploadingCover ? "Enviando..." : "Alterar Capa"}
                </label>
                <p className="text-[10px] text-ink-muted font-medium">JPG ou PNG. Proporção recomendada de 16:9.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold text-ink">
            Nome da loja
          </label>
          <input
            id="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-semibold text-ink">
            Descrição <span className="text-ink-muted font-normal">(opcional)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fale um pouco sobre o seu petshop e diferenciais..."
            className="rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="deliveryProvider" className="text-sm font-semibold text-ink">
            Tipo de entrega
          </label>
          <select
            id="deliveryProvider"
            value={deliveryProvider}
            onChange={(e) => setDeliveryProvider(e.target.value as DeliveryProviderType)}
            className="rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-surface"
          >
            <option value={DeliveryProviderType.SELF}>Entrega própria</option>
            <option value={DeliveryProviderType.EXTERNAL}>Entrega externa (em breve)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="deliveryTimeMinutes" className="text-sm font-semibold text-ink">
            Tempo estimado de entrega <span className="text-ink-muted font-normal">(minutos, opcional)</span>
          </label>
          <input
            id="deliveryTimeMinutes"
            type="number"
            min={1}
            max={300}
            value={deliveryTimeMinutes}
            onChange={(e) => setDeliveryTimeMinutes(e.target.value)}
            placeholder="Ex: 45"
            className="rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-surface"
          />
          <p className="text-xs text-ink-muted">
            Lojas com até 45 minutos aparecem em "Entrega Rápida". Autodeclarado — mantenha um valor realista.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="deliveryRadiusKm" className="text-sm font-semibold text-ink">
            Raio máximo de entrega <span className="text-ink-muted font-normal">(km, opcional)</span>
          </label>
          <input
            id="deliveryRadiusKm"
            type="number"
            min={1}
            max={100}
            value={deliveryRadiusKm}
            onChange={(e) => setDeliveryRadiusKm(e.target.value)}
            placeholder="Ex: 10"
            className="rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-surface"
          />
          <p className="text-xs text-ink-muted">
            Distância limite (em linha reta) para as entregas da sua loja. Padrão: 10 km.
          </p>
        </div>

        {/* Contato e Mídias Sociais */}
        <div className="border-t border-border/60 pt-4 mt-2">
          <h3 className="text-sm font-bold text-ink mb-3 uppercase tracking-wider text-primary-500">Contato & Redes Sociais</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-xs font-bold text-ink">
                Telefone / WhatsApp Comercial
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(21) 98765-4321"
                maxLength={15}
                className="rounded-xl border border-border px-4 py-3 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="instagram" className="text-xs font-bold text-ink">
                Usuário do Instagram
              </label>
              <input
                id="instagram"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@meupetshop"
                className="rounded-xl border border-border px-4 py-3 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="whatsapp" className="text-xs font-bold text-ink">
                Link do WhatsApp (Opcional)
              </label>
              <input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="https://wa.me/5521987654321"
                className="rounded-xl border border-border px-4 py-3 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
              />
            </div>
          </div>
        </div>

        {/* Horários de Funcionamento */}
        <div className="border-t border-border/60 pt-4 mt-2">
          <h3 className="text-sm font-bold text-ink mb-3 uppercase tracking-wider text-primary-500">Horários de Funcionamento</h3>
          <div className="flex flex-col gap-3">
            {BUSINESS_HOURS_GROUPS.map(({ key, label }) => {
              const schedule = businessHours[key];
              const isOpen = schedule !== null;
              return (
                <div key={key} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-end gap-3 p-3 border border-border/60 rounded-xl">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-ink">{label}</span>
                    <label className="flex items-center gap-2 text-xs text-ink-muted">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        onChange={(e) =>
                          setBusinessHours((prev) => ({
                            ...prev,
                            [key]: e.target.checked ? DEFAULT_DAY_SCHEDULE : null,
                          }))
                        }
                        className="h-4 w-4 rounded border-border accent-primary-500"
                      />
                      Aberto neste dia
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink">Abre</label>
                    <select
                      value={schedule?.open ?? DEFAULT_DAY_SCHEDULE.open}
                      disabled={!isOpen}
                      onChange={(e) =>
                        setBusinessHours((prev) => ({
                          ...prev,
                          [key]: { ...(prev[key] ?? DEFAULT_DAY_SCHEDULE), open: e.target.value },
                        }))
                      }
                      className="rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-surface disabled:opacity-50"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink">Fecha</label>
                    <select
                      value={schedule?.close ?? DEFAULT_DAY_SCHEDULE.close}
                      disabled={!isOpen}
                      onChange={(e) =>
                        setBusinessHours((prev) => ({
                          ...prev,
                          [key]: { ...(prev[key] ?? DEFAULT_DAY_SCHEDULE), close: e.target.value },
                        }))
                      }
                      className="rounded-xl border border-border px-3 py-2 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-surface disabled:opacity-50"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="zipCode" className="text-sm font-semibold text-ink">
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
              className="w-full rounded-xl border border-border px-4 py-3 pr-20 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
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
          <div className="col-span-2 flex flex-col gap-1.5">
            <label htmlFor="street" className="text-sm font-semibold text-ink">
              Rua
            </label>
            <input
              id="street"
              required
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="number" className="text-sm font-semibold text-ink">
              Número
            </label>
            <input
              id="number"
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="neighborhood" className="text-sm font-semibold text-ink">
            Bairro
          </label>
          <input
            id="neighborhood"
            required
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="rounded-xl border border-border px-4 py-3 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label htmlFor="city" className="text-sm font-semibold text-ink">
              Cidade
            </label>
            <input
              id="city"
              required
              value={city}
              disabled
              readOnly
              className="rounded-xl border border-border px-4 py-3 text-sm text-ink bg-surface-muted outline-none transition duration-150 cursor-not-allowed placeholder-ink-muted/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="state" className="text-sm font-semibold text-ink">
              UF
            </label>
            <input
              id="state"
              required
              maxLength={2}
              value={state}
              disabled
              readOnly
              className="rounded-xl border border-border px-4 py-3 text-sm uppercase text-ink bg-surface-muted outline-none transition duration-150 cursor-not-allowed placeholder-ink-muted/40"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Loja atualizada com sucesso.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 self-start flex items-center justify-center py-3 px-5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : null}
          {isSubmitting ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
      </div>
    </div>
  );
}
