import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export async function getCurrentUser(): Promise<{
  authId: string;
  profile: Tables<"User">;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("User")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { authId: user.id, profile };
}
