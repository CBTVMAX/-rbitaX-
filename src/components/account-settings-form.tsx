"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { Camera, ImagePlus, Loader2, Plus, X } from "lucide-react";

const MAX_INTERESTS = 12;

export function AccountSettingsForm({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    name: string;
    username: string;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    isPrivate: boolean;
    location: string | null;
    website: string | null;
    interests: string[];
    showAge: boolean;
    showSign: boolean;
    showLocation: boolean;
    hasProfileRow: boolean;
  };
}) {
  const supabase = createClient();
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [interestDraft, setInterestDraft] = useState("");
  const [showAge, setShowAge] = useState(initial.showAge);
  const [showSign, setShowSign] = useState(initial.showSign);
  const [showLocation, setShowLocation] = useState(initial.showLocation);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadImage(kind: "avatar" | "cover", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("A imagem precisa ter no máximo 10 MB.");
      return;
    }

    setUploading(kind);
    setError(null);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(null);
      setError("Não foi possível enviar a imagem.");
      return;
    }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("User")
      .update(kind === "avatar" ? { avatarUrl: pub.publicUrl } : { coverUrl: pub.publicUrl })
      .eq("id", userId);
    setUploading(null);
    if (updateError) {
      setError("Não foi possível salvar a imagem.");
      return;
    }
    if (kind === "avatar") setAvatarUrl(pub.publicUrl);
    else setCoverUrl(pub.publicUrl);
    router.refresh();
  }

  function addInterest() {
    const value = interestDraft.replace(/,/g, " ").trim().slice(0, 30);
    if (!value) return;
    setInterestDraft("");
    setInterests((list) =>
      list.length >= MAX_INTERESTS || list.some((i) => i.toLowerCase() === value.toLowerCase()) ? list : [...list, value]
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const { error: userError } = await supabase
      .from("User")
      .update({ name: name.trim(), bio: bio.trim() || null, isPrivate })
      .eq("id", userId);

    const profileFields = {
      location: location.trim() || null,
      website: website.trim() || null,
      interests: interests.length ? interests.join(", ") : null,
      showAge,
      showSign,
      showLocation,
      updatedAt: new Date().toISOString(),
    };

    const { error: profileError } = initial.hasProfileRow
      ? await supabase.from("Profile").update(profileFields).eq("userId", userId)
      : await supabase.from("Profile").insert({ id: crypto.randomUUID(), userId, ...profileFields });

    setSaving(false);
    if (userError || profileError) {
      setError("Não foi possível salvar. Tente novamente.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple";

  return (
    <form onSubmit={save} className="max-w-lg space-y-5">
      <div>
        <p className="mb-2 text-xs text-white/50">Capa</p>
        <button
          type="button"
          onClick={() => coverRef.current?.click()}
          disabled={uploading !== null}
          className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-space-card text-white/60 transition hover:border-orbit-purple/60"
        >
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <span className="relative flex items-center gap-2 rounded-lg bg-space-bg/80 px-3 py-1.5 text-xs text-white">
            {uploading === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {coverUrl ? "Trocar capa" : "Adicionar capa"}
          </span>
        </button>
        <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => uploadImage("cover", e)} />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={name} url={avatarUrl} size={72} />
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            disabled={uploading !== null}
            aria-label="Trocar foto"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-orbit-gradient text-white shadow-glow"
          >
            {uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => uploadImage("avatar", e)} />
        </div>
        <p className="text-xs text-white/40">@{initial.username} · toque no ícone para trocar a foto</p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/50">Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/50">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Conte um pouco sobre você..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/50">Cidade</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex.: Aracaju, BR" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Link</label>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Ex.: linktr.ee/seunome" className={inputClass} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/50">Interesses</label>
        <div className="flex flex-wrap gap-2">
          {interests.map((i) => (
            <span key={i} className="flex items-center gap-1 rounded-lg border border-orbit-purple/50 bg-orbit-purple/10 px-2.5 py-1 text-xs text-white/85">
              {i}
              <button
                type="button"
                onClick={() => setInterests((list) => list.filter((x) => x !== i))}
                aria-label={`Remover ${i}`}
                className="text-white/50 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {interests.length < MAX_INTERESTS && (
          <div className="mt-2 flex gap-2">
            <input
              value={interestDraft}
              onChange={(e) => setInterestDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addInterest();
                }
              }}
              placeholder="Ex.: Motocicletas, Rock, Tecnologia"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addInterest}
              aria-label="Adicionar interesse"
              className="flex shrink-0 items-center justify-center rounded-lg border border-white/15 px-3 text-white/70 hover:bg-white/5 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <fieldset className="space-y-2 rounded-xl border border-white/10 p-4">
        <legend className="px-1 text-xs text-white/50">Mostrar no perfil para outras pessoas</legend>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={showAge} onChange={(e) => setShowAge(e.target.checked)} /> Idade
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={showSign} onChange={(e) => setShowSign(e.target.checked)} /> Signo
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} /> Cidade
        </label>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
        Conta privada (perfil visível apenas para seguidores aprovados)
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-orbit-gradient px-6 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Salvo!</span>}
      </div>
    </form>
  );
}
