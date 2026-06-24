"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError, type Brand } from "@petdots/shared";
import { apiClient } from "@/lib/api-client";

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = () => {
    apiClient
      .listBrands()
      .then(setBrands)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar as marcas."));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiClient.createBrand({ name: newName.trim() });
      setNewName("");
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao criar marca.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setEditError(null);
    setIsSavingEdit(true);
    try {
      await apiClient.updateBrand(id, { name: editingName.trim() });
      setEditingId(null);
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Erro ao atualizar marca.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBrand) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await apiClient.deleteBrand(deletingBrand.id);
      setDeletingBrand(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Erro ao excluir marca.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!brands) return <p className="text-sm text-ink-muted">Carregando marcas...</p>;

  return (
    <div className="space-y-8 select-none animate-in fade-in duration-200">
      {/* Create */}
      <div className="bg-surface border border-border p-6 rounded-2xl shadow-xs">
        <h2 className="text-sm font-bold text-ink">Nova Marca</h2>
        <p className="text-[10px] text-ink-muted mt-0.5 mb-4">Cadastre marcas para uso nos produtos do catálogo.</p>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Royal Canin"
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-ink outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 placeholder-ink-muted/40 w-full"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newName.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 w-full sm:w-auto justify-center transition shadow-xs cursor-pointer"
          >
            {isSubmitting ? "Criando..." : "Adicionar Marca"}
          </button>
        </form>
        {formError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{formError}</p>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-border/80">
          <h3 className="text-sm font-bold text-ink">Marcas Cadastradas</h3>
          <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {brands.length} {brands.length === 1 ? "marca" : "marcas"}
          </span>
        </div>

        {brands.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-10 text-center">
            <p className="text-sm font-semibold text-ink">Nenhuma marca cadastrada</p>
            <p className="text-xs text-ink-muted mt-1">Cadastre a primeira marca pelo formulário acima.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {brands.map((brand) => {
              const isEditing = editingId === brand.id;
              return (
                <div key={brand.id} className="flex flex-col justify-between p-4 rounded-2xl border border-border bg-surface shadow-2xs hover:shadow-xs transition min-h-[100px]">
                  <div className="space-y-2">
                    <div className="flex justify-end items-start h-6">
                      {!isEditing && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingId(brand.id); setEditingName(brand.name); setEditError(null); }}
                            className="p-1.5 hover:bg-zinc-100 hover:text-primary-600 rounded-lg text-ink-muted transition cursor-pointer"
                            title="Editar"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setDeletingBrand(brand); setDeleteError(null); }}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-ink-muted transition cursor-pointer"
                            title="Excluir"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="rounded-xl border border-border px-3 py-1.5 text-xs text-ink outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-100 w-full bg-zinc-50/50"
                        />
                        {editError && <p className="text-[10px] text-red-600 font-bold">{editError}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(brand.id)} disabled={isSavingEdit || !editingName.trim()}
                            className="rounded-lg bg-primary-500 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-primary-600 disabled:opacity-60 cursor-pointer">
                            {isSavingEdit ? "Salvando..." : "Salvar"}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-bold text-ink-muted hover:bg-zinc-100 bg-surface cursor-pointer">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-ink">{brand.name}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deletingBrand && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
              Excluir a marca <span className="font-bold text-ink">{deletingBrand.name}</span>? Produtos vinculados ficarão sem marca.
            </p>
            {deleteError && <p className="text-xs text-red-600 font-bold bg-red-50 border border-red-100 p-2.5 rounded-xl">{deleteError}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={handleDelete} disabled={isDeleting}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 cursor-pointer shadow-xs">
                {isDeleting ? "Excluindo..." : "Excluir Marca"}
              </button>
              <button onClick={() => { setDeletingBrand(null); setDeleteError(null); }}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-ink-muted hover:bg-zinc-50 bg-surface cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
