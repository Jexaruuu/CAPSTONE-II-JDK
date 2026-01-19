import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import WorkerNavigation from "../../workercomponents/WorkerNavigation";
import WorkerFooter from "../../workercomponents/WorkerFooter";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const PLACEHOLDER = "/Bluelogo.png";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isImageFile(file) {
  const t = String(file?.type || "").toLowerCase();
  return t.startsWith("image/");
}

function clampSlots(arr, n) {
  const out = Array.from({ length: n }, (_, i) => arr?.[i] || null);
  return out;
}

export default function WorkerMyWorks() {
  const [bestWorks, setBestWorks] = useState([null, null, null]);
  const [prevWorks, setPrevWorks] = useState([null, null, null]);
  const [baseBest, setBaseBest] = useState([null, null, null]);
  const [basePrev, setBasePrev] = useState([null, null, null]);

  const [saving, setSaving] = useState(false);
  const [showSaving, setShowSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  const bestInputRefs = [useRef(null), useRef(null), useRef(null)];
  const prevInputRefs = [useRef(null), useRef(null), useRef(null)];

  const appU = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem("workerAuth") || "{}");
      const au = a.auth_uid || a.authUid || a.uid || a.id || localStorage.getItem("auth_uid") || "";
      const e =
        a.email ||
        localStorage.getItem("worker_email") ||
        localStorage.getItem("email_address") ||
        localStorage.getItem("email") ||
        "";
      return encodeURIComponent(JSON.stringify({ r: "worker", e, au }));
    } catch {
      return "";
    }
  }, []);

  const headersWithU = useMemo(() => (appU ? { "x-app-u": appU } : {}), [appU]);

  const dirtyBest = useMemo(
    () => JSON.stringify(bestWorks || []) !== JSON.stringify(baseBest || []),
    [bestWorks, baseBest]
  );
  const dirtyPrev = useMemo(
    () => JSON.stringify(prevWorks || []) !== JSON.stringify(basePrev || []),
    [prevWorks, basePrev]
  );

  const canSave = (dirtyBest || dirtyPrev) && !saving;

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/workers/myworks`, {
          withCredentials: true,
          headers: headersWithU
        });

        const best = clampSlots(data?.best_works || data?.bestWorks || [], 3);
        const prev = clampSlots(data?.previous_works || data?.previousWorks || [], 3);

        setBestWorks(best);
        setPrevWorks(prev);
        setBaseBest(best);
        setBasePrev(prev);
      } catch {
        setBestWorks([null, null, null]);
        setPrevWorks([null, null, null]);
        setBaseBest([null, null, null]);
        setBasePrev([null, null, null]);
      }
    };
    init();
  }, [appU]);

  useEffect(() => {
    document.body.style.overflow = confirmOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [confirmOpen]);

  useEffect(() => {
    const lock = showSuccess || showSaving;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    if (lock) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = prevHtml || "";
      body.style.overflow = prevBody || "";
    }
    return () => {
      html.style.overflow = prevHtml || "";
      body.style.overflow = prevBody || "";
    };
  }, [showSuccess, showSaving]);

  const setSlot = (type, index, value) => {
    setErrorMsg("");
    if (type === "best") {
      setBestWorks((p) => {
        const n = [...p];
        n[index] = value;
        return n;
      });
    } else {
      setPrevWorks((p) => {
        const n = [...p];
        n[index] = value;
        return n;
      });
    }
  };

  const onPickFile = async (type, index, file) => {
    try {
      setErrorMsg("");
      if (!file) return;
      if (!isImageFile(file)) {
        setErrorMsg("Please upload an image file (JPG/PNG/WebP).");
        return;
      }
      if (file.size > 6 * 1024 * 1024) {
        setErrorMsg("Image is too large. Max allowed size is 6MB.");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      setSlot(type, index, dataUrl);
    } catch {
      setErrorMsg("Failed to load image. Please try again.");
    }
  };

  const openPicker = (type, index) => {
    if (type === "best") bestInputRefs[index]?.current?.click();
    else prevInputRefs[index]?.current?.click();
  };

  const onRemove = (type, index) => {
    setSlot(type, index, null);
  };

  const onSave = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      setShowSaving(true);
      setErrorMsg("");

      const payload = {
        best_works: bestWorks,
        previous_works: prevWorks
      };

      const { data } = await axios.post(`${API_BASE}/api/workers/myworks`, payload, {
        withCredentials: true,
        headers: headersWithU
      });

      const best = clampSlots(data?.best_works || data?.bestWorks || bestWorks, 3);
      const prev = clampSlots(data?.previous_works || data?.previousWorks || prevWorks, 3);

      setBestWorks(best);
      setPrevWorks(prev);
      setBaseBest(best);
      setBasePrev(prev);

      setShowSuccess(true);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save your portfolio. Please try again.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
      setShowSaving(false);
    }
  };

  const WorkSlot = ({ type, index, value, title }) => {
    const has = !!value;
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">{title}</div>
            <div className="mt-1 text-sm text-gray-500">Slot {index + 1} of 3</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openPicker(type, index)}
              className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50"
            >
              {has ? "Change" : "Upload"}
            </button>
            <button
              type="button"
              onClick={() => onRemove(type, index)}
              disabled={!has}
              className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium ${
                has ? "border-red-500 text-red-600 hover:bg-red-50" : "border-gray-200 text-gray-300 cursor-not-allowed"
              }`}
            >
              Remove
            </button>
          </div>
        </div>

        <div
          onClick={() => openPicker(type, index)}
          className={`mt-4 rounded-2xl border overflow-hidden cursor-pointer transition ${
            has ? "border-gray-100 bg-white" : "border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100"
          }`}
        >
          <div className="aspect-[16/10] w-full flex items-center justify-center">
            {has ? (
              <img src={value} alt="Work" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center px-6 text-center">
                <div className="h-14 w-14 rounded-full bg-blue-50 border border-blue-200 overflow-hidden flex items-center justify-center">
                  <img src={PLACEHOLDER} alt="Placeholder" className="h-full w-full object-cover" />
                </div>
                <div className="mt-3 text-sm font-medium text-gray-700">Click to upload</div>
                <div className="mt-1 text-xs text-gray-500">JPG / PNG / WebP (max 6MB)</div>
              </div>
            )}
          </div>
        </div>

        <input
          ref={type === "best" ? bestInputRefs[index] : prevInputRefs[index]}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPickFile(type, index, e.target.files?.[0] || null)}
        />
      </div>
    );
  };

  return (
    <>
      <WorkerNavigation />

      <main className="min-h-[65vh] pb-24 md:pb-10">
        <div className="mx-auto w-full max-w-[1530px] px-6">
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 md:p-7 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <h2 className="text-[22px] md:text-3xl font-semibold tracking-tight text-gray-900">My Works</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Upload your best projects and previous works to build your portfolio.
                </p>
              </div>

              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Portfolio Status</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-xl px-3 py-1.5 text-sm border ${
                      canSave ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {canSave ? "Unsaved changes" : "Up to date"}
                  </span>
                </div>
              </div>
            </div>

            {errorMsg ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            ) : null}
          </div>

          <section className="w-full rounded-2xl border border-gray-100 bg-white p-6 md:p-7 mb-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">Best Works</h3>
                <p className="mt-1 text-sm text-gray-600">Upload your top 3 best works.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WorkSlot type="best" index={0} value={bestWorks[0]} title="Best Work" />
              <WorkSlot type="best" index={1} value={bestWorks[1]} title="Best Work" />
              <WorkSlot type="best" index={2} value={bestWorks[2]} title="Best Work" />
            </div>
          </section>

          <section className="w-full rounded-2xl border border-gray-100 bg-white p-6 md:p-7 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">Previous Works</h3>
                <p className="mt-1 text-sm text-gray-600">Upload 3 previous works (older projects).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <WorkSlot type="prev" index={0} value={prevWorks[0]} title="Previous Work" />
              <WorkSlot type="prev" index={1} value={prevWorks[1]} title="Previous Work" />
              <WorkSlot type="prev" index={2} value={prevWorks[2]} title="Previous Work" />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={!canSave}
                onClick={() => setConfirmOpen(true)}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition shadow-sm ${
                  canSave ? "bg-[#008cfc] text-white hover:bg-blue-700" : "bg-[#008cfc] text-white opacity-60 cursor-not-allowed"
                }`}
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </section>
        </div>

        {confirmOpen ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
            <div className="relative z-[101] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-900">Save portfolio?</h4>
              <p className="mt-1 text-sm text-gray-600">Are you sure you want to save these changes?</p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={() => {
                    setConfirmOpen(false);
                    onSave();
                  }}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                    canSave ? "bg-[#008cfc] text-white hover:bg-blue-700" : "bg-[#008cfc] text-white opacity-60 cursor-not-allowed"
                  }`}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showSaving ? (
          <div className="fixed inset-0 z-[2147483646] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483647]">
              <div className="relative mx-auto w-32 h-32">
                <div
                  className="absolute inset-0 animate-spin rounded-full"
                  style={{
                    borderWidth: "8px",
                    borderStyle: "solid",
                    borderColor: "#008cfc22",
                    borderTopColor: "#008cfc",
                    borderRadius: "9999px"
                  }}
                />
                <div className="absolute inset-4 rounded-full border-2 border-[#008cfc33]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {!logoBroken ? (
                    <img src="/jdklogo.png" alt="Logo" className="w-14 h-14 object-contain" onError={() => setLogoBroken(true)} />
                  ) : (
                    <div className="w-14 h-14 rounded-full border border-[#008cfc] flex items-center justify-center">
                      <span className="font-bold text-[#008cfc]">JDK</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 text-center space-y-1">
                <div className="text-base font-semibold text-gray-900">Saving Portfolio</div>
                <div className="text-sm text-gray-500">Please wait a moment</div>
              </div>
            </div>
          </div>
        ) : null}

        {showSuccess ? (
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSuccess(false)} />
            <div className="relative w-[380px] max-w-[92vw] rounded-2xl border border-[#008cfc] bg-white shadow-2xl p-8 z-[2147483648]">
              <div className="mx-auto w-24 h-24 rounded-full border-2 border-[#008cfc33] flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
                {!logoBroken ? (
                  <img src="/jdklogo.png" alt="Logo" className="w-16 h-16 object-contain" onError={() => setLogoBroken(true)} />
                ) : (
                  <div className="w-16 h-16 rounded-full border border-[#008cfc] flex items-center justify-center">
                    <span className="font-bold text-[#008cfc]">JDK</span>
                  </div>
                )}
              </div>
              <div className="mt-6 text-center space-y-2">
                <div className="text-lg font-semibold text-gray-900">Saved Successfully!</div>
                <div className="text-sm text-gray-600">Your portfolio has been updated.</div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowSuccess(false)}
                  className="w-full px-6 py-3 bg-[#008cfc] text-white rounded-xl shadow-sm hover:bg-blue-700 transition"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <WorkerFooter />
    </>
  );
}
