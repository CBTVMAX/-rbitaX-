"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  BadgeCheck,
  Bike,
  Camera,
  Check,
  Crown,
  Droplet,
  Flame,
  Gamepad2,
  Heart,
  ImagePlus,
  Loader2,
  Lock,
  Moon,
  Mountain,
  PawPrint,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProfileImageUpload } from "@/components/profile-client";
import {
  AVATAR_FRAMES,
  FRAME_TIERS,
  canEquipFrame,
  frameBackdropStyle,
  frameSrc,
  getFrame,
  type FrameTier,
} from "@/lib/avatar-frames";
import {
  DEFAULT_PROFILE_COLOR,
  PROFILE_COLORS,
  hexToChannels,
  isValidProfileColor,
  profileColorHex,
} from "@/lib/profile-colors";

type Props = {
  userId: string;
  name: string;
  username: string;
  bio: string | null;
  isVerified: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
  initialColor: string;
  initialFrame: string | null;
};

const GRADIENTS = [
  "linear-gradient(135deg,#2b6cff,#8b5cf6)",
  "linear-gradient(135deg,#8b5cf6,#ec4899)",
  "linear-gradient(135deg,#22d3ee,#2b6cff)",
  "linear-gradient(135deg,#ec4899,#f97316)",
  "linear-gradient(135deg,#22c55e,#22d3ee)",
  "linear-gradient(135deg,#d946ef,#2b6cff)",
];

const THEMES = [
  { name: "Galaxy Purple", icon: Moon, bg: "linear-gradient(135deg,#1e1048,#6d28d9 60%,#a855f7)" },
  { name: "Cyber Neon", icon: Zap, bg: "linear-gradient(135deg,#0f172a,#0891b2 55%,#db2777)" },
  { name: "Dark Wolf", icon: PawPrint, bg: "linear-gradient(135deg,#0b0b14,#312e81 60%,#7c3aed)" },
  { name: "Aurora", icon: Mountain, bg: "linear-gradient(135deg,#052e2b,#059669 50%,#6366f1)" },
  { name: "Dragon", icon: Flame, bg: "linear-gradient(135deg,#1c0505,#b91c1c 60%,#f97316)" },
  { name: "Vampire", icon: Droplet, bg: "linear-gradient(135deg,#12030a,#7f1d1d 55%,#be123c)" },
  { name: "Space", icon: Rocket, bg: "linear-gradient(135deg,#020617,#1d4ed8 60%,#38bdf8)" },
  { name: "Moto", icon: Bike, bg: "linear-gradient(135deg,#0c0a09,#44403c 55%,#ea580c)" },
  { name: "Gamer", icon: Gamepad2, bg: "linear-gradient(135deg,#0f0726,#7c3aed 55%,#22d3ee)" },
  { name: "Romântico", icon: Heart, bg: "linear-gradient(135deg,#2a0716,#be185d 55%,#f472b6)" },
];


const EFFECTS = ["Estrelas", "Partículas", "Aurora", "Fumaça", "Energia Neon"];
const BADGES = ["Astronauta", "Planetas", "Asas", "Coroa"];

function Pill({ children, tone }: { children: React.ReactNode; tone: "free" | "premium" | "soon" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "free" && "bg-emerald-500/15 text-emerald-400",
        tone === "premium" && "bg-amber-400/15 text-amber-400",
        tone === "soon" && "bg-white/10 text-white/55"
      )}
    >
      {tone === "premium" && <Crown className="h-3 w-3" />}
      {children}
    </span>
  );
}

