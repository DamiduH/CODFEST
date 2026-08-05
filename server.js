/**
 * Custom server: runs Next.js and Socket.IO in a single Node process.
 * Required because Vercel's serverless runtime cannot hold a persistent
 * WebSocket connection — deploy this to Railway/Render (or any Node host).
 * API route handlers emit events through the global `io` instance.
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  // Expose to API route handlers (same process).
  global.io = io;

  io.on("connection", (socket) => {
    // Admins join a private room for dispute alerts.
    socket.on("join:admin", () => socket.join("admins"));
  });

  server.listen(port, () => {
    console.log(`> CODFEST ready on http://localhost:${port}`);
  });
});
