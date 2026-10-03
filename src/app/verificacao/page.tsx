import type { Metadata } from "next";
import { Suspense } from "react";
import { TwoFactorChallenge } from "./challenge";

export const metadata: Metadata = { title: "Verificação em duas etapas · Órbita X" };
export const dynamic = "force-dynamic";

export default function VerificacaoPage() {
  return (
    <Suspense>
      <TwoFactorChallenge />
    </Suspense>
  );
}
