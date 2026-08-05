import type { Server } from "socket.io";

/**
 * API routes run in the same process as server.js, which stores the
 * Socket.IO instance on globalThis. Emissions are no-ops if the socket
 * server is not running (e.g. during `next build`).
 */
function io(): Server | null {
  return (globalThis as any).io ?? null;
}

/** Broadcast to every connected client. */
export function emitEvent(event: string, payload: unknown) {
  io()?.emit(event, payload);
}

/** Broadcast only to clients in the admin room. */
export function emitToAdmins(event: string, payload: unknown) {
  io()?.to("admins").emit(event, payload);
}
