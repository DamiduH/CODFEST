import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { logAudit } from "@/lib/audit";
import { emitEvent, emitToAdmins } from "@/lib/socket";
import { finalizeMatch } from "@/lib/bracket";
import { getMatchWithTeams } from "@/lib/standings";
import type { ScoreSubmission } from "@/lib/types";

/**
 * Dual-submission score verification — the core trust mechanism.
 *
 * Each captain independently reports the result with screenshot proof.
 * The server (never the client) compares both reports:
 *   - both agree  -> match auto-confirmed, standings/bracket update, realtime push
 *   - they differ -> match flagged "disputed" for admin resolution
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireRole("team_captain", "admin");
  if (!user) return NextResponse.json({ error: "Captains only" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const scoreOwn = Number(form.get("score_own"));
  const scoreOpponent = Number(form.get("score_opponent"));
  const screenshot = form.get("screenshot");

  if (!Number.isInteger(scoreOwn) || !Number.isInteger(scoreOpponent) || scoreOwn < 0 || scoreOpponent < 0) {
    return NextResponse.json({ error: "Scores must be non-negative integers" }, { status: 400 });
  }
  if (!(screenshot instanceof File) || screenshot.size === 0) {
    return NextResponse.json({ error: "Screenshot proof is required" }, { status: 400 });
  }
  if (screenshot.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Screenshot must be under 8 MB" }, { status: 400 });
  }

  const match = await getMatchWithTeams(params.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (!["live", "awaiting_scores"].includes(match.status)) {
    return NextResponse.json(
      { error: `Scores can only be submitted for live matches (current: ${match.status})` },
      { status: 409 }
    );
  }

  // The captain may only report for their own team in this match.
  const { data: team } = await db()
    .from("teams").select("id").eq("captain_id", user.id).maybeSingle();
  const teamId = team?.id;
  const side = teamId === match.team1_id ? 1 : teamId === match.team2_id ? 2 : null;
  if (!side) {
    return NextResponse.json({ error: "Your team is not part of this match" }, { status: 403 });
  }

  const field = side === 1 ? "submission_team1" : "submission_team2";
  if (match[field]) {
    return NextResponse.json({ error: "Your team already submitted a score for this match" }, { status: 409 });
  }

  const screenshotUrl = await uploadImage(
    Buffer.from(await screenshot.arrayBuffer()),
    "codfest/proofs"
  );

  const submission: ScoreSubmission = {
    score_own: scoreOwn,
    score_opponent: scoreOpponent,
    screenshot_url: screenshotUrl,
    submitted_by: user.id,
    submitted_at: new Date().toISOString(),
  };

  // Persist this side's submission first so nothing is lost if comparison fails.
  await db().from("matches").update({ [field]: submission, status: "awaiting_scores" }).eq("id", params.id);
  await logAudit(user.id, "match.score_submitted", params.id, {
    team_id: teamId, score_own: scoreOwn, score_opponent: scoreOpponent, screenshot_url: screenshotUrl,
  });
  emitEvent("match:score_submitted", { matchId: params.id, team: side });

  const sub1 = side === 1 ? submission : match.submission_team1;
  const sub2 = side === 2 ? submission : match.submission_team2;

  if (!sub1 || !sub2) {
    return NextResponse.json({ status: "awaiting_scores", message: "Waiting on opponent's submission" });
  }

  // Both sides reported. Canonical orientation: (team1 score, team2 score).
  const agrees =
    sub1.score_own === sub2.score_opponent && sub1.score_opponent === sub2.score_own;

  if (agrees) {
    const winnerId = await finalizeMatch(match, sub1.score_own, sub1.score_opponent);
    await logAudit(null, "match.auto_confirmed", params.id, {
      final_score: [sub1.score_own, sub1.score_opponent], winner_id: winnerId,
    });
    return NextResponse.json({ status: "finished", message: "Both submissions match — result confirmed" });
  }

  await db().from("matches").update({ status: "disputed" }).eq("id", params.id);
  await logAudit(null, "match.disputed", params.id, {
    team1_report: { own: sub1.score_own, opp: sub1.score_opponent },
    team2_report: { own: sub2.score_own, opp: sub2.score_opponent },
  });
  emitEvent("match:disputed", { matchId: params.id });
  emitToAdmins("admin:dispute_alert", { matchId: params.id });

  return NextResponse.json({
    status: "disputed",
    message: "Submissions conflict — the match is under admin review",
  });
}
