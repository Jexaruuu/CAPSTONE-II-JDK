const accountModel = require("../models/accountModel");
const { supabase } = require("../supabaseClient");

function parseCookie(str) {
  const out = {};
  if (!str) return out;
  str.split(";").forEach(p => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

function readAppUHeader(req) {
  const h = req.headers["x-app-u"];
  if (!h) return {};
  try { return JSON.parse(decodeURIComponent(h)); } catch { return {}; }
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
  return { role, email, auth_uid, id: s.id || null };
}

function computeAge(iso) {
  if (!iso) return null;
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a >= 0 && a <= 120 ? a : null;
}

exports.me = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || (!s.auth_uid && !s.email)) return res.status(401).json({ message: "Unauthorized" });
    if (s.role === "client") {
      const payload = await accountModel.getClientAccountProfile({ auth_uid: s.auth_uid, email: s.email });
      return res.status(200).json(payload);
    }
    if (s.role === "worker") {
      const payload = await accountModel.getWorkerAccountProfile({ auth_uid: s.auth_uid, email: s.email });
      return res.status(200).json(payload);
    }
    return res.status(401).json({ message: "Unauthorized" });
  } catch {
    return res.status(400).json({ message: "Failed to load profile" });
  }
};

exports.avatar = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || (!s.auth_uid && !s.email)) return res.status(401).json({ message: "Unauthorized" });
    let { data_url } = req.body || {};
    if ((!data_url || typeof data_url !== "string") && req.file && req.file.buffer && req.file.mimetype) {
      const b64 = req.file.buffer.toString("base64");
      data_url = `data:${req.file.mimetype};base64,${b64}`;
    }
    if (typeof data_url !== "string") return res.status(400).json({ message: "Invalid image" });
    const isImage = /^data:image\/[a-z0-9+.-]+;base64,/i.test(data_url.trim());
    if (!isImage) return res.status(400).json({ message: "Invalid image" });
    if (s.role === "client") {
      const row = await accountModel.getClientByAuthOrEmail({ auth_uid: s.auth_uid, email: s.email });
      const uid = row?.auth_uid || s.auth_uid;
      if (!uid) return res.status(401).json({ message: "Unauthorized" });
      const url = await accountModel.uploadClientAvatarDataUrl(uid, data_url);
      if (!url) return res.status(400).json({ message: "Failed to save avatar" });
      try { await accountModel.updateClientAvatarUrl(uid, url); } catch {}
      try { await accountModel.updateAuthUserAvatarMeta(uid, url); } catch {}
      return res.status(200).json({ avatar_url: url });
    }
    if (s.role === "worker") {
      const row = await accountModel.getWorkerByAuthOrEmail({ auth_uid: s.auth_uid, email: s.email });
      const uid = row?.auth_uid || s.auth_uid;
      if (!uid) return res.status(401).json({ message: "Unauthorized" });
      const url = await accountModel.uploadWorkerAvatarDataUrl(uid, data_url);
      if (!url) return res.status(400).json({ message: "Failed to save avatar" });
      try { await accountModel.updateWorkerAvatarUrl(uid, url); } catch {}
      try { await accountModel.updateAuthUserAvatarMeta(uid, url); } catch {}
      return res.status(200).json({ avatar_url: url });
    }
    return res.status(401).json({ message: "Unauthorized" });
  } catch {
    return res.status(400).json({ message: "Failed to save avatar" });
  }
};

exports.removeAvatar = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || (!s.auth_uid && !s.email)) return res.status(401).json({ message: "Unauthorized" });
    if (s.role === "client") {
      const row = await accountModel.getClientByAuthOrEmail({ auth_uid: s.auth_uid, email: s.email });
      const uid = row?.auth_uid || s.auth_uid;
      if (!uid) return res.status(401).json({ message: "Unauthorized" });
      await accountModel.clearClientAvatar(uid);
      try { await accountModel.updateAuthUserAvatarMeta(uid, null); } catch {}
      return res.status(200).json({ avatar_url: "" });
    }
    if (s.role === "worker") {
      const row = await accountModel.getWorkerByAuthOrEmail({ auth_uid: s.auth_uid, email: s.email });
      const uid = row?.auth_uid || s.auth_uid;
      if (!uid) return res.status(401).json({ message: "Unauthorized" });
      await accountModel.clearWorkerAvatar(uid);
      try { await accountModel.updateAuthUserAvatarMeta(uid, null); } catch {}
      return res.status(200).json({ avatar_url: "" });
    }
    return res.status(401).json({ message: "Unauthorized" });
  } catch {
    return res.status(400).json({ message: "Failed to remove avatar" });
  }
};

