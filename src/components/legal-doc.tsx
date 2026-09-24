import { CheckCircle, Info, ShieldAlert } from "lucide-react";
import { ExpandableIconList, type IconListItem } from "@/components/expandable-list";

export type Block =
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "checklist"; items: string[] }
  | { type: "iconGrid"; items: IconListItem[] }
  | { type: "h3"; text: string }
  | { type: "quote"; text: string }
  | { type: "info"; icon?: React.ReactNode; title: string; text: string }
  | { type: "hero"; icon?: React.ReactNode; title: string; text: string }
  | { type: "warn"; badge?: string; title: string; text: string }
  | { type: "fieldCard"; icon: React.ReactNode; title: string; items: string[] }
  | { type: "row"; blocks: Block[] };

export const p = (text: string): Block => ({ type: "p", text });
export const bullets = (items: string[]): Block => ({ type: "bullets", items });
export const checklist = (items: string[]): Block => ({ type: "checklist", items });
export const iconGrid = (items: IconListItem[]): Block => ({ type: "iconGrid", items });
export const h3 = (text: string): Block => ({ type: "h3", text });
export const quote = (text: string): Block => ({ type: "quote", text });
export const info = (title: string, text: string, icon?: React.ReactNode): Block => ({ type: "info", title, text, icon });
export const hero = (title: string, text: string, icon?: React.ReactNode): Block => ({ type: "hero", title, text, icon });
export const warn = (title: string, text: string, badge?: string): Block => ({ type: "warn", title, text, badge });
export const fieldCard = (icon: React.ReactNode, title: string, items: string[]): Block => ({ type: "fieldCard", icon, title, items });
export const row = (blocks: Block[]): Block => ({ type: "row", blocks });

export function RenderBlock({ block }: { block: Block }) {
  if (block.type === "p") {
    return <p className="mb-3 text-sm leading-relaxed text-white/80">{block.text}</p>;
  }
  if (block.type === "h3") {
    return <h3 className="mb-2 mt-5 text-sm font-semibold text-white/90">{block.text}</h3>;
  }
  if (block.type === "quote") {
    return (
      <blockquote className="mb-3 border-l-2 border-orbit-pink pl-4 text-sm italic leading-relaxed text-white/70">
        {block.text}
      </blockquote>
    );
  }
  if (block.type === "info") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-orbit-cyan/25 bg-orbit-cyan/[0.06] p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-cyan/15 text-orbit-cyan">
          {block.icon ?? <Info className="h-5 w-5" />}
        </span>
        <div>
          <p className="mb-1 text-sm font-semibold text-white">{block.title}</p>
          <p className="text-sm leading-relaxed text-white/60">{block.text}</p>
        </div>
      </div>
    );
  }
  if (block.type === "hero") {
    return (
      <div className="mb-8 flex items-start gap-4 rounded-2xl border border-orbit-purple/25 bg-gradient-to-br from-orbit-blue/10 via-orbit-purple/10 to-orbit-pink/10 p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orbit-gradient text-white shadow-glow">
          {block.icon ?? <Info className="h-5 w-5" />}
        </span>
        <div>
          <p className="mb-1 text-base font-semibold text-white">{block.title}</p>
          <p className="text-sm leading-relaxed text-white/60">{block.text}</p>
        </div>
      </div>
    );
  }
  if (block.type === "warn") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-orbit-pink/30 bg-orbit-pink/[0.06] p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-orbit-pink/50 text-xs font-bold text-orbit-pink">
          {block.badge ?? <ShieldAlert className="h-5 w-5" />}
        </span>
        <div>
          <p className="mb-1 text-sm font-semibold text-white">{block.title}</p>
          <p className="text-sm leading-relaxed text-white/60">{block.text}</p>
        </div>
      </div>
    );
  }
  if (block.type === "fieldCard") {
    return (
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-orbit-cyan">
            {block.icon}
          </span>
          <p className="text-sm font-semibold text-white">{block.title}</p>
        </div>
        <ul className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-white/70">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-orbit-cyan" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (block.type === "checklist") {
    return (
      <ul className="mb-4 space-y-1.5 text-sm leading-relaxed text-white/60">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orbit-cyan/70" />
            {item}
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "row") {
    return (
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        {block.blocks.map((child, i) => (
          <div key={i} className="mb-0">
            <RenderBlock block={child} />
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "iconGrid") {
    return <ExpandableIconList items={block.items} />;
  }
  return (
    <ul className="mb-4 space-y-1.5 text-sm leading-relaxed text-white/60">
      {block.items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orbit-blue" />
          {item}
        </li>
      ))}
    </ul>
  );
}
