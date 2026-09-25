"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { saveCover } from "@/lib/cover-upload";
import { CoverCropDialog } from "@/components/cover-crop-dialog";
import { normalizeUsername, usernameError } from "@/lib/username";
import { zodiacFor } from "@/lib/zodiac";
import { GENDER_OPTIONS, RELATIONSHIP_OPTIONS } from "@/lib/profile-options";
import {
  AtSign,
  Calendar,
  Camera,
  CheckCircle2,
  Heart,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  MapPin,
  PenLine,
  Plus,
  Shield,
  Star,
  User,
  X,
  XCircle,
} from "lucide-react";

const MAX_INTERESTS = 12;
const BIO_MAX = 160;
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type EditProfileInitial = {
  orbitId: string | null;
  name: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  isPrivate: boolean;
  location: string | null;
  website: string | null;
  interests: string[];
  birthDate: string | null;
  gender: string | null;
  relationshipStatus: string | null;
  showAge: boolean;
  showSign: boolean;
  showLocation: boolean;
  showInterests: boolean;
  showRelationship: boolean;
  hasProfileRow: boolean;
};

type UsernameState = "unchanged" | "invalid" | "checking" | "available" | "taken";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-orbit-purple/70";
const selectClass = `${inputClass} appearance-none pr-10`;
const dateSelectClass =
  "w-full appearance-none rounded-xl border border-white/10 bg-space-bg/60 py-3 pl-3 pr-7 text-sm text-white outline-none transition focus:border-orbit-purple/70";

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  desktopOnly = false,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  desktopOnly?: boolean;
}) {
  return (
    <div className={clsx("mb-4 items-start gap-2.5 lg:mb-5 lg:gap-3", desktopOnly ? "hidden lg:flex" : "flex")}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orbit-blue lg:h-6 lg:w-6" />
      <div>
        <h2 className="text-base font-semibold text-orbit-blue lg:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 hidden text-xs text-white/55 lg:block">{subtitle}</p>}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-space-surface/80 p-4 md:p-5">
      <SectionHeader title={title} subtitle={subtitle} icon={icon} />
      <div className="space-y-5 lg:space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  icon: Icon,
  stacked = false,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3",
        !stacked && "lg:grid-cols-[1.5rem_8.5rem_minmax(0,1fr)]"
      )}
    >
      <Icon className={clsx("mt-0.5 h-5 w-5 text-orbit-blue/80", !stacked && "lg:mt-3")} />
      <label className={clsx("mb-2 text-sm text-white/80", !stacked && "lg:mb-0 lg:mt-3")}>{label}</label>
      <div className={clsx("col-start-2", !stacked && "lg:col-start-3 lg:row-start-1")}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label, icon: Icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 shrink-0 text-orbit-blue/80" />
      <span className="flex-1 text-sm text-white/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-orbit-gradient" : "bg-white/15"
        )}
      >
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

function SelectWrap({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="relative">
      {children}
      <svg
        viewBox="0 0 20 20"
        className={clsx("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-white/50", compact ? "right-2" : "right-3.5")} fill="currentColor" aria-hidden>
        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
      </svg>
    </div>
  );
}

