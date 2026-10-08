"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { verifyUpload } from "@/lib/upload-guard";
import { createClient } from "@/lib/supabase/client";
import { saveCover } from "@/lib/cover-upload";
import { saveAvatar } from "@/lib/avatar-upload";
import { AvatarEditor } from "@/components/avatar-editor";
import { isRectangularAvatar } from "@/lib/avatar-aspect";
import { CoverCropDialog } from "@/components/cover-crop-dialog";
import { normalizeUsername, usernameError } from "@/lib/username";
import { zodiacFor } from "@/lib/zodiac";
import { GENDER_OPTIONS, PARTNER_STATUSES, partnerRelation, RELATIONSHIP_OPTIONS, type ProfileAbout } from "@/lib/profile-options";
import { PartnerPicker, type PartnerChoice } from "@/components/profile-edit/partner-picker";
import { AboutMeSection, CareerSection, CharacterSection, EducationSection, FavoritesSection, LifeSection, OriginSection } from "@/components/profile-edit/about-sections";
import { dateSelectClass, Field, inputClass, Section, SectionHeader, selectClass, SelectWrap, Toggle } from "@/components/profile-edit/form-ui";
import {
  AtSign,
  Calendar,
  Camera,
  CheckCircle2,
  Heart,
  ChevronRight,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  PenLine,
  Plus,
  Shield,
  Star,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";

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
  familyVisibility: string;
  hasProfileRow: boolean;
  /** Parceiro atual (vínculo Cônjuge/Companheiro(a)), confirmado ou aguardando. */
  partner: (PartnerChoice & { relation: string }) | null;
  about: ProfileAbout;
};

