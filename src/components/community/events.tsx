"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { CalendarDays, CalendarPlus, Check, ImagePlus, Loader2, MapPin, Star, Trash2, Users } from "lucide-react";
import { ACCEPT, communityError, uploadCommunityFile } from "@/lib/communities";
import { DEFAULT_TZ, dayKey, hhmm, useTimeZone } from "@/lib/use-tz";
import { useCommunity } from "./context";
import { Sheet } from "./ui";

export type CommunityEvent = {
  id: string;
  communityId: string;
  createdById: string | null;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  locationUrl: string | null;
  imageUrl: string | null;
  maxParticipants: number | null;
  status: "scheduled" | "cancelled";
  goingCount: number;
  interestedCount: number;
  createdAt: string;
};

export { EVENT_COLUMNS } from "@/lib/communities";

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function eventEnded(e: Pick<CommunityEvent, "startsAt" | "endsAt">) {
  const end = e.endsAt ? new Date(e.endsAt) : new Date(new Date(e.startsAt).getTime() + 6 * 3600_000);
  return end.getTime() < Date.now();
}
export function eventLive(e: Pick<CommunityEvent, "startsAt" | "endsAt">) {
  return new Date(e.startsAt).getTime() <= Date.now() && !eventEnded(e);
}

/** Date badge: "12 OUT" */
export function DateBadge({ iso, className }: { iso: string; className?: string }) {
  const tz = useTimeZone();
  const d = new Date(iso);
  return (
    <span className={clsx("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-space-bg/70 text-center backdrop-blur", className)}>
      <span className="font-display text-xl font-bold leading-none text-white">{d.toLocaleDateString("pt-BR", { day: "numeric", timeZone: tz })}</span>
      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-orbit-cyan">{d.toLocaleDateString("pt-BR", { month: "short", timeZone: tz }).replace(".", "")}</span>
    </span>
  );
}

