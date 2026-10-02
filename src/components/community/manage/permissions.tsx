"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { communityError, LEVEL_LABEL, PERMISSION_LABEL, type PermissionKey, type PermissionLevel, type Permissions } from "@/lib/communities";
import { useCommunity } from "../context";
import { Card, ReadOnlyNote, SaveButton } from "./fields";

const KEYS: { key: PermissionKey; hint: string }[] = [
  { key: "post", hint: "Publicar direto no mural, sem passar pela moderação" },
  { key: "suggest", hint: "Quem não pode publicar envia um post para a administração aprovar (como no VK). Todos/Membros = quem participa pode sugerir; Administradores = desligado" },
  { key: "comment", hint: "Comentários em posts e respostas em discussões" },
  { key: "discussion", hint: "Abrir novos tópicos. Padrão: só a administração; libere para Membros se quiser" },
  { key: "photo", hint: "Fotos e álbuns" },
  { key: "video", hint: "Vídeos e clipes verticais" },
  { key: "poll", hint: "Enquetes" },
  { key: "invite", hint: "Compartilhar convites da comunidade" },
  { key: "link", hint: "Links em posts e comentários" },
  { key: "mention", hint: "Marcar pessoas com @ (gera notificação)" },
  { key: "story", hint: "Histórias que somem após o prazo (foto, vídeo, texto, música, enquete, link)" },
  { key: "event", hint: "Criar eventos com data, local e lista de presença" },
];
const LEVELS: PermissionLevel[] = ["all", "members", "admins", "owner"];

export function PermissionsSection({ onSaved }: { onSaved: (p: Permissions) => void }) {
  const { community, role, supabase, toast } = useCommunity();
  const router = useRouter();
  const owner = role === "owner";
  const initial: Permissions = {
    ...community.permissions,
    story: community.permissions.story ?? "admins",
    event: community.permissions.event ?? "admins",
    suggest: community.permissions.suggest ?? "admins",
  };
  const [saved, setSaved] = useState<Permissions>(initial);
  const [perm, setPerm] = useState<Permissions>(initial);
  const [busy, setBusy] = useState(false);
  const dirty = KEYS.some(({ key }) => perm[key] !== saved[key]);

  async function save() {
    setBusy(true);
    // "Sugerir posts" tem a própria função; o resto vai junto em community_update.
    const { suggest, ...rest } = perm;
    const { error } = await supabase.rpc("community_update", { p_community: community.id, p: { permissions: rest } as never });
    const { error: e2 } =
      !error && suggest !== saved.suggest
        ? await supabase.rpc("community_set_suggestions" as never, { p_community: community.id, p_level: suggest ?? "admins" } as never)
        : { error: null };
    setBusy(false);
    if (error || e2) return toast(communityError((error ?? e2)!.message), true);
    setSaved(perm);
    onSaved(perm);
    toast("Permissões atualizadas. Elas já valem para todos.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card
        title="Quem pode fazer o quê"
        desc={
          <>
            <strong className="text-white/70">Todos</strong>: qualquer pessoa logada (em comunidade privada, só membros) · <strong className="text-white/70">Membros</strong>: quem participa ·{" "}
            <strong className="text-white/70">Administradores</strong>: administradores, editores e proprietário · <strong className="text-white/70">Somente proprietário</strong>. Moderadores contam como membros aqui. Membros silenciados não publicam, seja qual for a regra.
          </>
        }
      >
        {!owner && <ReadOnlyNote>Você pode ver as permissões, mas só o proprietário pode alterá-las.</ReadOnlyNote>}
        <div className="mt-3 divide-y divide-white/[0.05]">
          {KEYS.map(({ key, hint }) => (
            <div key={key} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:gap-4">
              <div className="min-w-0 md:w-56">
                <p className="text-sm font-semibold text-white">{PERMISSION_LABEL[key]}</p>
                <p className="text-xs text-white/45">{hint}</p>
              </div>
              <div role="radiogroup" aria-label={PERMISSION_LABEL[key]} className="grid flex-1 grid-cols-4 gap-1 rounded-2xl bg-space-bg/60 p-1">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={perm[key] === l}
                    disabled={!owner}
                    onClick={() => setPerm((p) => ({ ...p, [key]: l }))}
                    className={clsx(
                      "min-h-[40px] rounded-xl px-1 text-[11px] font-semibold leading-tight transition sm:text-xs",
                      perm[key] === l ? "bg-orbit-gradient text-snow shadow-[0_0_14px_rgb(var(--app-accent,139_92_246)/0.35)]" : "text-white/55 hover:text-white disabled:hover:text-white/55"
                    )}
                  >
                    {l === "owner" ? (
                      <>
                        <span className="sm:hidden">Dono</span>
                        <span className="hidden sm:inline">{LEVEL_LABEL[l]}</span>
                      </>
                    ) : l === "admins" ? (
                      <>
                        <span className="sm:hidden">Admins</span>
                        <span className="hidden sm:inline">{LEVEL_LABEL[l]}</span>
                      </>
                    ) : (
                      LEVEL_LABEL[l]
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      {owner && (
        <div className="flex justify-end gap-2">
          {dirty && (
            <button type="button" onClick={() => setPerm(saved)} className="min-h-[48px] rounded-full px-5 text-sm font-semibold text-white/70 hover:text-white">
              Descartar
            </button>
          )}
          <SaveButton busy={busy} disabled={!dirty} onClick={save}>
            Salvar permissões
          </SaveButton>
        </div>
      )}
    </div>
  );
}
