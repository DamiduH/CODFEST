/* eslint-disable @next/next/no-img-element */

/** Team logo (or initials fallback) + name — square tactical style. */
export default function TeamMark({
  name,
  logoUrl,
  size = 32,
  highlight = false,
}: {
  name: string | null | undefined;
  logoUrl?: string | null;
  size?: number;
  highlight?: boolean;
}) {
  const display = name ?? "TBD";
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={display}
          width={size}
          height={size}
          className="shrink-0 border border-night-700 object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="flex shrink-0 items-center justify-center border border-night-700 bg-night-600 font-mono font-bold text-zinc-500"
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {display === "TBD" ? "?" : display.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span
        className={`truncate font-display text-lg font-bold uppercase tracking-wide ${
          highlight ? "text-ember-500" : display === "TBD" ? "text-zinc-500 italic" : "text-zinc-200"
        }`}
      >
        {display}
      </span>
    </span>
  );
}
