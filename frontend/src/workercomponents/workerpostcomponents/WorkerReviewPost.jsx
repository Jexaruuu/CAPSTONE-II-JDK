import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createPortal } from 'react-dom';

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

const looksLikeBase64 = (s) => {
  const x = String(s || '').trim();
  if (!x) return false;
  if (x.startsWith('data:') || x.startsWith('http://') || x.startsWith('https://') || x.startsWith('blob:') || x.startsWith('/')) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(x)) return false;
  return x.length >= 200;
};

const coerceImageToDataUrl = (raw, mime = 'image/jpeg') => {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('data:')) return s;
  if (looksLikeBase64(s)) return `data:${mime};base64,${s}`;
  return '';
};

const pickPicAny = (...vals) => {
  for (const v of vals) {
    if (!v) continue;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s) return s;
    } else if (typeof v === 'object') {
      const o = v || {};
      const s =
        o.data_url ||
        o.dataUrl ||
        o.dataURL ||
        o.base64 ||
        o.url ||
        o.uri ||
        o.link ||
        o.href ||
        o.profile_picture ||
        o.profilePicture ||
        o.profile_picture_url ||
        o.profilePictureUrl ||
        '';
      if (typeof s === 'string' && s.trim()) return s.trim();
    }
  }
  return '';
};

const parseStoredMulti = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof v === 'object') {
    const s =
      v.url ||
      v.link ||
      v.href ||
      v.data_url ||
      v.dataUrl ||
      v.dataURL ||
      v.base64 ||
      '';
    const raw = String(s || '').trim();
    return raw ? [raw] : [];
  }
  const s = String(v || '').trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map((x) => String(x || '').trim()).filter(Boolean);
    } catch {}
  }
  if (s.includes('|')) return s.split('|').map((x) => String(x || '').trim()).filter(Boolean);
  if (s.includes('\n')) return s.split('\n').map((x) => String(x || '').trim()).filter(Boolean);
  return [s];
};

const isPdfLike = (u) => {
  const s = String(u || '').trim().toLowerCase();
  if (!s) return false;
  if (s.startsWith('data:application/pdf')) return true;
  if (s.includes('.pdf')) return true;
  return false;
};

