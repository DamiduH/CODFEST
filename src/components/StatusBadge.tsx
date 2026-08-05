const STYLES: Record<string, string> = {
  scheduled: "border-night-700 bg-night-600/50 text-zinc-300",
  live: "border-red-500/50 bg-red-500/10 text-red-400",
  awaiting_scores: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  disputed: "border-purple-500/40 bg-purple-500/10 text-purple-300",
  finished: "border-ember-600/40 bg-ember-600/10 text-ember-500",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  approved: "border-ember-600/40 bg-ember-600/10 text-ember-500",
  rejected: "border-red-500/50 bg-red-500/10 text-red-400",
};

const LABELS: Record<string, string> = {
  scheduled: "UPCOMING",
  live: "REC // LIVE",
  awaiting_scores: "AWAITING SCORES",
  disputed: "DISPUTED",
  finished: "FINAL",
  pending: "PENDING",
  approved: "VERIFIED",
  rejected: "REJECTED",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.1em] ${
        STYLES[status] ?? "border-night-700 text-zinc-300"
      }`}
    >
      {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulseLive" />}
      {LABELS[status] ?? status.toUpperCase()}
    </span>
  );
}