exports.password = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || (!s.auth_uid && !s.email)) return res.status(401).json({ message: "Unauthorized" });
    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password || !new_password || new_password !== confirm_password) return res.status(400).json({ message: "Invalid request" });
    if (s.role === "client") {
      const row = await accountModel.getClientByAuthOrEmail({ auth_uid: s.auth_uid, email: s.email });
      const acctEmail = row?.email_address || s.email;
      const sign = await supabase.auth.signInWithPassword({ email: acctEmail, password: current_password });
      if (sign.error) return res.status(400).json({ message: "Current password is incorrect" });
      const uid = row?.auth_uid || s.auth_uid;
      await accountModel.updateAuthPassword(uid, new_password);
      await accountModel.updateClientPassword(uid, new_password);
      return res.status(200).json({ message: "Password updated" });
    }
    if (s.role === "worker") {
      const row = await accountModel.getWorkerByAuthOrEmail({ auth_uid: s.auth_uid, email: s.email });
      const acctEmail = row?.email_address || s.email;
      const sign = await supabase.auth.signInWithPassword({ email: acctEmail, password: current_password });
      if (sign.error) return res.status(400).json({ message: "Current password is incorrect" });
      const uid = row?.auth_uid || s.auth_uid;
      await accountModel.updateAuthPassword(uid, new_password);
      await accountModel.updateWorkerPassword(uid, new_password);
      return res.status(200).json({ message: "Password updated" });
    }
    return res.status(401).json({ message: "Unauthorized" });
  } catch {
    return res.status(400).json({ message: "Failed to update password" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || (!s.auth_uid && !s.email)) return res.status(401).json({ message: "Unauthorized" });

    const patch = {};
    ["first_name","last_name","phone","facebook","instagram","date_of_birth"].forEach(k => {
      if (k in req.body) {
        const v = typeof req.body[k] === "string" ? req.body[k].trim() : req.body[k];
        patch[k] = v === "" ? null : v;
      }
    });

    const dbPatch = {};
    if ("first_name" in patch) dbPatch.first_name = patch.first_name;
    if ("last_name" in patch) dbPatch.last_name = patch.last_name;
    if ("phone" in patch) dbPatch.contact_number = patch.phone ? patch.phone : null;
    if ("facebook" in patch) dbPatch.social_facebook = patch.facebook ? accountModel.normalizeFacebook(patch.facebook) : null;
    if ("instagram" in patch) dbPatch.social_instagram = patch.instagram ? accountModel.normalizeInstagram(patch.instagram) : null;
    if ("date_of_birth" in patch) {
      dbPatch.date_of_birth = patch.date_of_birth ? patch.date_of_birth : null;
      const a = computeAge(patch.date_of_birth);
      dbPatch.age = a == null ? null : a;
    }

    if ("phone" in patch && patch.phone) {
      const taken = await accountModel.isContactNumberTakenAcrossAll(patch.phone, s.auth_uid);
      if (taken) return res.status(400).json({ message: "Contact number already in use" });
    }
    if ("facebook" in patch && patch.facebook) {
      const takenFb = await accountModel.isSocialLinkTakenAcrossAll("facebook", patch.facebook, s.auth_uid);
      if (takenFb) return res.status(400).json({ message: "Facebook already in use" });
    }
    if ("instagram" in patch && patch.instagram) {
      const takenIg = await accountModel.isSocialLinkTakenAcrossAll("instagram", patch.instagram, s.auth_uid);
      if (takenIg) return res.status(400).json({ message: "Instagram already in use" });
    }

    const hasAny = Object.keys(dbPatch).length > 0;

    if (s.role === "client") {
      const row = await accountModel.getClientByAuthOrEmail({ auth_uid: s.auth_uid, email: s.email });
      const uid = row?.auth_uid || s.auth_uid;
      if (hasAny) {
        await accountModel.updateClientProfile(uid, dbPatch);
        if ("first_name" in patch || "last_name" in patch) {
          const meta = {};
          if ("first_name" in patch) meta.first_name = patch.first_name || "";
          if ("last_name" in patch) meta.last_name = patch.last_name || "";
          await accountModel.updateAuthUserMeta(uid, meta);
        }
      }
      const payload = await accountModel.getClientAccountProfile({ auth_uid: uid, email: s.email });
      return res.status(200).json(payload);
    }

    if (s.role === "worker") {
      const row = await accountModel.getWorkerByAuthOrEmail({ auth_uid: s.auth_uid, email: s.email });
      const uid = row?.auth_uid || s.auth_uid;
      if (hasAny) {
        await accountModel.updateWorkerProfile(uid, dbPatch);
        if ("first_name" in patch || "last_name" in patch) {
          const meta = {};
          if ("first_name" in patch) meta.first_name = patch.first_name || "";
          if ("last_name" in patch) meta.last_name = patch.last_name || "";
          await accountModel.updateAuthUserMeta(uid, meta);
        }
      }
      const payload = await accountModel.getWorkerAccountProfile({ auth_uid: uid, email: s.email });
      return res.status(200).json(payload);
    }

    return res.status(401).json({ message: "Unauthorized" });
  } catch (e) {
    return res.status(400).json({ message: "Failed to update profile" });
  }
};
