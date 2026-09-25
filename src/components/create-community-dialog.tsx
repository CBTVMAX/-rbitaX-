"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { COMMUNITY_CATEGORIES } from "@/lib/community-categories";
import { Plus, X } from "lucide-react";

// userId is kept in the props for the callers; the database uses the signed-in account.
export function CreateCommunityDialog(_props: { userId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);

    // The database builds a unique address and makes the creator the owner in one step.
    const { data: slug, error: createError } = await supabase.rpc("create_community", {
      p_name: name,
      p_description: description,
      p_category: category,
    });

    if (createError || !slug) {
      setError(
        createError?.message.includes("entre 3 e 60")
          ? "O nome da comunidade deve ter entre 3 e 60 caracteres."
          : "Não foi possível criar a comunidade agora. Tente novamente."
      );
      setBusy(false);
      return;
    }

    setBusy(false);
    setOpen(false);
    setName("");
    setDescription("");
    setCategory("");
    router.push(`/comunidades/${slug}`);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-orbit-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow"
      >
        <Plus className="h-4 w-4" /> Criar uma comunidade
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-space-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Nova comunidade</h2>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/50">Nome</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
                >
                  <option value="" className="bg-space-card">Sem categoria</option>
                  {COMMUNITY_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug} className="bg-space-card">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-orbit-gradient py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
              >
                {busy ? "Criando..." : "Criar comunidade"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
