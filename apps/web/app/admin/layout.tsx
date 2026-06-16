"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/admin/stores", label: "Lojas" },
  { href: "/admin/users", label: "Usuários" },
  { href: "/admin/categories", label: "Categorias" },
  { href: "/admin/audit-logs", label: "Logs de auditoria" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Administração</h1>

      <nav className="mt-4 flex gap-2 border-b border-border">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-ink-muted hover:text-primary-600"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">{children}</div>
    </main>
  );
}
