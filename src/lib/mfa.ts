import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * When the account has two-step verification on and this login has not confirmed
 * the code yet, returns the factor to challenge. The database refuses every request
 * of such a login until the code is confirmed, so this is only the user-facing step.
 */
export async function pendingMfaFactor(supabase: SupabaseClient): Promise<string | null> {
  // listFactors asks Supabase Auth, so a factor enabled on another device counts right away.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === "verified");
  if (!factor) return null;
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2" ? null : factor.id;
}

export function authErrorMessage(error: { status?: number; code?: string; message?: string } | null, fallback: string) {
  if (!error) return null;
  if (error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit" || error.code === "over_sms_send_rate_limit") {
    return "Muitas tentativas seguidas. Por segurança, aguarde alguns minutos e tente de novo.";
  }
  if (error.code === "mfa_verification_failed" || error.code === "mfa_challenge_expired") return "Código inválido ou expirado. Confira o app autenticador.";
  if (error.code === "weak_password") return "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra.";
  if (error.code === "same_password") return "A nova senha precisa ser diferente da atual.";
  return fallback;
}