const isImageLike = (u) => {
  const s = String(u || '').trim().toLowerCase();
  if (!s) return false;
  if (s.startsWith('data:image/')) return true;
  if (/\.(png|jpg|jpeg|webp|gif|svg)(\?|#|$)/.test(s)) return true;
  return false;
};

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

  const [resolvedProfileSrc, setResolvedProfileSrc] = useState('');
  const [resolvedProfileDataUrl, setResolvedProfileDataUrl] = useState('');
  const [resolvedProfileHttpUrl, setResolvedProfileHttpUrl] = useState('');

  const [requiredDocsRow, setRequiredDocsRow] = useState(null);
  const [requiredDocsLoading, setRequiredDocsLoading] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewItems, setPreviewItems] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

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

  const profile_picture = s.profile_picture ?? savedInfo.profilePicture ?? savedInfo.profile_picture ?? null;
  const profile_picture_url_preview = s.profile_picture_url ?? savedInfo.profilePictureUrl ?? savedInfo.profile_picture_url ?? '';

  const service_types = s.service_types ?? savedWork.service_types ?? savedWork.serviceTypesSelected ?? [];
  const service_task = s.service_task ?? savedWork.service_task ?? savedWork.serviceTaskSelected ?? {};
  const years_experience = s.years_experience ?? savedWork.years_experience ?? savedWork.yearsExperience ?? '';
  const tools_provided = s.tools_provided ?? savedWork.tools_provided ?? savedWork.toolsProvided ?? '';
  const service_description = s.service_description ?? savedWork.service_description ?? savedWork.serviceDescription ?? '';

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

  const ensureBase64DataUrl = async (v, mime = 'image/jpeg') => {
    const raw = String(v || '').trim();
    if (!raw) return '';
    if (raw.startsWith('data:')) return raw;
    if (raw.startsWith('blob:')) {
      const du = await blobToDataUrl(raw);
      return typeof du === 'string' && du.startsWith('data:') ? du : '';
    }
    if (looksLikeBase64(raw)) return `data:${mime};base64,${raw}`;
    return raw;
  };

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const raw = pickPicAny(
        s.profile_picture_data_url,
        s.profile_picture,
        s.profilePicture,
        s.profile_picture_url,
        s.profilePictureUrl,
        profile_picture,
        profile_picture_url_preview,
        savedInfo.profilePictureDataUrl,
        savedInfo.profile_picture_data_url,
        savedInfo.profilePicture,
        savedInfo.profile_picture,
        savedInfo.profilePictureUrl,
        savedInfo.profile_picture_url
      );

      const cleaned = String(raw || '').trim();
      let finalSrc = '';
      let dataUrl = '';
      let httpUrl = '';

      if (cleaned) {
        if (/^https?:\/\//i.test(cleaned)) {
          finalSrc = cleaned;
          httpUrl = cleaned;
        } else if (cleaned.startsWith('data:')) {
          finalSrc = cleaned;
          dataUrl = cleaned;
        } else if (cleaned.startsWith('blob:')) {
          const du = await blobToDataUrl(cleaned);
          if (du && du.startsWith('data:')) {
            finalSrc = du;
            dataUrl = du;
          }
        } else {
          const du = coerceImageToDataUrl(cleaned, 'image/jpeg');
          if (du && du.startsWith('data:')) {
            finalSrc = du;
            dataUrl = du;
          }
        }
      }

      if (!finalSrc) finalSrc = '';
      if (alive) {
        setResolvedProfileSrc(finalSrc);
        setResolvedProfileDataUrl(dataUrl);
        setResolvedProfileHttpUrl(httpUrl);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [s, profile_picture, profile_picture_url_preview, savedInfo]);

  useEffect(() => {
    let alive = true;

    const fetchRequiredDocs = async () => {
      try {
        const emailVal =
          (savedInfo.email ||
            localStorage.getItem('worker_email') ||
            localStorage.getItem('email_address') ||
            localStorage.getItem('email') ||
            email ||
            '')?.toString().trim();

        if (!emailVal) {
          if (alive) setRequiredDocsRow(null);
          return;
        }

        setRequiredDocsLoading(true);

        const { data } = await axios.get(`${API_BASE}/api/workerapplications`, {
          params: { scope: 'current', limit: 1, email: emailVal },
          withCredentials: true,
          headers: headersWithU
        });

        const items = Array.isArray(data?.items) ? data.items : [];
        const latest = items[0] || null;
        const docsRow = latest?.required_documents || null;

        if (alive) setRequiredDocsRow(docsRow);
      } catch {
        if (alive) setRequiredDocsRow(null);
      } finally {
        if (alive) setRequiredDocsLoading(false);
      }
    };

    fetchRequiredDocs();

    return () => {
      alive = false;
    };
  }, [headersWithU, savedInfo, email]);

  const normalizeDocsForSubmit = (arr) => {
    const kindMap = (s0 = '') => {
      const t = String(s0).toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

      const hasTesda = /tesda|nc|ncii|nc2/.test(t);
      const isCert = /certificate|cert\b|certs\b/.test(t) || hasTesda;

      const isCarp = /carpentry|carpenter/.test(t);
      const isElec = /electric|electrician|eim|electrical installation/.test(t);
      const isPlum = /plumb|plumbing|plumber/.test(t);
      const isCarwash = /carwash|car washing|car wash|automotive/.test(t);
      const isLaundry = /laundry|housekeeping/.test(t);

      if (/^tesda carpentry certificate$/.test(t) || (hasTesda && isCert && isCarp)) return 'tesda_carpentry_certificate';
      if (/^tesda electrician certificate$/.test(t) || (hasTesda && isCert && isElec)) return 'tesda_electrician_certificate';
      if (/^tesda plumbing certificate$/.test(t) || (hasTesda && isCert && isPlum)) return 'tesda_plumbing_certificate';
      if (/^tesda carwashing certificate$/.test(t) || /^tesda car washing certificate$/.test(t) || (hasTesda && isCert && isCarwash)) return 'tesda_carwashing_certificate';
      if (/^tesda laundry certificate$/.test(t) || (hasTesda && isCert && isLaundry)) return 'tesda_laundry_certificate';

      if ((/primary|main/.test(t) && /(front|face|id front)/.test(t)) || t === 'primary id front') return 'primary_id_front';
      if ((/primary|main/.test(t) && /(back|rear|reverse|id back)/.test(t)) || t === 'primary id back') return 'primary_id_back';
      if (/secondary|alternate|alt/.test(t) || t === 'secondary id') return 'secondary_id';
      if (/(nbi|police)/.test(t)) return 'nbi_police_clearance';
      if (/proof of address|address proof|billing|bill/.test(t)) return 'proof_of_address';
      if (/medical|med cert|health/.test(t)) return 'medical_certificate';
      if (/^tesda_.*_certificate$/.test(String(s0).toLowerCase())) return String(s0).toLowerCase();
      return '';
    };

    const extFromData = (s1 = '') => {
      const m = /^data:([^;]+);base64,/.exec(s1);
      if (!m) return 'bin';
      const mime = m[1].toLowerCase();
      if (mime === 'image/jpeg') return 'jpg';
      if (mime === 'image/png') return 'png';
      if (mime === 'image/webp') return 'webp';
      if (mime === 'image/gif') return 'gif';
      if (mime === 'image/svg+xml') return 'svg';
      if (mime === 'application/pdf') return 'pdf';
      return 'bin';
    };

    const pickDataUrl = (v) => {
      const s1 = typeof v?.data_url === 'string' ? v.data_url : '';
      const s2 = typeof v?.dataUrl === 'string' ? v.dataUrl : '';
      const s3 = typeof v?.dataURL === 'string' ? v.dataURL : '';
      const s4 = typeof v?.imageData === 'string' ? v.imageData : '';
      const s5 = typeof v?.blobData === 'string' ? v.blobData : '';
      const b64 = typeof v?.base64 === 'string' ? v.base64 : '';
      if (s1.startsWith('data:')) return s1;
      if (s2.startsWith('data:')) return s2;
      if (s3.startsWith('data:')) return s3;
      if (s4.startsWith('data:')) return s4;
      if (s5.startsWith('data:')) return s5;
      if (b64 && /^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return `data:image/jpeg;base64,${b64}`;
      return '';
    };

    const pull = (v) => {
      if (!v) return { url: '', data_url: '', guess: '' };
      if (typeof v === 'string')
        return {
          url: /^https?:\/\//i.test(v) ? v : '',
          data_url: v.startsWith('data:') ? v : coerceImageToDataUrl(v, 'image/jpeg'),
          guess: ''
        };
      const url =
        typeof v.url === 'string' && /^https?:\/\//i.test(v.url)
          ? v.url
          : typeof v.link === 'string' && /^https?:\/\//i.test(v.link)
          ? v.link
          : typeof v.href === 'string' && /^https?:\/\//i.test(v.href)
          ? v.href
          : '';
      const data_url = pickDataUrl(v) || coerceImageToDataUrl(v?.base64 || '', 'image/jpeg');
      const guess = v.kind || v.type || v.label || v.name || v.field || v.filename || v.fileName || v.title || v.meta?.kind || v.meta?.label || v.meta?.name || '';
      return { url, data_url, guess: String(guess || '') };
    };

    const pushDoc = (out, guessedKind, v) => {
      const { url, data_url, guess } = pull(v);
      if (!(url || data_url)) return;
      const k = kindMap(guessedKind || guess);
      if (!k) return;
      const ext = data_url ? extFromData(data_url) : ((url.split('.').pop() || 'bin').split('?')[0]);
      const filename = `${k}.${ext}`;
      out.push({ kind: k, url, data_url, filename });
    };

    const out = [];
    if (arr && !Array.isArray(arr) && typeof arr === 'object') {
      pushDoc(out, 'primary_id_front', arr.primary_id_front || arr.primary_front || arr.front);
      pushDoc(out, 'primary_id_back', arr.primary_id_back || arr.primary_back || arr.back);
      pushDoc(out, 'secondary_id', arr.secondary_id || arr.secondary || arr.alt);
      pushDoc(out, 'nbi_police_clearance', arr.nbi_police_clearance || arr.nbi || arr.police);
      pushDoc(out, 'proof_of_address', arr.proof_of_address || arr.address || arr.billing);
      pushDoc(out, 'medical_certificate', arr.medical_certificate || arr.medical);

      pushDoc(out, 'tesda_carpentry_certificate', arr.tesda_carpentry_certificate || arr.tesdaCarpentryCertificate || arr.carpentry_certificate || arr.carpentry);
      pushDoc(out, 'tesda_electrician_certificate', arr.tesda_electrician_certificate || arr.tesdaElectricianCertificate || arr.electrician_certificate || arr.electrical_certificate || arr.electrician);
      pushDoc(out, 'tesda_plumbing_certificate', arr.tesda_plumbing_certificate || arr.tesdaPlumbingCertificate || arr.plumbing_certificate || arr.plumbing);
      pushDoc(out, 'tesda_carwashing_certificate', arr.tesda_carwashing_certificate || arr.tesdaCarwashingCertificate || arr.carwashing_certificate || arr.carwash_certificate || arr.automotive_certificate || arr.carwashing);
      pushDoc(out, 'tesda_laundry_certificate', arr.tesda_laundry_certificate || arr.tesdaLaundryCertificate || arr.laundry_certificate || arr.housekeeping_certificate || arr.laundry);

      return out.filter((d) => d.kind && (d.url || d.data_url));
    }

    (Array.isArray(arr) ? arr : []).forEach((d) => {
      const guess = d?.kind || d?.type || d?.label || d?.name || d?.field || d?.filename || d?.fileName || d?.title || d?.meta?.kind || d?.meta?.label || d?.meta?.name || '';
      pushDoc(out, guess, d);
    });

    return out.filter((d) => d.kind && (d.url || d.data_url));
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
    const isEmpty = !isElement && (value === null || value === undefined || (typeof value === 'string' && value.trim() === ''));
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
    if (Array.isArray(serviceTypesRaw))
      serviceTypesRaw.forEach((t) => {
        out[String(t).trim()] = out[String(t).trim()] || [];
      });
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

  const extFromPicData = (s0 = '') => {
    const m = /^data:([^;]+);base64,/.exec(s0 || '');
    const mime = (m ? m[1] : '').toLowerCase();
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    if (mime === 'image/gif') return 'gif';
    if (mime === 'image/svg+xml') return 'svg';
    return 'jpg';
  };

  const getDocsForDisplay = () => {
    const fromApi = requiredDocsRow && typeof requiredDocsRow === 'object' ? requiredDocsRow : null;
    const localRow = savedDocsObj && typeof savedDocsObj === 'object' ? savedDocsObj : null;

    const pickVal = (k) => {
      const a = fromApi?.[k];
      if (a !== undefined && a !== null && String(a).trim() !== '') return a;
      const b = localRow?.[k];
      if (b !== undefined && b !== null && String(b).trim() !== '') return b;
      return '';
    };

    const docs = [
      { key: 'primary_id_front', label: 'Primary ID (Front)', value: pickVal('primary_id_front') },
      { key: 'primary_id_back', label: 'Primary ID (Back)', value: pickVal('primary_id_back') },
      { key: 'secondary_id', label: 'Secondary ID', value: pickVal('secondary_id') },
      { key: 'nbi_police_clearance', label: 'NBI / Police Clearance', value: pickVal('nbi_police_clearance') },
      { key: 'proof_of_address', label: 'Proof of Address', value: pickVal('proof_of_address') },
      { key: 'medical_certificate', label: 'Medical Certificate', value: pickVal('medical_certificate') }
    ];

    const certs = [
      { key: 'tesda_carpentry_certificate', label: 'TESDA Carpentry Certificate', value: pickVal('tesda_carpentry_certificate') },
      { key: 'tesda_electrician_certificate', label: 'TESDA Electrician Certificate', value: pickVal('tesda_electrician_certificate') },
      { key: 'tesda_plumbing_certificate', label: 'TESDA Plumbing Certificate', value: pickVal('tesda_plumbing_certificate') },
      { key: 'tesda_carwashing_certificate', label: 'TESDA Carwashing Certificate', value: pickVal('tesda_carwashing_certificate') },
      { key: 'tesda_laundry_certificate', label: 'TESDA Laundry Certificate', value: pickVal('tesda_laundry_certificate') }
    ];

    const docsClean = docs
      .map((d) => ({ ...d, list: parseStoredMulti(d.value) }))
      .filter((d) => d.list.length > 0);

    const certsClean = certs
      .map((c) => ({ ...c, list: parseStoredMulti(c.value) }))
      .filter((c) => c.list.length > 0);

    return { docs: docsClean, certs: certsClean };
  };

  const { docs: docsToShow, certs: certsToShow } = useMemo(() => getDocsForDisplay(), [requiredDocsRow, savedDocsObj]);

  const openDoc = (u) => {
    const url = String(u || '').trim();
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  const openPreview = (title, list) => {
    const arr = Array.isArray(list) ? list.map((x) => String(x || '').trim()).filter(Boolean) : [];
    if (!arr.length) return;
    setPreviewTitle(String(title || '').trim() || 'Preview');
    setPreviewItems(arr);
    setPreviewIndex(0);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewItems([]);
    setPreviewIndex(0);
    setPreviewTitle('');
  };

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closePreview();
      if (e.key === 'ArrowRight' && previewItems.length > 1) setPreviewIndex((x) => (x + 1) % previewItems.length);
      if (e.key === 'ArrowLeft' && previewItems.length > 1) setPreviewIndex((x) => (x - 1 + previewItems.length) % previewItems.length);
    };
    window.addEventListener('keydown', onKey, true);
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
    };
  }, [previewOpen, previewItems.length]);

  const PreviewModal = () => {
    if (!previewOpen) return null;
    const cur = previewItems[previewIndex] || '';
    const pdf = isPdfLike(cur);
    const img = isImageLike(cur);
    const total = previewItems.length;

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Preview"
        tabIndex={-1}
        className="fixed inset-0 z-[2147483647] flex items-center justify-center px-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closePreview();
        }}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-md" />
        <div className="relative w-[980px] max-w-[96vw] max-h-[92vh] rounded-3xl border border-white/30 bg-white shadow-2xl overflow-hidden">
          <div className="px-5 md:px-6 py-4 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/90 backdrop-blur">
            <div className="min-w-0">
              <div className="text-base md:text-lg font-semibold text-gray-900 truncate">{previewTitle || 'Preview'}</div>
              {total > 1 ? (
                <div className="text-xs md:text-sm text-gray-500 mt-0.5">
                  {previewIndex + 1} / {total}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={closePreview}
                className="h-9 w-9 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                aria-label="Close"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
          </div>

          <div className="relative bg-gradient-to-b from-white to-gray-50">
            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewIndex((x) => (x - 1 + total) % total)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-2xl bg-white/90 border border-gray-200 shadow-sm hover:bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewIndex((x) => (x + 1) % total)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-2xl bg-white/90 border border-gray-200 shadow-sm hover:bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            ) : null}

            <div className="p-4 md:p-6">
              <div className="w-full h-[62vh] max-h-[62vh] rounded-2xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex items-center justify-center">
                {img ? (
                  <img src={cur} alt="" className="w-full h-full object-contain bg-white" />
                ) : pdf ? (
                  <iframe title="PDF preview" src={cur} className="w-full h-full bg-white" />
                ) : (
                  <div className="text-center px-6">
                    <div className="text-sm font-semibold text-gray-900">File preview not available</div>
                  </div>
                )}
              </div>

              {total > 1 ? (
                <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                  {previewItems.slice(0, 12).map((u, i) => {
                    const active = i === previewIndex;
                    const thumbImg = isImageLike(u);
                    return (
                      <button
                        key={`${u}-${i}`}
                        type="button"
                        onClick={() => setPreviewIndex(i)}
                        className={`h-14 w-14 rounded-2xl border overflow-hidden grid place-items-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 ${
                          active ? 'border-[#008cfc] ring-2 ring-[#008cfc]/15' : 'border-gray-200 bg-white'
                        }`}
                        aria-label={`Preview ${i + 1}`}
                      >
                        {thumbImg ? (
                          <img src={u} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-600">{isPdfLike(u) ? 'PDF' : 'FILE'}</span>
                        )}
                      </button>
                    );
                  })}
                  {previewItems.length > 12 ? <div className="text-xs text-gray-500 px-2">+{previewItems.length - 12} more</div> : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const FileBadge = ({ type }) => {
    const isImg = type === 'image';
    const isPdf = type === 'pdf';
    return (
      <span
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isImg ? 'bg-blue-50 text-[#008cfc] border-blue-100' : isPdf ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-700 border-gray-200'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isImg ? 'bg-[#008cfc]' : isPdf ? 'bg-amber-500' : 'bg-gray-400'}`} />
        {isImg ? 'Image' : isPdf ? 'PDF' : 'File'}
      </span>
    );
  };

  const DocumentTile = ({ title, list }) => {
    const items = Array.isArray(list) ? list : [];
    const first = items[0] || '';
    const img = isImageLike(first);
    const pdf = isPdfLike(first);

    return (
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <FileBadge type={img ? 'image' : pdf ? 'pdf' : 'file'} />
              <span className="text-xs text-gray-500">
                {items.length} file{items.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openPreview(title, items)}
            className="shrink-0 h-9 px-3 rounded-xl bg-[#008cfc] text-white text-sm hover:bg-[#0077d6] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
          >
            Preview
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="w-full h-44 rounded-2xl overflow-hidden border border-gray-200 bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
            {img ? (
              <img
                src={first}
                alt={title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : pdf ? (
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 grid place-items-center">
                  <span className="text-sm font-extrabold text-amber-700">PDF</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">Ready to preview</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-gray-50 border border-gray-200 grid place-items-center">
                  <span className="text-xs font-extrabold text-gray-700">FILE</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">Ready to preview</div>
              </div>
            )}
          </div>

          {items.length > 1 ? (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">Multiple uploads detected</div>
              <button
                type="button"
                onClick={() => openDoc(first)}
                className="text-xs font-semibold text-[#008cfc] hover:underline focus:outline-none"
              >
                Open first
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const CertGrid = ({ title, items }) => {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        <div className="border-t border-gray-100" />
        <div className="px-6 py-6">
          {items.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((c) => {
                const list = Array.isArray(c.list) ? c.list : parseStoredMulti(c.value);
                return <DocumentTile key={c.key} title={c.label} list={list} />;
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No certificates found.</div>
          )}
        </div>
      </div>
    );
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

      const authUidVal =
        (localStorage.getItem('auth_uid') ||
          localStorage.getItem('worker_auth_uid') ||
          workerAuth.auth_uid ||
          workerAuth.authUid ||
          workerAuth.uid ||
          workerAuth.id ||
          '')?.toString() || '';

      const initialPayload = {
        info: {
          firstName: infoDraft.firstName || '',
          lastName: infoDraft.lastName || '',
          contactNumber: infoDraft.contactNumber || '',
          email: (infoDraft.email || '').trim(),
          street: infoDraft.street || '',
          barangay: infoDraft.barangay || '',
          profilePicture: infoDraft.profilePicture || infoDraft.profile_picture || '',
          profilePictureName: infoDraft.profilePictureName || infoDraft.profile_picture_name || '',
          profilePictureUrl: infoDraft.profilePictureUrl || infoDraft.profile_picture_url || '',
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
        agreements: {
          consent_background_checks: !!agreeDraft.agree_verify,
          consent_terms_privacy: !!agreeDraft.agree_tos,
          consent_data_privacy: !!agreeDraft.agree_privacy
        }
      };

      let profilePicData = '';
      let profilePicUrl = '';

      const picCandidate = pickPicAny(
        infoDraft.profilePictureDataUrl,
        infoDraft.profile_picture_data_url,
        initialPayload.info.profilePicture,
        initialPayload.info.profilePictureUrl,
        s.profile_picture_data_url,
        profile_picture,
        profile_picture_url_preview,
        resolvedProfileDataUrl,
        resolvedProfileHttpUrl,
        resolvedProfileSrc
      );

      if (picCandidate) {
        const resolved = await ensureBase64DataUrl(picCandidate, 'image/jpeg');
        if (resolved.startsWith('data:')) profilePicData = resolved;
        else if (/^https?:\/\//i.test(resolved)) profilePicUrl = resolved;
        else {
          const du = coerceImageToDataUrl(resolved, 'image/jpeg');
          if (du) profilePicData = du;
        }
      }

      if (!profilePicData && !profilePicUrl) {
        const urlCandidate = pickPicAny(initialPayload.info.profilePictureUrl, profile_picture_url_preview, resolvedProfileHttpUrl);
        if (urlCandidate && /^https?:\/\//i.test(urlCandidate)) profilePicUrl = urlCandidate;
      }

      if (!profilePicData && !profilePicUrl) {
        setIsSubmitting(false);
        setSubmitError('Please upload a profile picture.');
        return;
      }

      if (!initialPayload.info.profilePictureName && profilePicData) {
        const ext = extFromPicData(profilePicData);
        initialPayload.info.profilePictureName = `profile-${Date.now()}.${ext}`;
      }

      const docsCandidatesMerged = []
        .concat(Array.isArray(docsDraftA) ? docsDraftA : [])
        .concat(Array.isArray(docsDraftB) ? docsDraftB : []);

      const docsDraftProcessed = await Promise.all(
        (docsCandidatesMerged || []).map(async (d) => {
          if (!d) return d;
          if (typeof d === 'string') {
            const resolved = await ensureBase64DataUrl(d, 'image/jpeg');
            return resolved.startsWith('data:') ? { data_url: resolved } : d;
          }
          const u = typeof d.url === 'string' ? d.url : typeof d.link === 'string' ? d.link : typeof d.href === 'string' ? d.href : '';
          if (u && u.startsWith('blob:')) {
            const du = await blobToDataUrl(u);
            return { ...d, data_url: du, url: '' };
          }
          if (typeof d.data_url === 'string' && d.data_url.startsWith('blob:')) {
            const du = await blobToDataUrl(d.data_url);
            return { ...d, data_url: du };
          }
          if (typeof d.base64 === 'string' && looksLikeBase64(d.base64)) {
            return { ...d, data_url: `data:image/jpeg;base64,${d.base64}` };
          }
          return d;
        })
      );

      const docsObjPrepared = await (async () => {
        const readJson = (k, d) => {
          try {
            return JSON.parse(localStorage.getItem(k) || d);
          } catch {
            return JSON.parse(d);
          }
        };

        const objCanon = readJson('worker_required_documents', '{}');
        const objCanonAlt = readJson('workerRequiredDocuments', '{}');
        const objData = readJson('workerDocumentsData', '{}');
        const objMeta = readJson('workerDocuments', '{}');

        const pickOne = (v) => {
          const take = (x) => {
            if (!x) return '';
            if (typeof x === 'string') return x;
            if (typeof x === 'object') {
              return x.data_url || x.dataUrl || x.dataURL || x.base64 || x.url || x.link || x.href || '';
            }
            return String(x);
          };

          if (Array.isArray(v)) {
            for (const item of v) {
              const got = take(item);
              if (got && String(got).trim()) return String(got);
            }
            return '';
          }

          return String(take(v) || '');
        };

        const mapAnyToCanon = (o) => {
          if (!o || typeof o !== 'object') return {};
          return {
            primary_id_front: pickOne(o.primary_id_front || o.primary_front || o.front || o.primaryIdFront),
            primary_id_back: pickOne(o.primary_id_back || o.primary_back || o.back || o.primaryIdBack),
            secondary_id: pickOne(o.secondary_id || o.secondary || o.alt || o.secondaryId),
            nbi_police_clearance: pickOne(o.nbi_police_clearance || o.nbi || o.police || o.nbiPoliceClearance),
            proof_of_address: pickOne(o.proof_of_address || o.address || o.billing || o.proofOfAddress),
            medical_certificate: pickOne(o.medical_certificate || o.medical || o.medicalCertificate),
            tesda_carpentry_certificate: pickOne(o.tesda_carpentry_certificate || o.tesdaCarpentryCertificate || o.carpentry_certificate || o.carpentry),
            tesda_electrician_certificate: pickOne(o.tesda_electrician_certificate || o.tesdaElectricianCertificate || o.electrician_certificate || o.electrical_certificate || o.electrician),
            tesda_plumbing_certificate: pickOne(o.tesda_plumbing_certificate || o.tesdaPlumbingCertificate || o.plumbing_certificate || o.plumbing),
            tesda_carwashing_certificate: pickOne(o.tesda_carwashing_certificate || o.tesdaCarwashingCertificate || o.carwashing_certificate || o.carwash_certificate || o.automotive_certificate || o.carwashing),
            tesda_laundry_certificate: pickOne(o.tesda_laundry_certificate || o.tesdaLaundryCertificate || o.laundry_certificate || o.housekeeping_certificate || o.laundry)
          };
        };

        let base = Object.assign({}, mapAnyToCanon(objCanon), mapAnyToCanon(objCanonAlt));

        const hasAny = (b) => {
          const keys = [
            'primary_id_front',
            'primary_id_back',
            'secondary_id',
            'nbi_police_clearance',
            'proof_of_address',
            'medical_certificate',
            'tesda_carpentry_certificate',
            'tesda_electrician_certificate',
            'tesda_plumbing_certificate',
            'tesda_carwashing_certificate',
            'tesda_laundry_certificate'
          ];
          return keys.some((k) => !!String(b?.[k] || '').trim());
        };

        if (!hasAny(base)) base = mapAnyToCanon(objData);
        if (!hasAny(base)) base = mapAnyToCanon(objMeta);

        const keys = [
          'primary_id_front',
          'primary_id_back',
          'secondary_id',
          'nbi_police_clearance',
          'proof_of_address',
          'medical_certificate',
          'tesda_carpentry_certificate',
          'tesda_electrician_certificate',
          'tesda_plumbing_certificate',
          'tesda_carwashing_certificate',
          'tesda_laundry_certificate'
        ];

        for (const k of keys) {
          const v = base[k];
          const resolved = await ensureBase64DataUrl(v, 'image/jpeg');
          if (resolved.startsWith('data:')) base[k] = resolved;
          else if (looksLikeBase64(resolved)) base[k] = `data:image/jpeg;base64,${resolved}`;
          else base[k] = resolved || '';
        }

        return base;
      })();

      const docsObjHasAny = (() => {
        const keys = [
          'primary_id_front',
          'primary_id_back',
          'secondary_id',
          'nbi_police_clearance',
          'proof_of_address',
          'medical_certificate',
          'tesda_carpentry_certificate',
          'tesda_electrician_certificate',
          'tesda_plumbing_certificate',
          'tesda_carwashing_certificate',
          'tesda_laundry_certificate'
        ];
        return keys.some((k) => !!String(docsObjPrepared?.[k] || '').trim());
      })();

      const documentsNormalized = docsObjHasAny ? normalizeDocsForSubmit(docsObjPrepared) : normalizeDocsForSubmit(docsDraftProcessed);

      const docsObject = await (async () => {
        const out = {};
        for (const d of documentsNormalized || []) {
          const k = d?.kind || '';
          if (!k) continue;
          const val = d?.data_url || d?.url || '';
          if (!val) continue;
          const resolved = await ensureBase64DataUrl(val, 'image/jpeg');
          out[k] = resolved || val;
        }

        const srcObj = savedDocsObj && typeof savedDocsObj === 'object' ? savedDocsObj : {};
        const keys = [
          'primary_id_front',
          'primary_id_back',
          'secondary_id',
          'nbi_police_clearance',
          'proof_of_address',
          'medical_certificate',
          'tesda_carpentry_certificate',
          'tesda_electrician_certificate',
          'tesda_plumbing_certificate',
          'tesda_carwashing_certificate',
          'tesda_laundry_certificate'
        ];

        for (const k of keys) {
          const v = srcObj[k] || srcObj[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
          if (typeof v === 'string' && v && !out[k]) {
            const resolved = await ensureBase64DataUrl(v, 'image/jpeg');
            out[k] = resolved || v;
          }
        }

        if ('certificates' in out) delete out.certificates;

        return out;
      })();

      const certificatesObject = (() => {
        const out = {};
        [
          'tesda_carpentry_certificate',
          'tesda_electrician_certificate',
          'tesda_plumbing_certificate',
          'tesda_carwashing_certificate',
          'tesda_laundry_certificate'
        ].forEach((k) => {
          const v = docsObject?.[k] || '';
          if (typeof v === 'string' && v.trim()) out[k] = v;
        });
        return out;
      })();

      const emailVal =
        (savedInfo.email ||
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
        first_name: (first_name || '').trim(),
        last_name: (last_name || '').trim(),
        email_address: emailVal,
        contact_number: (contact_number || '').trim(),
        barangay: (barangay || '').trim() || 'N/A',
        street: (street || '').trim() || 'N/A',
        date_of_birth: (date_of_birth || '').trim(),
        age: age || null,
        profile_picture: profilePicData || profilePicUrl,
        profile_picture_name: initialPayload.info.profilePictureName || '',
        service_types: asStringArray(service_types),
        service_task: buildServiceTaskObject(service_task, service_types),
        years_experience: coerceYears(years_experience),
        tools_provided: normalizeToolsProvided(tools_provided),
        service_description: (service_description || '').trim(),
        documents: documentsNormalized,
        required_documents_object: docsObject,
        certificates: certificatesObject,
        agreements: {
          consent_background_checks: !!initialPayload.agreements.consent_background_checks,
          consent_terms_privacy: !!initialPayload.agreements.consent_terms_privacy,
          consent_data_privacy: !!initialPayload.agreements.consent_data_privacy
        },
        metadata: {
          profile_picture_name: initialPayload.info.profilePictureName || '',
          auth_uid: authUidVal,
          profile_picture_data_url: profilePicData || '',
          profile_picture_url: profilePicUrl || '',
          certificates: certificatesObject
        }
      };

      const missing = requireFields(normalized, [
        'first_name',
        'last_name',
        'contact_number',
        'street',
        'barangay',
        'service_types',
        'service_description',
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
        profile_picture_url: normalized.metadata.profile_picture_url,
        profilePictureUrl: normalized.metadata.profile_picture_url,
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

      const requiredDocsPayload = {
        ...normalized.required_documents_object,
        worker_id: normalized.worker_id,
        email_address: normalized.email_address,
        auth_uid: normalized.metadata.auth_uid,
        certificates: normalized.certificates
      };

      if ('certificates' in requiredDocsPayload && (!requiredDocsPayload.certificates || typeof requiredDocsPayload.certificates !== 'object')) {
        delete requiredDocsPayload.certificates;
      }

      const res = await axios.post(
        `${API_BASE}/api/workerapplications/submit`,
        {
          info: infoPayload,
          details: workPayload,
          documents: normalized.documents,
          required_documents: requiredDocsPayload,
          required_documents_object: normalized.required_documents_object,
          certificates: normalized.certificates,
          agreements: normalized.agreements,
          email_address: normalized.email_address,
          worker_id: normalized.worker_id,
          auth_uid: normalized.metadata.auth_uid,
          metadata: normalized.metadata,
          profile_picture_data_url: normalized.metadata.profile_picture_data_url,
          profile_picture_url: normalized.metadata.profile_picture_url,
          profile_picture_name: normalized.profile_picture_name || normalized.metadata.profile_picture_name || ''
        },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json', ...headersWithU }
        }
      );

      const gid = res?.data?.application?.request_group_id || res?.data?.request_group_id || null;
      setApplicationGroupId(gid);
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
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs md:text-sm px-2.5 py-1">{children}</span>
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

  const displayProfileSrc =
    resolvedProfileSrc ||
    (typeof profile_picture_url_preview === 'string' && /^https?:\/\//i.test(profile_picture_url_preview) ? profile_picture_url_preview : '') ||
    fallbackProfile;

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
            <div className="hidden sm:block text-sm text-gray-500">Step 4 of 4</div>
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
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-2 ring-blue-100 bg-white shadow-sm">
                    <img
                      src={displayProfileSrc}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = fallbackProfile;
                      }}
                    />
                  </div>
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
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900">Required Documents</h3>
                  </div>
                </div>
                <div className="border-t border-gray-100" />
                <div className="px-6 py-6">
                  {docsToShow.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {docsToShow.map((d) => (
                        <DocumentTile key={d.key} title={d.label} list={d.list || parseStoredMulti(d.value)} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No required documents found.</div>
                  )}
                </div>
              </div>

              <CertGrid title="TESDA Certificates" items={certsToShow} />
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
                    <span className="text-base font-semibold text-[#008cfc]">
                      {first_name || '-'} {last_name || ''}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Services:</span>
                    <span className="text-base font-semibold text-[#008cfc] truncate max-w-[60%] text-right sm:text-left">
                      {formatList(service_types)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Experience:</span>
                    <span className="text-base font-semibold text-[#008cfc]">{years_experience || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-700">Tools:</span>
                    <span className="text-base font-semibold text-[#008cfc]">{tools_provided || '-'}</span>
                  </div>
                </div>
                {submitError ? <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-t border-red-100">{submitError}</div> : null}
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
                    Submit
                  </button>
                </div>
              </div>
            </aside>
          </div>

          {false && <></>}
        </div>
      </div>

      <PreviewModal />

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
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
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
                  <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-20 h-20 object-contain" onError={() => setLogoBroken(true)} />
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
                <img src="/jdklogo.png" alt="JDK Homecare Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
              ) : (
                <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                  <span className="font-bold text-[#008cfc]">JDK</span>
                </div>
              )}
            </div>

            <div className="mt-6 text-center space-y-2">
              <div className="text-lg font-semibold text-gray-900">Application Submitted!</div>
              <div className="mt-1 text-sm text-gray-600">Your application has been successfully submitted.</div>
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
