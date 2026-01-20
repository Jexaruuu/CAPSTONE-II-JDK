const { supabaseAdmin } = require("../supabaseClient");

async function getAuthUserById(auth_uid) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(auth_uid);
    if (error) return null;
    return data?.user || null;
  } catch {
    return null;
  }
}

function safeName(first, last) {
  const a = String(first || "").trim();
  const b = String(last || "").trim();
  const full = [a, b].filter(Boolean).join(" ").trim();
  return full || "User";
}

async function getClientSummary(auth_uid) {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_client")
      .select("auth_uid, first_name, last_name, email_address")
      .eq("auth_uid", auth_uid)
      .limit(1);

    if (error) throw error;
    const row = data && data[0] ? data[0] : null;
    const user = await getAuthUserById(auth_uid);

    const name = safeName(row?.first_name || user?.user_metadata?.first_name, row?.last_name || user?.user_metadata?.last_name);
    const avatarUrl =
      row?.profile_picture_url ||
      user?.user_metadata?.profile_picture_url ||
      user?.user_metadata?.avatar_url ||
      null;

    return {
      auth_uid,
      role: "client",
      name,
      email_address: row?.email_address || user?.email || "",
      avatarUrl
    };
  } catch {
    const user = await getAuthUserById(auth_uid);
    return {
      auth_uid,
      role: "client",
      name: safeName(user?.user_metadata?.first_name, user?.user_metadata?.last_name),
      email_address: user?.email || "",
      avatarUrl: user?.user_metadata?.profile_picture_url || user?.user_metadata?.avatar_url || null
    };
  }
}

async function getWorkerSummary(auth_uid) {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_worker")
      .select("auth_uid, first_name, last_name, email_address")
      .eq("auth_uid", auth_uid)
      .limit(1);

    if (error) throw error;
    const row = data && data[0] ? data[0] : null;
    const user = await getAuthUserById(auth_uid);

    const name = safeName(row?.first_name || user?.user_metadata?.first_name, row?.last_name || user?.user_metadata?.last_name);
    const avatarUrl =
      row?.profile_picture_url ||
      user?.user_metadata?.profile_picture_url ||
      user?.user_metadata?.avatar_url ||
      null;

    return {
      auth_uid,
      role: "worker",
      name,
      email_address: row?.email_address || user?.email || "",
      avatarUrl
    };
  } catch {
    const user = await getAuthUserById(auth_uid);
    return {
      auth_uid,
      role: "worker",
      name: safeName(user?.user_metadata?.first_name, user?.user_metadata?.last_name),
      email_address: user?.email || "",
      avatarUrl: user?.user_metadata?.profile_picture_url || user?.user_metadata?.avatar_url || null
    };
  }
}

async function findWorkerByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  const { data, error } = await supabaseAdmin
    .from("user_worker")
    .select("auth_uid, email_address")
    .ilike("email_address", e)
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function findClientByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  const { data, error } = await supabaseAdmin
    .from("user_client")
    .select("auth_uid, email_address")
    .ilike("email_address", e)
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

