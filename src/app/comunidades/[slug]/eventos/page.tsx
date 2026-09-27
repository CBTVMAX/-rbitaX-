import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/community-shell";
import { CommunityProvider } from "@/components/community/provider";
import { EventsView } from "@/components/community/pages/events";
import type { CommunityEvent } from "@/components/community/events";
import { EVENT_COLUMNS } from "@/lib/communities";
import { findCommunity } from "@/lib/community-server";
import { loadCommunityAccess } from "@/lib/community-access";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const c = await findCommunity(params.slug);
  return { title: c ? `Eventos · ${c.name}` : "Eventos · Órbita X" };
}

export default async function EventsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const access = await loadCommunityAccess(params.slug);
  if (!access) notFound();
  const { current, community, supabase, me, membership, canSee, viewer, canAsCommunity } = access;
  let events: CommunityEvent[] = [];
  const rsvps: Record<string, "going" | "interested"> = {};
  if (canSee) {
    const { data } = await supabase.from("CommunityEvent").select(EVENT_COLUMNS).eq("communityId", community.id).order("startsAt", { ascending: false }).limit(200);
    events = (data ?? []) as CommunityEvent[];
    if (me && events.length) {
      const { data: mine } = await supabase.from("CommunityEventRsvp").select("eventId, status").eq("userId", me).in("eventId", events.map((e) => e.id));
      (mine ?? []).forEach((r) => (rsvps[r.eventId] = r.status as "going" | "interested"));
    }
  }
  return (
    <CommunityShell current={current}>
      <CommunityProvider community={community} viewer={viewer} membership={membership} canAsCommunity={canAsCommunity}>
        <EventsView canSee={canSee} events={events} rsvps={rsvps} />
      </CommunityProvider>
    </CommunityShell>
  );
}
