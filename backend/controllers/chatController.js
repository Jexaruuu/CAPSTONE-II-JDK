const chatModel = require("../models/chatModel");

function parseCookie(str) {
  const out = {};
  if (!str) return out;
  str.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

function readAppUHeader(req) {
  const h = req.headers["x-app-u"];
  if (!h) return {};
  try {
    return JSON.parse(decodeURIComponent(h));
  } catch {
    return {};
  }
}

function readAppUQuery(req) {
  const q = req.query?.app_u;
  if (!q) return {};
  try {
    return JSON.parse(decodeURIComponent(q));
  } catch {
    return {};
  }
}

function sess(req) {
  const s = req.session?.user || {};
  let role = s.role;
  let email = s.email_address || null;
  let auth_uid = s.auth_uid || null;

  if (!role || (!email && !auth_uid)) {
    const c = parseCookie(req.headers.cookie || "");
    if (c.app_u) {
      try {
        const j = JSON.parse(decodeURIComponent(c.app_u));
        role = role || j.r;
        email = email || j.e || null;
        auth_uid = auth_uid || j.au || null;
      } catch {}
    }
  }

  if (!role || (!email && !auth_uid)) {
    const h = readAppUHeader(req);
    if (h && (h.e || h.au)) {
      role = role || h.r;
      email = email || h.e || null;
      auth_uid = auth_uid || h.au || null;
    }
  }

  if (!role || (!email && !auth_uid)) {
    const q = readAppUQuery(req);
    if (q && (q.e || q.au)) {
      role = role || q.r;
      email = email || q.e || null;
      auth_uid = auth_uid || q.au || null;
    }
  }

  return { role, email, auth_uid };
}

const ensure = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || !s.auth_uid) return res.status(401).json({ message: "Unauthorized" });

    const role = String(s.role || "").toLowerCase();
    const toUid = String(req.body?.to_auth_uid || req.body?.toUid || "").trim();
    const toEmail = String(req.body?.to_email || req.body?.to || "").trim().toLowerCase();

    let client_uid = null;
    let worker_uid = null;

    if (role === "client") {
      client_uid = s.auth_uid;
      if (toUid) worker_uid = toUid;
      if (!worker_uid && toEmail) {
        const w = await chatModel.findWorkerByEmail(toEmail);
        worker_uid = w?.auth_uid || null;
      }
    } else if (role === "worker") {
      worker_uid = s.auth_uid;
      if (toUid) client_uid = toUid;
      if (!client_uid && toEmail) {
        const c = await chatModel.findClientByEmail(toEmail);
        client_uid = c?.auth_uid || null;
      }
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!client_uid || !worker_uid) return res.status(400).json({ message: "Invalid target user" });

    const convo = await chatModel.ensureConversation(client_uid, worker_uid);

    const peer =
      role === "client"
        ? await chatModel.getWorkerSummary(worker_uid)
        : await chatModel.getClientSummary(client_uid);

    return res.status(200).json({
      conversation: {
        id: convo?.id,
        name: peer?.name || "User",
        avatarUrl: peer?.avatarUrl || null,
        subtitle: peer?.role ? peer.role.toUpperCase() : ""
      }
    });
  } catch (e) {
    return res.status(400).json({ message: e?.message || "Failed" });
  }
};

const conversations = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || !s.auth_uid) return res.status(401).json({ message: "Unauthorized" });
    const role = String(s.role || "").toLowerCase();
    if (role !== "client" && role !== "worker") return res.status(401).json({ message: "Unauthorized" });

    const items = await chatModel.listConversationsForUser(s.auth_uid, role);
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(400).json({ message: e?.message || "Failed" });
  }
};

const messages = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || !s.auth_uid) return res.status(401).json({ message: "Unauthorized" });
    const conversation_id = String(req.params.conversationId || "").trim();
    if (!conversation_id) return res.status(400).json({ message: "Missing conversation id" });

    const limit = req.query?.limit;
    const list = await chatModel.listMessages(conversation_id, s.auth_uid, limit);
    await chatModel.markRead(conversation_id, s.auth_uid).catch(() => {});
    return res.status(200).json({ items: list });
  } catch (e) {
    return res.status(400).json({ message: e?.message || "Failed" });
  }
};

const send = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || !s.auth_uid) return res.status(401).json({ message: "Unauthorized" });
    const role = String(s.role || "").toLowerCase();
    if (role !== "client" && role !== "worker") return res.status(401).json({ message: "Unauthorized" });

    const conversation_id = String(req.params.conversationId || "").trim();
    if (!conversation_id) return res.status(400).json({ message: "Missing conversation id" });

    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ message: "Message cannot be empty" });

    await chatModel.sendMessage(conversation_id, s.auth_uid, role, text);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: e?.message || "Failed" });
  }
};

const markRead = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || !s.auth_uid) return res.status(401).json({ message: "Unauthorized" });
    const conversation_id = String(req.params.conversationId || "").trim();
    if (!conversation_id) return res.status(400).json({ message: "Missing conversation id" });
    await chatModel.markRead(conversation_id, s.auth_uid);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ message: e?.message || "Failed" });
  }
};

module.exports = { ensure, conversations, messages, send, markRead };
