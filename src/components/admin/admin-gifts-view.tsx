"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Loader2, Plus, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DiamondIcon } from "@/components/diamonds";

type Gift = { id: string; name: string; description: string; image: string; priceCoins: number; active: boolean; badge: string | null; sortOrder: number };
type Draft = { id: string; name: string; image: string; description: string; price: string; badge: string; sort: string; active: boolean };

function toDraft(g: Gift): Draft {
  return { id: g.id, name: g.name, image: g.image, description: g.description ?? "", price: String(g.priceCoins), badge: g.badge ?? "", sort: String(g.sortOrder), active: g.active };
}

export function AdminGiftsView() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Gift[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("admin_gifts");
    const list = (data ?? []) as Gift[];
    setRows(list);
    setDrafts(Object.fromEntries(list.map((g) => [g.id, toDraft(g)])));
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(id: string, k: keyof Draft, v: string | boolean) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));
  }

  async function save(id: string) {
    const d = drafts[id];
    if (!d.name.trim()) { setMsg("Informe o nome do presente."); return; }
    const price = parseInt(d.price, 10) || 0;
    setSavingId(id);
    setMsg(null);
    const { error } = await supabase.rpc("admin_save_gift", {
      p_id: id.startsWith("new-") ? "" : id,
      p_name: d.name.trim(), p_image: d.image.trim(), p_price: price, p_active: d.active,
      p_description: d.description, p_badge: d.badge || null, p_sort: parseInt(d.sort, 10) || 0,
    });
    setSavingId(null);
    if (error) { setMsg("Não foi possível salvar."); return; }
    setMsg("Presente salvo.");
    await load();
  }

  async function toggle(id: string, active: boolean) {
    await supabase.rpc("admin_toggle_gift", { p_id: id, p_active: active });
    setField(id, "active", active);
  }

  function addNew() {
    const id = `new-${Date.now()}`;
    setDrafts((d) => ({ ...d, [id]: { id, name: "", image: "", description: "", price: "50", badge: "", sort: "50", active: true } }));
    setRows((r) => [...r, { id, name: "", description: "", image: "", priceCoins: 50, active: true, badge: "", sortOrder: 50 }]);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-white/60">Presentes virtuais pagos em Diamantes. Criar, editar preço, imagem e ativar/desativar.</p>
        <button type="button" onClick={addNew} className="flex items-center gap-1.5 rounded-xl bg-orbit-gradient px-3.5 py-2 text-sm font-semibold text-snow">
          <Plus className="h-4 w-4" /> Novo presente
        </button>
      </div>
      {msg && <p className="mb-3 text-xs text-white/70">{msg}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((g) => {
          const d = drafts[g.id];
          if (!d) return null;
          return (
            <div key={g.id} className="rounded-2xl border border-white/10 bg-space-surface/60 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-space-bg/50">
                  {d.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.image} alt="" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  ) : (
                    <DiamondIcon className="h-6 w-6" />
                  )}
                </span>
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <input value={d.name} onChange={(e) => setField(g.id, "name", e.target.value)} placeholder="Nome" className={clsx(input, "col-span-2")} />
                  <input value={d.image} onChange={(e) => setField(g.id, "image", e.target.value)} placeholder="URL da imagem/animação" className={clsx(input, "col-span-2")} />
                  <input value={d.price} onChange={(e) => setField(g.id, "price", e.target.value.replace(/[^0-9]/g, ""))} placeholder="Preço 💎" className={input} />
                  <input value={d.sort} onChange={(e) => setField(g.id, "sort", e.target.value.replace(/[^0-9]/g, ""))} placeholder="Ordem" className={input} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input type="checkbox" checked={d.active} onChange={(e) => (g.id.startsWith("new-") ? setField(g.id, "active", e.target.checked) : toggle(g.id, e.target.checked))} className="h-4 w-4 accent-orbit-purple" /> Ativo
                </label>
                <button type="button" onClick={() => save(g.id)} disabled={savingId === g.id} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-60">
                  {savingId === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const input = "w-full rounded-lg border border-white/10 bg-space-card px-2.5 py-2 text-sm text-white outline-none focus:border-orbit-purple/60";
