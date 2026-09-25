// Viewer's relationship with another profile (public.friendship_state).
export type FriendState = "none" | "outgoing" | "incoming" | "friends" | "self";

export function parseFriendState(value: string | null | undefined): FriendState {
  return value === "outgoing" || value === "incoming" || value === "friends" || value === "self" ? value : "none";
}
