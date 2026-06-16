"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError, type Store, type StoreStats } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/pricing";
import { ORDER_STATUS_CHART_COLORS, ORDER_STATUS_LABELS } from "@/lib/order-status";

export default function DashboardAnalyticsPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getMyStore()
      .then((result) => {
        if (!result) {
          router.replace("/stores/new");
          return;
        }
        setStore(result);
        apiClient
          .getStoreStats(result.id)
          .then(setStats)
          .catch(() => null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar sua loja."));
  }, [router]);

  if (error) {
    return (
      <div className="bg-white border border-red-100 p-6 rounded-2xl shadow-sm">
        <p className="text-sm text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  if (!store || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs text-ink-muted font-medium">Carregando indicadores de desempenho...</p>
      </div>
    );
  }

  const ordersByStatusData =
    stats.ordersByStatus
      ? (Object.entries(stats.ordersByStatus) as [keyof typeof ORDER_STATUS_LABELS, number][])
          .filter(([, count]) => count > 0)
          .map(([status, count]) => ({
            status,
            label: ORDER_STATUS_LABELS[status],
            value: count,
            color: ORDER_STATUS_CHART_COLORS[status],
          }))
      : [];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-bold text-ink">Indicadores e Métricas de Vendas</h2>
        <p className="text-xs text-ink-muted mt-1">
          Acompanhe o faturamento, volume de pedidos e ranking de produtos do seu estabelecimento.
        </p>
      </div>

      {/* SaaS Stats Metric Cards Grid with Brand Accents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat Card 1 - Faturamento (Borda Superior Laranja) */}
        <div className="bg-white border border-border border-t-4 border-t-primary-500 p-5 rounded-2xl shadow-xs flex flex-col justify-between h-32 select-none relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Faturamento Total</p>
              <h3 className="text-2xl font-black text-zinc-800 mt-1.5">
                {formatCurrency(stats.revenueDelivered)}
              </h3>
            </div>
            <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-full px-2 py-0.5">
              Real
            </span>
          </div>
          <div className="flex justify-between items-end mt-2">
            <span className="text-[10px] text-zinc-400">Receita de pedidos entregues</span>
            <svg className="w-20 h-7 text-primary-500" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M0 25 C 20 23, 40 12, 60 17, 80 6, 100 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Stat Card 2 - Em andamento (Borda Superior Laranja Claro) */}
        <div className="bg-white border border-border border-t-4 border-t-primary-300 p-5 rounded-2xl shadow-xs flex flex-col justify-between h-32 select-none relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Em Andamento</p>
              <h3 className="text-2xl font-black text-zinc-800 mt-1.5">
                {formatCurrency(stats.revenueInProgress)}
              </h3>
            </div>
            <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-extrabold rounded-full px-2 py-0.5">
              Potencial
            </span>
          </div>
          <div className="flex justify-between items-end mt-2">
            <span className="text-[10px] text-zinc-400">Pedidos ainda não entregues</span>
            <svg className="w-20 h-7 text-primary-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M0 20 C 20 18, 40 22, 60 16, 80 18, 100 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Stat Card 3 - Pedidos (Borda Superior Preta/Zinc-950) */}
        <div className="bg-white border border-border border-t-4 border-t-zinc-950 p-5 rounded-2xl shadow-xs flex flex-col justify-between h-32 select-none relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quantidade de Pedidos</p>
              <h3 className="text-2xl font-black text-zinc-800 mt-1.5">
                {stats.ordersCount}
              </h3>
            </div>
            <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-full px-2 py-0.5">
              Real
            </span>
          </div>
          <div className="flex justify-between items-end mt-2">
            <span className="text-[10px] text-zinc-400">
              {stats.cancelledOrdersCount > 0
                ? `Não inclui ${stats.cancelledOrdersCount} cancelado${stats.cancelledOrdersCount === 1 ? "" : "s"}`
                : "Pedidos válidos recebidos"}
            </span>
            <svg className="w-20 h-7 text-zinc-950" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M0 22 C 20 24, 40 18, 60 14, 80 8, 100 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Stat Card 4 - Itens Ativos (Borda Superior Laranja Claro/Suave) */}
        <div className="bg-white border border-border border-t-4 border-t-primary-400 p-5 rounded-2xl shadow-xs flex flex-col justify-between h-32 select-none relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Produtos Ativos</p>
              <h3 className="text-2xl font-black text-zinc-800 mt-1.5">
                {stats.activeProductsCount}
              </h3>
            </div>
            <span className="bg-primary-50 border border-primary-100 text-primary-700 text-[10px] font-extrabold rounded-full px-2 py-0.5">
              Estável
            </span>
          </div>
          <div className="flex justify-between items-end mt-2">
            <span className="text-[10px] text-zinc-400">Visíveis no marketplace</span>
            <svg className="w-20 h-7 text-primary-400" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M0 15 C 20 16, 40 14, 60 15, 80 14, 100 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue over time */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Faturamento nos últimos 30 dias</h3>
            <p className="text-[10px] text-ink-muted mt-0.5">Receita diária consolidada de pedidos entregues.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueByDay} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6b00" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ff6b00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f5f5f5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => value.slice(8, 10) + "/" + value.slice(5, 7)}
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCurrency(value)}
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  width={75}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(value) =>
                    new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
                  }
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e4e4e7" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#ff6b00" strokeWidth={2.5} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by status */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Status dos Pedidos</h3>
            <p className="text-[10px] text-ink-muted mt-0.5">Distribuição proporcional de todos os pedidos.</p>
          </div>
          
          {ordersByStatusData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-ink-muted italic">Ainda não há pedidos para exibir.</p>
            </div>
          ) : (
            <>
              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ordersByStatusData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="60%"
                      outerRadius="95%"
                      paddingAngle={3}
                    >
                      {ordersByStatusData.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e4e4e7" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 pt-2 border-t border-zinc-50">
                {ordersByStatusData.map((entry) => (
                  <li key={entry.status} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-ink-muted font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.label}
                    </span>
                    <span className="font-bold text-ink">{entry.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-xs lg:col-span-3 space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Produtos Mais Vendidos</h3>
            <p className="text-[10px] text-ink-muted mt-0.5">
              Ranking dos {stats.topProducts.length} produtos de maior receita no marketplace.
            </p>
          </div>

          {stats.topProducts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-ink-muted italic">Ainda não há pedidos entregues para exibir o ranking.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid horizontal={false} stroke="#f5f5f5" />
                  <XAxis type="number" tickFormatter={(value: number) => formatCurrency(value)} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 11, fill: "#27272a" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Receita"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e4e4e7" }}
                  />
                  <Bar dataKey="revenue" fill="#ff6b00" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
