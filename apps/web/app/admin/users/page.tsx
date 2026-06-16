"use client";

import { useEffect, useState } from "react";
import { ApiError, type User, type UserRole } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const ROLE_FILTERS: { value: UserRole | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "CUSTOMER", label: "Clientes" },
  { value: "STORE_OWNER", label: "Lojistas" },
  { value: "ADMIN", label: "Admins" },
];

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Cliente",
  STORE_OWNER: "Lojista",
  ADMIN: "Admin",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = (role: UserRole | "") => {
    apiClient
      .adminListUsers(role ? { role } : {})
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar os usuários."));
  };

  useEffect(() => {
    loadUsers(roleFilter);
  }, [roleFilter]);

  const handleRoleChange = async (id: string, role: UserRole) => {
    setUpdatingId(id);
    setError(null);
    try {
      await apiClient.adminUpdateUser(id, { role });
      loadUsers(roleFilter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o usuário.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setUpdatingId(id);
    setError(null);
    try {
      await apiClient.adminUpdateUser(id, { isActive: !isActive });
      loadUsers(roleFilter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar o usuário.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setRoleFilter(filter.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              roleFilter === filter.value
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-border text-ink-muted hover:border-primary-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {users === null && !error && <p className="mt-4 text-sm text-ink-muted">Carregando...</p>}
      {users?.length === 0 && <p className="mt-4 text-sm text-ink-muted">Nenhum usuário encontrado.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {users?.map((u) => {
          const isSelf = u.id === currentUser?.id;
          return (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {u.name}
                  {isSelf && <span className="ml-2 text-xs font-normal text-ink-muted">(você)</span>}
                </p>
                <p className="text-xs text-ink-muted">{u.email}</p>
                {u.phone && <p className="text-xs text-ink-muted">{u.phone}</p>}
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {u.isActive ? "Ativo" : "Inativo"}
                </span>

                <select
                  value={u.role}
                  disabled={isSelf || updatingId === u.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm text-ink outline-none focus:border-primary-500 disabled:opacity-60"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleToggleActive(u.id, u.isActive)}
                  disabled={isSelf || updatingId === u.id}
                  className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted transition hover:border-primary-500 hover:text-primary-600 disabled:opacity-60"
                >
                  {u.isActive ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
