export default function ContactPage() {
  const channels = [
    { label: "Phone", value: "+91 98765 43210", href: "tel:+919876543210" },
    { label: "Email", value: "organizers@codfest.gg", href: "mailto:organizers@codfest.gg" },
    { label: "Discord", value: "discord.gg/codfest", href: "https://discord.gg" },
    { label: "WhatsApp", value: "+91 98765 43210", href: "https://wa.me/919876543210" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="section-title">Contact the organizers</h1>
      <p className="mt-2 text-sm text-zinc-500">
        For disputes during a match, use Discord — it&apos;s the fastest channel and is monitored
        throughout every match day.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {channels.map((c) => (
          <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="card p-5 transition hover:border-ember-600/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{c.label}</div>
            <div className="mt-1 font-semibold text-zinc-200">{c.value}</div>
          </a>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Location</div>
        <p className="mt-1 text-sm text-zinc-300">
          CODFEST is an online tournament — matches are played from home. Finals may be casted
          live on stream; links are posted on the Announcements page.
        </p>
      </div>
    </div>
  );
}
