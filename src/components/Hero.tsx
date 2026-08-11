"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Countdown from "@/components/Countdown";

// ── Real tournament date — update this when the date changes ──────────
const TOURNAMENT_START = "2026-08-15T10:00:00+05:30"; // 15 Aug 2026, 10:00 AM IST

export default function Hero({
  liveCount,
  nextMatchTime,
  stats,
}: {
  liveCount: number;
  nextMatchTime: string | null;
  registrationOpen: boolean;
  prizePool: string;
  stats: { teams: number; players: number; played: number };
}) {
  const countdownTarget = nextMatchTime ?? TOURNAMENT_START;

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative -mt-16 h-screen overflow-hidden border-b border-night-700">
        {/* Radar scan line overlay */}
        <div className="radar-overlay z-10" />

        {/* Background video + tactical overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-night-page">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          >
            <source
              src="https://cdn.jsdelivr.net/gh/PrakashLeena/CODFEST@main/public/hero-bg.mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-night-page/40 via-night-page/10 to-night-page" />
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-ember-600/10" />
        </div>

        <div className="site-gutter relative z-20 mx-auto flex h-full max-w-7xl flex-col items-center justify-center pb-16 pt-20 text-center">
          {liveCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.03 }}
              className="mt-4 flex items-center gap-2 border border-red-500/50 bg-red-500/15 px-4 py-1.5 font-mono text-xs font-bold tracking-[0.1em] text-red-300 shadow-md"
            >
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulseLive" />
              {liveCount} MATCH{liveCount > 1 ? "ES" : ""} LIVE // SPECTATE NOW
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 flex w-full justify-center"
          >
            <Image
              src="/logo.png"
              alt="CODFEST 2026 — Intra-Departmental E-Sports Tournament"
              width={628}
              height={225}
              priority
              className="h-auto w-[min(88vw,560px)] drop-shadow-[0_0_20px_rgba(113,224,0,0.2)]"
            />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-4 font-body text-base uppercase tracking-[0.1em] text-zinc-200 opacity-90 md:text-lg"
          >
            Assemble your squad. <br className="md:hidden block" />
            Enter the battlefield. <br />
            <span className="font-semibold ">Claim the title.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className="mt-6 flex flex-wrap justify-center gap-4"
          >
            <motion.div
              className="w-full sm:w-auto"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Link
                href="/register"
                className="btn-primary w-full !px-10 !py-3 font-display text-2xl font-bold tracking-[0.05em] text-ember-900 shadow-glowLg"
              >
                REGISTER YOUR TEAM
              </Link>
            </motion.div>
            <motion.div
              className="w-full sm:w-auto"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Link
                href="/contact"
                className="btn-clipped-outline inline-flex w-full items-center justify-center border border-white px-10 py-3 font-display text-2xl font-bold tracking-[0.05em] text-white transition-colors duration-300 hover:bg-white hover:text-night-page"
              >
                CONTACT US
              </Link>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ============ DEPLOYMENT COUNTDOWN BAR ============ */}
      <section className="relative border-b border-night-700 bg-night-page py-12">
        <div className="site-gutter mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="card flex flex-col items-start justify-between gap-6 p-6 shadow-[0_0_20px_rgba(0,0,0,0.6)] md:flex-row md:items-center"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-ember-600 shadow-glowSm animate-pulseLive" />
                <span className="font-mono text-sm font-bold tracking-[0.1em] text-ember-600">
                  LIVE SYSTEM
                </span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[0.05em] text-white md:text-3xl">
                {nextMatchTime
                  ? "NEXT MATCH DEPLOYMENT"
                  : "TOURNAMENT DEPLOYMENT BEGINS"}
              </h2>
            </div>
            <Countdown target={countdownTarget} />
          </motion.div>
        </div>
      </section>

      {/* ============ QUICK STATS ============ */}
      <section className="site-gutter mx-auto max-w-7xl pt-12">
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              [stats.teams, "REGISTERED TEAMS", "REG.01"],
              [stats.players, "TOTAL PLAYERS", "PLR.02"],
              [stats.played, "MATCHES PLAYED", "OPS.03"],
            ] as const
          ).map(([value, label, tag], index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -4, borderColor: "rgba(113,224,0,0.8)" }}
              className="card relative p-5 transition-all duration-300 md:p-6"
            >
              <span className="hud-note absolute right-2 top-2">{tag}</span>
              <div className="font-display text-4xl font-bold text-white md:text-6xl">
                {value}
              </div>
              <div className="mt-2 font-mono text-[10px] tracking-[0.1em] text-zinc-300 md:text-xs">
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
