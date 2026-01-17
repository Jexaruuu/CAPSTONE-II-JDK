import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import WorkerNavigation from '../../workercomponents/WorkerNavigation';
import WorkerFooter from '../../workercomponents/WorkerFooter';
import axios from 'axios';

const CONFIRM_FLAG = 'workerApplicationJustViewed';
const GLOBAL_DESC_KEY = 'workerApplicationDescription';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const REASONS = ['Change of plans', 'Schedule conflict', 'Rate not suitable', 'Applied by mistake'];

const WorkerViewApplication = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [logoBroken, setLogoBroken] = useState(false);
  const [workerIdState, setWorkerIdState] = useState(null);
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelErr, setCancelErr] = useState('');
  const [leavingDone, setLeavingDone] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const jumpTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {}
  };

  useEffect(() => {
    const widLS = localStorage.getItem('worker_id');
    setWorkerIdState(widLS ? Number(widLS) : null);
  }, []);

  const headersWithU = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem('workerAuth') || '{}');
      const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem('auth_uid') || '';
      const e =
        a.email ||
        localStorage.getItem('worker_email') ||
        localStorage.getItem('email_address') ||
        localStorage.getItem('email') ||
        '';
      const x = encodeURIComponent(JSON.stringify({ r: 'worker', e, au }));
      return { 'x-app-u': x };
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const fromSession = (() => {
          try {
            const raw =
              sessionStorage.getItem('wa_view_payload') || sessionStorage.getItem('worker_app_view_payload') || 'null';
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })();
        const fromState = location.state && (location.state.row || location.state.item || location.state.data);
        const data = fromSession || fromState || null;
        if (!data) {
          try {
            const tryParams = [
              { scope: 'current', id },
              { scope: 'current', application_id: id },
              { scope: 'current', applicationId: id },
              { scope: 'current', worker_application_id: id },
              { scope: 'current', workerApplicationId: id },
              { scope: 'current', applicationId: id, id },
              { scope: 'current', groupId: id }
            ];

            let pick = null;
            for (const params of tryParams) {
              try {
                const { data: resp } = await axios.get(`${API_BASE}/api/workerapplications`, {
                  withCredentials: true,
                  headers: headersWithU,
                  params
                });

                const items = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp) ? resp : [];
                const wanted = String(id);

                pick =
                  items.find(r => String(r?.id ?? '').trim() === wanted) ||
                  items.find(r => String(r?.application_id ?? '').trim() === wanted) ||
                  items.find(r => String(r?.worker_application_id ?? '').trim() === wanted) ||
                  items.find(r => String(r?.applicationId ?? '').trim() === wanted) ||
                  items.find(r => String(r?.workerApplicationId ?? '').trim() === wanted) ||
                  items.find(r => String(r?.request_group_id ?? '').trim() === wanted) ||
                  items.find(r => String(r?.group_id ?? '').trim() === wanted) ||
                  items[0] ||
                  null;

                if (pick) break;
              } catch {}
            }

            if (!cancelled) setRow(pick);
            try {
              if (pick) sessionStorage.setItem('wa_view_payload', JSON.stringify(pick));
            } catch {}
          } catch {
            if (!cancelled) setRow(null);
          } finally {
            if (!cancelled) setLoading(false);
          }
          return;
        }
        if (!cancelled) setRow(data);
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, location.state, headersWithU]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    if (loading || showCancel || submittingCancel || leavingDone || showCancelSuccess) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    } else {
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
    }
    return () => {
      html.style.overflow = prevHtmlOverflow || '';
      body.style.overflow = prevBodyOverflow || '';
    };
  }, [loading, showCancel, submittingCancel, leavingDone, showCancelSuccess]);

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
  const savedRate = (() => {
    try {
      return JSON.parse(localStorage.getItem('workerRate') || '{}');
    } catch {
      return {};
    }
  })();
  const savedDocs = (() => {
    try {
      return JSON.parse(localStorage.getItem('workerDocumentsData') || '[]');
    } catch {
      return [];
    }
  })();

  const s = location.state || {};

  const fx = row || {};
  const infoR = fx.info || {};
  const workR = fx.work || {};
  const detailsR = fx.details || {};
  const rateR = fx.rate || {};
  const docsR = Array.isArray(fx.documents) ? fx.documents : fx.docs || [];

  const applicationIdDisplay = useMemo(() => {
    const candidates = [
      fx?.id,
      fx?.application_id,
      fx?.applicationId,
      fx?.worker_application_id,
      fx?.workerApplicationId,
      fx?.request_group_id,
      fx?.requestGroupId,
      fx?.request_group,
      fx?.group_id,
      fx?.groupId,
      fx?.request_id,
      fx?.requestId,
      detailsR?.application_id,
      detailsR?.applicationId,
      detailsR?.request_group_id,
      detailsR?.requestGroupId,
      workR?.request_group_id,
      workR?.requestGroupId,
      s?.id,
      s?.application_id,
      s?.applicationId,
      s?.request_group_id,
      s?.requestGroupId,
      id
    ];
    for (const c of candidates) {
      if (c === null || c === undefined) continue;
      const str = String(c).trim();
      if (str) return str;
    }
    return '-';
  }, [fx, detailsR, workR, s, id]);

  const first_name = infoR.first_name ?? s.first_name ?? savedInfo.firstName;
  const last_name = infoR.last_name ?? s.last_name ?? savedInfo.lastName;
  const contact_number = infoR.contact_number ?? s.contact_number ?? savedInfo.contactNumber;
  const email = infoR.email_address ?? s.email ?? savedInfo.email;
  const street = infoR.street ?? s.street ?? savedInfo.street;
  const barangay = infoR.barangay ?? s.barangay ?? savedInfo.barangay;
  const additional_address = infoR.additional_address ?? s.additional_address ?? savedInfo.additionalAddress;
  const profile_picture = infoR.profile_picture_url ?? s.profile_picture ?? savedInfo.profilePicture;

  const selectedTasksFromJobDetails = (() => {
    const jd = workR.job_details;
    if (!jd) return undefined;
    if (Array.isArray(jd)) return jd;
    if (typeof jd === 'string') return [jd];
    if (typeof jd === 'object') {
      const out = [];
      for (const v of Object.values(jd)) {
        if (Array.isArray(v)) out.push(...v.map(String));
        else if (typeof v === 'string') out.push(v);
      }
      return out.length ? out : undefined;
    }
    return undefined;
  })();

  const service_types = workR.service_types ?? detailsR.service_types ?? s.service_types ?? savedWork.serviceTypes;

  const normalizeTasks = raw => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      if (raw.length && typeof raw[0] === 'object' && raw[0] !== null && ('category' in raw[0] || 'tasks' in raw[0])) {
        const out = [];
        raw.forEach(it => {
          const arr = Array.isArray(it?.tasks) ? it.tasks : [];
          out.push(...arr.map(x => String(x || '').trim()).filter(Boolean));
        });
        return Array.from(new Set(out));
      }
      return raw.map(x => String(x || '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string') return raw.split(',').map(x => x.trim()).filter(Boolean);
    if (typeof raw === 'object') {
      const out = [];
      Object.values(raw).forEach(v => {
        if (Array.isArray(v)) out.push(...v.map(x => String(x || '').trim()).filter(Boolean));
        else if (typeof v === 'string') out.push(String(v).trim());
      });
      return Array.from(new Set(out));
    }
    return [];
  };

  const service_tasks_list = normalizeTasks(
    workR.service_task ??
      workR.service_tasks ??
      detailsR.service_task ??
      detailsR.service_tasks ??
      workR.selected_tasks ??
      workR.selected_task ??
      selectedTasksFromJobDetails ??
      s.service_tasks ??
      savedWork.serviceTasks ??
      savedWork.service_task
  );

  const years_experience =
    workR.years_experience ?? detailsR.years_experience ?? s.years_experience ?? savedWork.yearsExperience;

  const tools_provided = workR.tools_provided ?? detailsR.tools_provided ?? s.tools_provided ?? savedWork.toolsProvided;

  const application_description =
    workR.description ??
    workR.work_description ??
    workR.job_details?.description ??
    detailsR.work_description ??
    s.description ??
    savedWork.description;

  const inferredRateType = rateR.rate_type ?? s.rate_type ?? savedRate.rateType;
  const rate_type = (() => {
    const t = String(inferredRateType || '').toLowerCase();
    if (t === 'range' || t === 'hourly') return 'Hourly Rate';
    if (t === 'fixed' || t === 'by_job' || t === 'by the job' || t === 'by_the_job') return 'By the Job Rate';
    return inferredRateType || '';
  })();
  const rate_from = rateR.rate_from ?? s.rate_from ?? savedRate.rateFrom;
  const rate_to = rateR.rate_to ?? s.rate_to ?? savedRate.rateTo;
  const rate_value = rateR.rate_value ?? s.rate_value ?? savedRate.rateValue;

  const review_image =
    workR.image_url ||
    workR.image ||
    (Array.isArray(savedWork.attachments) && savedWork.attachments[0]) ||
    savedWork.image ||
    '';

  const formatTime12h = t => {
    if (!t || typeof t !== 'string' || !t.includes(':')) return t || '-';
    const [hh, mm] = t.split(':');
    let h = parseInt(hh, 10);
    if (Number.isNaN(h)) return t;
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mm} ${suffix}`;
  };

  const formatDateMDY = d => {
    if (!d) return d || '-';
    const tryDate = new Date(d);
    if (!Number.isNaN(tryDate.getTime())) {
      const mm = String(tryDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tryDate.getDate()).padStart(2, '0');
      const yyyy = String(tryDate.getFullYear());
      return `${mm}/${dd}/${yyyy}`;
    }
    const parts = String(d).split('-');
    if (parts.length === 3) {
      const [yyyy, mm, dd] = parts;
      return `${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}/${yyyy}`;
    }
    return d;
  };

  const toBoolStrict = v => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1') return true;
    if (v === 0 || v === '0') return false;
    const s2 = String(v ?? '').trim().toLowerCase();
    if (['yes', 'y', 'true', 't'].includes(s2)) return true;
    if (['no', 'n', 'false', 'f'].includes(s2)) return false;
    return false;
  };

  const yesNo = b => (b ? 'Yes' : 'No');

  const normalizeLocalPH10 = v => {
    let d = String(v || '').replace(/\D/g, '');
    if (d.startsWith('63')) d = d.slice(2);
    if (d.startsWith('0')) d = d.slice(1);
    if (d.length > 10) d = d.slice(-10);
    if (d.length === 10 && d[0] === '9') return d;
    return '';
  };

  const contactLocal10 = normalizeLocalPH10(contact_number);

  const contactDisplay = (
    <div className="inline-flex items-center gap-2">
      <img src="/philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover" />
      <span className="text-base md:text-lg leading-6 text-[#008cfc] font-semibold">+63</span>
      <span className="text-base md:text-lg leading-6 text-[#008cfc] font-semibold">
        {contactLocal10 || '9XXXXXXXXX'}
      </span>
    </div>
  );

  const LabelValue = ({ label, value, emptyAs = '-' }) => {
    const isElement = React.isValidElement(value);
    const mapped = typeof value === 'boolean' ? yesNo(value) : value;
    const isEmpty =
      !isElement && (mapped === null || mapped === undefined || (typeof mapped === 'string' && mapped.trim() === ''));
    const display = isElement ? value : isEmpty ? emptyAs : mapped;
    const labelText = `${String(label || '').replace(/:?\s*$/, '')}:`;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[15px] md:text-base font-medium text-gray-700">{labelText}</span>
        {isElement ? (
          <div className="inline-flex items-center gap-2 text-[15px] md:text-base text-[#008cfc] font-semibold">
            {display}
          </div>
        ) : (
          <span className="text-[15px] md:text-base font-semibold text-[#008cfc]">{display}</span>
        )}
      </div>
    );
  };

  const handleDone = async () => {
    setLeavingDone(true);
    try {
      localStorage.removeItem(GLOBAL_DESC_KEY);
      localStorage.setItem(CONFIRM_FLAG, '1');
      window.dispatchEvent(new Event('worker-application-viewed'));
    } catch {}
    await new Promise(r => setTimeout(r, 350));
    setTimeout(() => {
      jumpTop();
      if (window.history.length > 1) navigate(-1);
      else navigate('/workerdashboard', { replace: true });
    }, 2000);
  };

  const handleCancel = () => {
    setCancelErr('');
    setReason('');
    setOtherReason('');
    setShowCancel(true);
  };

  const submitCancel = async () => {
    if (!reason && !otherReason.trim()) {
      setCancelErr('Please select a reason or write one.');
      return;
    }
    setCancelErr('');
    setShowCancel(false);
    await new Promise(r => setTimeout(r, 30));
    setSubmittingCancel(true);
    try {
      try {
        const key = 'workerApplications';
        const raw = localStorage.getItem(key) || '[]';
        const base = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
        const updated = base.map(app => {
          const appId = String(app.id ?? app.application_id ?? app.request_group_id ?? '');
          if (appId !== String(id || '')) return app;
          return {
            ...app,
            status: 'cancelled',
            reason_choice: reason || null,
            reason_other: otherReason || null,
            decision_reason: app.decision_reason || null,
            decided_at: new Date().toISOString()
          };
        });
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('worker-application-cancelled', { detail: { id } }));
      } catch {}
      try {
        localStorage.removeItem('workerInformationForm');
        localStorage.removeItem('workerWorkInformation');
        localStorage.removeItem('workerDocuments');
        localStorage.removeItem('workerDocumentsData');
        localStorage.removeItem('workerRate');
        localStorage.removeItem(GLOBAL_DESC_KEY);
        sessionStorage.removeItem('worker_app_view_payload');
        sessionStorage.removeItem('wa_view_payload');
        const k = 'workerPostHiddenIds';
        const raw = localStorage.getItem(k);
        const arr = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
        if (!arr.includes(id)) arr.push(id);
        localStorage.setItem(k, JSON.stringify(arr));
      } catch {}
      try {
        await axios.post(
          `${API_BASE}/api/workerapplications/cancel`,
          {
            request_group_id: id,
            application_id: id,
            id,
            reason_choice: reason || null,
            reason_other: otherReason || null,
            worker_id: workerIdState || null,
            email_address: email || null
          },
          { withCredentials: true, headers: headersWithU }
        );
      } catch {}
      setRow(prev =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              reason_choice: reason || null,
              reason_other: otherReason || null,
              decided_at: new Date().toISOString()
            }
          : prev
      );
      setShowCancelSuccess(true);
    } catch (e) {
      const msg = 'Failed to cancel. Try again.';
      setCancelErr(msg);
      setSubmittingCancel(false);
      setShowCancel(true);
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleGoAfterCancel = () => {
    jumpTop();
    navigate('/workerdashboard', { replace: true, state: { cancelled: id } });
  };

  const schedule_date = fx?.details?.preferred_date || fx?.work?.preferred_date || '';
  const schedule_time = fx?.details?.preferred_time || fx?.work?.preferred_time || '';

  return (
    <>
      <WorkerNavigation />

      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,140,252,0.06),transparent_45%),linear-gradient(to_bottom,white,white)] pb-24">
        <div className="sticky top-0 z-10 border-b border-blue-100/60 bg-white/80 backdrop-blur">
          <div className="mx-auto w-full max-w-[1420px] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 grid place-items-center rounded-xl border border-blue-100 bg-white shadow-sm">
                <img
                  src="/jdklogo.png"
                  alt=""
                  className="h-6 w-6 object-contain"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="text-2xl md:text-3xl font-semibold text-gray-900">View Worker Application</div>
            </div>
            <div className="flex items-center gap-3"></div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1420px] px-6">
          <div className="space-y-6 mt-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm md:text-base font-semibold text-gray-700">Application ID:</div>
                <div className="text-sm md:text-base font-semibold text-[#008cfc] break-all">{applicationIdDisplay}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Personal Information</h3>
              </div>
              <div className="border-t border-gray-100" />
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-base">
                    <LabelValue label="First Name" value={first_name} />
                    <LabelValue label="Last Name" value={last_name} />
                    <LabelValue label="Contact Number" value={contactDisplay} />
                    <LabelValue label="Email" value={email} />
                    <LabelValue label="Barangay" value={barangay || '-'} />
                    <LabelValue label="Street" value={additional_address || street || '-'} />
                    <div className="hidden md:block" />
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

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm ring-1 ring-black/5 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Work Details</h3>
              </div>
              <div className="border-t border-gray-100" />
              <div className="px-6 py-6">
                <div className="text-base grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <LabelValue
                    label="Service Type"
                    value={Array.isArray(service_types) ? service_types.join(', ') : service_types || '-'}
                  />
                  <LabelValue label="Years of Experience" value={years_experience ? `${years_experience}` : '-'} />
                  <LabelValue
                    label="Service Task"
                    value={service_tasks_list.length ? service_tasks_list.join(', ') : '-'}
                  />
                  <LabelValue label="Tools Provided" value={toBoolStrict(tools_provided) ? 'Yes' : 'No'} />
                  <div className="md:col-span-2">
                    <LabelValue label="Work Description" value={application_description || '-'} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleDone}
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 whitespace-nowrap"
              >
                Done View
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#008cfc] text-white hover:bg-[#0077d6] transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40 whitespace-nowrap"
              >
                Cancel Application
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Loading application"
            tabIndex={-1}
            autoFocus
            onKeyDown={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={e => {
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
                <div className="text-lg font-semibold text-gray-900">Loading Application</div>
                <div className="text-sm text-gray-600 animate-pulse">Please wait a moment</div>
              </div>
            </div>
          </div>
        )}

        {showCancel && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cancel application"
            tabIndex={-1}
            autoFocus
            className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !submittingCancel && setShowCancel(false)}
            />
            <div className="relative w-full max-w-[560px] mx-4 rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="px-6 pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 grid place-items-center">
                    <span className="text-blue-600 text-lg">ⓘ</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-semibold text-gray-900">Cancel Application</div>
                    <div className="text-sm text-gray-600">Let us know why you’re cancelling.</div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {REASONS.map(r => (
                    <label
                      key={r}
                      className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                        reason === r
                          ? 'border-blue-400 ring-1 ring-blue-200 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancel-reason"
                        className="h-4 w-4"
                        checked={reason === r}
                        onChange={() => setReason(curr => (curr === r ? '' : r))}
                        disabled={submittingCancel}
                      />
                      <span className="text-sm md:text-base">{r}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700">Other</div>
                  <textarea
                    value={otherReason}
                    onChange={e => setOtherReason(e.target.value)}
                    disabled={submittingCancel}
                    placeholder="Type your reason here"
                    className="w-full min-h-[96px] rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {cancelErr ? <div className="text-sm text-blue-700">{cancelErr}</div> : null}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => !submittingCancel && setShowCancel(false)}
                  className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50"
                  disabled={submittingCancel}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitCancel}
                  className="h-10 px-4 rounded-md bg-[#008cfc] text-white hover:bg-blue-700 transition disabled:opacity-60"
                  disabled={submittingCancel}
                >
                  {submittingCancel ? 'Submitting...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {submittingCancel && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Please wait a moment"
            tabIndex={-1}
            autoFocus
            onKeyDown={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={e => {
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
                <div className="text-lg font-semibold text-gray-900">Please wait a moment</div>
                <div className="text-sm text-gray-600 animate-pulse">Submitting cancellation</div>
              </div>
            </div>
          </div>
        )}

        {showCancelSuccess && !submittingCancel && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Application cancelled"
            tabIndex={-1}
            autoFocus
            onKeyDown={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={e => {
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
                <div className="text-lg font-semibold text-gray-900">Application Cancelled!</div>
                <div className="text-sm text-gray-600">Your application has been cancelled.</div>
                <div className="text-xs text-gray-500">You can review it under your Current Applications.</div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoAfterCancel}
                  className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-[#0077d6] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008cfc]/40"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {leavingDone && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Loading next step"
            tabIndex={-1}
            className="fixed inset-0 z-[2147483646] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-[320px] max-w-[90vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
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
              <div className="mt-6 text-center">
                <div className="text-base font-semibold text-gray-900 animate-pulse">Please wait a moment</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <WorkerFooter />
    </>
  );
};

export default WorkerViewApplication;
