"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { apiClient } from "@/lib/api-client";
import type { Category, PetType } from "@petdots/shared";

export function Header() {
  const { user, isLoading, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);

  useEffect(() => {
    apiClient.listCategories().then(setCategories).catch(() => undefined);
    apiClient.listPetTypes().then(setPetTypes).catch(() => undefined);
  }, []);

  if (pathname === "/login" || pathname === "/register" || pathname?.startsWith("/dashboard")) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface border-t-4 border-t-primary-500 shadow-sm">
      {/* Main Topbar Row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center select-none shrink-0">
          <img
            src="/logo-big.png"
            alt="PetDots Logo"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Central Search Field */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative hidden md:block">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar rações, brinquedos, petshops..."
            className="w-full rounded-xl border border-border bg-zinc-50/50 hover:bg-zinc-50 px-4 py-2 pl-10 text-xs text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:bg-white placeholder-ink-muted/50"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        {/* User / Cart Navigation */}
        <nav className="flex items-center gap-3 text-sm font-medium shrink-0">
          {isLoading ? null : user ? (
            <>
              {user.role === "STORE_OWNER" && (
                <Link
                  href="/dashboard"
                  className="rounded-full px-3 py-1.5 text-ink-muted transition hover:text-primary-600"
                >
                  Minha loja
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-1.5 text-ink-muted transition hover:text-primary-600"
                >
                  Admin
                </Link>
              )}
              {user.role === "CUSTOMER" && (
                <Link
                  href="/orders"
                  className="rounded-full px-3 py-1.5 text-ink-muted transition hover:text-primary-600"
                >
                  Minhas compras
                </Link>
              )}
              <Link
                href="/cart"
                className="relative rounded-full px-3 py-1.5 text-ink-muted transition hover:text-primary-600"
              >
                Carrinho
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                className="hidden text-ink-muted sm:inline hover:text-primary-600 transition"
              >
                Olá, <span className="font-bold">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full border border-border px-3 py-1.5 transition hover:border-primary-500 hover:text-primary-600 cursor-pointer"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-1.5 text-ink-muted transition hover:text-primary-600"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-primary-500 px-4 py-1.5 text-white transition hover:bg-primary-600"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Secondary Categories & Finder Bar */}
      <div className="border-t border-border/80 bg-zinc-50/40 select-none">
        <div className="mx-auto max-w-7xl flex items-center justify-start gap-6 px-4 py-2.5 text-xs font-bold text-ink-muted">
          
          {/* Dropdown 1: Encontrar Produtos */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:text-primary-500 transition cursor-pointer py-1 select-none focus:outline-none">
              <span>Encontrar Produtos</span>
              <svg className="h-3 w-3 text-ink-muted/60 group-hover:rotate-180 transition duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu Box */}
            <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-white border border-border shadow-xl rounded-2xl p-5 w-[360px] gap-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex-1 space-y-3">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary-500">Categorias</span>
                <ul className="space-y-2 text-ink font-semibold">
                  {categories.slice(0, 4).map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => router.push(`/products?categoryId=${cat.id}`)}
                        className="hover:text-primary-500 transition cursor-pointer text-left block w-full"
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                  {categories.length === 0 && (
                    <li className="text-xs text-ink-muted italic">Nenhuma categoria encontrada</li>
                  )}
                </ul>
              </div>
              <div className="flex-1 space-y-3 border-l border-border pl-6">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary-500">Por Pet</span>
                <ul className="space-y-2 text-ink font-semibold">
                  {petTypes.slice(0, 4).map((pt) => (
                    <li key={pt.id}>
                      <button
                        onClick={() => router.push(`/products?petTypeId=${pt.id}`)}
                        className="hover:text-primary-500 transition cursor-pointer text-left block w-full"
                      >
                        {pt.name}
                      </button>
                    </li>
                  ))}
                  {petTypes.length === 0 && (
                    <li className="text-xs text-ink-muted italic">Nenhum tipo cadastrado</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Dropdown 2: Encontrar Lojas */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 hover:text-primary-500 transition cursor-pointer py-1 select-none focus:outline-none">
              <span>Encontrar Lojas</span>
              <svg className="h-3 w-3 text-ink-muted/60 group-hover:rotate-180 transition duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu Box */}
            <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col bg-white border border-border shadow-xl rounded-2xl p-4 w-[240px] gap-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary-500 px-1">Filtros de Petshops</span>
              <ul className="space-y-2 text-ink font-semibold px-1">
                <li>
                  <Link href="/stores?filter=nearby" className="hover:text-primary-500 transition text-left flex items-center gap-2">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Lojas Próximas</span>
                  </Link>
                </li>
                <li>
                  <Link href="/stores?filter=rating" className="hover:text-primary-500 transition text-left flex items-center gap-2">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.52 4.674c.3.921-.755 1.688-1.54 1.118l-3.97-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.784.57-1.838-.197-1.539-1.118l1.52-4.674a1 1 0 00-.364-1.118L2.98 10.1c-.783-.57-.38-1.81.588-1.81h4.906a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span>Melhor Avaliadas</span>
                  </Link>
                </li>
                <li>
                  <Link href="/stores?filter=fast" className="hover:text-primary-500 transition text-left flex items-center gap-2">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Entrega Rápida</span>
                  </Link>
                </li>
                <li>
                  <Link href="/stores?filter=newest" className="hover:text-primary-500 transition text-left flex items-center gap-2">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Novidades</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-border/80 hidden sm:block" />

          {/* Quick Filter Buttons */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => router.push(`/?category=${cat.id}&categoryName=${encodeURIComponent(cat.name)}`)}
              className="hover:text-primary-500 transition cursor-pointer hidden sm:block"
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => router.push("/?onSale=true")}
            className="text-primary-500 hover:text-primary-600 transition cursor-pointer hidden sm:block flex items-center gap-1"
          >
            <span>🔥</span> Ofertas
          </button>
        </div>
      </div>
    </header>
  );
}
