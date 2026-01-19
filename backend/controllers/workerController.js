const workerModel = require("../models/workerModel");
const notifModel = require("../models/notificationsModel");
const { supabase, supabaseAdmin, createConfirmedUser } = require("../supabaseClient");
const bcrypt = require("bcryptjs");

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

function clamp3(a) {
  const src = Array.isArray(a) ? a : [];
  return [src[0] ?? null, src[1] ?? null, src[2] ?? null];
}

const registerWorker = async (req, res) => {
  const { first_name, last_name, sex, email_address, password, is_agreed_to_terms, is_agreed_to_policy_nda } = req.body;
  try {
    const rawEmail = String(email_address || "").trim();
    const email = rawEmail.toLowerCase();
    if (!first_name || !last_name || !sex || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const map = req.session?.verifiedEmails || {};
    let verified = false;
    for (const key of Object.keys(map)) {
      if (String(key || "").trim().toLowerCase() === email && map[key] === true) {
        verified = true;
        break;
      }
    }
    if (!verified) {
      return res
        .status(400)
        .json({ message: "Please verify your email with the 6-digit code before creating an account." });
    }

    const exists = await workerModel.checkEmailExistenceAcrossAllUsers(email);
    if (exists.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const agreed_at = is_agreed_to_terms ? new Date().toISOString() : null;
    const policy_nda_agreed_at = is_agreed_to_policy_nda ? new Date().toISOString() : null;

    let authUser = null;

    const { user: createdUser, error: authError } = await createConfirmedUser(email, password, {
      first_name,
      last_name,
      sex,
      role: "worker",
      is_agreed_to_terms: !!is_agreed_to_terms,
      agreed_at,
      is_agreed_to_policy_nda: !!is_agreed_to_policy_nda,
      policy_nda_agreed_at,
    });

    if (authError) {
      if (authError.status === 422 || (authError.message && authError.message.toLowerCase().includes("already"))) {
        try {
          const { data, listError } = await supabaseAdmin.auth.admin.listUsers();
          if (!listError && data && Array.isArray(data.users)) {
            const existing = data.users.find((u) => String(u.email || "").trim().toLowerCase() === email);
            if (existing) authUser = existing;
          }
        } catch {}
      }
      if (!authUser) {
        return res
          .status(authError.status || 400)
          .json({ message: authError.message || "Signup failed", code: authError.code || undefined });
      }
    } else {
      authUser = createdUser;
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    await workerModel.createWorker(
      authUser.id,
      first_name,
      last_name,
      sex,
      email,
      hashedPassword,
      !!is_agreed_to_terms,
      agreed_at
    );

    try {
      await workerModel.upsertWorkerAgreements(
        authUser.id,
        email,
        !!is_agreed_to_policy_nda,
        !!is_agreed_to_policy_nda,
        policy_nda_agreed_at,
        { db: req.supabaseUser }
      );
    } catch {}

    if (req.session?.verifiedEmails) {
      const src = req.session.verifiedEmails;
      const next = {};
      Object.keys(src).forEach((k) => {
        if (String(k || "").trim().toLowerCase() !== email) next[k] = src[k];
      });
      req.session.verifiedEmails = next;
    }

    return res.status(201).json({
      message: "Worker registered successfully",
      data: {
        first_name,
        last_name,
        sex,
        is_agreed_to_terms: !!is_agreed_to_terms,
        agreed_at,
        auth_uid: authUser.id,
      },
    });
  } catch (e) {
    return res.status(400).json({ message: e?.message || "Internal server error" });
  }
};

const me = async (req, res) => {
  try {
    const s = sess(req);
    if (s.role !== "worker" || (!s.auth_uid && !s.email)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = await workerModel.getWorkerAccountProfile({ auth_uid: s.auth_uid, email: s.email }, { db: req.supabaseUser });
    return res.status(200).json(payload);
  } catch {
    return res.status(400).json({ message: "Failed to load profile" });
  }
};

const password = async (req, res) => {
  try {
    const s = sess(req);
    if (s.role !== "worker" || (!s.auth_uid && !s.email)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password || !new_password || new_password !== confirm_password) {
      return res.status(400).json({ message: "Invalid request" });
    }
    const row = await workerModel.getByAuthUid(s.auth_uid || null, { db: req.supabaseUser });
    const acctEmail = row?.email_address || s.email;
    const sign = await supabase.auth.signInWithPassword({ email: acctEmail, password: current_password });
    if (sign.error) return res.status(400).json({ message: "Current password is incorrect" });
    const uid = row?.auth_uid || s.auth_uid;
    await workerModel.updateAuthPassword(uid, new_password, { dbAuth: req.supabaseUser });
    const hashedNew = await bcrypt.hash(String(new_password), 12);
    await workerModel.updatePassword(uid, hashedNew, { db: req.supabaseUser });
    return res.status(200).json({ message: "Password updated" });
  } catch {
    return res.status(400).json({ message: "Failed to update password" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const s = sess(req);
    if (s.role !== "worker" || (!s.auth_uid && !s.email)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const patch = {};
    ["first_name", "last_name", "phone", "facebook", "instagram", "date_of_birth"].forEach((k) => {
      if (k in req.body) {
        const v = typeof req.body[k] === "string" ? req.body[k].trim() : req.body[k];
        patch[k] = v === "" ? null : v;
      }
    });

    const dbPatch = {};
    if ("first_name" in patch) dbPatch.first_name = patch.first_name;
    if ("last_name" in patch) dbPatch.last_name = patch.last_name;
    if ("phone" in patch) {
      if (patch.phone) {
        const stored = workerModel.normalizePHContactForStore(patch.phone);
        dbPatch.contact_number = stored || null;
      } else {
        dbPatch.contact_number = null;
      }
    }
    if ("facebook" in patch) dbPatch.social_facebook = patch.facebook ? workerModel.normalizeFacebook(patch.facebook) : null;
    if ("instagram" in patch) dbPatch.social_instagram = patch.instagram ? workerModel.normalizeInstagram(patch.instagram) : null;
    if ("date_of_birth" in patch) {
      dbPatch.date_of_birth = patch.date_of_birth ? patch.date_of_birth : null;
      const a = computeAge(patch.date_of_birth);
      dbPatch.age = a == null ? null : a;
    }

    if ("phone" in patch && patch.phone) {
      const taken = await workerModel.isContactNumberTakenAcrossAll(patch.phone, s.auth_uid);
      if (taken) return res.status(400).json({ message: "Contact number already in use" });
    }
    if ("facebook" in patch && patch.facebook) {
      const takenFb = await workerModel.isSocialLinkTakenAcrossAll("facebook", patch.facebook, s.auth_uid);
      if (takenFb) return res.status(400).json({ message: "Facebook already in use" });
    }
    if ("instagram" in patch && patch.instagram) {
      const takenIg = await workerModel.isSocialLinkTakenAcrossAll("instagram", patch.instagram, s.auth_uid);
      if (takenIg) return res.status(400).json({ message: "Instagram already in use" });
    }

    const hasAny = Object.keys(dbPatch).length > 0;
    const before = await workerModel.getByAuthUid(s.auth_uid || null, { db: req.supabaseUser });
    const uid = before?.auth_uid || s.auth_uid;

    if (hasAny) {
      await workerModel.updateWorkerProfile(uid, dbPatch, { db: req.supabaseUser });
      if ("first_name" in patch || "last_name" in patch) {
        const meta = {};
        if ("first_name" in patch) meta.first_name = patch.first_name || "";
        if ("last_name" in patch) meta.last_name = patch.last_name || "";
        await workerModel.updateAuthUserMeta(uid, meta, { dbAuth: req.supabaseUser });
      }
      const changes = [];
      if ("first_name" in patch || "last_name" in patch) changes.push("name");
      if ("phone" in patch) changes.push("contact number");
      if ("facebook" in patch) changes.push("facebook");
      if ("instagram" in patch) changes.push("instagram");
      if ("date_of_birth" in patch) changes.push("date of birth");
      const title = "Profile updated successfully";
      const message = changes.length ? `Updated ${changes.join(", ")}.` : "Your details are now up to date.";
      await notifModel.create({ auth_uid: uid, role: "worker", title, message });
    }

    const payload = await workerModel.getWorkerAccountProfile({ auth_uid: uid, email: s.email }, { db: req.supabaseUser });
    return res.status(200).json(payload);
  } catch {
    return res.status(400).json({ message: "Failed to update profile" });
  }
};

const publicSex = async (req, res) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    const auth_uid = String(req.query.auth_uid || "").trim();
    if (!email && !auth_uid) return res.status(400).json({ message: "Missing identifier" });

    let row = null;
    if (auth_uid) {
      const { data } = await supabaseAdmin.from("user_worker").select("sex, auth_uid, email_address").eq("auth_uid", auth_uid).limit(1);
      row = data && data[0] ? data[0] : null;
    }
    if (!row && email) {
      const { data } = await supabaseAdmin
        .from("user_worker")
        .select("sex, auth_uid, email_address")
        .ilike("email_address", email)
        .order("created_at", { ascending: false })
        .limit(1);
      row = data && data[0] ? data[0] : null;
    }

    return res.status(200).json({ sex: row?.sex || null });
  } catch {
    return res.status(400).json({ sex: null });
  }
};

const listPublicReviews = async (req, res) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    const auth_uid = String(req.query.auth_uid || "").trim();
    const request_group_id = String(req.query.request_group_id || "").trim() || null;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const out = await workerModel.listPublicReviews({ email, auth_uid, request_group_id, limit });
    return res.status(200).json(out);
  } catch {
    return res.status(200).json({ items: [], avg: 0, count: 0 });
  }
};

const getMyWorks = async (req, res) => {
  try {
    const s = sess(req);
    if (s.role !== "worker" || !s.auth_uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const row = await workerModel.getWorkerWorksByAuthUid(s.auth_uid, { db: supabaseAdmin });

    const best_works = [
      row?.best_work_1 ?? null,
      row?.best_work_2 ?? null,
      row?.best_work_3 ?? null,
    ];

    const previous_works = [
      row?.previous_work_1 ?? null,
      row?.previous_work_2 ?? null,
      row?.previous_work_3 ?? null,
    ];

    return res.status(200).json({ best_works, previous_works });
  } catch (e) {
    return res.status(200).json({ best_works: [null, null, null], previous_works: [null, null, null] });
  }
};

const saveMyWorks = async (req, res) => {
  try {
    const s = sess(req);
    if (s.role !== "worker" || !s.auth_uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const best = clamp3(req.body?.best_works || req.body?.bestWorks);
    const prev = clamp3(req.body?.previous_works || req.body?.previousWorks);

    const saved = await workerModel.upsertWorkerWorks(s.auth_uid, best, prev, { db: supabaseAdmin });

    const best_works = [
      saved?.best_work_1 ?? null,
      saved?.best_work_2 ?? null,
      saved?.best_work_3 ?? null,
    ];

    const previous_works = [
      saved?.previous_work_1 ?? null,
      saved?.previous_work_2 ?? null,
      saved?.previous_work_3 ?? null,
    ];

    return res.status(200).json({ best_works, previous_works });
  } catch (e) {
    return res.status(400).json({ message: e?.message || "Failed to save portfolio" });
  }
};

module.exports = {
  registerWorker,
  me,
  password,
  updateProfile,
  publicSex,
  listPublicReviews,
  getMyWorks,
  saveMyWorks,
};
