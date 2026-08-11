const contacts = [
  {
    name: "Savindu Mihiran",
    email: "savindumihiran12345@gmail.com",
    code: "CR-01",
  },
  {
    name: "Tharu Silva",
    email: "shehantharu2095@gmail.com",
    code: "CR-02",
  },
] as const;

const phone = { value: "+94 76 293 4155", href: "tel:+94762934155" };

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M7.2 3.5 9.6 8l-2.2 1.8c1.1 2.6 3.2 4.7 5.8 5.8l1.8-2.2 4.5 2.4-.8 3.3c-.2.8-.9 1.4-1.8 1.4C9.5 20.5 3.5 14.5 3.5 7.1c0-.9.6-1.6 1.4-1.8l2.3-.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M3.5 6.5h17v12h-17v-12Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4.5 7.5 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <main className="site-gutter mx-auto max-w-7xl py-12 md:py-16">
      <div className="border-l-4 border-l-ember-400 pl-4">
        <h1 className="section-title">Contact the organizers</h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-ember-500">
          // OPEN COMMUNICATION CHANNELS
        </p>
      </div>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Contact tournament operations by phone or email for registration support, match-day
        questions, and official assistance.
      </p>

      <div className="mx-auto mt-8 grid max-w-4xl gap-5">
        {contacts.map((contact) => (
          <article
            key={contact.code}
            className="group relative isolate min-h-[280px] overflow-hidden border border-white/25 bg-night-900 transition duration-500 hover:-translate-y-1 hover:border-ember-500/80 hover:shadow-glowSm"
            style={{
              clipPath:
                "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
            }}
          >
            <div className="relative flex min-w-0 flex-col justify-center p-4 sm:p-6 md:p-8">
              <span className="absolute right-4 top-4 border border-ember-500/60 bg-black/70 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-ember-400">
                {contact.code}
              </span>

              <p className="pr-16 font-display text-2xl tracking-[0.06em] text-white sm:text-3xl">
                {contact.name}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ember-400 sm:text-[10px] sm:tracking-[0.2em]">
                Tournament Operations
              </p>

              <div className="mt-5 space-y-2">
                <a
                  href={phone.href}
                  className="flex items-center gap-3 border border-white/10 bg-black/35 p-2.5 transition hover:border-ember-500/60 hover:bg-black/60 sm:p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center border border-ember-500/60 text-ember-400">
                    <PhoneIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-ember-400">Phone</span>
                    <span className="block font-display text-lg tracking-[0.05em] text-white sm:text-xl">{phone.value}</span>
                  </span>
                </a>

                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 border border-white/10 bg-black/35 p-2.5 transition hover:border-ember-500/60 hover:bg-black/60 sm:p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center border border-ember-500/60 text-ember-400">
                    <EmailIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-ember-400">Email</span>
                    <span className="block break-all font-display text-base tracking-[0.04em] text-white sm:text-xl">{contact.email}</span>
                  </span>
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
