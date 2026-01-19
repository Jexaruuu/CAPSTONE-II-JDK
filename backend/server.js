require("dotenv").config();

(function ensureServiceRoleKey() {
  const strip = (s) => (typeof s === "string" ? s.trim().replace(/^['"]|['"]$/g, "") : s);
  process.env.SUPABASE_URL = strip(process.env.SUPABASE_URL || "");
  process.env.SUPABASE_ANON_KEY = strip(process.env.SUPABASE_ANON_KEY || "");
  process.env.SUPABASE_SERVICE_ROLE_KEY = strip(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mask = v.length > 16 ? `${v.slice(0, 6)}...${v.slice(-6)}` : "set";
    console.log(`[boot] SRK loaded: ${mask}`);
  } else {
    console.error("[boot] Missing SUPABASE_SERVICE_ROLE_KEY");
  }
})();

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");

const clientRoutes = require("./routes/clientRoutes");
const workerRoutes = require("./routes/workerRoutes");
const loginRoutes = require("./routes/loginRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const {
  resendSignupEmail,
  setDefaultRedirectBase,
  ensureStorageBucket,
  getSupabaseFromRequest,
  getSupabaseAdmin,
} = require("./supabaseClient");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const clientModel = require("./models/clientModel");
const workerModel = require("./models/workerModel");
const adminModel = require("./models/adminModel");

const clientservicerequestsRoutes = require("./routes/clientservicerequestsRoutes");
const adminservicerequestsRoutes = require("./routes/adminservicerequestsRoutes");
const workerapplicationRoutes = require("./routes/workerapplicationRoutes");
const adminworkerapplicationRoutes = require("./routes/adminworkerapplicationRoutes");
const clientservicerequeststatusRoutes = require("./routes/clientservicerequeststatusRoutes");
const workerapplicationstatusRoutes = require("./routes/workerapplicationstatusRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const adminServiceRequestsRoutes = require("./routes/adminservicerequestsRoutes");

const workerapplicationController = require("./controllers/workerapplicationController");

dotenv.config();

try {
  getSupabaseAdmin();
  console.log("[boot] Supabase admin client initialized");
} catch (e) {
  console.error("[boot] Failed to init Supabase admin client:", e?.message || e);
  throw e;
}

const app = express();
const PORT = process.env.PORT || 5000;

const rawAllowed = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const escapeRegex = (s) => s.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
const wcToReg = (pat) => new RegExp("^" + escapeRegex(pat.trim()).replace(/\*/g, ".*") + "$");
const allowedRegexes = rawAllowed.map(wcToReg);
const isLocal = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
  /^https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
const isAllowed = (origin) => !origin || isLocal(origin) || allowedRegexes.some((rx) => rx.test(origin));
const corsOrigin = (origin, cb) => (isAllowed(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS")));

app.use(cors({ origin: corsOrigin, credentials: true }));

app.use((req, res, next) => {
  const o = req.headers.origin;
  const base = isAllowed(o) ? o : process.env.PUBLIC_APP_URL || "";
  if (base) setDefaultRedirectBase(base);
  next();
});

const BODY_LIMIT = process.env.MAX_BODY_SIZE || "25mb";

app.use(express.json({ limit: BODY_LIMIT, type: ["application/json", "application/*+json", "text/plain"] }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

const useSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const cookieSameSite = useSecure ? "none" : "lax";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: useSecure,
      httpOnly: true,
      sameSite: cookieSameSite,
      domain: process.env.COOKIEDOMAIN || process.env.COOKIE_DOMAIN || undefined,
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

app.use((req, _res, next) => {
  try {
    req.supabaseUser = getSupabaseFromRequest(req);
  } catch {}
  next();
});

app.use((req, res, next) => {
  try {
    if (!req.session.user) {
      const h = req.headers["x-app-u"];
      if (h) {
        const j = JSON.parse(decodeURIComponent(h));
        if (j && j.r && (j.e || j.au)) req.session.user = { role: j.r, email_address: j.e || null, auth_uid: j.au || null };
      }
    }
    if (!req.session.user) {
      const m = /(?:^|;\s*)app_u=([^;]+)/.exec(req.headers.cookie || "");
      if (m) {
        const j = JSON.parse(decodeURIComponent(m[1]));
        if (j && j.r && (j.e || j.au)) req.session.user = { role: j.r, email_address: j.e || null, auth_uid: j.au || null };
      }
    }
  } catch {}
  next();
});

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

app.get("/api/account/me", async (req, res) => {
  try {
    const s = sess(req);
    if (!s.role || (!s.auth_uid && !s.email)) return res.status(401).json({ message: "Unauthorized" });
    if (s.role === "client") {
      const payload = await clientModel.getClientAccountProfile({ auth_uid: s.auth_uid, email: s.email }, { db: req.supabaseUser });
      return res.status(200).json(payload);
    }
    if (s.role === "worker") {
      const payload = await workerModel.getWorkerAccountProfile({ auth_uid: s.auth_uid, email: s.email }, { db: req.supabaseUser });
      return res.status(200).json(payload);
    }
    if (s.role === "admin") {
      if (typeof adminModel.getAdminAccountProfile === "function") {
        const payload = await adminModel.getAdminAccountProfile({ auth_uid: s.auth_uid, email: s.email });
        return res.status(200).json(payload);
      }
      return res.status(200).json({ auth_uid: s.auth_uid || "", email_address: s.email || "", role: "admin" });
    }
    return res.status(400).json({ message: "Unknown role" });
  } catch {
    return res.status(400).json({ message: "Failed to load account" });
  }
});

app.get("/api/workers/me", async (req, res) => {
  try {
    const s = sess(req);
    if (s.role !== "worker" || (!s.auth_uid && !s.email)) return res.status(401).json({ message: "Unauthorized" });
    const payload = await workerModel.getWorkerAccountProfile({ auth_uid: s.auth_uid, email: s.email }, { db: req.supabaseUser });
    return res.status(200).json(payload);
  } catch {
    return res.status(400).json({ message: "Failed to load account" });
  }
});

app.get("/test", (req, res) => res.json({ message: "Server is up and running" }));
app.get("/healthz", (req, res) => res.status(200).send("ok"));

const nodemailerTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

nodemailerTransport
  .verify()
  .then(() => {
    console.log("SMTP connection verified");
  })
  .catch((err) => {
    console.error("SMTP connection error", err);
  });

function buildOtpEmail({ brandName, code, minutesValid, supportEmail }) {
  const prettyCode = String(code || "")
    .trim()
    .split("")
    .join(" ");
  const preheader = `Your verification code is ${code}. Expires in ${minutesValid} minutes.`;
  const subject = `Your ${brandName} verification code`;
  const text =
    `${brandName}\n\n` +
    `Your verification code is: ${code}\n` +
    `This code will expire in ${minutesValid} minutes.\n\n` +
    `If you didn't request this, you can ignore this email.\n` +
    (supportEmail ? `\nNeed help? Contact ${supportEmail}\n` : "");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:16px;font-weight:700;">
                    ${brandName}
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;">
                    Security verification
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:22px 22px 0 22px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:20px;font-weight:700;line-height:1.25;">
                      Verify your email
                    </div>
                    <div style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:14px;line-height:1.6;padding-top:8px;">
                      Use the code below to finish signing in. This code expires in <b>${minutesValid} minutes</b>.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:18px 22px 0 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;">
                      <tr>
                        <td align="center" style="padding:16px 14px;">
                          <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:28px;font-weight:800;letter-spacing:6px;">
                            ${prettyCode}
                          </div>
                          <div style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;line-height:1.5;padding-top:8px;">
                            If you didn’t request this code, you can safely ignore this email.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:18px 22px 22px 22px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;line-height:1.6;">
                      For your security, never share this code with anyone.
                      ${supportEmail ? `<br/>Need help? Contact <span style="color:#111827;">${supportEmail}</span>.` : ""}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 6px 0 6px;">
              <div style="font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
                © ${new Date().getFullYear()} ${brandName}. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, text, html };
}

const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PEPPER = process.env.OTP_SECRET || "otp_pepper_dev";
const hashOtp = (email, code) => crypto.createHash("sha256").update(`${email}:${code}:${OTP_PEPPER}`).digest("hex");
const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

app.post("/api/auth/request-otp", async (req, res) => {
  try {
    const email = String((req.body || {}).email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });
    const existing = otpStore.get(email);
    const now = Date.now();
    if (existing && existing.lastSentAt && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting another code.` });
    }
    const code = generateCode();
    const hash = hashOtp(email, code);
    otpStore.set(email, { hash, expiresAt: now + OTP_TTL_MS, attempts: 0, lastSentAt: now });

    const brandName = process.env.EMAIL_BRAND_NAME || "JDK HOMECARE";
    const minutesValid = Math.round(OTP_TTL_MS / 60000);
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost";
    const supportEmail = process.env.SUPPORT_EMAIL || "";

    const emailTpl = buildOtpEmail({ brandName, code, minutesValid, supportEmail });

    await nodemailerTransport.sendMail({
      from: `"${brandName}" <${from}>`,
      to: email,
      subject: emailTpl.subject,
      text: emailTpl.text,
      html: emailTpl.html,
    });

    return res.status(200).json({ message: "OTP sent" });
  } catch (err) {
    console.error("OTP email send error", err);
    return res.status(500).json({ message: "Failed to send OTP email. Check SMTP settings." });
  }
});

app.post("/api/auth/verify-otp", (req, res) => {
  try {
    const email = String((req.body || {}).email || "").trim().toLowerCase();
    const code = String((req.body || {}).code || "").trim();
    if (!email || !code) return res.status(400).json({ message: "Email and code are required" });
    const rec = otpStore.get(email);
    if (!rec) return res.status(400).json({ message: "No OTP requested for this email." });
    const now = Date.now();
    if (now > rec.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }
    if (rec.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(email);
      return res.status(429).json({ message: "Too many attempts. Please request a new code." });
    }
    const ok = rec.hash === hashOtp(email, code);
    rec.attempts += 1;
    if (!ok) {
      otpStore.set(email, rec);
      return res.status(400).json({ message: "Invalid code. Please try again." });
    }
    otpStore.delete(email);
    if (!req.session.verifiedEmails) req.session.verifiedEmails = {};
    req.session.verifiedEmails[email] = true;
    return res.status(200).json({ message: "OTP verified." });
  } catch {
    return res.status(400).json({ message: "OTP verification failed." });
  }
});

app.post("/api/auth/resend", async (req, res) => {
  try {
    const email = String((req.body || {}).email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });
    await resendSignupEmail(email);
    return res.status(200).json({ message: "Verification email resent." });
  } catch (err) {
    const status = err?.status || 400;
    return res.status(status).json({ message: err?.message || "Failed to resend verification." });
  }
});

app.use("/api", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/worker", workerRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationsRoutes);

app.use("/api/clientservicerequests", clientservicerequestsRoutes);
app.use("/api/client/service-requests", clientservicerequestsRoutes);
app.use("/api/admin/servicerequests", adminservicerequestsRoutes);
app.use("/api/workerapplication", workerapplicationRoutes);
app.use("/api/workerapplications", workerapplicationRoutes);
app.use("/api/client/servicerequeststatus", clientservicerequeststatusRoutes);
app.use("/api/workerapplicationstatus", workerapplicationstatusRoutes);
app.use("/api/admin/servicerequests", adminServiceRequestsRoutes);

app.get("/api/admin/workerapplications/group/:id", workerapplicationController.getByGroupFull);
app.put("/api/admin/workerapplications/group/:id", workerapplicationController.updateByGroup);

app.get("/api/admin/workerapplications/by-group/:id", workerapplicationController.getByGroupFull);
app.put("/api/admin/workerapplications/by-group/:id", workerapplicationController.updateByGroup);

app.use("/api/admin/workerapplications", adminworkerapplicationRoutes);

ensureStorageBucket("user-notifications", true).catch(() => {});
ensureStorageBucket(process.env.SUPABASE_BUCKET_SERVICE_IMAGES || "service-request-images", true).catch(() => {});
ensureStorageBucket("wa-attachments", true).catch(() => {});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Admin key present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
});
