import { db } from "@/lib/supabase";

/** Append-only audit trail. Every score submission, resolution and admin action lands here. */
export async function logAudit(
  actorId: string | null,
  action: string,
  targetId: string | null,
  details: Record<string, unknown> = {}
) {
  await db().from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_id: targetId,
    details,
  });
}
