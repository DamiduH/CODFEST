"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function parts(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
    over: diff === 0,
  };
}

/** Boxed HUD countdown with animated ticking digits: DAYS / HRS / MIN / SEC. */
export default function Countdown({ target }: { target: string }) {
  const ts = new Date(target).getTime();
  const [t, setT] = useState<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    setT(parts(ts));
    const id = setInterval(() => setT(parts(ts)), 1000);
    return () => clearInterval(id);
  }, [ts]);

  if (t?.over) return null;

  const cells = [
    { value: t?.days, unit: "DAYS", accent: false },
    { value: t?.hours, unit: "HRS", accent: false },
    { value: t?.minutes, unit: "MIN", accent: false },
    { value: t?.seconds, unit: "SEC", accent: true },
  ];

  return (
    <div className="flex gap-3 md:gap-4">
      {cells.map((c) => {
        const displayVal = c.value === undefined ? "--" : String(c.value).padStart(2, "0");
        return (
          <motion.div
            key={c.unit}
            whileHover={{ scale: 1.05, borderColor: "rgba(113, 224, 0, 0.7)" }}
            className={`flex min-w-[64px] flex-col items-center border bg-night-600 px-3 py-3 transition-colors md:min-w-[80px] md:px-5 ${
              c.accent ? "border-ember-600/60 shadow-glowSm" : "border-night-700"
            }`}
          >
            <div className="relative h-9 md:h-10 overflow-hidden flex items-center justify-center">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={displayVal}
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`font-display text-3xl font-bold leading-none md:text-4xl ${
                    c.accent ? "text-ember-600" : "text-white"
                  }`}
                >
                  {displayVal}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="mt-1.5 font-mono text-[10px] tracking-wider text-zinc-300">{c.unit}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
