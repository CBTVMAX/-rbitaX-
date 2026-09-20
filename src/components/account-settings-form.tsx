"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/post-card";
import { Camera } from "lucide-react";

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
  };
}) {
  const supabase = createClient();
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (error) return;
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    await supabase.from("User").update({ avatarUrl: pub.publicUrl }).eq("id", userId);
    router.refresh();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await supabase
      .from("User")
      .update({ name: name.trim(), bio: bio.trim() || null, isPrivate })
      .eq("id", userId);

    await supabase
      .from("Profile")
      .update({ location: location.trim() || null, website: website.trim() || null })
      .eq("userId", userId);

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-lg space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={name} url={avatarUrl} size={72} />
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-orbit-gradient text-white shadow-glow"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input ref={avatarRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
        </div>
        <p className="text-xs text-white/40">@{initial.username} · toque no ícone para trocar a foto</p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/50">Nome</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/50">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-white/50">Cidade</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/50">Site</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-space-card px-3 py-2 text-sm text-white outline-none focus:border-orbit-purple"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
        Conta privada (perfil visível apenas para seguidores aprovados)
      </label>

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
