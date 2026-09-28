import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente com a chave de service role — SOMENTE no servidor (webhooks, tarefas de sistema).
 * Ignora RLS, então só é usado para chamar funções SECURITY DEFINER que fazem sua própria
 * verificação (ex.: diamond_credit_order exige auth.role()='service_role').
 * Retorna null quando a chave não está configurada, para o código degradar com segurança.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-orbitax-service": "1" } },
  });
}
