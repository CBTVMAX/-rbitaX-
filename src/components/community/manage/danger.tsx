"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { ArrowLeftRight, Loader2, Lock, Power, ShieldAlert, Trash2 } from "lucide-react";
import { Avatar } from "@/components/post-card";
import { communityError } from "@/lib/communities";
import { useCommunity } from "../context";
import { Confirm, Sheet } from "../ui";

type Member = { userId: string; name: string; username: string; avatarUrl: string | null };

/** Zona de Perigo — ações exclusivas do proprietário. O backend confere Community.ownerId de novo. */
export function DangerSection() {
  const { supabase, community, viewer, toast } = useCommunity();
  const router = useRouter();
  const isOwner = !!viewer && community.ownerId === viewer.id;
  const [status, setStatus] = useState(community.status);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  if (!isOwner) {
    return (
      <div className="rounded-3xl border border-white/10 bg-space-card/60 p-6 text-center">
        <Lock className="mx-auto h-7 w-7 text-white/40" />
        <p className="mt-3 text-sm font-semibold text-white/80">Somente o proprietário</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-white/45">Transferir, desativar ou excluir a comunidade são ações exclusivas do proprietário. Ter um cargo alto não concede esse poder.</p>
      </div>
    );
  }

  async function toggleStatus() {
    const next = status === "active" ? "disabled" : "active";
    setStatusBusy(true);
    const { error } = await supabase.rpc("community_set_status", { p_community: community.id, p_status: next });
    setStatusBusy(false);
    if (error) return toast(communityError(error.message), true);
    setStatus(next);
    toast(next === "disabled" ? "Comunidade desativada." : "Comunidade reativada.");
    router.refresh();
  }

  async function remove() {
    setDelBusy(true);
    setDelError(null);
    const { error } = await supabase.rpc("community_delete", { p_community: community.id, p_confirm: confirmName.trim() });
    setDelBusy(false);
    if (error) return setDelError(/name_mismatch/.test(error.message) ? "O nome digitado não confere." : communityError(error.message));
    toast("Comunidade excluída.");
    router.push("/comunidades");
  }

  const Row = ({ icon, tint, title, desc, children }: { icon: React.ReactNode; tint: string; title: string; desc: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-space-card/60 p-4 sm:flex-row sm:items-center">
      <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tint)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/50">{desc}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-red-200">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <p className="text-xs">Estas ações podem afetar permanentemente a comunidade. Só o proprietário pode executá-las.</p>
      </div>

      <Row icon={<ArrowLeftRight className="h-5 w-5 text-orbit-cyan" />} tint="bg-orbit-cyan/15" title="Transferir propriedade" desc="Passa o controle máximo para outro membro. Você vira administrador.">
        <button type="button" onClick={() => setTransferOpen(true)} className="h-10 shrink-0 rounded-full border border-white/15 px-4 text-xs font-semibold text-white/85 hover:bg-white/5">Transferir</button>
      </Row>

      <Row
        icon={<Power className={clsx("h-5 w-5", status === "disabled" ? "text-emerald-300" : "text-amber-300")} />}
        tint={status === "disabled" ? "bg-emerald-500/15" : "bg-amber-500/15"}
        title={status === "disabled" ? "Reativar comunidade" : "Desativar comunidade"}
        desc={status === "disabled" ? "A comunidade está desativada. Reative para voltar ao normal." : "Oculta temporariamente e impede novas entradas. O conteúdo é preservado."}
      >
        <button type="button" onClick={toggleStatus} disabled={statusBusy} className={clsx("flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold disabled:opacity-60", status === "disabled" ? "bg-emerald-500/90 text-snow" : "border border-amber-400/40 text-amber-200 hover:bg-amber-400/10")}>
          {statusBusy && <Loader2 className="h-4 w-4 animate-spin" />} {status === "disabled" ? "Reativar" : "Desativar"}
        </button>
      </Row>

      <Row icon={<Trash2 className="h-5 w-5 text-red-300" />} tint="bg-red-500/15" title="Excluir comunidade" desc="Remove permanentemente a comunidade e todo o seu conteúdo. Não pode ser desfeito.">
        <button type="button" onClick={() => (setConfirmName(""), setDelError(null), setDeleteOpen(true))} className="h-10 shrink-0 rounded-full bg-red-500/90 px-4 text-xs font-semibold text-snow hover:bg-red-500">Excluir</button>
      </Row>

      {transferOpen && <TransferModal onClose={() => setTransferOpen(false)} onDone={() => (setTransferOpen(false), router.refresh())} />}

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir comunidade">
        <div className="space-y-3 pt-1">
          <p className="text-sm text-white/70">Esta ação é permanente e apaga publicações, discussões, eventos, mídias e membros. Para confirmar, digite o nome exato da comunidade:</p>
          <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white">{community.name}</p>
          <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder="Digite o nome da comunidade" className="w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60" />
          {delError && <p className="text-xs text-red-300">{delError}</p>}
          <button type="button" onClick={remove} disabled={delBusy || confirmName.trim() !== community.name} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-500/90 text-sm font-semibold text-snow transition hover:bg-red-500 disabled:opacity-50">
            {delBusy && <Loader2 className="h-4 w-4 animate-spin" />} Excluir permanentemente
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function TransferModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { supabase, community, viewer, toast } = useCommunity();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [target, setTarget] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("CommunityMember")
      .select("userId, user:User!CommunityMember_userId_fkey(name, username, avatarUrl)")
      .eq("communityId", community.id)
      .order("createdAt");
    setMembers(
      ((data ?? []) as unknown as { userId: string; user: { name: string; username: string; avatarUrl: string | null } | null }[])
        .filter((x) => x.user && x.userId !== viewer?.id)
        .map((x) => ({ userId: x.userId, name: x.user!.name, username: x.user!.username, avatarUrl: x.user!.avatarUrl }))
    );
  }, [supabase, community.id, viewer?.id]);
  useEffect(() => {
    load();
  }, [load]);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.rpc("community_transfer_owner", { p_community: community.id, p_user: target.userId });
    setBusy(false);
    if (error) return toast(communityError(error.message), true);
    toast(`Propriedade transferida para ${target.name}.`);
    onDone();
  }

  return (
    <>
      <Sheet open onClose={onClose} title="Transferir propriedade">
        <div className="space-y-2 pt-1">
          <p className="text-xs text-white/50">Escolha o novo proprietário. Você continuará como administrador.</p>
          {members === null ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
          ) : members.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/45">Não há outros membros para receber a propriedade.</p>
          ) : (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li key={m.userId}>
                  <button type="button" onClick={() => setTarget(m)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-2.5 text-left transition hover:bg-white/5">
                    <Avatar name={m.name} url={m.avatarUrl} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{m.name}</span>
                      <span className="block truncate text-xs text-white/45">@{m.username}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Sheet>
      <Confirm
        open={!!target}
        title="Transferir propriedade?"
        message={target ? `${target.name} passará a ser o proprietário, com controle máximo da comunidade. Você continuará como administrador.` : ""}
        confirmLabel="Transferir"
        busy={busy}
        onConfirm={confirm}
        onClose={() => setTarget(null)}
      />
    </>
  );
}
