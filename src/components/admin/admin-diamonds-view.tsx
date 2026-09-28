"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Loader2, Plus, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DiamondIcon } from "@/components/diamonds";

type Pkg = { id: string; diamonds: number; priceBRL: number; label: string | null; badge: string | null; sortOrder: number; active: boolean };
type Draft = { id: string; diamonds: string; price: string; label: string; badge: string; sort: string; active: boolean };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toDraft(p: Pkg): Draft {
  return { id: p.id, diamonds: String(p.diamonds), price: String(p.priceBRL), label: p.label ?? "", badge: p.badge ?? "", sort: String(p.sortOrder), active: p.active };
}

export function AdminDiamondsView() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Pkg[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("admin_diamond_packages");
    const list = (data ?? []) as Pkg[];
    setRows(list);
    setDrafts(Object.fromEntries(list.map((p) => [p.id, toDraft(p)])));
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
    const diamonds = parseInt(d.diamonds, 10);
    const price = parseFloat(d.price.replace(",", "."));
    if (!diamonds || diamonds <= 0 || isNaN(price) || price < 0) {
      setMsg("Preencha diamantes (>0) e preço válido.");
      return;
    }
    setSavingId(id);
    setMsg(null);
    const { error } = await supabase.rpc("admin_save_diamond_package", {
      p_id: id.startsWith("new-") ? "" : id,
      p_diamonds: diamonds, p_price: price, p_label: d.label || null, p_badge: d.badge || null,
      p_sort: parseInt(d.sort, 10) || 0, p_active: d.active,
    });
    setSavingId(null);
    if (error) { setMsg("Não foi possível salvar."); return; }
    setMsg("Pacote salvo.");
    await load();
  }

  function addNew() {
    const id = `new-${Date.now()}`;
    setDrafts((d) => ({ ...d, [id]: { id, diamonds: "", price: "", label: "", badge: "", sort: "50", active: true } }));
    setRows((r) => [...r, { id, diamonds: 0, priceBRL: 0, label: "", badge: "", sortOrder: 50, active: true }]);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-white/60">Pacotes de compra. O valor cobrado sempre vem daqui — nunca do aplicativo.</p>
        <button type="button" onClick={addNew} className="flex items-center gap-1.5 rounded-xl bg-orbit-gradient px-3.5 py-2 text-sm font-semibold text-snow">
          <Plus className="h-4 w-4" /> Novo pacote
        </button>
      </div>
      {msg && <p className="mb-3 text-xs text-white/70">{msg}</p>}
      <div className="space-y-3">
        {rows.map((p) => {
          const d = drafts[p.id];
          if (!d) return null;
          return (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-space-surface/60 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                <Field label="Diamantes" icon><input value={d.diamonds} onChange={(e) => setField(p.id, "diamonds", e.target.value.replace(/[^0-9]/g, ""))} className={input} /></Field>
                <Field label="Preço (R$)"><input value={d.price} onChange={(e) => setField(p.id, "price", e.target.value.replace(/[^0-9.,]/g, ""))} className={input} /></Field>
                <Field label="Rótulo"><input value={d.label} onChange={(e) => setField(p.id, "label", e.target.value)} className={input} /></Field>
                <Field label="Selo"><input value={d.badge} onChange={(e) => setField(p.id, "badge", e.target.value)} placeholder="ex: Mais popular" className={input} /></Field>
                <Field label="Ordem"><input value={d.sort} onChange={(e) => setField(p.id, "sort", e.target.value.replace(/[^0-9]/g, ""))} className={input} /></Field>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input type="checkbox" checked={d.active} onChange={(e) => setField(p.id, "active", e.target.checked)} className="h-4 w-4 accent-orbit-purple" /> Ativo
                  </label>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-white/40">{d.price && d.diamonds ? `${d.diamonds} 💎 por ${BRL.format(parseFloat(d.price.replace(",", ".")) || 0)}` : "Novo pacote"}</p>
                <button type="button" onClick={() => save(p.id)} disabled={savingId === p.id} className="flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-60">
                  {savingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
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

function Field({ label, children, icon }: { label: string; children: React.ReactNode; icon?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] text-white/45">{icon && <DiamondIcon className="h-3 w-3" />}{label}</span>
      {children}
    </label>
  );
}