async function ensureConversation(client_auth_uid, worker_auth_uid) {
  const { data: existing, error: e1 } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .eq("client_auth_uid", client_auth_uid)
    .eq("worker_auth_uid", worker_auth_uid)
    .limit(1);

  if (e1) throw e1;

  let convo = existing && existing[0] ? existing[0] : null;

  if (!convo) {
    const { data: created, error: e2 } = await supabaseAdmin
      .from("chat_conversations")
      .insert([
        {
          client_auth_uid,
          worker_auth_uid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select("*")
      .limit(1);

    if (e2) throw e2;
    convo = created && created[0] ? created[0] : null;
  }

  if (convo?.id) {
    await supabaseAdmin
      .from("chat_participants")
      .upsert(
        [
          { conversation_id: convo.id, auth_uid: client_auth_uid, role: "client", updated_at: new Date().toISOString() },
          { conversation_id: convo.id, auth_uid: worker_auth_uid, role: "worker", updated_at: new Date().toISOString() }
        ],
        { onConflict: "conversation_id,auth_uid" }
      );
  }

  return convo;
}

async function listConversationsForUser(auth_uid, role) {
  const isClient = role === "client";
  const key = isClient ? "client_auth_uid" : "worker_auth_uid";

  const { data, error } = await supabaseAdmin
    .from("chat_conversations")
    .select("*")
    .eq(key, auth_uid)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const convos = Array.isArray(data) ? data : [];

  const ids = convos.map((c) => c.id).filter(Boolean);
  const { data: lastMsgs } = ids.length
    ? await supabaseAdmin
        .from("chat_messages")
        .select("conversation_id, text, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] };

  const lastMap = {};
  (Array.isArray(lastMsgs) ? lastMsgs : []).forEach((m) => {
    if (!lastMap[m.conversation_id]) lastMap[m.conversation_id] = m;
  });

  const { data: parts } = ids.length
    ? await supabaseAdmin
        .from("chat_participants")
        .select("conversation_id, auth_uid, last_read_at")
        .in("conversation_id", ids)
        .eq("auth_uid", auth_uid)
    : { data: [] };

  const readMap = {};
  (Array.isArray(parts) ? parts : []).forEach((p) => {
    readMap[p.conversation_id] = p.last_read_at ? new Date(p.last_read_at).getTime() : 0;
  });

  const out = [];
  for (const c of convos) {
    const peerUid = isClient ? c.worker_auth_uid : c.client_auth_uid;
    const peer = isClient ? await getWorkerSummary(peerUid) : await getClientSummary(peerUid);
    const last = lastMap[c.id];
    const myLastRead = readMap[c.id] || 0;

    let unreadCount = 0;
    try {
      const { count } = await supabaseAdmin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .gt("created_at", myLastRead ? new Date(myLastRead).toISOString() : "1970-01-01T00:00:00.000Z")
        .neq("sender_auth_uid", auth_uid);

      unreadCount = Number.isFinite(count) ? count : 0;
    } catch {
      unreadCount = 0;
    }

    out.push({
      id: c.id,
      peer_auth_uid: peerUid,
      name: peer?.name || "User",
      avatarUrl: peer?.avatarUrl || null,
      subtitle: peer?.role ? peer.role.toUpperCase() : "",
      lastMessage: last?.text || "",
      updated_at: c.updated_at || c.created_at,
      unreadCount
    });
  }

  return out;
}

async function listMessages(conversation_id, auth_uid, limit = 200) {
  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(500, Number(limit) || 200)));

  if (error) throw error;

  const list = Array.isArray(data) ? data : [];
  return list.map((m) => {
    const mine = String(m.sender_auth_uid || "") === String(auth_uid || "");
    return {
      id: m.id,
      mine,
      text: m.text || "",
      time: m.created_at
        ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : ""
    };
  });
}

async function sendMessage(conversation_id, sender_auth_uid, sender_role, text) {
  const msg = String(text || "").trim();
  if (!msg) return null;

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .insert([
      {
        conversation_id,
        sender_auth_uid,
        sender_role,
        text: msg,
        created_at: now
      }
    ])
    .select("*")
    .limit(1);

  if (error) throw error;

  await supabaseAdmin
    .from("chat_conversations")
    .update({ updated_at: now })
    .eq("id", conversation_id);

  return data && data[0] ? data[0] : null;
}

async function markRead(conversation_id, auth_uid) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("chat_participants")
    .upsert(
      [{ conversation_id, auth_uid, last_read_at: now, updated_at: now }],
      { onConflict: "conversation_id,auth_uid" }
    );
  if (error) throw error;
  return true;
}

module.exports = {
  ensureConversation,
  listConversationsForUser,
  listMessages,
  sendMessage,
  markRead,
  findWorkerByEmail,
  findClientByEmail,
  getClientSummary,
  getWorkerSummary
};
