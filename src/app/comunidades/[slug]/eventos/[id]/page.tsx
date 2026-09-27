import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { EventDetailView } from "@/components/community/pages/events";
import type { CommunityEvent } from "@/components/community/events";
import { EVENT_COLUMNS } from "@/lib/communities";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";
const ID = /^[0-9a-f-]{36}$/;

export async function generateMetadata(props: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  if (!c || !ID.test(params.id)) return { title: "Evento · Órbita X" };
  const { data } = await (await createClient()).from("CommunityEvent").select("title, description").eq("id", params.id).eq("communityId", c.id).maybeSingle();
  return { title: data ? `${data.title} · ${c.name}` : `Evento · ${c.name}`, description: c.isPrivate ? undefined : data?.description?.slice(0, 160) };
}

export default async function EventPage(props: { params: Promise<{ slug: string; id: string }> }) {
  const params = await props.params;
  if (!ID.test(params.id)) notFound();
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, me, membership, viewer } = access;
  // RLS returns the event only to people who can see the community.
  const { data } = await supabase.from("CommunityEvent").select(EVENT_COLUMNS).eq("id", params.id).eq("communityId", community.id).maybeSingle();
  if (!data) notFound();
  const event = data as CommunityEvent;
  const [people, organizer] = await Promise.all([
    supabase
      .from("CommunityEventRsvp")
      .select("status, createdAt, user:User!CommunityEventRsvp_userId_fkey(id, name, username, avatarUrl)")
      .eq("eventId", event.id)
      .order("createdAt", { ascending: true })
      .limit(500),
    event.createdById ? supabase.from("User").select("name, username, avatarUrl").eq("id", event.createdById).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  type Person = { status: "going" | "interested"; createdAt: string; user: { id: string; name: string; username: string; avatarUrl: string | null } };
  const list = ((people.data ?? []) as unknown as Person[]).filter((p) => p.user);
  const mine = me ? list.find((p) => p.user.id === me)?.status ?? null : null;
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership}>
        <EventDetailView event={event} people={list} mine={mine} organizer={organizer.data ?? null} />
      </CommunityProvider>
    </CommunityShell>
  );
}
