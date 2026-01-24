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
        documents: docsDraftProcessed || [],
        agreements: {
          consent_background_checks: !!initialPayload.agreements.consent_background_checks,
          consent_terms_privacy: !!initialPayload.agreements.consent_terms_privacy,
          consent_data_privacy: !!initialPayload.agreements.consent_data_privacy
        },
        metadata: {
          profile_picture_name: initialPayload.info.profilePictureName || '',
          auth_uid: authUidVal,
          profile_picture_data_url: profilePicData || '',
          profile_picture_url: profilePicUrl || ''
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

      const res = await axios.post(
        `${API_BASE}/api/workerapplications/submit`,
        {
          info: infoPayload,
          details: workPayload,
          documents: normalized.documents,
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
