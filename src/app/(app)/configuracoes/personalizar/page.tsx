import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { ProfileCustomizer } from "@/components/profile-customizer";

export const dynamic = "force-dynamic";

export default async function CustomizeProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const user = current.profile;

  // Premium frames: the ones this member owns and the ones on sale in the Órbita X Store.
  const supabase = createClient();
  const [{ data: onSale }, { data: owned }] = await Promise.all([
    supabase.from("StoreProduct").select("refId, priceCoins").eq("kind", "frame"),
    supabase.from("UserInventory").select("product:StoreProduct(kind, refId)"),
  ]);
  const framePrices = Object.fromEntries((onSale ?? []).map((p) => [p.refId, p.priceCoins]));
  const ownedFrames = (owned ?? [])
    .map((i) => (i as unknown as { product: { kind: string; refId: string } | null }).product)
    .filter((p): p is { kind: string; refId: string } => p?.kind === "frame")
    .map((p) => p.refId);

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 md:px-4 md:py-6 lg:max-w-6xl lg:px-6">
      <div className="mb-4 flex items-center gap-3 lg:mb-6">
        <Link
          href={`/perfil/${user.username}`}
          aria-label="Voltar para o perfil"
          className="rounded-full p-1.5 text-white/80 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold text-white md:text-2xl lg:text-3xl">Personalizar perfil</h1>
          <p className="mt-1 text-sm text-white/60">Expresse quem você é. Muda só o visual do seu perfil, não o aplicativo.</p>
        </div>
        <Link
          href={`/perfil/${user.username}`}
          className="hidden items-center gap-2 rounded-xl border border-orbit-purple/60 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orbit-purple/10 lg:flex"
        >
          <Eye className="h-4 w-4" /> Ver meu perfil
        </Link>
      </div>

      <ProfileCustomizer
        userId={current.authId}
        name={user.name}
        username={user.username}
        bio={user.bio}
        isVerified={user.isVerified}
        avatarUrl={user.avatarUrl}
        coverUrl={user.coverUrl}
        initialColor={user.profileColor ?? "orbita"}
        initialFrame={user.avatarFrame ?? null}
        ownedFrames={ownedFrames}
        framePrices={framePrices}
      />
    </div>
  );
}