type UsernameState = "unchanged" | "invalid" | "checking" | "available" | "taken";

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
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [interestDraft, setInterestDraft] = useState("");
  const [addingInterest, setAddingInterest] = useState(false);

  const [birthYear, birthMonth, birthDay] = (initial.birthDate ?? "").slice(0, 10).split("-");
  const [day, setDay] = useState(birthDay ? String(Number(birthDay)) : "");
  const [month, setMonth] = useState(birthMonth ? String(Number(birthMonth)) : "");
  const [year, setYear] = useState(birthYear ?? "");
  const [gender, setGender] = useState(initial.gender ?? "");
  const [relationship, setRelationship] = useState(initial.relationshipStatus ?? "");
  const [familyVisibility, setFamilyVisibility] = useState(initial.familyVisibility ?? "all");
  const [partner, setPartner] = useState<PartnerChoice | null>(initial.partner);
  const [about, setAboutState] = useState<ProfileAbout>(initial.about);
  const setAbout = (patch: Partial<ProfileAbout>) => setAboutState((a) => ({ ...a, ...patch }));
  const wantsPartner = PARTNER_STATUSES.includes(relationship);

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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
    setError(null);
    try {
      await verifyUpload(file, ["image"], file.name);
    } catch (e) {
      return setError(e instanceof Error ? e.message : "Imagem inválida.");
    }
    // Both go through an editor, so the framing is the user's choice.
    if (kind === "cover") setCoverFile(file);
    else setAvatarFile(file);
  }

  async function applyAvatar(blob: Blob, ratio: number) {
    const url = await saveAvatar(userId, blob, ratio);
    setAvatarUrl(url);
    setAvatarFile(null);
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
      // O campo Link saiu do perfil: o link antigo é apagado ao salvar.
      website: null,
      interests: interests.length ? interests.join(", ") : null,
      gender: gender || null,
      relationship: relationship || null,
      ...(birthDate ? { birthDate } : {}),
      showAge,
      showSign,
      showLocation,
      showInterests,
      showRelationship,
      familyVisibility,
      updatedAt: new Date().toISOString(),
    };

    const { error: profileError } = initial.hasProfileRow
      ? await supabase.from("Profile").update(profileFields).eq("userId", userId)
      : await supabase.from("Profile").insert({ id: crypto.randomUUID(), userId, ...profileFields });

    if (profileError) {
      setSaving(false);
      return setError(profileError.code === "23514" ? profileError.message : "Não foi possível salvar. Tente novamente.");
    }

    const { error: aboutError } = await supabase.rpc("save_profile_about", { p: about as never });
    if (aboutError) {
      setSaving(false);
      return setError("Não foi possível salvar as informações adicionais. Tente novamente.");
    }

    // Parceiro: troca, remove ou pede confirmação (o vínculo só aparece depois que a pessoa aceita).
    const desired = wantsPartner ? partner : null;
    const before = initial.partner;
    if (before && before.id !== desired?.id) await supabase.rpc("family_remove", { p_relative_id: before.id });
    if (desired) {
      const relation = partnerRelation(relationship);
      if (!before || before.id !== desired.id) {
        const { error: partnerError } = await supabase.rpc("family_add", { p_relative_id: desired.id, p_relation: relation });
        if (partnerError) {
          setSaving(false);
          return setError(
            /blocked/.test(partnerError.message) ? "Não foi possível indicar essa pessoa como parceiro(a)." : "Perfil salvo, mas o pedido ao parceiro(a) não foi enviado. Tente de novo."
          );
        }
      } else if (before.relation !== relation) {
        if (before.status === "accepted") await supabase.rpc("family_update_relation", { p_relative_id: desired.id, p_relation: relation });
        else await supabase.rpc("family_add", { p_relative_id: desired.id, p_relation: relation });
      }
    }
    setSaving(false);

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
        <div className="relative aspect-[7/2] overflow-hidden rounded-t-2xl lg:rounded-xl">
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

        <div className="flex items-end gap-4 px-4 pb-2 lg:-mt-[80px] lg:px-3 lg:pb-0">
          <div className="relative -mt-[48px] shrink-0 lg:mt-0">
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
              className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-orbit-gradient text-snow shadow-glow"
            >
              {uploading === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => uploadImage("avatar", e)} />
            {avatarFile && <AvatarEditor file={avatarFile} confirmLabel="Salvar" onCancel={() => setAvatarFile(null)} onConfirm={applyAvatar} />}
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
                className={clsx(inputClass, "pr-[44px]")}
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

          <div className="space-y-5">
          <Field label="Cidade" icon={MapPin} stacked>
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Ex.: Aracaju, Sergipe, Brasil" className={inputClass} />
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
        {wantsPartner && (
          <Field label="Parceiro" icon={Heart}>
            <PartnerPicker userId={userId} value={partner} onChange={setPartner} />
          </Field>
        )}
      </Section>

      <Section title="Parentes" subtitle="Pais, irmãos, filhos e outros — vínculos reais entre perfis." icon={Users}>
        <Link
          href="/configuracoes/conta/parentes"
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-space-bg/60 px-4 py-3.5 transition hover:border-orbit-purple/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10">
            <Users className="h-5 w-5 text-orbit-cyan" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-white">Meus parentes</span>
            <span className="block text-xs text-white/45">Adicionar, editar e confirmar vínculos familiares</span>
          </span>
          <ChevronRight className="h-5 w-5 text-white/40" />
        </Link>
      </Section>

      <div id="informacoes" className="scroll-mt-24">
        <AboutMeSection about={about} set={setAbout} />
      </div>
      <OriginSection about={about} set={setAbout} />
      <EducationSection about={about} set={setAbout} />
      <CareerSection about={about} set={setAbout} userId={userId} />
      <LifeSection about={about} set={setAbout} />
      <FavoritesSection about={about} set={setAbout} />
      <CharacterSection about={about} set={setAbout} />

      <Section title="Privacidade" subtitle="Escolha o que será exibido no seu perfil." icon={Shield}>
        <div className="space-y-4">
          <Toggle label="Mostrar minha idade no perfil" icon={Calendar} checked={showAge} onChange={setShowAge} />
          <Toggle label="Mostrar meu signo no perfil" icon={Star} checked={showSign} onChange={setShowSign} />
          <Toggle label="Mostrar minha cidade no perfil" icon={MapPin} checked={showLocation} onChange={setShowLocation} />
          <Toggle label="Mostrar meus interesses no perfil" icon={Heart} checked={showInterests} onChange={setShowInterests} />
          <Toggle label="Mostrar meu relacionamento no perfil" icon={Heart} checked={showRelationship} onChange={setShowRelationship} />
          <Field label="Quem pode ver seus parentes?" icon={Users}>
            <SelectWrap>
              <select value={familyVisibility} onChange={(e) => setFamilyVisibility(e.target.value)} className={selectClass}>
                <option value="all">Todos</option>
                <option value="friends">Amigos</option>
                <option value="me">Somente eu</option>
              </select>
            </SelectWrap>
          </Field>
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
          Informações atualizadas.
        </p>
      )}

      <button
        type="submit"
        disabled={saving || uploading !== null}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orbit-gradient py-3.5 text-base font-semibold text-snow shadow-glow transition hover:opacity-90 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-5 w-5 animate-spin" />}
        {saving ? "Salvando..." : "Salvar alterações"}
      </button>
      </div>
    </form>
  );
}
