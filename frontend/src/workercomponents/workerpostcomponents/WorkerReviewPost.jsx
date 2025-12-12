import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const CONFIRM_FLAG = 'workerApplicationJustSubmitted';
const fallbackProfile = '/fallback-profile.png';

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
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState('qr');
  const [payError, setPayError] = useState('');
  const [payFields, setPayFields] = useState({ name: '', number: '', ref: '', screenshotDataUrl: '' });
  const [payProcessing, setPayProcessing] = useState(false);
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [showPaySuccess, setShowPaySuccess] = useState(false);
  const FEE = 150;

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
  const savedDocsAlt = (() => {
    try {
      return JSON.parse(localStorage.getItem('workerDocuments') || '[]');
    } catch {
      return [];
    }
  })();
  const savedDocsObj = (() => {
    try {
      const a = localStorage.getItem('worker_required_documents') || localStorage.getItem('workerRequiredDocuments') || '{}';
      const o = JSON.parse(a || '{}');
      return o && typeof o === 'object' ? o : {};
    } catch {
      return {};
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
  const docs = docsFromState.length ? docsFromState : [...(Array.isArray(savedDocsData) ? savedDocsData : []), ...(Array.isArray(savedDocsAlt) ? savedDocsAlt : [])];

  const formatList = (arr) => (Array.isArray(arr) && arr.length ? arr.join(', ') : '-');

  const normalizeLocalPH10 = (v) => {
    let d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('63')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    if (d.length > 10) d = d.slice(-10);
    if (d.length === 10 && d[0] === '9') return d;
    return '';
  };

  const blobToDataUrl = async (u) => {
    try {
      const r = await fetch(u);
      const b = await r.blob();
      return await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result);
        fr.readAsDataURL(b);
      });
    } catch {
      return '';
    }
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
    const pickDataUrl = (v) => {
      const s1 = typeof v?.data_url === "string" ? v.data_url : "";
      const s2 = typeof v?.dataUrl === "string" ? v.dataUrl : "";
      const s3 = typeof v?.dataURL === "string" ? v.dataURL : "";
      const s4 = typeof v?.imageData === "string" ? v.imageData : "";
      const s5 = typeof v?.blobData === "string" ? v.blobData : "";
      const b64 = typeof v?.base64 === "string" ? v.base64 : "";
      if (s1.startsWith("data:")) return s1;
      if (s2.startsWith("data:")) return s2;
      if (s3.startsWith("data:")) return s3;
      if (s4.startsWith("data:")) return s4;
      if (s5.startsWith("data:")) return s5;
      if (b64 && /^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return `data:image/jpeg;base64,${b64}`;
      return "";
    };
    const pull = (v) => {
      if (!v) return { url: "", data_url: "", guess: "" };
      if (typeof v === "string") {
        return { url: /^https?:\/\//i.test(v) ? v : "", data_url: v.startsWith("data:") ? v : "", guess: "" };
      }
      const url = typeof v.url === "string" && /^https?:\/\//i.test(v.url) ? v.url : (typeof v.link === "string" && /^https?:\/\//i.test(v.link) ? v.link : (typeof v.href === "string" && /^https?:\/\//i.test(v.href) ? v.href : ""));
      const data_url = pickDataUrl(v);
      const guess = v.kind || v.type || v.label || v.name || v.field || v.filename || v.fileName || v.title || v.meta?.kind || v.meta?.label || v.meta?.name || "";
      return { url, data_url, guess: String(guess || "") };
    };
    const pushDoc = (out, guessedKind, v) => {
      const { url, data_url, guess } = pull(v);
      if (!(url || data_url)) return;
      const k = kindMap(guessedKind || guess);
      const ext = data_url ? extFromData(data_url) : ((url.split(".").pop() || "bin").split("?")[0]);
      const filename = k ? `${k}.${ext}` : `document.${ext}`;
      out.push({ kind: k, url, data_url, filename });
    };

    const out = [];
    if (arr && !Array.isArray(arr) && typeof arr === "object") {
      pushDoc(out, "primary_id_front", arr.primary_id_front || arr.primary_front || arr.front);
      pushDoc(out, "primary_id_back", arr.primary_id_back || arr.primary_back || arr.back);
      pushDoc(out, "secondary_id", arr.secondary_id || arr.secondary || arr.alt);
      pushDoc(out, "nbi_police_clearance", arr.nbi_police_clearance || arr.nbi || arr.police);
      pushDoc(out, "proof_of_address", arr.proof_of_address || arr.address || arr.billing);
      pushDoc(out, "medical_certificate", arr.medical_certificate || arr.medical);
      pushDoc(out, "certificates", arr.certificates || arr.certs);
      return out;
    }

    (Array.isArray(arr) ? arr : []).forEach((d) => {
      const guess = d?.kind || d?.type || d?.label || d?.name || d?.field || d?.filename || d?.fileName || d?.title || d?.meta?.kind || d?.meta?.label || d?.meta?.name || "";
      pushDoc(out, guess, d);
    });

    return out;
  };

  const contactLocal10 = normalizeLocalPH10(contact_number);

  const contactDisplay = (
    <div className="inline-flex items-center gap-2">
      <img src="/philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover" />
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-[#008cfc] font-semibold' : 'text-gray-400'}`}>+63</span>
      <span className={`text-base md:text-lg leading-6 ${contactLocal10 ? 'text-[#008cfc] font-semibold' : 'text-gray-400'}`}>
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
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-gray-700 font-semibold">{labelText}</span>
        {isElement ? (
          <div className="text-[15px] md:text-base text-[#008cfc] font-semibold">{display}</div>
        ) : (
          <span className="text-[15px] md:text-base text-[#008cfc] font-semibold">{display}</span>
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
        const arr = Array.isArray(it?.tasks) ? it?.tasks : [];
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

  const readFileAsDataUrl = (file) =>
    new Promise((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result);
      fr.readAsDataURL(file);
    });

  const genRef = () => {
    const t = Date.now();
    const r = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
    return `JDK-${t}-${r}`;
  };

  const openPayment = () => {
    setPayError('');
    setPayFields((f) => ({ ...f, ref: f.ref || genRef() }));
    setShowPay(true);
  };

  const handleConfirmPayment = async () => {
    setPayError('');
    try {
      if (payMethod === 'qr') {
        if (!payFields.screenshotDataUrl) {
          setPayError('Upload the GCash payment screenshot.');
          return;
        }
      } else {
        if (!payFields.name || !payFields.number) {
          setPayError('Provide GCash name and number.');
          return;
        }
      }
      const meta = {
        method: 'gcash',
        option: payMethod,
        amount: FEE,
        reference: payFields.ref || genRef(),
        payer_name: payFields.name || '',
        payer_number: payFields.number || '',
        screenshot: payFields.screenshotDataUrl || '',
        currency: 'PHP'
      };
      setPaymentMeta(meta);
      setShowPay(false);
      setPayProcessing(true);
      setTimeout(() => {
        setPayProcessing(false);
        setShowPaySuccess(true);
        setTimeout(async () => {
          setShowPaySuccess(false);
          await handleConfirm(meta);
        }, 1200);
      }, 1200);
    } catch (e) {
      setPayError('Payment confirmation failed.');
      setPayProcessing(false);
    }
  };

  const handleConfirm = async (payment = null) => {
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
      const docsDraftA = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerDocumentsData') || '[]');
        } catch {
          return [];
        }
      })();
      const docsDraftB = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerDocuments') || '[]');
        } catch {
          return [];
        }
      })();
      const docsDraftObj = (() => {
        try {
          const a = localStorage.getItem('worker_required_documents') || localStorage.getItem('workerRequiredDocuments') || '{}';
          const o = JSON.parse(a || '{}');
          return o && typeof o === 'object' ? o : {};
        } catch {
          return {};
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

      const workerAuth = (() => {
        try {
          return JSON.parse(localStorage.getItem('workerAuth') || '{}');
        } catch {
          return {};
        }
      })();

      const initialPayload = {
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
        documents: [],
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

      let profilePicData = '';
      const picRaw = String(initialPayload.info.profilePicture || '');
      if (picRaw.startsWith('data:')) {
        profilePicData = picRaw;
      } else if (picRaw.startsWith('blob:')) {
        profilePicData = await blobToDataUrl(picRaw);
      } else {
        profilePicData = '';
      }
      if (profilePicData) {
        initialPayload.info.profilePicture = profilePicData;
      }

      if (!initialPayload.info.profilePicture) {
        setIsSubmitting(false);
        setSubmitError('Please upload a profile picture.');
        return;
      }

      const docsCandidatesMerged = []
        .concat(Array.isArray(docsDraftA) ? docsDraftA : [])
        .concat(Array.isArray(docsDraftB) ? docsDraftB : []);
      const docsDraftProcessed = await Promise.all(
        (docsCandidatesMerged || []).map(async (d) => {
          if (!d) return d;
          const u = typeof d === 'string' ? d : (d.url || d.link || d.href || '');
          if (typeof u === 'string' && u.startsWith('blob:')) {
            const du = await blobToDataUrl(u);
            if (typeof d === 'string') return { data_url: du };
            return { ...d, data_url: du, url: '' };
          }
          return d;
        })
      );

      const docsObjPrepared = await (async () => {
        const readJson = (k, d) => {
          try { return JSON.parse(localStorage.getItem(k) || d); } catch { return JSON.parse(d); }
        };
        const objCanon = readJson('worker_required_documents', '{}');
        const objCanonAlt = readJson('workerRequiredDocuments', '{}');
        const objData = readJson('workerDocumentsData', '{}');
        const objMeta = readJson('workerDocuments', '{}');

        const mapAnyToCanon = (o) => {
          if (!o || typeof o !== 'object') return {};
          return {
            primary_id_front: o.primary_id_front || o.primary_front || o.front || '',
            primary_id_back: o.primary_id_back || o.primary_back || o.back || '',
            secondary_id: o.secondary_id || o.secondary || o.alt || '',
            nbi_police_clearance: o.nbi_police_clearance || o.nbi || o.police || '',
            proof_of_address: o.proof_of_address || o.address || o.billing || '',
            medical_certificate: o.medical_certificate || o.medical || '',
            certificates: o.certificates || o.certs || ''
          };
        };

        let base = Object.assign({}, mapAnyToCanon(objCanon), mapAnyToCanon(objCanonAlt));
        if (!Object.values(base).some(Boolean)) {
          base = mapAnyToCanon(objData);
        }
        if (!Object.values(base).some(Boolean)) {
          base = mapAnyToCanon(objMeta);
        }

        const keys = ['primary_id_front','primary_id_back','secondary_id','nbi_police_clearance','proof_of_address','medical_certificate','certificates'];
        for (const k of keys) {
          const v = base[k];
          if (typeof v === 'string' && v.startsWith('blob:')) {
            const du = await blobToDataUrl(v);
            if (du) base[k] = du;
          }
        }
        return base;
      })();

      const documentsNormalized = Object.keys(docsObjPrepared || {}).some(k => (docsObjPrepared[k] || '').length)
        ? normalizeDocsForSubmit(docsObjPrepared)
        : normalizeDocsForSubmit(docsDraftProcessed);

      const docsObject = (() => {
        const out = {};
        (documentsNormalized || []).forEach((d) => {
          const k = d?.kind || '';
          if (!k) return;
          const val = d?.data_url || d?.url || '';
          if (!val) return;
          out[k] = val;
        });
        const srcObj = (savedDocsObj && typeof savedDocsObj === 'object') ? savedDocsObj : {};
        ['primary_id_front','primary_id_back','secondary_id','nbi_police_clearance','proof_of_address','medical_certificate','certificates'].forEach((k) => {
          const v = srcObj[k];
          if (typeof v === 'string' && v && !out[k]) out[k] = v;
        });
        return out;
      })();

      const emailVal =
        (initialPayload.info.email ||
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
        first_name: (initialPayload.info.firstName || '').trim(),
        last_name: (initialPayload.info.lastName || '').trim(),
        email_address: emailVal,
        contact_number: (initialPayload.info.contactNumber || '').trim(),
        barangay: (initialPayload.info.barangay || '').trim() || 'N/A',
        street: (initialPayload.info.street || '').trim() || 'N/A',
        date_of_birth: (initialPayload.info.birthDate || '').trim(),
        age: initialPayload.info.age || null,
        profile_picture: initialPayload.info.profilePicture || '',
        profile_picture_name: initialPayload.info.profilePictureName || '',
        service_types: asStringArray(initialPayload.work.serviceTypes),
        service_task: buildServiceTaskObject(initialPayload.work.serviceTask, initialPayload.work.serviceTypes),
        years_experience: coerceYears(initialPayload.work.yearsExperience),
        tools_provided: normalizeToolsProvided(initialPayload.work.toolsProvided),
        service_description: (initialPayload.work.serviceDescription || '').trim(),
        rate_type: (initialPayload.rate.rateType || '').trim(),
        rate_from: null,
        rate_to: null,
        rate_value: null,
        documents: documentsNormalized,
        required_documents_object: docsObject,
        agreements: {
          consent_background_checks: !!initialPayload.agreements.consent_background_checks,
          consent_terms_privacy: !!initialPayload.agreements.consent_terms_privacy,
          consent_data_privacy: !!initialPayload.agreements.consent_data_privacy
        },
        metadata: {
          profile_picture_name: initialPayload.info.profilePictureName || '',
          auth_uid: localStorage.getItem('auth_uid') || workerAuth.auth_uid || '',
          profile_picture_data_url: initialPayload.info.profilePicture || ''
        }
      };

      if (normalized.rate_type === 'Hourly Rate') {
        normalized.rate_from = (() => {
          const n = Number(initialPayload.rate.rateFrom);
          return Number.isFinite(n) ? n : null;
        })();
        normalized.rate_to = (() => {
          const n = Number(initialPayload.rate.rateTo);
          return Number.isFinite(n) ? n : null;
        })();
      } else if (normalized.rate_type === 'By the Job Rate') {
        normalized.rate_value = (() => {
          const n = Number(initialPayload.rate.rateValue);
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
        'rate_type',
        'profile_picture'
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
        profile_picture_data_url: normalized.metadata.profile_picture_data_url,
        profilePictureDataUrl: normalized.metadata.profile_picture_data_url,
        date_of_birth: normalized.date_of_birth,
        age: normalized.age
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

      const submitBody = {
        info: infoPayload,
        details: workPayload,
        rate: ratePayload,
        documents: normalized.documents,
        required_documents: normalized.required_documents_object,
        agreements: normalized.agreements,
        email_address: normalized.email_address,
        worker_id: normalized.worker_id,
        metadata: normalized.metadata,
        payment: payment || paymentMeta || null
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
    const lock = isSubmitting || showSuccess || isLoadingBack || showPay || payProcessing || showPaySuccess;
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
  }, [isSubmitting, showSuccess, isLoadingBack, showPay, payProcessing, showPaySuccess]);

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

  const canConfirmPayment = payMethod === 'qr'
    ? !!payFields.screenshotDataUrl
    : !!payFields.name && !!payFields.number;

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
                      <img
                        src={profile_picture || fallbackProfile}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = fallbackProfile;
                        }}
                      />
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
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                    <LabelValue label="Service Types" value={formatList(service_types)} />
                    <LabelValue label="Service Tasks" value={formatServiceTasksText(service_task)} />
                    <LabelValue label="Years of Experience" value={years_experience} />
                    <LabelValue label="Tools Provided" value={tools_provided} />
                    <div className="md:col-span-2">
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
                  <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
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
                <div className="px-6 py-5 space-y-3 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Worker:</span>
                    <span className="text-base font-semibold text-[#008cfc]">{first_name || '-'} {last_name || ''}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Services:</span>
                    <span className="text-base font-semibold text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">{formatList(service_types)}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Experience:</span>
                    <span className="text-base font-semibold text-[#008cfc]">{years_experience || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Tools:</span>
                    <span className="text-base font-semibold text-[#008cfc]">{tools_provided || '-'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-gray-700">Rate:</span>
                    {rate_type === 'Hourly Rate' ? (
                      <div className="text-lg font-bold text-[#008cfc]">
                        ₱{rate_from || 0}–₱{rate_to || 0} <span className="text-sm font-semibold opacity-80">per hour</span>
                      </div>
                    ) : rate_type === 'By the Job Rate' ? (
                      <div className="text-lg font-bold text-[#008cfc]">
                        ₱{rate_value || 0} <span className="text-sm font-semibold opacity-80">per job</span>
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
                    onClick={openPayment}
                    className="w-full sm:w-1/2 h-[48px] px-5 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  >
                    Pay & Submit
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

      {showPay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="GCash Payment"
          tabIndex={-1}
          autoFocus
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-[520px] max-w-[94vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl">
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-900">Pay via GCash</div>
                <div className="text-sm text-gray-500">Amount: <span className="font-semibold text-[#008cfc]">₱{FEE}</span></div>
              </div>
              <div className="mt-2 text-xs text-gray-500">Choose a method</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod('qr')}
                  className={`h-10 rounded-xl border ${payMethod==='qr'?'border[#008cfc] border-[#008cfc] bg-blue-50 text-[#008cfc]':'border-gray-300 text-gray-700'} transition`}
                >
                  GCash QR
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('details')}
                  className={`h-10 rounded-xl border ${payMethod==='details'?'border-[#008cfc] bg-blue-50 text-[#008cfc]':'border-gray-300 text-gray-700'} transition`}
                >
                  Fill GCash Details
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              {payMethod === 'qr' ? (
                <div className="space-y-4">
                  <div className="w-full grid place-items-center">
                    <div className="rounded-2xl border border-gray-200 p-3 bg-white shadow-sm">
                      <img
                        src="/QR.jpg"
                        alt="GCash QR"
                        className="w-56 h-56 object-contain"
                        onError={(e)=>{e.currentTarget.style.display='none';}}
                      />
                      <div className="text-center text-xs text-gray-500 mt-2">Scan this QR using GCash</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="text-sm text-gray-700">Reference No.</div>
                    <input
                      value={payFields.ref}
                      onChange={(e)=>setPayFields((f)=>({...f, ref: e.target.value.trim()}))}
                      placeholder="Enter GCash Ref. No."
                      className="h-11 w-full rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                    />
                    <div className="text-sm text-gray-700">Upload Screenshot</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e)=>{
                        const file=e.target.files?.[0];
                        if (file) {
                          const du=await readFileAsDataUrl(file);
                          setPayFields((f)=>({...f, screenshotDataUrl: du}));
                        }
                      }}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-[#008cfc] hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="text-sm text-gray-700">GCash Account Name</div>
                    <input
                      value={payFields.name}
                      onChange={(e)=>setPayFields((f)=>({...f, name: e.target.value}))}
                      placeholder="e.g. Juan Dela Cruz"
                      className="h-11 w-full rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                    />
                  </div>
                  <div>
                    <div className="text-sm text-gray-700">GCash Number</div>
                    <input
                      value={payFields.number}
                      onChange={(e)=>setPayFields((f)=>({...f, number: e.target.value.replace(/[^0-9+]/g,'')}))}
                      placeholder="09XXXXXXXXX"
                      className="h-11 w-full rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                    />
                  </div>
                  <div>
                    <div className="text-sm text-gray-700">Reference No.</div>
                    <input
                      value={payFields.ref}
                      onChange={(e)=>setPayFields((f)=>({...f, ref: e.target.value.trim()}))}
                      placeholder="Enter GCash Ref. No."
                      className="h-11 w-full rounded-xl border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#008cfc]/40"
                    />
                  </div>
                </div>
              )}
              {payError ? <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{payError}</div> : null}
            </div>

            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={payProcessing}
                  onClick={()=>setShowPay(false)}
                  className="w-full sm:w-1/2 h-[48px] px-5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={payProcessing || !canConfirmPayment}
                  onClick={handleConfirmPayment}
                  className="w-full sm:w-1/2 h-[48px] px-5 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 disabled:opacity-60"
                >
                  {payProcessing ? 'Processing…' : 'Confirm Payment'}
                </button>
              </div>
              <div className="mt-3 text-center text-[11px] text-gray-500">GCash only • Secure payment • Non-refundable application fee</div>
            </div>
          </div>
        </div>
      )}

      {payProcessing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Processing payment"
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
              <div className="text-lg font-semibold text-gray-900">Processing Payment</div>
              <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {showPaySuccess && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Payment successful"
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
              <div className="text-lg font-semibold text-gray-900">Payment Successfully</div>
              <div className="text-sm text-gray-600">Submitting your application…</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerReviewPost;
