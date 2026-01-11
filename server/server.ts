// server/server.ts
import { ClientMessage, ServerMessage } from "@shared/protocol";

Bun.serve({
  port: 3000,

  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("OK");
  },

  websocket: {
    message(ws, message) {
      const msg = JSON.parse(message.toString()) as ClientMessage;

      if (msg.type === "ping") {
        const reply: ServerMessage = { type: "pong" };
        ws.send(JSON.stringify(reply));
      }
    },
  },
});
