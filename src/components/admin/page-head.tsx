export function AdminPageHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-xl font-bold text-white md:text-2xl lg:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-white/60">{subtitle}</p>
    </div>
  );
}
