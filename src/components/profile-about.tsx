"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { clsx } from "clsx";
import { AlignLeft, AtSign, Briefcase, Cake, Check, Copy, Gem, GraduationCap, Heart, Home, Languages, MapPin, Quote, Rss, Sparkles, UserRound, Users, UsersRound, X } from "lucide-react";
import type { ProfileAbout } from "@/lib/profile-options";
import { Avatar } from "@/components/post-card";

export type AboutFamilyMember = { relativeId: string; relation: string; username: string; name: string; avatarUrl: string | null };
export type AboutCommunity = { id: string; name: string; slug: string; avatarUrl: string | null; role: string };

export type AboutData = {
  name: string;
  username: string;
  bio: string | null;
  location: string | null;
  age: number | null;
  sign: string | null;
  relationship: string | null;
  interests: string[];
  website: string | null;
  followers: number;
  following: number;
  friends: number;
  mutual: number;
  family: AboutFamilyMember[];
  about?: ProfileAbout;
  communities: AboutCommunity[];
  isMe: boolean;
};

// Família em grupos, na ordem em que as redes costumam mostrar.
const FAMILY_GROUPS: [string, string[]][] = [
  ["Pais", ["Pai", "Mãe", "Padrasto", "Madrasta"]],
  ["Irmãos", ["Irmão", "Irmã"]],
  ["Filhos", ["Filho", "Filha", "Enteado", "Enteada"]],
  ["Avós", ["Avô", "Avó"]],
  ["Netos", ["Neto", "Neta"]],
  ["Tios", ["Tio", "Tia"]],
  ["Primos", ["Primo", "Prima"]],
  ["Sobrinhos", ["Sobrinho", "Sobrinha"]],
  ["Outros", ["Outro"]],
];
const PARTNER = ["Cônjuge", "Companheiro(a)"];
const ROLE_LABEL: Record<string, string> = { owner: "Fundador(a)", admin: "Administrador(a)", moderator: "Moderador(a)", editor: "Editor(a)" };

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function Row({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2">
      <Icon className="mt-0.5 h-[22px] w-[22px] shrink-0 text-white/45" />
      <div className="min-w-0 flex-1 break-words text-[15px] leading-snug text-white/75">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/[0.08] pt-4">
      <h3 className="mb-2 text-[19px] font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

/** Informações do perfil organizadas como o "Saber mais" do VK. Usada no painel e na aba Sobre. */
export function ProfileAboutContent({ d, onNavigate }: { d: AboutData; onNavigate?: () => void }) {
  const [copied, setCopied] = useState(false);
  const partner = d.family.find((m) => PARTNER.includes(m.relation)) ?? null;
  const relatives = d.family.filter((m) => !PARTNER.includes(m.relation));
  const groups = FAMILY_GROUPS.map(([title, rels]) => [title, relatives.filter((m) => rels.includes(m.relation))] as const).filter(([, list]) => list.length);
  const ageLine = [d.age !== null ? `${d.age} anos` : null, d.sign].filter(Boolean).join(" · ");
  const personLink = (m: { username: string; name: string }) => (
    <Link href={`/perfil/${m.username}`} onClick={onNavigate} className="text-orbit-blue hover:underline">
      {m.name}
    </Link>
  );
  const ab = d.about ?? {};
  const hasAbout = Boolean(ab.hometown || ab.languages?.length || ab.education?.length || ab.career?.length || ab.motto || ab.priority || ab.peopleValue || ab.inspiredBy || ab.smoking || ab.alcohol);
  const nothing = !d.bio && !d.location && !ageLine && !d.relationship && !partner && !d.interests.length && !hasAbout;
  const life: [string, string | undefined][] = [
    ["Prioridade na vida", ab.priority],
    ["O mais importante nas pessoas", ab.peopleValue],
    ["Visão sobre fumo", ab.smoking],
    ["Visão sobre álcool", ab.alcohol],
    ["Inspirações", ab.inspiredBy],
  ];

  async function copyUsername() {
    try {
      await navigator.clipboard.writeText(`@${d.username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sem área de transferência */
    }
  }

  return (
    <div className="space-y-4">
      <div>
        {d.bio && (
          <Row icon={AlignLeft}>
            <span className="whitespace-pre-line text-white/85">{d.bio}</span>
          </Row>
        )}
        <Row icon={AtSign}>
          <button type="button" onClick={copyUsername} className="inline-flex items-center gap-2 text-orbit-blue hover:underline" title="Copiar @usuário">
            {d.username}
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
          </button>
        </Row>
      </div>

      {(!nothing || d.followers > 0) && (
        <div className="border-t border-white/[0.08] pt-2">
          {ageLine && <Row icon={Cake}>{ageLine}</Row>}
          {d.location && <Row icon={Home}>Cidade: {d.location}</Row>}
          {ab.hometown && <Row icon={MapPin}>Cidade natal: {ab.hometown}</Row>}
          {ab.languages?.length ? <Row icon={Languages}>Idiomas: {ab.languages.join(", ")}</Row> : null}
          {(d.relationship || partner) && (
            <Row icon={Heart}>
              {d.relationship ?? "Em um relacionamento"}
              {partner && <> com {personLink(partner)}</>}
            </Row>
          )}
          {d.interests.length > 0 && <Row icon={Sparkles}>Interesses: {d.interests.join(", ")}</Row>}
          <Row icon={Rss}>
            {compact.format(d.followers)} {d.followers === 1 ? "seguidor" : "seguidores"}
          </Row>
        </div>
      )}

      {nothing && d.isMe && (
        <Link href="/configuracoes/conta" onClick={onNavigate} className="flex items-center justify-center rounded-xl border border-dashed border-white/15 py-3 text-sm text-white/55 hover:text-white">
          Adicione cidade, aniversário, relacionamento, formação e carreira
        </Link>
      )}

      <div className="border-t border-white/[0.08] pt-1">
        <a href="#tab-amigos" onClick={onNavigate} className="flex items-center gap-4 py-3">
          <UserRound className="h-6 w-6 shrink-0 text-orbit-blue" />
          <span className="flex-1 text-[17px] text-white">Amigos</span>
          <span className="text-[16px] text-white/50">
            {compact.format(d.friends)}
            {!d.isMe && d.mutual > 0 && ` (${d.mutual} em comum)`}
          </span>
        </a>
        <div className="flex items-center gap-4 py-3">
          <Users className="h-6 w-6 shrink-0 text-orbit-blue" />
          <span className="flex-1 text-[17px] text-white">Seguindo</span>
          <span className="text-[16px] text-white/50">{compact.format(d.following)}</span>
        </div>
      </div>

      {d.isMe && (
        <a
          href="#tab-familia"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/[0.04]"
        >
          {groups.length || partner ? "Gerenciar família e pedidos" : "Adicionar familiares (pais, irmãos, cônjuge…)"}
          <span className="text-orbit-blue">›</span>
        </a>
      )}

      {ab.career?.length ? (
        <Section title="Carreira">
          {ab.career.map((c, i) => (
            <Row key={i} icon={Briefcase}>
              {c.communitySlug ? (
                <Link href={`/comunidades/${c.communitySlug}`} onClick={onNavigate} className="inline-flex items-center gap-2 text-orbit-blue hover:underline">
                  {c.communityAvatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.communityAvatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                  )}
                  {c.communityName ?? c.company}
                </Link>
              ) : (
                <span className="text-white/90">{c.company}</span>
              )}
              {c.role && <span className="text-white/60"> · {c.role}</span>}
              {(c.city || c.from) && (
                <span className="block text-[13px] text-white/45">
                  {[c.city, c.from ? `${c.from}–${c.to ?? "atual"}` : c.to ? `até ${c.to}` : null].filter(Boolean).join(" · ")}
                </span>
              )}
            </Row>
          ))}
        </Section>
      ) : null}

      {ab.education?.length ? (
        <Section title="Formação">
          {ab.education.map((e, i) => (
            <Row key={i} icon={GraduationCap}>
              <span className="text-white/90">{e.school}</span>
              {(e.course || e.level || e.year) && (
                <span className="block text-[13px] text-white/45">{[e.course, e.level, e.year ? `${e.year}` : null].filter(Boolean).join(" · ")}</span>
              )}
            </Row>
          ))}
        </Section>
      ) : null}

      {(ab.motto || life.some(([, v]) => v)) && (
        <Section title="Lema de vida">
          {ab.motto && (
            <Row icon={Quote}>
              <span className="italic text-white/85">“{ab.motto}”</span>
            </Row>
          )}
          {life
            .filter(([, v]) => v)
            .map(([label, v]) => (
              <Row key={label} icon={Sparkles}>
                <span className="text-white/45">{label}:</span> {v}
              </Row>
            ))}
        </Section>
      )}

      {groups.length > 0 && (
        <Section title="Família">
          <div className="space-y-3">
            {groups.map(([title, list]) => (
              <div key={title}>
                <p className="mb-1 text-[14px] text-white/45">{title}</p>
                {list.map((m) => (
                  <Link key={m.relativeId} href={`/perfil/${m.username}`} onClick={onNavigate} className="flex items-center gap-3.5 rounded-xl py-1.5 hover:bg-white/[0.03]">
                    <Avatar name={m.name} url={m.avatarUrl} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate text-[16px] text-white">{m.name}</span>
                      <span className="block text-[12px] text-white/40">{m.relation}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {d.communities.length > 0 && (
        <Section title="Comunidades">
          <div className="space-y-1">
            {d.communities.map((c) => (
              <Link key={c.id} href={`/comunidades/${c.slug}`} onClick={onNavigate} className="flex items-center gap-3 rounded-xl py-2 hover:bg-white/[0.03]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] text-white">{c.name}</span>
                  <span className="block text-[13px] text-white/45">{ROLE_LABEL[c.role] ?? "Membro"}</span>
                </span>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-space-card text-sm font-bold text-white/70">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UsersRound className="h-5 w-5" />
                  )}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {d.isMe && (
        <Link
          href="/configuracoes/conta"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/[0.06]"
        >
          <Gem className="h-4 w-4" /> Editar informações
        </Link>
      )}
    </div>
  );
}

/** Botão "Saber mais" que abre o painel com todas as informações. */
export function ProfileAboutButton({ d, className, children, title = "Saber mais" }: { d: AboutData; className?: string; children: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/60 backdrop-blur-[2px] md:items-center md:p-6" onClick={() => setOpen(false)} role="presentation">
            <div
              role="dialog"
              aria-label={title}
              onClick={(e) => e.stopPropagation()}
              className={clsx("animate-pop-in flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-space-surface shadow-2xl md:max-h-[85vh] md:rounded-3xl")}
            >
              <header className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-4">
                <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/5">
                  <X className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <ProfileAboutContent d={d} onNavigate={() => setOpen(false)} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
