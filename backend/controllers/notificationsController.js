const notifModel = require("../models/notificationsModel");
const accountModel = require("../models/accountModel");

function parseCookie(str){const out={};if(!str)return out;str.split(";").forEach(p=>{const i=p.indexOf("=");if(i>-1)out[p.slice(0,i).trim()]=p.slice(i+1).trim();});return out;}
function readAppUHeader(req){const h=req.headers["x-app-u"];if(!h)return{};try{return JSON.parse(decodeURIComponent(h));}catch{return{};}}
function readAppUQuery(req){const q=req.query?.app_u;if(!q)return{};try{return JSON.parse(decodeURIComponent(q));}catch{return{};}}
function sess(req){
  const s=req.session?.user||{};
  let role=s.role;let email=s.email_address||null;let auth_uid=s.auth_uid||null;
  if(!role||(!email&&!auth_uid)){const c=parseCookie(req.headers.cookie||"");if(c.app_u){try{const j=JSON.parse(decodeURIComponent(c.app_u));role=role||j.r;email=email||j.e||null;auth_uid=auth_uid||j.au||null;}catch{}}}
  if(!role||(!email&&!auth_uid)){const h=readAppUHeader(req);if(h&&(h.e||h.au)){role=role||h.r;email=email||h.e||null;auth_uid=auth_uid||h.au||null;}}
  return { role, email, auth_uid };
}
async function ensureAuthUid(s){
  if(s.auth_uid) return s.auth_uid;
  if(!s.role||!s.email) return null;
  if(s.role==="client"){
    const row=await accountModel.getClientByAuthOrEmail({auth_uid:null,email:s.email});
    return row?.auth_uid||null;
  }
  if(s.role==="worker"){
    const row=await accountModel.getWorkerByAuthOrEmail({auth_uid:null,email:s.email});
    return row?.auth_uid||null;
  }
  return null;
}

exports.list = async (req, res) => {
  try {
    const s = sess(req);
    const au = await ensureAuthUid(s);
    if (!au) return res.status(401).json({ message: "Unauthorized" });
    const items = await notifModel.listByUser({ auth_uid: au, role: s.role, limit: 100 });
    return res.status(200).json({ items });
  } catch {
    return res.status(400).json({ message: "Failed to load notifications" });
  }
};

exports.read = async (req, res) => {
  try {
    const s = sess(req);
    const au = await ensureAuthUid(s);
    if (!au) return res.status(401).json({ message: "Unauthorized" });
    await notifModel.markRead({ id: req.params.id, auth_uid: au });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(400).json({ message: "Failed to mark read" });
  }
};

exports.readAll = async (req, res) => {
  try {
    const s = sess(req);
    const au = await ensureAuthUid(s);
    if (!au) return res.status(401).json({ message: "Unauthorized" });
    await notifModel.markAllRead({ auth_uid: au });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(400).json({ message: "Failed to mark all read" });
  }
};

exports.remove = async (req, res) => {
  try {
    const s = sess(req);
    const au = await ensureAuthUid(s);
    if (!au) return res.status(401).json({ message: "Unauthorized" });
    await notifModel.remove({ id: req.params.id, auth_uid: au });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(400).json({ message: "Failed to delete notification" });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const s = sess(req);
    const au = await ensureAuthUid(s);
    if (!au) return res.status(401).json({ message: "Unauthorized" });
    const count = await notifModel.unreadCount({ auth_uid: au });
    return res.status(200).json({ count });
  } catch {
    return res.status(400).json({ message: "Failed to fetch count" });
  }
};

exports.create = async (req, res) => {
  try {
    const s = sess(req);
    const au = await ensureAuthUid(s);
    if (!au) return res.status(401).json({ message: "Unauthorized" });
    const { title, message, role } = req.body || {};
    const row = await notifModel.create({ auth_uid: au, role: role || s.role || null, title: title || "Notification", message: message || "" });
    return res.status(200).json(row || { ok: true });
  } catch {
    return res.status(400).json({ message: "Failed to create notification" });
  }
};

exports.stream = async (req, res) => {
  try {
    let s = sess(req);
    if (!s.auth_uid) {
      const h = readAppUQuery(req);
      if (h && (h.e || h.au)) s = { role: h.r || s.role, email: h.e || s.email, auth_uid: h.au || s.auth_uid };
    }
    const au = await ensureAuthUid(s);
    if (!au) return res.status(401).end();
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const send = (event, payload) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    let lastCount = -1;
    let lastLatestId = "";
    let closed = false;
    const tick = async () => {
      if (closed) return;
      try {
        const [count, latest] = await Promise.all([
          notifModel.unreadCount({ auth_uid: au }),
          notifModel.latestByUser({ auth_uid: au })
        ]);
        if (Number.isFinite(count) && count !== lastCount) {
          lastCount = count;
          send("count", { count });
        }
        if (latest && latest.id && latest.id !== lastLatestId) {
          lastLatestId = latest.id;
          send("notification", latest);
        }
      } catch {}
    };
    const iv = setInterval(tick, 3000);
    const keep = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => {
      closed = true;
      clearInterval(iv);
      clearInterval(keep);
    });
    tick();
  } catch {
    try { res.status(400).end(); } catch {}
  }
};
