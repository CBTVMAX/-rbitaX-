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

const FRAMES = [
  { name: "Padrão", free: true, ring: "border-2 border-white/40" },
  { name: "Neon", free: true, ring: "border-2 border-[#2b6cff] shadow-[0_0_14px_#2b6cff]" },
  { name: "Cristal", free: false, ring: "border-[3px] border-dotted border-[#a5b4fc] shadow-[0_0_12px_#818cf8]" },
  { name: "Fogo", free: false, ring: "border-[3px] border-[#f97316] shadow-[0_0_16px_#ef4444]" },
  { name: "Galáxia", free: false, ring: "border-[3px] border-[#8b5cf6] shadow-[0_0_16px_#6366f1]" },
  { name: "Coração", free: false, ring: "border-[3px] border-[#ec4899] shadow-[0_0_16px_#ec4899]" },
  { name: "Dragão", free: false, ring: "border-[3px] border-double border-[#dc2626] shadow-[0_0_14px_#dc2626]" },
  { name: "Lobo", free: false, ring: "border-[3px] border-dashed border-[#60a5fa] shadow-[0_0_14px_#3b82f6]" },
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
function Preview({ color, props }: { color: string; props: Props }) {
  const accent = color !== DEFAULT_PROFILE_COLOR;
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
        <div
          className={clsx(
            "relative -mt-10 h-20 w-20 rounded-full p-[3px]",
            accent
              ? "bg-pa shadow-[0_0_24px_rgb(var(--pa)/0.6)]"
              : "bg-[conic-gradient(from_210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)] shadow-[0_0_24px_rgba(139,92,246,0.45)]"
          )}
        >
          <div className="flex h-full w-full items-end justify-center overflow-hidden rounded-full border-[3px] border-space-surface bg-space-card">
            {props.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Silhouette className="h-[78%] w-[78%] text-orbit-blue/55" />
            )}
          </div>
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

export function ProfileCustomizer(props: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(props.initialColor);
  const [color, setColor] = useState(props.initialColor);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const customRef = useRef<HTMLInputElement>(null);

  const isCustom = color.startsWith("#");
  const dirty = color !== saved;
  const customHex = useMemo(() => (isCustom ? color : profileColorHex(color)), [color, isCustom]);

  async function apply() {
    if (!isValidProfileColor(color)) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("User")
      .update({ profileColor: color, updatedAt: new Date().toISOString() })
      .eq("id", props.userId);
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: "Não foi possível aplicar agora. Tente novamente." });
      return;
    }
    setSaved(color);
    setMessage({ ok: true, text: "Pronto! Seu perfil já está com a nova cor." });
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
          <Preview color={color} props={props} />
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

        <Block step={4} title="Molduras de avatar" pill={<Pill tone="soon">Em breve</Pill>} subtitle="Destaque sua foto com uma moldura.">
          <div className="orbit-scrollbar flex gap-2 overflow-x-auto pb-1">
            {FRAMES.map(({ name, free, ring }, i) => (
              <div
                key={name}
                title={i === 0 ? "Em uso" : "Em breve"}
                className={clsx(
                  "flex w-[4.75rem] shrink-0 cursor-default flex-col items-center gap-1.5 rounded-xl border p-2.5",
                  i === 0 ? "border-orbit-purple/60 bg-orbit-purple/10" : "border-white/10 bg-space-bg/40"
                )}
              >
                <span className="relative">
                  <span className={clsx("block h-11 w-11 rounded-full", ring)} />
                  {!free && <Crown className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-amber-400" />}
                </span>
                <span className="text-[11px] text-white/75">{name}</span>
                <span className={clsx("text-[10px]", i === 0 ? "text-orbit-purple" : free ? "text-emerald-400" : "text-amber-400")}>
                  {i === 0 ? "Em uso" : free ? "Grátis" : "Premium"}
                </span>
              </div>
            ))}
          </div>
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
        <Preview color={color} props={props} />
        {applyButton("w-full")}
        {feedback}
        <Link href={`/perfil/${props.username}`} className="block text-center text-xs text-orbit-blue hover:underline">
          Ver meu perfil
        </Link>
      </aside>
    </div>
  );
}