export function AccountSettingsForm({ userId, initial }: { userId: string; initial: EditProfileInitial }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial.name);
  const [username, setUsername] = useState(initial.username);
  const [usernameState, setUsernameState] = useState<UsernameState>("unchanged");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [interestDraft, setInterestDraft] = useState("");
  const [addingInterest, setAddingInterest] = useState(false);

  const [birthYear, birthMonth, birthDay] = (initial.birthDate ?? "").slice(0, 10).split("-");
  const [day, setDay] = useState(birthDay ? String(Number(birthDay)) : "");
  const [month, setMonth] = useState(birthMonth ? String(Number(birthMonth)) : "");
  const [year, setYear] = useState(birthYear ?? "");
  const [gender, setGender] = useState(initial.gender ?? "");
  const [relationship, setRelationship] = useState(initial.relationshipStatus ?? "");

  const [showAge, setShowAge] = useState(initial.showAge);
  const [showSign, setShowSign] = useState(initial.showSign);
  const [showLocation, setShowLocation] = useState(initial.showLocation);
  const [showInterests, setShowInterests] = useState(initial.showInterests);
  const [showRelationship, setShowRelationship] = useState(initial.showRelationship);
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);

  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeUsername(username);
  const formatError = normalized === initial.username ? null : usernameError(username, initial.orbitId);
  const profileUrlHost = typeof window === "undefined" ? "orbitax.social.br" : window.location.host;

  useEffect(() => {
    if (normalized === initial.username) {
      setUsernameState("unchanged");
      return;
    }
    if (formatError) {
      setUsernameState("invalid");
      return;
    }
    setUsernameState("checking");
    const handle = setTimeout(async () => {
      const { data, error: rpcError } = await supabase.rpc("username_available", { check_username: normalized });
      setUsernameState(rpcError ? "invalid" : data ? "available" : "taken");
    }, 400);
    return () => clearTimeout(handle);
  }, [normalized, formatError, initial.username, supabase]);

  const birthDate = useMemo(() => {
    if (!day || !month || !year) return null;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (d.getMonth() !== Number(month) - 1) return "invalid";
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }, [day, month, year]);
  const sign = birthDate && birthDate !== "invalid" ? zodiacFor(Number(month), Number(day)) : null;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 83 }, (_, i) => String(thisYear - 18 - i));

  async function uploadImage(kind: "avatar" | "cover", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Escolha um arquivo de imagem.");
    const limitMb = kind === "cover" ? 20 : 10;
    if (file.size > limitMb * 1024 * 1024) return setError(`A imagem precisa ter no máximo ${limitMb} MB.`);
    if (kind === "cover") {
      setError(null);
      setCoverFile(file);
      return;
    }

    setUploading(kind);
    setError(null);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(null);
      return setError("Não foi possível enviar a imagem.");
    }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("User")
      .update(kind === "avatar" ? { avatarUrl: pub.publicUrl } : { coverUrl: pub.publicUrl })
      .eq("id", userId);
    setUploading(null);
    if (updateError) return setError("Não foi possível salvar a imagem.");
    if (kind === "avatar") setAvatarUrl(pub.publicUrl);
    else setCoverUrl(pub.publicUrl);
    router.refresh();
  }

  async function applyCover(blob: Blob) {
    const url = await saveCover(userId, blob);
    setCoverUrl(url);
    setCoverFile(null);
    router.refresh();
  }

  function addInterest() {
    const value = interestDraft.replace(/,/g, " ").trim().slice(0, 30);
    setInterestDraft("");
    if (!value) return;
    setInterests((list) =>
      list.length >= MAX_INTERESTS || list.some((i) => i.toLowerCase() === value.toLowerCase()) ? list : [...list, value]
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);

    if (!name.trim()) return setError("Digite seu nome.");
    if (formatError) return setError(formatError);
    if (usernameState === "taken") return setError("Esse nome de usuário já está em uso.");
    if (usernameState === "checking") return setError("Aguarde a verificação do nome de usuário.");
    if (birthDate === "invalid") return setError("Data de nascimento inválida.");

    setSaving(true);
    const usernameChanged = normalized !== initial.username;

    const { error: userError } = await supabase
      .from("User")
      .update({
        name: name.trim(),
        bio: bio.trim() || null,
        isPrivate,
        ...(usernameChanged ? { username: normalized } : {}),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId);

    if (userError) {
      setSaving(false);
      if (userError.code === "23505") {
        setUsernameState("taken");
        return setError("Esse nome de usuário já está em uso.");
      }
      return setError(userError.code === "23514" ? userError.message : "Não foi possível salvar. Tente novamente.");
    }

    const profileFields = {
      location: location.trim() || null,
      website: website.trim() || null,
      interests: interests.length ? interests.join(", ") : null,
      gender: gender || null,
      relationshipStatus: relationship || null,
      ...(birthDate ? { birthDate } : {}),
      showAge,
      showSign,
      showLocation,
      showInterests,
      showRelationship,
      updatedAt: new Date().toISOString(),
    };

    const { error: profileError } = initial.hasProfileRow
      ? await supabase.from("Profile").update(profileFields).eq("userId", userId)
      : await supabase.from("Profile").insert({ id: crypto.randomUUID(), userId, ...profileFields });

    setSaving(false);
    if (profileError) {
      return setError(profileError.code === "23514" ? profileError.message : "Não foi possível salvar. Tente novamente.");
    }

    if (usernameChanged) {
      window.location.href = `/perfil/${normalized}`;
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const usernameHint = {
    unchanged: null,
    checking: <span className="text-white/50">Verificando disponibilidade...</span>,
    available: <span className="text-emerald-400">Disponível</span>,
    taken: <span className="text-red-400">Esse nome de usuário já está em uso.</span>,
    invalid: <span className="text-red-400">{formatError}</span>,
  }[usernameState];

  return (
    <form
      onSubmit={save}
      className="pb-6 lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:items-start lg:gap-5"
    >
      <div className="lg:space-y-5">
      <section className="rounded-t-2xl border border-b-0 border-white/10 bg-space-surface/80 lg:rounded-2xl lg:border-b lg:p-5">
        <SectionHeader title="Foto e capa" subtitle="Personalize sua capa e foto de perfil" icon={ImagePlus} desktopOnly />
        <div className="relative aspect-[8/3] overflow-hidden rounded-t-2xl lg:rounded-xl">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center border-b border-dashed border-white/15 bg-gradient-to-br from-orbit-blue/10 via-space-card to-orbit-purple/10 text-xs text-white/50">
              Nenhuma capa ainda
            </div>
          )}
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            disabled={uploading !== null}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-xl border border-white/15 bg-space-bg/80 px-3.5 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-space-bg"
          >
            {uploading === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {coverUrl ? "Trocar capa" : "Adicionar capa"}
          </button>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => uploadImage("cover", e)} />
          {coverFile && <CoverCropDialog file={coverFile} onCancel={() => setCoverFile(null)} onConfirm={applyCover} />}
        </div>

        <div className="flex items-end gap-4 px-4 pb-2 lg:-mt-20 lg:px-3 lg:pb-0">
          <div className="relative -mt-12 shrink-0 lg:mt-0">
            <div className="h-28 w-28 rounded-full lg:h-36 lg:w-36 bg-[conic-gradient(from_210deg,#2b6cff,#8b5cf6,#ec4899,#22d3ee,#2b6cff)] p-[3px]">
              <div className="flex h-full w-full items-end justify-center overflow-hidden rounded-full border-4 border-space-bg bg-space-card">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <User className="mb-3 h-14 w-14 text-orbit-blue/60" />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              disabled={uploading !== null}
              aria-label="Trocar foto de perfil"
              className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-orbit-gradient text-white shadow-glow"
            >
              {uploading === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => uploadImage("avatar", e)} />
          </div>
          <div className="pb-2 lg:hidden">
            <p className="text-sm font-medium text-white">Foto de perfil</p>
            <p className="text-xs text-white/50">Toque para trocar sua foto</p>
          </div>
        </div>

      </section>

      <section className="rounded-b-2xl border border-t-0 border-white/10 bg-space-surface/80 lg:rounded-2xl lg:border-t">
        <div className="space-y-5 p-4 md:p-5 lg:space-y-4">
          <SectionHeader
            title="Informações básicas"
            subtitle="Seu nome, nome de usuário e uma breve descrição sobre você."
            icon={User}
            desktopOnly
          />
          <Field label="Nome" icon={User}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
          </Field>

          <Field label="Nome de usuário" icon={AtSign}>
            <div className="relative">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={31}
                className={clsx(inputClass, "pr-11")}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {usernameState === "checking" && <Loader2 className="h-5 w-5 animate-spin text-white/50" />}
                {(usernameState === "available" || usernameState === "unchanged") && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {(usernameState === "taken" || usernameState === "invalid") && <XCircle className="h-5 w-5 text-red-400" />}
              </span>
            </div>
            <p className="mt-2 break-all text-xs text-orbit-blue">
              https://{profileUrlHost}/@{normalized || initial.username}
            </p>
            <p className="mt-1.5 text-xs text-white/50">
              {usernameHint ?? "Você pode alterar seu nome de usuário. Ele precisa ser único."}
            </p>
          </Field>

          <Field label="Bio" icon={PenLine}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              rows={3}
              placeholder="Conte um pouco sobre você..."
              className={clsx(inputClass, "resize-none")}
            />
            <p className="mt-1 text-right text-xs text-white/40">
              {bio.length}/{BIO_MAX}
            </p>
          </Field>

          <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          <Field label="Cidade" icon={MapPin} stacked>
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Ex.: Aracaju, Sergipe, Brasil" className={inputClass} />
          </Field>

          <Field label="Link" icon={Link2} stacked>
            <div className="relative">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} placeholder="Ex.: linktr.ee/seunome" className={clsx(inputClass, "pr-10")} />
              {website && (
                <button
                  type="button"
                  onClick={() => setWebsite("")}
                  aria-label="Limpar link"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-0.5 text-white/70 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </Field>

          </div>

          <Field label="Interesses" icon={Star} stacked>
            <div className="flex flex-wrap gap-2">
              {interests.map((i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-full border border-orbit-purple/60 bg-orbit-purple/10 px-3 py-1.5 text-xs text-white/90">
                  {i}
                  <button type="button" onClick={() => setInterests((l) => l.filter((x) => x !== i))} aria-label={`Remover ${i}`} className="text-white/60 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {interests.length < MAX_INTERESTS &&
                (addingInterest ? (
                  <input
                    autoFocus
                    value={interestDraft}
                    onChange={(e) => setInterestDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInterest();
                      }
                      if (e.key === "Escape") setAddingInterest(false);
                    }}
                    onBlur={() => {
                      addInterest();
                      setAddingInterest(false);
                    }}
                    placeholder="Digite e pressione Enter"
                    className="w-48 rounded-full border border-orbit-purple/60 bg-space-bg/60 px-3 py-1.5 text-xs text-white outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingInterest(true)}
                    className="flex items-center gap-1.5 rounded-full border border-orbit-purple/60 px-3 py-1.5 text-xs text-white/85 transition hover:bg-orbit-purple/10"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar interesse
                  </button>
                ))}
            </div>
          </Field>
        </div>
      </section>
      </div>

      <div className="mt-4 space-y-4 lg:mt-0">
      <Section title="Informações pessoais" subtitle="Estas informações ajudam outras pessoas a te conhecerem." icon={User}>
        <Field label="Data de nascimento" icon={Calendar} stacked>
          <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_5.75rem] gap-2">
            <SelectWrap compact>
              <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="Dia" className={dateSelectClass}>
                <option value="">Dia</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                  <option key={d} value={d}>{d.padStart(2, "0")}</option>
                ))}
              </select>
            </SelectWrap>
            <SelectWrap compact>
              <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mês" className={dateSelectClass}>
                <option value="">Mês</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </SelectWrap>
            <SelectWrap compact>
              <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Ano" className={dateSelectClass}>
                <option value="">Ano</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </SelectWrap>
          </div>
          <p className="mt-2 text-xs text-white/50">
            {showAge ? "Sua idade será exibida no seu perfil." : "Sua idade não será exibida publicamente."}
          </p>
        </Field>

        <Field label="Signo" icon={Star}>
          <div className={clsx(inputClass, "text-white/80")}>{sign ?? "Preencha a data de nascimento"}</div>
          <p className="mt-2 text-xs text-white/50">Calculado automaticamente pela data de nascimento.</p>
        </Field>

        <Field label="Gênero" icon={User}>
          <SelectWrap>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
              <option value="">Não informar</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </SelectWrap>
        </Field>
      </Section>

      <Section title="Relacionamento" subtitle="Defina seu status de relacionamento." icon={Heart}>
        <Field label="Status de relacionamento" icon={User}>
          <SelectWrap>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className={selectClass}>
              <option value="">Não informar</option>
              {RELATIONSHIP_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </SelectWrap>
        </Field>
      </Section>

      <Section title="Privacidade" subtitle="Escolha o que será exibido no seu perfil." icon={Shield}>
        <div className="space-y-4">
          <Toggle label="Mostrar minha idade no perfil" icon={Calendar} checked={showAge} onChange={setShowAge} />
          <Toggle label="Mostrar meu signo no perfil" icon={Star} checked={showSign} onChange={setShowSign} />
          <Toggle label="Mostrar minha cidade no perfil" icon={MapPin} checked={showLocation} onChange={setShowLocation} />
          <Toggle label="Mostrar meus interesses no perfil" icon={Heart} checked={showInterests} onChange={setShowInterests} />
          <Toggle label="Mostrar meu relacionamento no perfil" icon={Heart} checked={showRelationship} onChange={setShowRelationship} />
          <Toggle label="Conta privada (apenas seguidores aprovados)" icon={Lock} checked={isPrivate} onChange={setIsPrivate} />
        </div>
      </Section>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Alterações salvas.
        </p>
      )}

      <button
        type="submit"
        disabled={saving || uploading !== null}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orbit-gradient py-3.5 text-base font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-5 w-5 animate-spin" />}
        {saving ? "Salvando..." : "Salvar alterações"}
      </button>
      </div>
    </form>
  );
}
