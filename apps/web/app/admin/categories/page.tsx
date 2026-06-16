"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, type Category } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete State
  const [deletingCategory, setDeletingCategory] = useState<Category[] | Category | null>(null);
  const [deletingCategorySingle, setDeletingCategorySingle] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadCategories = () => {
    apiClient
      .listCategories()
      .then(setCategories)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar as categorias."));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim()) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiClient.createCategory({ name: newName.trim() });
      setNewName("");
      loadCategories();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao criar a categoria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditError(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setEditError(null);
    setIsSavingEdit(true);

    try {
      await apiClient.updateCategory(id, { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
      loadCategories();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Erro ao atualizar a categoria.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategorySingle) return;
    setDeleteError(null);
    setIsDeleting(true);

    try {
      await apiClient.deleteCategory(deletingCategorySingle.id);
      setDeletingCategorySingle(null);
      loadCategories();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Erro ao excluir a categoria.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!categories) {
    return <p className="text-sm text-ink-muted">Carregando categorias...</p>;
  }

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-200">
      {/* Creation card */}
      <div className="bg-surface border border-border p-6 rounded-2xl shadow-xs">
        <h2 className="text-sm font-bold text-ink">Nova Categoria</h2>
        <p className="text-[10px] text-ink-muted mt-0.5 mb-4">Cadastre novas divisões de produtos para o marketplace.</p>

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full flex items-center gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Brinquedos para Cães"
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newName.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-primary-600 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed shrink-0 w-full sm:w-auto justify-center"
          >
            {isSubmitting ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            {isSubmitting ? "Criando..." : "Adicionar Categoria"}
          </button>
        </form>

        {formError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            <svg className="h-5 w-5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{formError}</span>
          </div>
        )}
      </div>

      {/* Grid List of Categories */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-border/80">
          <h3 className="text-sm font-bold text-ink">Categorias Cadastradas</h3>
          <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-10 text-center select-none">
            <p className="text-sm font-semibold text-ink">Nenhuma categoria cadastrada</p>
            <p className="text-xs text-ink-muted mt-1">Cadastre a primeira categoria preenchendo o formulário acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((category) => {
              const isEditing = editingId === category.id;

              return (
                <div
                  key={category.id}
                  className="flex flex-col justify-between p-4 rounded-2xl border border-border bg-surface shadow-2xs hover:shadow-xs transition duration-200 min-h-[100px]"
                >
                  <div className="space-y-2">
                    {/* Header: Actions */}
                    <div className="flex justify-end items-start h-6">
                      {!isEditing && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(category)}
                            className="p-1.5 hover:bg-zinc-100 hover:text-primary-600 rounded-lg text-ink-muted transition cursor-pointer"
                            title="Editar categoria"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setDeletingCategorySingle(category);
                              setDeleteError(null);
                            }}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-ink-muted transition cursor-pointer"
                            title="Excluir categoria"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content / Edit Form */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          required
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="rounded-xl border border-border px-3 py-1.5 text-xs text-ink outline-none transition duration-150 focus:border-primary-500 focus:ring-1 focus:ring-primary-100 w-full bg-zinc-50/50"
                        />
                        {editError && <p className="text-[10px] text-red-600 font-bold">{editError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(category.id)}
                            disabled={isSavingEdit || !editingName.trim()}
                            className="rounded-lg bg-primary-500 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-primary-600 disabled:opacity-60 cursor-pointer"
                          >
                            {isSavingEdit ? "Salvando..." : "Salvar"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-bold text-ink-muted transition hover:bg-zinc-100 bg-surface cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-ink">{category.name}</p>
                        <p className="text-[9px] font-mono text-ink-muted tracking-wide">{category.slug}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCategorySingle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div
            className="bg-surface border border-border rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Confirmar Exclusão</h3>
                <p className="text-[10px] text-ink-muted">Ação irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Você tem certeza de que deseja excluir a categoria{" "}
              <span className="font-bold text-ink">
                {deletingCategorySingle.name}
              </span>
              ? Produtos vinculados a esta categoria ficarão "Sem Categoria".
            </p>

            {deleteError && (
              <p className="text-xs text-red-600 font-bold bg-red-50 border border-red-100 p-2.5 rounded-xl">
                {deleteError}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center justify-center py-2 px-4 rounded-xl shadow-xs text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? "Excluindo..." : "Excluir Categoria"}
              </button>
              <button
                onClick={() => {
                  setDeletingCategorySingle(null);
                  setDeleteError(null);
                }}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-ink-muted transition hover:bg-zinc-50 bg-surface cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
