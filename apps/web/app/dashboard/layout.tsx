"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import type { Store } from "@petdots/shared";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Minha loja",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/products",
    label: "Produtos",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/promotions",
    label: "Cupons e Descontos",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5.586a1 1 0 01.707.293l7.414 7.414a1 1 0 010 1.414l-7.586 7.586a1 1 0 01-1.414 0L4.293 12.293A1 1 0 014 11.586V5a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/orders",
    label: "Pedidos",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    href: "/dashboard/reviews",
    label: "Avaliações",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [store, setStore] = useState<Store | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        !isCollapsed &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsCollapsed(true);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCollapsed]);
  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "STORE_OWNER") {
      router.replace("/");
    } else {
      apiClient.getMyStore()
        .then((s) => {
          if (!s) return;
          setStore(s);
        })
        .catch(() => null);
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "STORE_OWNER") {
    return null;
  }

  const STATUS_LABELS: Record<string, string> = {
    PENDING_APPROVAL: "Pendente",
    ACTIVE: "Ativa",
    SUSPENDED: "Suspensa",
  };

  const STATUS_STYLES: Record<string, string> = {
    PENDING_APPROVAL: "bg-amber-900/40 text-amber-300 border-amber-800/50",
    ACTIVE: "bg-emerald-900/40 text-emerald-300 border-emerald-800/50",
    SUSPENDED: "bg-rose-900/40 text-rose-300 border-rose-800/50",
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-50/50">
      {/* Sidebar - Desktop (Retrátil com Tema Escuro) */}
      <aside
        ref={sidebarRef}
        className={`hidden lg:flex bg-zinc-950 border-r border-zinc-900 text-zinc-400 flex-col justify-between shrink-0 h-screen sticky top-0 p-5 select-none transition-all duration-300 ${
          isCollapsed ? "w-20 px-3.5" : "w-64 xl:w-72"
        }`}
      >
        <div className="space-y-6">
          {/* Logo container wrapper */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center cursor-pointer transition active:scale-95 duration-200 hover:opacity-80 py-1"
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <img
              src={isCollapsed ? "/logo-removebg.png" : "/logo-big-removebg.png"}
              alt="PetDots Logo"
              className={isCollapsed ? "h-9 w-auto object-contain" : "h-11 w-auto object-contain"}
            />
          </button>



          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center transition duration-150 rounded-xl font-semibold select-none ${
                    isCollapsed ? "justify-center p-3" : "gap-3 py-2.5 px-4 text-sm"
                  } ${
                    isActive
                      ? "bg-primary-500 text-white shadow-md"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  {item.icon}
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-4">

          <Link
            href="/"
            className={`flex items-center text-xs font-bold text-zinc-400 hover:text-primary-500 transition ${
              isCollapsed ? "justify-center p-3" : "gap-2 px-4"
            }`}
            title="Voltar ao Início"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!isCollapsed && <span>Voltar ao Início</span>}
          </Link>

          <hr className="border-zinc-900" />

          {/* User Profile & Logout Section */}
          <div className={`flex items-center gap-3 ${isCollapsed ? "flex-col justify-center py-2" : "px-4 py-2"}`}>
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full bg-zinc-800 text-primary-500 border border-zinc-700/85 flex items-center justify-center font-extrabold text-sm select-none"
                  title={`Logado como ${user.name} (${user.email})`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="h-8 w-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-950/30 transition cursor-pointer"
                  title="Sair da Conta"
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-800 text-primary-500 border border-zinc-700/85 flex items-center justify-center font-extrabold text-sm select-none">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200 truncate">{user.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-950/30 transition cursor-pointer"
                  title="Sair da Conta"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Sub-Header Tabs - Mobile Only */}
      <div className="lg:hidden sticky top-[57px] z-10 bg-surface border-b border-border px-4 py-2 overflow-x-auto flex gap-2 no-scrollbar select-none">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 py-1.5 px-3 rounded-full text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? "bg-primary-500 text-white shadow-xs"
                  : "bg-surface-muted text-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="p-6 md:p-8 lg:p-10 max-w-6xl w-full mx-auto space-y-8">
          {/* Header Title Row with Breadcrumbs */}
          <div className="flex items-center justify-between border-b-2 border-primary-500/10 pb-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-primary-500 mb-1.5 select-none">
                Painel da Loja &nbsp;/&nbsp; {NAV_ITEMS.find((i) => pathname === i.href)?.label || "Início"}
              </div>
              <h1 className="text-2xl font-extrabold text-ink tracking-tight">Painel da Loja</h1>
              <p className="text-xs text-ink-muted mt-1">
                Gerencie as informações da sua petshop, produtos e pedidos.
              </p>
            </div>
          </div>



          {/* Subpage Content Area */}
          <div className="min-h-[400px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
