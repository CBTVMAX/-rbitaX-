import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Download,
  CircleHelp,
  FileText,
  Lock,
  Palette,
  ShieldCheck,
  SunMoon,
  UserRound,
} from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { APP_THEME_COOKIE, parseAppTheme } from "@/lib/app-theme";
import { profileColorLabel } from "@/lib/profile-colors";

export const dynamic = "force-dynamic";

const THEME_LABEL = { dark: "Escuro", light: "Claro", auto: "Automático" } as const;

type Item = {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
};

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-white/45">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-space-surface/80">
        {items.map(({ href, icon: Icon, label, hint }, i) => {
          const content = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orbit-purple/10 text-orbit-purple">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white">{label}</span>
                {hint && <span className="block truncate text-xs text-white/50">{hint}</span>}
              </span>
              {href ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
              ) : (
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">Em breve</span>
              )}
            </>
          );
          const cls = `flex items-center gap-3 px-4 py-3.5 ${i ? "border-t border-white/10" : ""}`;
          return href ? (
            <Link key={label} href={href} className={`${cls} transition hover:bg-white/5`}>
              {content}
            </Link>
          ) : (
            <div key={label} title="Em breve" className={`${cls} cursor-default opacity-70`}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/entrar");
  const theme = parseAppTheme(cookies().get(APP_THEME_COOKIE)?.value);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-3 py-4 md:px-4 md:py-6">
      <div>
        <h1 className="font-display text-xl font-bold text-white md:text-2xl lg:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-white/60">Gerencie sua conta, sua privacidade e o visual do Órbita X.</p>
      </div>

      <Group
        title="Conta"
        items={[
          { href: "/configuracoes/conta", icon: UserRound, label: "Minha conta", hint: "Nome, @, bio, foto, capa e informações" },
          { href: "/configuracoes/conta", icon: Lock, label: "Privacidade", hint: "O que aparece no seu perfil" },
          { icon: ShieldCheck, label: "Segurança", hint: "Senha e sessões" },
          { href: "/configuracoes/notificacoes", icon: Bell, label: "Notificações", hint: "No celular e no computador, mesmo com o app fechado" },
        ]}
      />

      <Group
        title="Visual"
        items={[
          { href: "/configuracoes/aparencia", icon: SunMoon, label: "Aparência", hint: `Modo ${THEME_LABEL[theme].toLowerCase()}` },
          {
            href: "/configuracoes/personalizar",
            icon: Palette,
            label: "Personalizar perfil",
            hint: `Cor do perfil: ${profileColorLabel(current.profile.profileColor)}`,
          },
        ]}
      />

      <Group
        title="Aplicativo"
        items={[{ href: "/app", icon: Download, label: "Baixar o app ÓrbitaX", hint: "Android (APK), iPhone e computador" }]}
      />

      <Group
        title="Suporte"
        items={[
          { icon: CircleHelp, label: "Ajuda" },
          { href: "/termos", icon: FileText, label: "Termos de Uso" },
          { href: "/privacidade", icon: Lock, label: "Política de Privacidade" },
        ]}
      />
    </div>
  );
}