/** "Sábado, 12 de outubro · 19:30 – 21:00" in the given timezone (use useTimeZone() in components). */
export function eventWhen(e: Pick<CommunityEvent, "startsAt" | "endsAt">, tz: string = DEFAULT_TZ) {
  const s = new Date(e.startsAt);
  const day = s.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
  const end = e.endsAt ? new Date(e.endsAt) : null;
  const sameDay = end && dayKey(end, tz) === dayKey(s, tz);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${hhmm(s, tz)}${end ? (sameDay ? ` – ${hhmm(end, tz)}` : ` até ${end.toLocaleDateString("pt-BR", { timeZone: tz })} ${hhmm(end, tz)}`) : ""}`;
}

/** .ics file that any calendar app (Google, Apple, Outlook) imports. */
export function downloadIcs(e: CommunityEvent, communityName: string, url: string) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  const start = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : new Date(start.getTime() + 2 * 3600_000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orbita X//Comunidades//PT-BR",
    "BEGIN:VEVENT",
    `UID:${e.id}@orbitax.social.br`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(`${e.description}\n\n${communityName} · ${url}`)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  a.download = `${e.title.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase().slice(0, 40) || "evento"}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function EventCard({ e, slug, rsvp }: { e: CommunityEvent; slug: string; rsvp?: "going" | "interested" | null }) {
  const tz = useTimeZone();
  const ended = eventEnded(e);
  const live = eventLive(e);
  return (
    <Link
      href={`/comunidades/${slug}/eventos/${e.id}`}
      className={clsx(
        "group block overflow-hidden rounded-3xl border bg-space-card/80 transition hover:border-orbit-purple/40",
        e.status === "cancelled" || ended ? "border-white/[0.06] opacity-75" : "border-white/[0.08]"
      )}
    >
      <div className="relative h-32 overflow-hidden bg-[linear-gradient(135deg,rgb(var(--app-accent,139_92_246)/0.45),#0b0d1a_75%)] sm:h-36">
        {e.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-space-card via-transparent to-transparent" />
        <DateBadge iso={e.startsAt} className="absolute left-3 top-3" />
        {(live || e.status === "cancelled" || ended) && (
          <span
            className={clsx(
              "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold",
              e.status === "cancelled" ? "bg-red-500/85 text-snow" : live ? "animate-pulse bg-emerald-500 text-snow" : "bg-black/60 text-white/80"
            )}
          >
            {e.status === "cancelled" ? "Cancelado" : live ? "Acontecendo agora" : "Encerrado"}
          </span>
        )}
      </div>
      <div className="p-4 pt-2">
        <p className="line-clamp-2 font-semibold text-white">{e.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/55">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" /> <span className="truncate">{eventWhen(e, tz)}</span>
        </p>
        {e.location && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-orbit-pink" /> <span className="truncate">{e.location}</span>
          </p>
        )}
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-white/60">
            <Users className="h-3.5 w-3.5" /> {e.goingCount} {e.goingCount === 1 ? "vai" : "vão"}
            {e.interestedCount > 0 && ` · ${e.interestedCount} interessado${e.interestedCount === 1 ? "" : "s"}`}
            {e.maxParticipants && ` · ${Math.max(0, e.maxParticipants - e.goingCount)} vagas`}
          </span>
          {rsvp && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
              {rsvp === "going" ? <Check className="h-3 w-3" /> : <Star className="h-3 w-3" />} {rsvp === "going" ? "Você vai" : "Interessado"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Create or edit an event (the database checks the "event" permission and ownership). */
export function EventForm({ open, onClose, event, onSaved }: { open: boolean; onClose: () => void; event?: CommunityEvent | null; onSaved: (id: string) => void }) {
  const { supabase, community, viewer, toast } = useCommunity();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [max, setMax] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const s = event ? new Date(event.startsAt) : new Date(Date.now() + 24 * 3600_000);
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setDate(localDate(s));
    setTime(event ? localTime(s) : "19:00");
    setEndTime(event?.endsAt ? localTime(new Date(event.endsAt)) : "");
    setLocation(event?.location ?? "");
    setLocationUrl(event?.locationUrl ?? "");
    setMax(event?.maxParticipants ? String(event.maxParticipants) : "");
    setImage(event?.imageUrl ?? null);
    setError(null);
  }, [open, event]);

  async function upload(f: File | undefined) {
    if (!f || !viewer) return;
    setUploading(true);
    try {
      setImage((await uploadCommunityFile(supabase, viewer.id, community.id, f, "image")).url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no envio da imagem.");
    }
    setUploading(false);
  }

  async function save() {
    setError(null);
    if (title.trim().length < 3) return setError("Dê um nome ao evento (mínimo 3 letras).");
    if (!date || !time) return setError("Informe a data e o horário.");
    const starts = new Date(`${date}T${time}`);
    if (Number.isNaN(starts.getTime())) return setError("Data inválida.");
    if (!event && starts.getTime() < Date.now() - 5 * 60_000) return setError("O início não pode estar no passado.");
    let ends: Date | null = null;
    if (endTime) {
      ends = new Date(`${date}T${endTime}`);
      if (ends <= starts) ends = new Date(ends.getTime() + 24 * 3600_000); // ends after midnight
    }
    const maxN = max.trim() ? Number(max) : null;
    if (maxN !== null && (!Number.isInteger(maxN) || maxN < 1)) return setError("Vagas: use um número inteiro maior que zero.");
    const url = locationUrl.trim() && !/^https?:\/\//i.test(locationUrl.trim()) ? `https://${locationUrl.trim()}` : locationUrl.trim();
    setBusy(true);
    const { data, error: e } = await supabase.rpc("community_save_event", {
      p_community: community.id,
      p_id: event?.id ?? null,
      p: {
        title: title.trim(),
        description: description.trim(),
        startsAt: starts.toISOString(),
        endsAt: ends?.toISOString() ?? "",
        location: location.trim(),
        locationUrl: url,
        imageUrl: image ?? "",
        maxParticipants: maxN ?? "",
      } as never,
    });
    setBusy(false);
    if (e) return setError(communityError(e.message));
    toast(event ? "Evento atualizado. Quem confirmou presença foi avisado." : "Evento criado e divulgado para os membros!");
    onSaved(data as string);
    onClose();
  }

  const field = "w-full rounded-2xl border border-white/10 bg-space-bg/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-orbit-purple/60";
  return (
    <Sheet
      open={open}
      onClose={() => !busy && onClose()}
      wide
      title={event ? "Editar evento" : "Novo evento"}
      footer={
        <div className="flex items-center gap-2">
          {error ? <p className="min-w-0 flex-1 text-xs text-red-300">{error}</p> : <p className="min-w-0 flex-1 truncate text-xs text-white/45">Horário de {Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ")}</p>}
          <button type="button" onClick={save} disabled={busy || uploading} className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-orbit-gradient px-6 text-sm font-semibold text-snow shadow-glow disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {event ? "Salvar" : "Criar evento"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/15 bg-[linear-gradient(135deg,rgb(var(--app-accent,139_92_246)/0.25),transparent)] text-sm text-white/70"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <span className="relative flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {image ? "Trocar imagem" : "Imagem do evento (opcional)"}
          </span>
        </button>
        {image && (
          <button type="button" onClick={() => setImage(null)} className="flex items-center gap-1 text-xs font-semibold text-white/50 hover:text-white">
            <Trash2 className="h-3.5 w-3.5" /> Remover imagem
          </button>
        )}
        <input ref={input} type="file" hidden accept={ACCEPT.image} onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Nome do evento" className={clsx(field, "font-semibold")} autoFocus />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={4} placeholder="Descrição: o que vai acontecer, programação, como participar…" className={clsx(field, "resize-y")} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="col-span-2 block sm:col-span-1">
            <span className="mb-1 block text-xs text-white/50">Data</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={clsx(field, "[color-scheme:dark]")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/50">Início</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={clsx(field, "[color-scheme:dark]")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/50">Término (opcional)</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={clsx(field, "[color-scheme:dark]")} />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="Local (ex.: Online, Discord, São Paulo)" className={field} />
          <input value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} maxLength={2000} inputMode="url" placeholder="Link do local ou da transmissão (opcional)" className={field} />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-white/50">Limite de participantes (opcional)</span>
          <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Sem limite" className={field} />
        </label>
      </div>
    </Sheet>
  );
}

/** Adds the event to the calendar app. */
export function CalendarButton({ e, className }: { e: CommunityEvent; className?: string }) {
  const { community } = useCommunity();
  return (
    <button
      type="button"
      onClick={() => downloadIcs(e, community.name, `${window.location.origin}/comunidades/${community.slug}/eventos/${e.id}`)}
      className={clsx("flex items-center justify-center gap-2 rounded-full border border-white/10 text-sm font-semibold text-white/85 transition hover:bg-white/5", className)}
    >
      <CalendarPlus className="h-4 w-4" /> Adicionar à agenda
    </button>
  );
}
