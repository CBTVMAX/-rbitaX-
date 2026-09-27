import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

// Columns of "User" anyone may read. Private data (email, phone, terms, role, status…)
// is not readable through the API; the owner gets it from my_account_details().
export const PUBLIC_USER_COLUMNS =
  "id, username, name, bio, avatarUrl, coverUrl, isPrivate, isVerified, createdAt, updatedAt, lastSeenAt, orbitId, pinnedPostId, presence, profileColor, avatarFrame, discoverable" as const;

export type PublicUser = Pick<
  Tables<"User">,
  | "id"
  | "username"
  | "name"
  | "bio"
  | "avatarUrl"
  | "coverUrl"
  | "isPrivate"
  | "isVerified"
  | "createdAt"
  | "updatedAt"
  | "lastSeenAt"
  | "orbitId"
  | "pinnedPostId"
  | "presence"
  | "profileColor"
  | "avatarFrame"
  | "discoverable"
>;

export async function getCurrentUser(): Promise<{
  authId: string;
  profile: PublicUser;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("User")
    .select(PUBLIC_USER_COLUMNS)
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { authId: user.id, profile };
}
