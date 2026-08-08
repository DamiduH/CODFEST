import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-t-white/20 bg-[#0A0F0C]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-3">
        <div>
          <div className="font-display text-2xl font-bold tracking-tight text-white">
            CODFEST <span className="text-ember-600">2026</span>
          </div>
          <p className="mt-4 max-w-xs font-mono text-[10px] leading-relaxed text-zinc-500 opacity-70">
            SECURED DEPARTMENTAL CONNECTION ESTABLISHED. OPERATIONAL DATA ENCRYPTED.
            UNAUTHORIZED ACCESS PROHIBITED.
          </p>
        </div>
        <div>
          <h4 className="inline-block border-b border-zinc-500/30 pb-1 font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
            System Links
          </h4>
          <ul className="mt-4 space-y-2.5 font-mono text-xs uppercase tracking-wide text-zinc-300">
            <li><Link className="hover:text-ember-400" href="/rules">Terms of Engagement</Link></li>
            <li><Link className="hover:text-ember-400" href="/announcements">Announcements</Link></li>
            <li><Link className="hover:text-ember-400" href="/bracket">Bracket</Link></li>
            <li><Link className="hover:text-ember-400" href="/leaderboard">Leaderboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="inline-block border-b border-zinc-500/30 pb-1 font-mono text-xs uppercase tracking-[0.1em] text-zinc-500">
            Comms
          </h4>
          <ul className="mt-4 space-y-2.5 font-mono text-xs uppercase tracking-wide text-zinc-300">
            <li><Link className="hover:text-ember-400" href="/contact">Contact HQ</Link></li>
            <li><a className="hover:text-ember-400" href="https://discord.gg" target="_blank" rel="noreferrer">Discord</a></li>
            <li><a className="hover:text-ember-400" href="https://wa.me" target="_blank" rel="noreferrer">WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-night-700/30 bg-night-page/50 py-4 text-center font-mono text-[10px] text-zinc-500">
        © {new Date().getFullYear()} CODFEST INTRA-DEPARTMENTAL ESPORTS CHAMPIONSHIP // OPERATIONAL DATA SECURED
      </div>
    </footer>
  );
}
