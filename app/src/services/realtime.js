const { logger } = require("../logger");

const HEARTBEAT_INTERVAL_MS = 25000;
const clients = new Map();
let lastEventSequence = 0;

function normalizeRealtimeUser(user) {
  return {
    sub: user?.sub ?? user?.id ?? null,
    id: user?.id ?? user?.sub ?? null,
    role: user?.role || null,
    name: user?.name || "",
    email: user?.email || "",
    groups: Array.isArray(user?.groups) ? user.groups : [],
    groupAccess: user?.groupAccess || null
  };
}

function sanitizeEventKind(kind) {
  const normalized = String(kind || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]/g, "");
  return normalized || "update";
}

function safeWrite(client, chunk) {
  if (!client || !client.res || client.res.writableEnded || client.res.destroyed) {
    return false;
  }

  try {
    client.res.write(chunk);
    return true;
  } catch (error) {
    logger.warn({ err: error, clientId: client.id }, "No se pudo escribir evento SSE");
    return false;
  }
}

function removeRealtimeClient(clientId) {
  const client = clients.get(clientId);
  if (!client) {
    return;
  }

  if (client.heartbeatTimer) {
    clearInterval(client.heartbeatTimer);
  }

  clients.delete(clientId);
}

function writeSseEvent(client, { id, event, data }) {
  const chunks = [];
  if (id) {
    chunks.push(`id: ${id}`);
  }
  if (event) {
    chunks.push(`event: ${event}`);
  }
  chunks.push(`data: ${JSON.stringify(data || {})}`);
  chunks.push("");
  return safeWrite(client, `${chunks.join("\n")}\n`);
}

function registerRealtimeClient({ req, res, user }) {
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const normalizedUser = normalizeRealtimeUser(user);

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  if (typeof req.socket?.setNoDelay === "function") {
    req.socket.setNoDelay(true);
  }
  if (typeof req.socket?.setKeepAlive === "function") {
    req.socket.setKeepAlive(true);
  }
  if (typeof req.socket?.setTimeout === "function") {
    req.socket.setTimeout(0);
  }

  const client = {
    id: clientId,
    user: normalizedUser,
    req,
    res,
    connectedAt: Date.now(),
    heartbeatTimer: null
  };

  clients.set(clientId, client);

  safeWrite(client, ": connected\n\n");
  writeSseEvent(client, {
    id: String(++lastEventSequence),
    event: "connected",
    data: {
      kind: "connected",
      clientId,
      serverTime: new Date().toISOString()
    }
  });

  client.heartbeatTimer = setInterval(() => {
    const stillOpen = safeWrite(client, ": heartbeat\n\n");
    if (!stillOpen) {
      removeRealtimeClient(clientId);
    }
  }, HEARTBEAT_INTERVAL_MS);

  const close = () => {
    removeRealtimeClient(clientId);
  };

  req.on("close", close);
  req.on("error", close);
  res.on("close", close);
  res.on("error", close);

  return clientId;
}

function publishRealtimeEvent({ kind, payload = {}, visibility } = {}) {
  const eventKind = sanitizeEventKind(kind);
  const eventId = String(++lastEventSequence);
  const eventPayload = {
    kind: eventKind,
    sentAt: new Date().toISOString(),
    ...payload
  };

  for (const [clientId, client] of clients.entries()) {
    let isAllowed = true;
    if (typeof visibility === "function") {
      try {
        isAllowed = Boolean(visibility(client.user));
      } catch (error) {
        logger.warn({ err: error, clientId, eventKind }, "Error evaluando visibilidad realtime");
        isAllowed = false;
      }
    }

    if (!isAllowed) {
      continue;
    }

    const delivered = writeSseEvent(client, {
      id: eventId,
      event: eventKind,
      data: eventPayload
    });

    if (!delivered) {
      removeRealtimeClient(clientId);
    }
  }
}

function closeAllRealtimeClients() {
  for (const clientId of clients.keys()) {
    removeRealtimeClient(clientId);
  }
}

module.exports = {
  registerRealtimeClient,
  publishRealtimeEvent,
  closeAllRealtimeClients
};