function Block({
  step,
  title,
  pill,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  pill?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="font-display text-base font-bold text-white/40">{step}.</span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {pill}
        {subtitle && <p className="w-full text-xs text-white/55">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Silhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="24" r="12" fill="currentColor" />
      <path d="M10 58c2-12 11-19 22-19s20 7 22 19" fill="currentColor" />
    </svg>
  );
}

/** Live preview of the profile header with the selected color (same rules as the real profile). */
function Preview({ color, frameId, props }: { color: string; frameId: string | null; props: Props }) {
  const accent = color !== DEFAULT_PROFILE_COLOR;
  const frame = getFrame(frameId);
  const style = accent ? ({ ["--pa" as string]: hexToChannels(profileColorHex(color)) } as React.CSSProperties) : undefined;

  return (
    <div style={style} className={clsx("overflow-hidden rounded-2xl border bg-space-surface", accent ? "border-pa/50 shadow-[0_0_36px_rgb(var(--pa)/0.18)]" : "border-white/10")}>
      <div className="relative aspect-[8/3]">
        {props.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className={clsx(
              "h-full bg-gradient-to-br",
              accent ? "from-pa/35 via-space-card to-pa/15" : "from-orbit-blue/25 via-space-card to-orbit-purple/25"
            )}
          />
        )}
      </div>
      <div className="px-4 pb-4">
        <div className={clsx("relative h-20 w-20", frame ? "-mt-8 mb-6 ml-4" : "-mt-10")}>
          {frame && <div aria-hidden className="pointer-events-none absolute -inset-[30%]" style={frameBackdropStyle(frame)} />}
          <div
            className={clsx(
              "relative h-full w-full rounded-full",
              !frame && "p-[3px]",
              !frame &&
                (accent
                  ? "bg-pa shadow-[0_0_24px_rgb(var(--pa)/0.6)]"
                  : "bg-[conic-gradient(from_210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)] shadow-[0_0_24px_rgba(139,92,246,0.45)]")
            )}
          >
            <div
              className={clsx(
                "flex h-full w-full items-end justify-center overflow-hidden rounded-full bg-space-card",
                !frame && "border-[3px] border-space-surface"
              )}
            >
              {props.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={props.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
              )}
            </div>
          </div>
          {frame && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={frameSrc(frame.id)} alt="" aria-hidden className="pointer-events-none absolute -inset-[30%] h-[160%] w-[160%] max-w-none" />
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <p className="truncate font-display text-lg font-bold text-white">{props.name}</p>
          {props.isVerified && <BadgeCheck className={clsx("h-4 w-4 shrink-0", accent ? "text-pa" : "text-orbit-blue")} />}
        </div>
        <p className="text-xs text-white/60">@{props.username}</p>
        {props.bio && <p className="mt-2 line-clamp-2 text-xs text-white/75">{props.bio}</p>}
        <div className="mt-3 grid grid-cols-3 text-center">
          {["Seguidores", "Seguindo", "Publicações"].map((l) => (
            <div key={l}>
              <p className="text-sm font-bold text-white">0</p>
              <p className="text-[10px] text-white/55">{l}</p>
            </div>
          ))}
        </div>
        <div
          className={clsx(
            "mt-3 rounded-xl py-2 text-center text-xs font-semibold",
            accent ? "border border-pa bg-pa/15 text-white shadow-[0_0_18px_rgb(var(--pa)/0.35)]" : "bg-orbit-gradient text-snow"
          )}
        >
          Editar perfil
        </div>
        <div className="mt-3 flex gap-4 border-b border-white/10 text-xs">
          {["Posts", "Mídia", "Sobre", "Amigos"].map((t, i) => (
            <span key={t} className={clsx("relative pb-2", i === 0 ? "font-semibold text-white" : "text-white/55")}>
              {t}
              {i === 0 && (
                <span className={clsx("absolute inset-x-0 bottom-0 h-[2px] rounded-full", accent ? "bg-pa" : "bg-orbit-gradient")} />
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const TIER_ORDER: FrameTier[] = ["gratuita", "rara", "epica", "mistica", "lendaria", "fantasia", "heroica", "magica"];

function FrameCatalog({
  avatarUrl,
  selected,
  onSelect,
}: {
  avatarUrl: string | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [tier, setTier] = useState<FrameTier>(() => getFrame(selected)?.tier ?? "gratuita");
  const frames = AVATAR_FRAMES.filter((f) => f.tier === tier);
  const free = FRAME_TIERS[tier].free;

  const photo = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <Silhouette className="h-[78%] w-[78%] text-[#2b6cff]/55" />
  );
  const avatar = (
    <span className="absolute inset-[18.75%] flex items-end justify-center overflow-hidden rounded-full bg-[#11152a]">
      {photo}
    </span>
  );

  return (
    <div>
      <div className="orbit-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Coleções de molduras">
        {TIER_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tier === t}
            onClick={() => setTier(t)}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
              tier === t ? "border-orbit-purple bg-orbit-purple/15 text-white" : "border-white/10 text-white/60 hover:text-white"
            )}
          >
            {!FRAME_TIERS[t].free && <Lock className="h-3 w-3 opacity-70" />}
            {FRAME_TIERS[t].label}
          </button>
        ))}
      </div>

      {!free && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/90">
          <Crown className="h-4 w-4 shrink-0 text-amber-400" />
          Coleção {FRAME_TIERS[tier].label.toLowerCase()}: disponível em breve com as Órbita Coins.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
        {free && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={selected === null}
            className={clsx(
              "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition",
              selected === null ? "border-orbit-purple bg-orbit-purple/10" : "border-white/10 hover:border-white/25"
            )}
          >
            <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-[#0b0e1c]">
              <span className="absolute inset-[18.75%] rounded-full bg-[conic-gradient(from_210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)] p-[3px]">
                <span className="flex h-full w-full items-end justify-center overflow-hidden rounded-full border-2 border-[#0b0e1c] bg-[#11152a]">
                  {photo}
                </span>
              </span>
            </span>
            <span className="w-full truncate text-center text-[11px] font-medium text-white/85">Sem moldura</span>
            <span className="text-[10px] text-white/45">Anel padrão</span>
          </button>
        )}
        {frames.map((f) => {
          const isSel = selected === f.id;
          return (
            <button
              key={f.id}
              type="button"
              title={free ? f.tagline : `${f.tagline} · Em breve`}
              onClick={() => free && onSelect(f.id)}
              aria-pressed={isSel}
              aria-disabled={!free}
              className={clsx(
                "group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition",
                isSel ? "border-orbit-purple bg-orbit-purple/10 shadow-[0_0_18px_rgba(139,92,246,0.3)]" : "border-white/10",
                free ? "hover:border-white/25" : "cursor-default"
              )}
            >
              <span className="relative block aspect-square w-full overflow-hidden rounded-lg bg-[#0b0e1c]">
                {avatar}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frameSrc(f.id, true)} alt="" loading="lazy" className="absolute inset-0 h-full w-full" />
                {!free && (
                  <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/80">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
                {isSel && (
                  <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-orbit-gradient text-snow">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[11px] font-medium text-white/85">{f.name}</span>
              <span className={clsx("rounded-full border px-2 py-px text-[9px] font-semibold uppercase tracking-wide", FRAME_TIERS[f.tier].className)}>
                {free ? (isSel ? "Em uso" : "Grátis") : FRAME_TIERS[f.tier].badge}
              </span>
              {f.price && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-200 to-amber-500" />
                  {f.price.toLocaleString("pt-BR")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProfileCustomizer(props: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState({ color: props.initialColor, frame: props.initialFrame });
  const [color, setColor] = useState(props.initialColor);
  const [frameId, setFrameId] = useState<string | null>(props.initialFrame);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const customRef = useRef<HTMLInputElement>(null);

  const isCustom = color.startsWith("#");
  const dirty = color !== saved.color || frameId !== saved.frame;
  const customHex = useMemo(() => (isCustom ? color : profileColorHex(color)), [color, isCustom]);

  async function apply() {
    if (!isValidProfileColor(color) || (frameId && !canEquipFrame(frameId))) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("User")
      .update({ profileColor: color, avatarFrame: frameId, updatedAt: new Date().toISOString() })
      .eq("id", props.userId);
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: "Não foi possível aplicar agora. Tente novamente." });
      return;
    }
    setSaved({ color, frame: frameId });
    setMessage({ ok: true, text: "Pronto! Seu perfil já está atualizado." });
    router.refresh();
  }

  const applyButton = (extra: string) => (
    <button
      type="button"
      onClick={apply}
      disabled={!dirty || saving}
      className={clsx(
        "flex items-center justify-center gap-2 rounded-xl bg-orbit-gradient py-3 text-sm font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:cursor-default disabled:opacity-50",
        extra
      )}
    >
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {saving ? "Aplicando..." : dirty ? "Aplicar no meu perfil" : "Aplicado no seu perfil"}
    </button>
  );

  const feedback = message && (
    <p className={clsx("text-center text-xs", message.ok ? "text-emerald-400" : "text-red-400")}>{message.text}</p>
  );

  const swatch = "relative flex h-11 w-11 items-center justify-center rounded-full transition md:h-12 md:w-12";
  const selectedRing = "ring-2 ring-white ring-offset-2 ring-offset-space-surface";

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-5">
      <div className="space-y-4">
        {/* Mobile preview */}
        <div className="lg:hidden">
          <p className="mb-2 px-1 text-xs font-medium text-white/55">Pré-visualização</p>
          <Preview color={color} frameId={frameId} props={props} />
        </div>

        <Block step={1} title="Cor do perfil" pill={<Pill tone="free">Gratuito</Pill>} subtitle="Escolha a cor que combina com você. Ela aparece para todos que visitam seu perfil.">
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 md:grid-cols-6 xl:grid-cols-11">
            {PROFILE_COLORS.map((c) => {
              const selected = color === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  aria-pressed={selected}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={clsx(swatch, selected && selectedRing)}
                    style={{
                      background:
                        c.id === DEFAULT_PROFILE_COLOR
                          ? "conic-gradient(from 210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)"
                          : c.hex,
                      boxShadow: `0 0 16px ${c.hex}66`,
                    }}
                  >
                    {selected && <Check className="h-5 w-5 text-snow drop-shadow" />}
                  </span>
                  <span className={clsx("text-[11px]", selected ? "font-semibold text-white" : "text-white/60")}>{c.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => customRef.current?.click()}
              aria-pressed={isCustom}
              className="relative flex flex-col items-center gap-1.5"
            >
              <span
                className={clsx(swatch, isCustom && selectedRing)}
                style={{
                  background: isCustom
                    ? color
                    : "conic-gradient(#ef4444,#f97316,#eab308,#22c55e,#22d3ee,#2b6cff,#8b5cf6,#ec4899,#ef4444)",
                }}
              >
                {isCustom && <Check className="h-5 w-5 text-snow drop-shadow" />}
              </span>
              <span className={clsx("text-[11px]", isCustom ? "font-semibold text-white" : "text-white/60")}>Personalizada</span>
              <input
                ref={customRef}
                type="color"
                value={customHex}
                onChange={(e) => setColor(e.target.value.toLowerCase())}
                className="pointer-events-none absolute left-1/2 top-0 h-0 w-0 opacity-0"
                aria-label="Escolher cor personalizada"
                tabIndex={-1}
              />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <span className="text-xs font-medium text-white/70">Gradiente</span>
            <Pill tone="premium">Premium</Pill>
            <div className="flex flex-wrap gap-2">
              {GRADIENTS.map((g) => (
                <span key={g} title="Em breve" className="relative h-8 w-8 cursor-default rounded-full opacity-70" style={{ background: g }}>
                  <Lock className="absolute inset-0 m-auto h-3.5 w-3.5 text-snow/90" />
                </span>
              ))}
            </div>
            <Pill tone="soon">Em breve</Pill>
          </div>
        </Block>

        <Block step={2} title="Capa e foto" pill={<Pill tone="free">Gratuito</Pill>} subtitle="A capa pode ser qualquer imagem. Antes de aplicar, você ajusta o enquadramento.">
          <div className="grid gap-2 sm:grid-cols-2">
            <ProfileImageUpload
              userId={props.userId}
              field="coverUrl"
              ariaLabel="Alterar capa"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 px-4 py-3 text-left text-sm text-white transition hover:border-orbit-purple/50"
            >
              <ImagePlus className="h-5 w-5 text-orbit-blue" /> Alterar capa
            </ProfileImageUpload>
            <ProfileImageUpload
              userId={props.userId}
              field="avatarUrl"
              ariaLabel="Alterar foto"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/40 px-4 py-3 text-left text-sm text-white transition hover:border-orbit-purple/50"
            >
              <Camera className="h-5 w-5 text-orbit-blue" /> Alterar foto de perfil
            </ProfileImageUpload>
          </div>
        </Block>

        <Block step={3} title="Temas de aparência" pill={<><Pill tone="premium">Premium</Pill><Pill tone="soon">Em breve</Pill></>} subtitle="Transforme seu perfil com temas completos. O tema do perfil é independente do modo claro ou escuro do aplicativo.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {THEMES.map(({ name, icon: Icon, bg }) => (
              <div key={name} title="Em breve" className="relative aspect-[4/3] cursor-default overflow-hidden rounded-xl border border-white/10" style={{ background: bg }}>
                <Icon className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 text-snow/25" />
                <Crown className="absolute right-2 top-2 h-4 w-4 text-amber-400" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-5 text-xs font-semibold text-snow">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </Block>

        <Block
          step={4}
          title="Molduras de avatar"
          pill={<Pill tone="free">Gratuitas liberadas</Pill>}
          subtitle="Destaque sua foto com uma moldura. As coleções especiais chegam com as Órbita Coins."
        >
          <FrameCatalog avatarUrl={props.avatarUrl} selected={frameId} onSelect={setFrameId} />
        </Block>

        <Block step={5} title="Efeitos, decorativos e badges" pill={<><Pill tone="premium">Premium</Pill><Pill tone="soon">Em breve</Pill></>}>
          <div className="flex flex-wrap gap-2">
            {EFFECTS.map((e) => (
              <span key={e} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-space-bg/40 px-3 py-1.5 text-xs text-white/65">
                <Sparkles className="h-3.5 w-3.5 text-orbit-purple" /> {e}
              </span>
            ))}
            {BADGES.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-space-bg/40 px-3 py-1.5 text-xs text-white/65">
                <Crown className="h-3.5 w-3.5 text-amber-400" /> {b}
              </span>
            ))}
          </div>
        </Block>

        {/* Mobile apply bar: appears once something changed */}
        {(dirty || saving || message) && (
          <div className="sticky bottom-20 z-10 space-y-2 rounded-2xl border border-white/10 bg-space-surface/95 p-3 shadow-2xl backdrop-blur lg:hidden">
            {applyButton("w-full")}
            {feedback}
          </div>
        )}
      </div>

      {/* Desktop preview */}
      <aside className="sticky top-20 hidden space-y-3 lg:block">
        <p className="px-1 text-xs font-medium text-white/55">Pré-visualização</p>
        <Preview color={color} frameId={frameId} props={props} />
        {applyButton("w-full")}
        {feedback}
        <Link href={`/perfil/${props.username}`} className="block text-center text-xs text-orbit-blue hover:underline">
          Ver meu perfil
        </Link>
      </aside>
    </div>
  );
}
