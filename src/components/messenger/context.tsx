"use client";

import { createContext, useContext } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ChatUser, Conversation } from "@/lib/messenger/types";

export type MessengerContextValue = {
  me: ChatUser;
  supabase: SupabaseClient<Database>;
  conversations: Conversation[];
  /** Short confirmation or error at the bottom of the screen. */
  toast: (text: string, tone?: "info" | "error") => void;
  /** Reloads the list from the database (after any change that affects it). */
  reloadConversations: () => Promise<void>;
  patchConversation: (id: string, patch: Partial<Conversation>) => void;
  openConversation: (id: string) => void;
  /** Direct chat with a friend (created if needed). */
  startDirect: (user: ChatUser) => Promise<void>;
};

export const MessengerContext = createContext<MessengerContextValue | null>(null);

export function useMessenger() {
  const ctx = useContext(MessengerContext);
  if (!ctx) throw new Error("useMessenger outside Messenger");
  return ctx;
}
