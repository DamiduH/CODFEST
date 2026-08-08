/**
 * Custom server: runs Next.js and Socket.IO in a single Node process.
 * Required because Vercel's serverless runtime cannot hold a persistent
 * WebSocket connection — deploy this to Railway/Render (or any Node host).
 * API route handlers emit events through the global `io` instance.
 */
const { createServer } = require("http");
const { parse } = require("url");
const os = require("os");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const host = "0.0.0.0"; // Binds to all network interfaces for local network access
const app = next({ dev });
const handle = app.getRequestHandler();

// Helper function to extract your local IPv4 address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

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

  server.listen(port, host, (err) => {
    if (err) throw err;
    const localIp = getLocalIp();
    console.log(`> CODFEST Local:   http://localhost:${port}`);
    console.log(`> CODFEST Network: http://${localIp}:${port}`);
  });
});
