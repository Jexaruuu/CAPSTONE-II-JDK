// WorkerReviewPost.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const CONFIRM_FLAG = 'workerApplicationJustSubmitted';

function computeAge(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a >= 0 && a <= 120 ? a : null;
}

const coerceYears = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 50) return 50;
  return Math.floor(n);
};

const normalizeToolsProvided = (v) => {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const s = String(Array.isArray(v) ? v[0] : v).trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(s)) return 'No';
  return 'No';
};

const clearWorkerApplicationDrafts = () => {
  try {
    localStorage.removeItem('workerInformationForm');
    localStorage.removeItem('workerWorkInformation');
    localStorage.removeItem('workerDocuments');
    localStorage.removeItem('workerDocumentsData');
    localStorage.removeItem('workerRate');
    localStorage.removeItem('workerAgreements');
  } catch {}
};

function buildAppU() {
  try {
    const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
    const e =
      a.email ||
      localStorage.getItem('workerEmail') ||
      localStorage.getItem('worker_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    const au =
      a.auth_uid ||
      a.authUid ||
      a.uid ||
      a.id ||
      localStorage.getItem('worker_auth_uid') ||
      localStorage.getItem('auth_uid') ||
      null;
    return encodeURIComponent(JSON.stringify({ r: 'worker', e, au }));
  } catch {
    const e =
      localStorage.getItem('workerEmail') ||
      localStorage.getItem('worker_email') ||
      localStorage.getItem('email_address') ||
      localStorage.getItem('email') ||
      '';
    return encodeURIComponent(JSON.stringify({ r: 'worker', e, au: null }));
  }
}

const WorkerReviewPost = ({ handleBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoBroken, setLogoBroken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBack, setIsLoadingBack] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [applicationGroupId, setApplicationGroupId] = useState(null);
  const [workerIdState, setWorkerIdState] = useState(null);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

  const appU = useMemo(() => buildAppU(), []);
  const headersWithU = useMemo(() => (appU ? { 'x-app-u': appU } : {}), [appU]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/workers/me`, { withCredentials: true, headers: headersWithU });
        const wid = data?.id || null;
        const au = data?.auth_uid || null;
        if (wid) localStorage.setItem('worker_id', String(wid));
        if (au) localStorage.setItem('auth_uid', String(au));
        setWorkerIdState(wid || null);
      } catch {
        const widLS = localStorage.getItem('worker_id');
        setWorkerIdState(widLS ? Number(widLS) : null);
      }
    };
    fetchMe();
  }, [headersWithU]);

  const savedInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem('workerInformationForm') || '{}');
    } catch {
      return {};
    }
  })();
  const savedWork = (() => {
    try {
      return JSON.parse(localStorage.getItem('workerWorkInformation') || '{}');
    } catch {
      return {};
    }
  })();
  const savedDocsData = (() => {
    try {
      return JSON.parse(localStorage.getItem('workerDocumentsData') || '[]');
    } catch {
      return [];
    }
  })();
  const savedRate = (() => {
    try {
      return JSON.parse(localStorage.getItem('workerRate') || '{}');
    } catch {
      return {};
    }
  })();
  const savedAgree = (() => {
    try {
      return JSON.parse(localStorage.getItem('workerAgreements') || '{}');
    } catch {
      return {};
    }
  })();

  const s = location.state || {};

  const first_name = s.first_name ?? savedInfo.firstName ?? '';
  const last_name = s.last_name ?? savedInfo.lastName ?? '';
  const date_of_birth = s.date_of_birth ?? savedInfo.date_of_birth ?? '';
  const age = s.age ?? savedInfo.age ?? computeAge(date_of_birth);
  const contact_number = s.contact_number ?? savedInfo.contactNumber ?? '';
  const email = s.email ?? savedInfo.email ?? '';
  const street = s.street ?? savedInfo.street ?? '';
  const barangay = s.barangay ?? savedInfo.barangay ?? '';
  const profile_picture = s.profile_picture ?? savedInfo.profilePicture ?? null;

  const service_types = s.service_types ?? savedWork.service_types ?? savedWork.serviceTypesSelected ?? [];
  const service_task = s.service_task ?? savedWork.service_task ?? savedWork.serviceTaskSelected ?? {};
  const years_experience = s.years_experience ?? savedWork.years_experience ?? savedWork.yearsExperience ?? '';
  const tools_provided = s.tools_provided ?? savedWork.tools_provided ?? savedWork.toolsProvided ?? '';
  const service_description = s.service_description ?? savedWork.service_description ?? savedWork.serviceDescription ?? '';

  const rate_type = s.rate_type ?? savedRate.rate_type ?? savedRate.rateType ?? '';
  const rate_from = s.rate_from ?? savedRate.rate_from ?? savedRate.rateFrom ?? '';
  const rate_to = s.rate_to ?? savedRate.rate_to ?? savedRate.rateTo ?? '';
  const rate_value = s.rate_value ?? savedRate.rate_value ?? savedRate.rateValue ?? '';

  const docsFromState = Array.isArray(s.docs) ? s.docs : [];
  const docs = docsFromState.length ? docsFromState : savedDocsData;

  const formatList = (arr) => (Array.isArray(arr) && arr.length ? arr.join(', ') : '-');

  const normalizeLocalPH10 = (v) => {
    let d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('63')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    if (d.length > 10) d = d.slice(-10);
    if (d.length === 10 && d[0] === '9') return d;
    return '';
  };

 const normalizeDocsForSubmit = (arr) => {
  const kindMap = (s = "") => {
    const t = String(s).toLowerCase().replace(/\s+/g, " ").trim();
    if ((/primary|main/.test(t)) && (/(front|face|id\s*front)/.test(t))) return "primary_id_front";
    if ((/primary|main/.test(t)) && (/(back|rear|reverse|id\s*back)/.test(t))) return "primary_id_back";
    if (/secondary|alternate|alt/.test(t)) return "secondary_id";
    if (/(nbi|police)/.test(t)) return "nbi_police_clearance";
    if (/proof.*address|address.*proof|billing|bill/.test(t)) return "proof_of_address";
    if (/medical|med\s*cert|health/.test(t)) return "medical_certificate";
    if (/certificate|certs?\b|tesda|ncii|nc2/.test(t)) return "certificates";
    return "";
  };
  const extFromData = (s = "") => {
    const m = /^data:([^;]+);base64,/.exec(s);
    if (!m) return "bin";
    const mime = m[1].toLowerCase();
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    if (mime === "image/svg+xml") return "svg";
    if (mime === "application/pdf") return "pdf";
    return "bin";
  };
  const pull = (v) => {
    if (!v) return { url: "", data_url: "", guess: "" };
    if (typeof v === "string") {
      return { url: /^https?:\/\//i.test(v) ? v : "", data_url: v.startsWith("data:") ? v : "", guess: "" };
    }
    const url = typeof v.url === "string" && /^https?:\/\//i.test(v.url) ? v.url : "";
    const data_url = typeof v.data_url === "string" && v.data_url.startsWith("data:") ? v.data_url : "";
    const guess = v.kind || v.type || v.label || v.name || v.field || v.slot || v.filename || v.fileName || v.title || v.meta?.kind || v.meta?.label || v.meta?.name || "";
    return { url, data_url, guess: String(guess || "") };
  };
  const pushDoc = (out, guessedKind, v) => {
    const { url, data_url, guess } = pull(v);
    const k = kindMap(guessedKind || guess);
    if (!(url || data_url)) return;
    const ext = data_url ? extFromData(data_url) : (url.split(".").pop() || "bin");
    const filename = k ? `${k}.${ext}` : `document.${ext}`;
    out.push({ kind: k, url, data_url, filename });
  };

  const out = [];
  if (arr && !Array.isArray(arr) && typeof arr === "object") {
    pushDoc(out, "primary_id_front", arr.primary_id_front || arr.primary_front);
    pushDoc(out, "primary_id_back", arr.primary_id_back || arr.primary_back);
    pushDoc(out, "secondary_id", arr.secondary_id);
    pushDoc(out, "nbi_police_clearance", arr.nbi_police_clearance || arr.nbi);
    pushDoc(out, "proof_of_address", arr.proof_of_address || arr.address);
    pushDoc(out, "medical_certificate", arr.medical_certificate || arr.medical);
    pushDoc(out, "certificates", arr.certificates || arr.certs);
    return out;
  }

  (Array.isArray(arr) ? arr : []).forEach((d) => {
    const guess =
      d?.kind || d?.type || d?.label || d?.name || d?.field || d?.slot || d?.filename || d?.fileName || d?.title || d?.meta?.kind || d?.meta?.label || d?.meta?.name || "";
    pushDoc(out, guess, d);
    if (!guess) {
      Object.keys(d || {}).forEach((k) => {
        if (["url", "link", "href", "data_url", "dataUrl", "dataURL", "base64", "imageData", "blobData", "meta"].includes(k)) return;
        pushDoc(out, k, d[k]);
      });
    }
  });

  return out;
};

  const contactLocal10 = normalizeLocalPH10(contact_number);

  const contactDisplay = (
    <div className="inline-flex items-center gap-2">
      <img src="/philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover" />
      <span className="text-gray-700 text-sm">+63</span>
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
        {contactLocal10 || '9XXXXXXXXX'}
      </span>
    </div>
  );

  const LabelValue = ({ label, value, emptyAs = '-' }) => {
    const isElement = React.isValidElement(value);
    const isEmpty =
      !isElement &&
      (value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === ''));
    const display = isElement ? value : isEmpty ? emptyAs : value;
    const labelText = `${String(label || '').replace(/:?\s*$/, '')}:`;
    return (
      <div className="grid grid-cols-[160px,1fr] md:grid-cols-[200px,1fr] items-start gap-x-4">
        <span className="font-medium text-gray-600">{labelText}</span>
        {isElement ? (
          <div className="text-[15px] md:text-base">{display}</div>
        ) : (
          <span className="text-[15px] md:text-base font-semibold text-gray-900">{display}</span>
        )}
      </div>
    );
  };

  const handleBackClick = () => {
    jumpTop();
    setIsLoadingBack(true);
    setTimeout(() => {
      if (typeof handleBack === 'function') handleBack();
      else navigate(-1);
    }, 2000);
  };

  const requireFields = (obj, keys) => {
    const missing = [];
    keys.forEach((k) => {
      const val = obj[k];
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) missing.push(k);
    });
    return missing;
  };

  const asStringArray = (v) => {
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
    return [];
  };

  const buildServiceTaskObject = (serviceTaskRaw, serviceTypesRaw) => {
    const out = {};
    if (Array.isArray(serviceTypesRaw)) serviceTypesRaw.forEach((t) => { out[String(t).trim()] = out[String(t).trim()] || []; });
    if (Array.isArray(serviceTaskRaw)) {
      serviceTaskRaw.forEach((it) => {
        const cat = String(it?.category || '').trim();
        const arr = Array.isArray(it?.tasks) ? it.tasks : [];
        if (!cat) return;
        const vals = arr.map((x) => String(x || '').trim()).filter(Boolean);
        out[cat] = Array.from(new Set([...(out[cat] || []), ...vals]));
      });
    } else if (serviceTaskRaw && typeof serviceTaskRaw === 'object') {
      Object.entries(serviceTaskRaw).forEach(([k, v]) => {
        const vals = Array.isArray(v) ? v : [v];
        const norm = vals.map((x) => String(x || '').trim()).filter(Boolean);
        if (!norm.length) return;
        const key = String(k || '').trim() || 'General';
        out[key] = Array.from(new Set([...(out[key] || []), ...norm]));
      });
    }
    return out;
  };

  const handleConfirm = async () => {
    try {
      setSubmitError('');
      setIsSubmitting(true);

      const infoDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerInformationForm') || '{}');
        } catch {
          return {};
        }
      })();
      const workDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerWorkInformation') || '{}');
        } catch {
          return {};
        }
      })();
      const docsDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerDocumentsData') || '[]');
        } catch {
          return [];
        }
      })();
      const rateDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerRate') || '{}');
        } catch {
          return {};
        }
      })();
      const agreeDraft = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerAgreements') || '{}');
        } catch {
          return {};
        }
      })();

      const payload = {
        info: {
          firstName: infoDraft.firstName || '',
          lastName: infoDraft.lastName || '',
          contactNumber: infoDraft.contactNumber || '',
          email: (infoDraft.email || '').trim(),
          street: infoDraft.street || '',
          barangay: infoDraft.barangay || '',
          profilePicture: infoDraft.profilePicture || '',
          profilePictureName: infoDraft.profilePictureName || '',
          birthDate: infoDraft.date_of_birth || '',
          age: infoDraft.age || computeAge(infoDraft.date_of_birth || '')
        },
        work: {
          serviceTypes: workDraft.service_types || workDraft.serviceTypesSelected || [],
          serviceTask: workDraft.service_task || workDraft.serviceTaskSelected || {},
          yearsExperience: workDraft.years_experience || workDraft.yearsExperience || '',
          toolsProvided: workDraft.tools_provided || workDraft.toolsProvided || '',
          serviceDescription: workDraft.service_description || workDraft.serviceDescription || ''
        },
        documents: normalizeDocsForSubmit(docsDraft),
        rate: {
          rateType: rateDraft.rateType || rateDraft.rate_type || '',
          rateFrom: rateDraft.rateFrom || rateDraft.rate_from || '',
          rateTo: rateDraft.rateTo || rateDraft.rate_to || '',
          rateValue: rateDraft.rateValue || rateDraft.rate_value || ''
        },
        agreements: {
          consent_background_checks: !!agreeDraft.agree_verify,
          consent_terms_privacy: !!agreeDraft.agree_tos,
          consent_data_privacy: !!agreeDraft.agree_privacy
        }
      };

      const workerAuth = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerAuth') || '{}');
        } catch {
          return {};
        }
      })();
      const emailVal =
        (payload.info.email ||
          savedInfo.email ||
          workerAuth.email ||
          localStorage.getItem('worker_email') ||
          localStorage.getItem('email_address') ||
          localStorage.getItem('email') ||
          '').toString().trim().toLowerCase();

      const workerId =
        workerIdState ||
        infoDraft.worker_id ||
        infoDraft.workerId ||
        Number(localStorage.getItem('worker_id')) ||
        null;

      const normalized = {
        worker_id: workerId || '',
        first_name: (payload.info.firstName || '').trim(),
        last_name: (payload.info.lastName || '').trim(),
        email_address: emailVal,
        contact_number: (payload.info.contactNumber || '').trim(),
        barangay: (payload.info.barangay || '').trim() || 'N/A',
        street: (payload.info.street || '').trim() || 'N/A',
        date_of_birth: (payload.info.birthDate || '').trim(),
        age: payload.info.age || null,
        profile_picture: payload.info.profilePicture || '',
        profile_picture_name: payload.info.profilePictureName || '',
        service_types: asStringArray(payload.work.serviceTypes),
        service_task: buildServiceTaskObject(payload.work.serviceTask, payload.work.serviceTypes),
        years_experience: coerceYears(payload.work.yearsExperience),
        tools_provided: normalizeToolsProvided(payload.work.toolsProvided),
        service_description: (payload.work.serviceDescription || '').trim(),
        rate_type: (payload.rate.rateType || '').trim(),
        rate_from: null,
        rate_to: null,
        rate_value: null,
        documents: Array.isArray(payload.documents) ? payload.documents : [],
        agreements: {
          consent_background_checks: !!payload.agreements.consent_background_checks,
          consent_terms_privacy: !!payload.agreements.consent_terms_privacy,
          consent_data_privacy: !!payload.agreements.consent_data_privacy
        },
        metadata: {
          profile_picture_name: payload.info.profilePictureName || '',
          auth_uid: localStorage.getItem('auth_uid') || workerAuth.auth_uid || ''
        }
      };

      if (normalized.rate_type === 'Hourly Rate') {
        normalized.rate_from = (() => {
          const n = Number(payload.rate.rateFrom);
          return Number.isFinite(n) ? n : null;
        })();
        normalized.rate_to = (() => {
          const n = Number(payload.rate.rateTo);
          return Number.isFinite(n) ? n : null;
        })();
      } else if (normalized.rate_type === 'By the Job Rate') {
        normalized.rate_value = (() => {
          const n = Number(payload.rate.rateValue);
          return Number.isFinite(n) ? n : null;
        })();
      }

      const missing = requireFields(normalized, [
        'first_name',
        'last_name',
        'contact_number',
        'street',
        'barangay',
        'service_types',
        'service_description',
        'rate_type'
      ]);
      if (missing.length) {
        setIsSubmitting(false);
        setSubmitError(`Missing fields: ${missing.join(', ')}`);
        return;
      }

      if (!(normalized.worker_id && String(normalized.worker_id).trim()) && !(normalized.email_address && String(normalized.email_address).trim())) {
        setIsSubmitting(false);
        setSubmitError('Unable to identify worker. Provide worker_id or a known email_address.');
        return;
      }

     const profilePicRaw = (payload.info.profilePicture || '').toString();
const profilePicData = profilePicRaw.startsWith('data:') ? profilePicRaw : '';

const infoPayload = {
  worker_id: normalized.worker_id,
  workerId: normalized.worker_id,
  auth_uid: normalized.metadata.auth_uid,
  first_name: normalized.first_name,
  firstName: normalized.first_name,
  last_name: normalized.last_name,
  lastName: normalized.last_name,
  email_address: normalized.email_address,
  email: normalized.email_address,
  contact_number: normalized.contact_number,
  contactNumber: normalized.contact_number,
  street: normalized.street,
  barangay: normalized.barangay,
  profile_picture: normalized.profile_picture,
  profilePicture: normalized.profile_picture,
  profile_picture_name: normalized.profile_picture_name,
  profilePictureName: normalized.profile_picture_name,
  profile_picture_data_url: profilePicData,
  profilePictureDataUrl: profilePicData,
  date_of_birth: normalized.date_of_birth,
  age: normalized.age
};

normalized.metadata = {
  profile_picture_name: payload.info.profilePictureName || '',
  auth_uid: localStorage.getItem('auth_uid') || workerAuth.auth_uid || '',
  profile_picture_data_url: profilePicData
};

      const workPayload = {
        service_types: normalized.service_types,
        serviceTypes: normalized.service_types,
        service_task: normalized.service_task,
        serviceTask: normalized.service_task,
        years_experience: normalized.years_experience,
        yearsExperience: normalized.years_experience,
        tools_provided: normalized.tools_provided,
        toolsProvided: normalized.tools_provided,
        service_description: normalized.service_description,
        work_description: normalized.service_description
      };

      const ratePayload = {
        rate_type: normalized.rate_type,
        rateType: normalized.rate_type,
        rate_from: normalized.rate_from,
        rateFrom: normalized.rate_from,
        rate_to: normalized.rate_to,
        rateTo: normalized.rate_to,
        rate_value: normalized.rate_value,
        rateValue: normalized.rate_value
      };

      const jsonBody = {
        worker_id: normalized.worker_id,
        first_name: normalized.first_name,
        last_name: normalized.last_name,
        email_address: normalized.email_address,
        contact_number: normalized.contact_number,
        street: normalized.street,
        barangay: normalized.barangay,
        date_of_birth: normalized.date_of_birth,
        age: normalized.age,
        service_types: normalized.service_types,
        service_task: normalized.service_task,
        years_experience: normalized.years_experience,
        tools_provided: normalized.tools_provided,
        service_description: normalized.service_description,
        rate_type: normalized.rate_type,
        rate_from: normalized.rate_from,
        rate_to: normalized.rate_to,
        rate_value: normalized.rate_value,
        documents: normalized.documents,
        agreements: normalized.agreements,
        metadata: normalized.metadata,
        info: infoPayload,
        details: {
          service_types: normalized.service_types,
          service_task: normalized.service_task,
          years_experience: normalized.years_experience,
          tools_provided: normalized.tools_provided,
          service_description: normalized.service_description,
          work_description: normalized.service_description
        },
        rate: ratePayload
      };

  const submitBody = {
  info: infoPayload,
  details: workPayload,
  rate: ratePayload,
  documents: normalizeDocsForSubmit(normalized.documents),
  required_documents: normalizeDocsForSubmit(normalized.documents),
  agreements: normalized.agreements,
  email_address: normalized.email_address,
  worker_id: normalized.worker_id,
  metadata: normalized.metadata
};

      const res = await axios.post(`${API_BASE}/api/workerapplications/submit`, submitBody, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json', ...headersWithU }
      });

      setApplicationGroupId(res?.data?.application?.request_group_id || res?.data?.request_group_id || null);
      setShowSuccess(true);
      localStorage.setItem(CONFIRM_FLAG, '1');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Submission failed';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoDashboard = () => {
    try {
      clearWorkerApplicationDrafts();
      localStorage.setItem(CONFIRM_FLAG, '1');
      window.dispatchEvent(new Event('worker-application-submitted'));
    } catch {}
    jumpTop();
    navigate('/workerdashboard', { state: { submitted: true, request_group_id: applicationGroupId, __forceTop: true }, replace: true });
  };

  useEffect(() => {
    const lock = isSubmitting || showSuccess || isLoadingBack;
    if (!lock) return;
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState, true);
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    const blockKeys = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
      window.removeEventListener('keydown', blockKeys, true);
    };
  }, [isSubmitting, showSuccess, isLoadingBack]);

  const TaskPill = ({ children }) => (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs md:text-sm px-2.5 py-1">
      {children}
    </span>
  );

  const TaskGroup = ({ title, items = [] }) => (
    <div className="rounded-xl border border-gray-200 bg-white shadow-xs ring-1 ring-black/5">
      <div className="px-4 pt-3">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
      </div>
      <div className="p-4">
        {items.length ? (
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) => (
              <TaskPill key={`${title}-${i}`}>{it}</TaskPill>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">No tasks selected</div>
        )}
      </div>
    </div>
  );

  const formatServiceTasksText = (obj) => {
    if (!obj) return '-';
    const values = Array.isArray(obj) ? obj : Object.values(obj).flat();
    const clean = values.map((x) => String(x || '').trim()).filter(Boolean);
    const uniq = Array.from(new Set(clean));
    return uniq.length ? uniq.join(', ') : '-';
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
      <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1420px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 grid place-items-center rounded-xl border border-blue-100 bg-white shadow-sm">
              <img
                src="/jdklogo.png"
                alt=""
                className="h-6 w-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="text-2xl md:text-[28px] font-semibold tracking-tight text-gray-900">Review Worker Application</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-gray-500">Step 6 of 6</div>
            <div className="h-2 w-40 rounded-full bg-gray-200 overflow-hidden ring-1 ring-white">
              <div className="h-full w-full bg-[#008cfc]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1420px] px-6">
        <div className="space-y-6 mt-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900">Personal Information</h3>
            </div>
            <div className="border-t border-gray-100" />
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-6">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                  <LabelValue label="First Name" value={first_name} />
                  <LabelValue label="Last Name" value={last_name} />
                  <LabelValue label="Contact Number" value={contactDisplay} />
                  <LabelValue label="Email" value={email} />
                  <LabelValue label="Barangay" value={barangay} />
                  <LabelValue label="Street" value={street} />
                </div>
                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="text-sm font-medium text-gray-700 mb-3">Worker Profile Picture</div>
                  {profile_picture ? (
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-2 ring-blue-100 bg-white shadow-sm">
                      <img src={profile_picture} alt="Profile" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full grid place-items-center bg-gray-50 text-gray-400 border border-dashed">
                      <span className="text-sm">No Image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">Work Details</h3>
                </div>
                <div className="border-t border-gray-100" />
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                    <div className="space-y-5">
                      <LabelValue label="Service Types" value={formatList(service_types)} />
                      <LabelValue label="Service Tasks" value={formatServiceTasksText(service_task)} />
                    </div>
                    <div className="space-y-5">
                      <LabelValue label="Years of Experience" value={years_experience} />
                      <LabelValue label="Tools Provided" value={tools_provided} />
                      <LabelValue label="Work Description" value={service_description || '-'} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">Service Rate</h3>
                </div>
                <div className="border-t border-gray-100" />
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                    <LabelValue label="Rate Type" value={rate_type} />
                    {rate_type === 'Hourly Rate' ? (
                      <LabelValue label="Rate" value={rate_from && rate_to ? `₱${rate_from} - ₱${rate_to} per hour` : ''} />
                    ) : (
                      <LabelValue label="Rate" value={rate_value ? `₱${rate_value}` : ''} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:col-span-1 flex flex-col">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="text-base font-semibold text-gray-900">Summary</div>
                </div>
                <div className="border-t border-gray-100" />
                <div className="px-6 py-5 space-y-4 flex-1">
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-medium text-gray-600">Worker:</span>
                    <span className="text-base font-semibold text-gray-900">{first_name || '-'} {last_name || ''}</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-medium text-gray-600">Services:</span>
                    <span className="text-base font-semibold text-gray-900 truncate max-w-[60%] text-right sm:text-left">{formatList(service_types)}</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-medium text-gray-600">Experience:</span>
                    <span className="text-base font-semibold text-gray-900">{years_experience || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[120px,1fr] items-center gap-x-2">
                    <span className="text-sm font-medium text-gray-600">Tools:</span>
                    <span className="text-base font-semibold text-gray-900">{tools_provided || '-'}</span>
                  </div>
                  <div className="h-px bg-gray-100 my-2" />
                  <div className="grid grid-cols-[120px,1fr] items-start gap-x-2">
                    <span className="text-sm font-medium text-gray-600">Rate:</span>
                    {rate_type === 'Hourly Rate' ? (
                      <div className="text-lg font-bold text-gray-900">
                        ₱{rate_from || 0}–₱{rate_to || 0} <span className="text-sm font-medium text-gray-700 opacity-80">per hour</span>
                      </div>
                    ) : rate_type === 'By the Job Rate' ? (
                      <div className="text-lg font-bold text-gray-900">
                        ₱{rate_value || 0} <span className="text-sm font-medium text-gray-700 opacity-80">per job</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No rate provided</div>
                    )}
                  </div>
                </div>
                {submitError ? (
                  <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-t border-red-100">{submitError}</div>
                ) : null}
                <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleBackClick}
                    className="w-full sm:w-1/2 h-[48px] px-5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full sm:w-1/2 h-[48px] px-5 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {false && <></>}
        </div>
      </div>

      {isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submitting application"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="relative mx-auto w-40 h-40">
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  borderWidth: '10px',
                  borderStyle: 'solid',
                  borderColor: '#008cfc22',
                  borderTopColor: '#008cfc',
                  borderRadius: '9999px'
                }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img
                    src="/jdklogo.png"
                    alt="JDK Homecare Logo"
                    className="w-20 h-20 object-contain"
                    onError={() => setLogoBroken(true)}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center space-y-1">
              <div className="text-lg font-semibold text-gray-900">Submitting Application</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {isLoadingBack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Back to Step 5"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center cursor-wait"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="relative mx-auto w-40 h-40">
              <div
                className="absolute inset-0 animate-spin rounded-full"
                style={{
                  borderWidth: '10px',
                  borderStyle: 'solid',
                  borderColor: '#008cfc22',
                  borderTopColor: '#008cfc',
                  borderRadius: '9999px'
                }}
              />
              <div className="absolute inset-6 rounded-full border-2 border-[#008cfc33]" />
              <div className="absolute inset-0 flex items-center justify-center">
                {!logoBroken ? (
                  <img
                    src="/jdklogo.png"
                    alt="JDK Homecare Logo"
                    className="w-20 h-20 object-contain"
                    onError={() => setLogoBroken(true)}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-center space-y-1">
              <div className="text-lg font-semibold text-gray-900">Back to Step 5</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && !isSubmitting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Application submitted"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8">
            <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
              {!logoBroken ? (
                <img
                  src="/jdklogo.png"
                  alt="JDK Homecare Logo"
                  className="w-16 h-16 object-contain"
                  onError={() => setLogoBroken(true)}
                />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Application Submitted!</div>
              <div className="text-sm text-gray-600">Please wait for admin approval.</div>
              <div className="text-xs text-gray-500">The details below will remain on this page for your reference.</div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoDashboard}
                className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-[#0077d6] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
              >
                Go back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerReviewPost;
